/**
 * T1031 (issue #21 R1) — `--scope page` proposes the page's own findings.
 *
 * Before this, a page-level defect (a missing meta description) was unreachable: attribution matched
 * element descriptors, and the audit reports those findings at their own route (`/`), so the command
 * exited 0 with "nothing to propose" while the audit had failed a gate on the same page.
 *
 * The page owns everything measured on it, so a page scope attributes by dimension rather than by
 * element descriptor — that is a statement about the audit's unit, not a containment guess.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FOCUS_DIMENSIONS, resolvePageScope, isPageScopeReference } from '../src/audit/scope.js';
import { selectScopedItems } from '../src/bestpractice/command.js';
import { runAudit } from '../src/audit/pipeline.js';
import { checkSeo } from '@sus/scanners';

const FIXTURE = 'fixtures/bestpractice/scoped-axe/index.html';

describe('page scope (issue #21 R1)', () => {
  it('recognises the whole-document tokens and nothing else', () => {
    expect(isPageScopeReference({ kind: 'selector', value: 'page' })).toBe(true);
    expect(isPageScopeReference({ kind: 'selector', value: ' Page ' })).toBe(true);
    expect(isPageScopeReference({ kind: 'selector', value: 'document' })).toBe(true);
    expect(isPageScopeReference({ kind: 'selector', value: '#signup' })).toBe(false);
    // `body` is a real element and stays one: the browser resolves it like any selector.
    expect(isPageScopeReference({ kind: 'selector', value: 'body' })).toBe(false);
    expect(isPageScopeReference({ kind: 'component-path', value: 'src/Form.tsx' })).toBe(false);
  });

  it('resolves without a browser and declares no dimension out of scope', () => {
    const scope = resolvePageScope({ kind: 'selector', value: 'page' });
    expect(scope.outcome).toBe('resolved');
    expect(scope.focus?.kind).toBe('page');
    expect(scope.focus?.run).toEqual([...FOCUS_DIMENSIONS]);
    expect(scope.focus?.notApplicable).toEqual([]);
    expect(scope.targets.map((target) => target.selector)).toEqual(['html']);
  });

  it('proposes findings the audit reported at their own route', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-page-scope-'));
    const run = await runAudit({
      target: FIXTURE,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      fixPlan: false,
    });
    const scope = resolvePageScope({ kind: 'selector', value: 'page' });
    const selection = selectScopedItems(run.report, scope);

    const pageLevel = selection.items.filter((item) => item.location === '/');
    expect(pageLevel.length).toBeGreaterThan(0);
    expect(pageLevel.map((item) => item.title)).toEqual(
      expect.arrayContaining(['meta-description on /']),
    );
    // The page owns element findings too: they are inside the document.
    expect(selection.items.some((item) => item.location === 'input#email')).toBe(true);
    // Nothing is counted as "attributed elsewhere" when the selection is the whole document.
    expect(selection.unattributed).toBe(0);
    // Every dimension was measured on this unit, so none is silently skipped.
    expect(selection.dimensions).toEqual([...FOCUS_DIMENSIONS]);
    expect(selection.notApplicable).toEqual([]);
  }, 180000);

  it('gives every SEO check a number, so a page-level finding can carry an observation', () => {
    // Without this the proposal contract refused the finding as `fact-without-observation`, which is
    // the honest failure mode: a "measured" fact that cannot say how many is not a measurement.
    const result = checkSeo(
      '<html lang="en"><head><title>t</title></head><body><main><h1>t</h1><img src="a.png"></main></body></html>',
    );
    for (const check of result.checks) {
      expect(typeof check.observed, check.id).toBe('number');
      expect(typeof check.expected, check.id).toBe('number');
      expect(typeof check.unit, check.id).toBe('string');
    }
    const alt = result.checks.find((check) => check.id === 'img-alt');
    expect(alt?.observed).toBe(1);
    expect(alt?.expected).toBe(0);
  });
});
