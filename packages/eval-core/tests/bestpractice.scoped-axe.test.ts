/**
 * T1030 (issue #21 R2 / #15) — axe findings can belong to a selection.
 *
 * Before this, every axe finding carried the *rule id* as its location, so a scoped proposal could
 * not honestly say "this violation is inside the element you selected": the rule id names no element,
 * and substring-matching it against a scope would have been a guess. axe's `include` confines the
 * analysis to a subtree, which makes the attribution true by construction.
 *
 * These tests hold both halves: the scoped scan attributes what is inside, and the page-wide scan is
 * unchanged (a scoped scan must not replace the whole-page measurement).
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runAudit } from '../src/audit/pipeline.js';
import { runBestPractice } from '../src/bestpractice/command.js';

const FIXTURE = 'fixtures/bestpractice/scoped-axe/index.html';
const SCOPE = { selector: 'form#signup', label: 'form#signup' };

const audit = async (scopeSelectors: { selector: string; label: string }[] = []) => {
  const out = mkdtempSync(join(tmpdir(), 'sus-scoped-axe-'));
  const run = await runAudit({
    target: FIXTURE,
    liveUrl: null,
    mode: 'deep',
    outDir: out,
    authorizedHosts: [],
    fixPlan: false,
    scopeSelectors,
  });
  return run.report.findings.filter((finding) => finding.check === 'axe-a11y');
};

describe('scope-confined axe (issue #21 R2)', () => {
  it('runs no scoped scan when no scope was asked for, and says so instead of implying coverage', async () => {
    const findings = await audit();
    expect(findings.every((finding) => !finding.title.includes('within'))).toBe(true);
    // The page-wide scan still sees both deliberate defects.
    expect(findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining(['image-alt (critical)', 'label (critical)']),
    );
  }, 180000);

  it('attributes an in-scope violation to the selected element', async () => {
    const findings = await audit([SCOPE]);
    const scoped = findings.filter((finding) => finding.title.includes('within form#signup'));
    expect(scoped).toHaveLength(1);
    expect(scoped[0]!.title).toContain('label (critical)');
    expect(scoped[0]!.observation?.location).toBe('form#signup');
    expect(scoped[0]!.evidence).toContain('label');
    // The measurement the proposal contract requires: a fact with an actual observation.
    expect(scoped[0]!.observation?.expected).toEqual({
      value: 0,
      unit: 'serious/critical violations in scope',
    });
    expect(scoped[0]!.observation?.observed).toEqual({ value: 1, unit: 'affected nodes in scope' });
  }, 180000);

  it('does not attribute an out-of-scope violation to the scope', async () => {
    const findings = await audit([SCOPE]);
    expect(
      findings.some(
        (finding) => finding.title.includes('image-alt') && finding.title.includes('within'),
      ),
    ).toBe(false);
    // …while the page-wide finding for it stays.
    expect(findings.some((finding) => finding.title === 'image-alt (critical)')).toBe(true);
  }, 180000);

  it('survives a selector axe cannot include: records the failure, does not fail the audit', async () => {
    const findings = await audit([{ selector: '.no-such-element', label: '.no-such-element' }]);
    // No scoped findings, no throw: the page-wide measurement is still delivered.
    expect(findings.some((finding) => finding.title.includes('within .no-such-element'))).toBe(
      false,
    );
    expect(findings.length).toBeGreaterThan(0);
  }, 180000);

  it('reaches the proposal through the real command, and resolves a single-file target', async () => {
    // Regression: `targetIsDirectory` guessed from a `.` in the path, so a single .html target
    // resolved no selector at all and every scoped a11y finding was unreachable.
    const out = mkdtempSync(join(tmpdir(), 'sus-bp-scoped-axe-'));
    const run = await runBestPractice({
      target: FIXTURE,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'selector', value: '#signup' },
      focus: null,
    });
    expect(run.scope.outcome).toBe('resolved');
    const item = run.proposal?.items.find((entry) => entry.location === 'form#signup');
    expect(item).toBeDefined();
    expect(item!.dimension).toBe('a11y');
    expect(item!.kind).toBe('fact');
    expect(run.exitCode).toBe(1); // a P0 in scope is blocking
  }, 240000);
});
