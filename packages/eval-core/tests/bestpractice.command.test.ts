/**
 * T1023 — the scoped command end to end: real audit, real scope, real proposal, and refusals
 * that are as important as the happy path.
 *
 * The integration cases drive the actual pipeline against `fixtures/bestpractice` in deep mode
 * (Chromium + Lighthouse). They assert the target's bytes are unchanged afterwards, because
 * "read-only" is a property of the run, not a sentence in the help text.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BESTPRACTICE_HELP,
  defaultFocus,
  parseFocus,
  runBestPractice,
} from '../src/bestpractice/command.js';
import {
  dimensionForCheck,
  isAttributedTo,
  itemsFromReport,
  untestedFromReport,
} from '../src/bestpractice/from-audit.js';
import { BestPracticeProposal } from '../src/bestpractice/proposal.js';

const FIXTURE = join(process.cwd(), 'fixtures', 'bestpractice');

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('CLI surface', () => {
  it('documents the read-only default and the exit codes in --help', () => {
    expect(BESTPRACTICE_HELP).toContain('READ-ONLY');
    expect(BESTPRACTICE_HELP).toContain('--dry-run');
    expect(BESTPRACTICE_HELP).toContain('3  proposal written but nothing in scope was measured');
  });

  it('parses a focus list and refuses dimensions it does not know', () => {
    expect(parseFocus('a11y,responsive')).toEqual(['a11y', 'responsive']);
    expect(parseFocus('a11y,a11y')).toEqual(['a11y']);
    expect(parseFocus(undefined)).toBeUndefined();
    expect(() => parseFocus('colour')).toThrow(/does not know colour/);
    expect(() => parseFocus(' , ')).toThrow(/no dimensions/);
  });

  it('derives the default focus from the component kind', () => {
    expect(defaultFocus('button')).toEqual(['a11y', 'visual', 'copy']);
  });
});

describe('report → proposal items', () => {
  it('maps every audit check to a dimension or to nothing at all', () => {
    expect(dimensionForCheck('capture-matrix')).toBe('responsive');
    expect(dimensionForCheck('reflow-matrix')).toBe('responsive');
    expect(dimensionForCheck('keyboard-flow')).toBe('a11y');
    expect(dimensionForCheck('axe-a11y')).toBe('a11y');
    expect(dimensionForCheck('lighthouse-budgets')).toBe('performance');
    expect(dimensionForCheck('seo-structure')).toBe('copy');
    expect(dimensionForCheck('transition-oracle')).toBe('motion');
    expect(dimensionForCheck('made-up-check')).toBeNull();
  });

  it('attributes only an exact element descriptor', () => {
    expect(isAttributedTo('a#cta', ['a#cta'])).toBe(true);
    expect(isAttributedTo('a#cta', ['a#other'])).toBe(false);
    expect(isAttributedTo('td.cell', ['td'])).toBe(false);
    expect(isAttributedTo(null, ['a#cta'])).toBe(false);
  });
});

describe('scoped run against a real fixture (deep)', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'sus-bp-run-'));
  const targetBefore = sha256(join(FIXTURE, 'index.html'));

  it('proposes measured items for the selected element and writes them outside the target', async () => {
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      scope: { kind: 'selector', value: '#skip' },
      outDir,
      mode: 'deep',
      generatedAt: '2026-11-17T00:00:00.000Z',
    });
    expect(run.scope.outcome).toBe('resolved');
    expect(run.proposal).not.toBeNull();
    const proposal = run.proposal;
    if (proposal === null) throw new Error('expected a proposal');
    // Two measured defects on that element: clipped content at 400% zoom, and a small target.
    expect(proposal.items.length).toBeGreaterThanOrEqual(2);
    expect(proposal.items.every((item) => item.kind === 'fact')).toBe(true);
    expect(proposal.items.every((item) => item.location === 'a#skip')).toBe(true);
    expect(proposal.items.some((item) => item.observed !== null && item.expected !== null)).toBe(
      true,
    );
    expect(run.exitCode).toBe(1); // a P1 is present
    expect(
      BestPracticeProposal.safeParse(JSON.parse(readFileSync(run.proposalPath as string, 'utf8')))
        .success,
    ).toBe(true);
    expect(run.markdown).toContain('## Not measured');
    expect(run.markdown).toContain('nothing is written until hunks are approved');
    expect(run.markdown).toContain(proposal.digest.slice(0, 16));
    // The target is untouched: the run wrote only under --out.
    expect(sha256(join(FIXTURE, 'index.html'))).toBe(targetBefore);
    expect(existsSync(join(outDir, 'audit', 'audit.json'))).toBe(true);
    // A deep audit of the whole best-practice fixture (five routes: capture, reflow, axe, keyboard,
    // Lighthouse, motion, component states and one full Lighthouse budget run per route) takes ~285 s
    // alone on this laptop (measured) and exceeded 420 s when the whole suite ran in parallel, so the
    // timeout was measuring contention rather than the code. The timeout is headroom, not a claim about
    // speed: the suite's own duration is reported by vitest and is the number to compare.
  }, 720000);

  it('writes no proposal and changes nothing when the selector matches nothing', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-bp-miss-'));
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      scope: { kind: 'selector', value: '#does-not-exist' },
      outDir: out,
      mode: 'quick',
    });
    expect(run.scope.outcome).toBe('not-found');
    expect(run.exitCode).toBe(2);
    expect(run.proposal).toBeNull();
    expect(run.markdown).toContain('Resolve the scope and run again');
    expect(existsSync(join(out, 'proposal.json'))).toBe(false);
  }, 120000);

  it('refuses a selector that means the whole page', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-bp-star-'));
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      scope: { kind: 'selector', value: '*' },
      outDir: out,
      mode: 'quick',
    });
    expect(run.scope.outcome).toBe('rejected');
    expect(run.scope.reason).toContain('whole page');
    expect(run.exitCode).toBe(2);
  }, 120000);

  it('proposes nothing in quick mode and says which dimensions were not measured', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-bp-quick-'));
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      scope: { kind: 'selector', value: '#skip' },
      outDir: out,
      mode: 'quick',
    });
    // Scope resolution needs a page even in quick mode; the audit's browser checks stay not-run,
    // so there is nothing measured to propose — and the report says why.
    if (run.scope.outcome === 'resolved') {
      expect(run.exitCode).toBe(0);
      expect(run.proposal).toBeNull();
      expect(run.markdown).toContain('Not measured');
    } else {
      expect(run.exitCode).toBe(2);
      expect(run.markdown).toContain('could not be opened');
    }
  }, 120000);

  it('keeps a screenshot region advisory instead of proposing from pixels', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-bp-region-'));
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      scope: { kind: 'region', value: 'rect-1', source: 'screenshot' },
      outDir: out,
      mode: 'quick',
    });
    expect(run.scope.outcome).toBe('advisory');
    expect(run.exitCode).toBe(2);
    expect(run.proposal).toBeNull();
  }, 120000);
});

describe('selection helpers refuse to invent what they did not see', () => {
  it('counts findings outside the dimensions instead of dropping them silently', () => {
    const report = {
      findings: [
        {
          check: 'axe-a11y',
          severity: 'P0',
          title: 'rule',
          detail: 'd',
          evidence: [],
          route: '/',
          viewport: null,
          observation: {
            evaluator: 'e',
            expected: null,
            observed: null,
            location: 'rule-id',
            artifact: null,
            artifactHash: null,
            confidence: 'measured',
            verdict: 'confirmed',
            remediation: 'r',
          },
        },
      ],
      checks: [],
    } as unknown as Parameters<typeof itemsFromReport>[0];
    const { items, outOfScope } = itemsFromReport(report, { dimensions: ['copy'] });
    expect(items).toEqual([]);
    expect(outOfScope).toBe(1);
  });

  it('reports a not-run check as an untested dimension with its reason', () => {
    const report = {
      findings: [],
      checks: [
        {
          id: 'capture-matrix',
          status: 'not-run',
          reason: 'quick mode runs no browser',
          detail: [],
        },
        { id: 'seo-structure', status: 'pass', detail: [] },
      ],
    } as unknown as Parameters<typeof untestedFromReport>[0];
    const untested = untestedFromReport(report, { dimensions: ['responsive', 'copy'] });
    expect(untested).toHaveLength(1);
    expect(untested[0]!.dimension).toBe('responsive');
    expect(untested[0]!.reason).toContain('quick mode runs no browser');
  });
});
