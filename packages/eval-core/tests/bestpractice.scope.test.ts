/**
 * T1021 — scope resolution is the part of `/sus-bestpractice` that can silently do the
 * wrong thing. A selector that is stale, ambiguous or screenshot-only must produce a
 * clarification, not the nearest guess; and a scope must never quietly drop a dimension
 * it did not measure.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import {
  FOCUS_DIMENSIONS,
  SCOPE_LIMITS,
  classifyComponent,
  renderScope,
  resolveScope,
  selectFocus,
  type ScopeReference,
} from '../src/audit/scope.js';

describe('component classification (no inference from text)', () => {
  it('classifies the classes the repository has guidance for', () => {
    const kind = (tag: string, role: string | null, classes: string[]) =>
      classifyComponent({ tag, role, classes });
    expect(kind('nav', null, [])).toBe('navbar');
    expect(kind('div', 'navigation', [])).toBe('navbar');
    expect(kind('button', null, [])).toBe('button');
    expect(kind('a', null, ['cta-link'])).toBe('button');
    expect(kind('form', null, [])).toBe('form');
    expect(kind('input', null, [])).toBe('form-field');
    expect(kind('div', 'combobox', [])).toBe('form-field');
    expect(kind('table', null, [])).toBe('record-table');
    expect(kind('div', 'grid', [])).toBe('record-table');
    expect(kind('div', 'dialog', [])).toBe('dialog');
    expect(kind('div', null, ['pricing-modal'])).toBe('dialog');
    expect(kind('section', null, ['hero'])).toBe('generic');
  });

  it('prefers the table over a button when both could match (a table with a button class)', () => {
    expect(classifyComponent({ tag: 'table', role: null, classes: ['btn-grid'] })).toBe(
      'record-table',
    );
  });
});

describe('focus selection names what it will not measure', () => {
  it.each(['navbar', 'button', 'form', 'form-field', 'record-table', 'dialog', 'generic'] as const)(
    '%s accounts for all six dimensions exactly once',
    (kind) => {
      const focus = selectFocus(kind);
      const covered = [...focus.run, ...focus.notApplicable.map((n) => n.dimension)];
      expect([...covered].sort()).toEqual([...FOCUS_DIMENSIONS].sort());
      expect(focus.run.length).toBeGreaterThan(0);
      for (const skip of focus.notApplicable) {
        expect(skip.reason.length).toBeGreaterThan(20);
      }
    },
  );

  it('does not claim to measure performance for a single button', () => {
    const focus = selectFocus('button');
    expect(focus.run).not.toContain('performance');
    const skip = focus.notApplicable.find((n) => n.dimension === 'performance');
    expect(skip?.reason).toContain('scripted interaction');
  });

  it('leaves copy out of a record table and says why', () => {
    const focus = selectFocus('record-table');
    expect(focus.run).toEqual(['responsive', 'a11y', 'visual']);
    expect(focus.notApplicable.find((n) => n.dimension === 'copy')?.reason).toContain('content');
  });
});

const PAGE = `<!doctype html><html><head><title>scope</title></head><body>
  <nav><a href="/a">a</a></nav>
  <button id="cta">Buy</button>
  <div class="card" id="c1">1</div>
  <div class="card" id="c2">2</div>
  <div class="card" id="c3">3</div>
  <span id="plain">note</span>
</body></html>`;

let server: ReturnType<typeof createServer>;
let origin: string;
let browser: Browser;
let page: Awaited<ReturnType<Browser['newPage']>>;

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(PAGE);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto(origin, { waitUntil: 'load' });
}, 120000);

afterAll(async () => {
  await browser.close();
  server.close();
});

const ref = (value: string, over: Partial<ScopeReference> = {}): ScopeReference => ({
  kind: 'selector',
  value,
  ...over,
});

describe('resolution against a live page', () => {
  it('resolves one element and picks focus from its component class', async () => {
    const resolution = await resolveScope(page, ref('#cta'));
    expect(resolution.outcome).toBe('resolved');
    expect(resolution.targets).toHaveLength(1);
    expect(resolution.targets[0]!.kind).toBe('button');
    expect(resolution.focus?.kind).toBe('button');
    expect(resolution.clarification).toBeNull();
  }, 60000);

  it('classifies a nav and a plain element differently', async () => {
    expect((await resolveScope(page, ref('nav'))).targets[0]!.kind).toBe('navbar');
    expect((await resolveScope(page, ref('#plain'))).targets[0]!.kind).toBe('generic');
  }, 60000);

  it('never picks the first of several matches', async () => {
    const resolution = await resolveScope(page, ref('.card'));
    expect(resolution.outcome).toBe('ambiguous');
    // Descriptors prefer the id, as the metrics and tap-target selectors already do.
    expect(resolution.targets.map((t) => t.selector)).toEqual(['div#c1', 'div#c2', 'div#c3']);
    expect(resolution.clarification).toContain('narrow the selector');
    // Ambiguity means "not auditable yet": no focus set is offered.
    expect(resolution.focus).toBeNull();
  }, 60000);

  it('reports a stale selection as not-found with a next step', async () => {
    const resolution = await resolveScope(page, ref('#gone'));
    expect(resolution.outcome).toBe('not-found');
    expect(resolution.clarification).toContain('reselect');
    expect(resolution.targets).toEqual([]);
  }, 60000);

  it('refuses selectors that are not a selection at all', async () => {
    for (const value of [
      '',
      '   ',
      '*',
      'html *',
      'a'.repeat(SCOPE_LIMITS.maxSelectorLength + 1),
    ]) {
      const resolution = await resolveScope(page, ref(value));
      expect(resolution.outcome).toBe('rejected');
      expect(resolution.reason).not.toBeNull();
    }
  }, 60000);

  it('refuses control characters instead of passing them to the browser', async () => {
    const resolution = await resolveScope(page, ref('button\u0000'));
    expect(resolution.outcome).toBe('rejected');
    expect(resolution.reason).toContain('control characters');
  }, 60000);

  it('returns a clarification rather than a result when no browser is available', async () => {
    const resolution = await resolveScope(null, ref('#cta'));
    expect(resolution.outcome).toBe('not-found');
    expect(resolution.clarification).toContain('component path');
  });

  it('keeps a screenshot region advisory: pixels are not source', async () => {
    const resolution = await resolveScope(page, {
      kind: 'region',
      value: 'annotation-1',
      source: 'screenshot',
    });
    expect(resolution.outcome).toBe('advisory');
    expect(resolution.advisory).toBe(true);
    expect(resolution.focus).toBeNull();
    expect(resolution.clarification).toContain('not linked to source');
  }, 60000);
});

describe('resolution against the file tree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'sus-scope-'));
  const readFile = (path: string): string | null => {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  };

  it('resolves an existing component path and carries the file', async () => {
    const file = join(dir, 'Navbar.astro');
    writeFileSync(file, '<nav></nav>', 'utf8');
    const resolution = await resolveScope(
      page,
      { kind: 'component-path', value: file },
      { readFile },
    );
    expect(resolution.outcome).toBe('resolved');
    expect(resolution.targets[0]!.file).toBe(file);
    expect(resolution.targets[0]!.kind).toBe('navbar');
  }, 60000);

  it('reports a stale path as not-found', async () => {
    const resolution = await resolveScope(
      page,
      { kind: 'component-path', value: join(dir, 'Deleted.tsx') },
      { readFile },
    );
    expect(resolution.outcome).toBe('not-found');
    expect(resolution.clarification).toContain('stale');
  }, 60000);

  it('refuses an empty path', async () => {
    const resolution = await resolveScope(
      page,
      { kind: 'component-path', value: '  ' },
      { readFile },
    );
    expect(resolution.outcome).toBe('rejected');
  }, 60000);
});

describe('the rendered scope states what was refused or left out', () => {
  it('prints targets, measured dimensions and the reasons for the rest', async () => {
    const resolution = await resolveScope(page, ref('#cta'));
    const text = renderScope(resolution);
    expect(text).toContain('resolved');
    expect(text).toContain('button#cta');
    expect(text).toContain('measuring:');
    expect(text).toContain('not-applicable performance:');
  }, 60000);

  it('prints the clarification when the scope is not usable', async () => {
    const text = renderScope(await resolveScope(page, ref('.card')));
    expect(text).toContain('ambiguous');
    expect(text).toContain('needs confirmation');
  }, 60000);
});
