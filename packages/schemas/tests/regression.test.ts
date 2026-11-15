/**
 * T1001 — the regression report must fail closed.
 *
 * A pipeline report is read as "the build is fine". These tests pin the three
 * ways such a report lies: an empty run, a stage that never ran, and a run
 * against a dirty tree that is described as if it were a clean commit.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM helper shared with the CLI
import {
  STAGES,
  aggregateStages,
  hasPlaywright,
  renderReport,
  resolveStages,
} from '../../../scripts/lib/regression.mjs';

interface Named {
  id: string;
}

const stage = (id: string, status: string, durationMs = 1000) => ({
  id,
  command: `pnpm ${id}`,
  status,
  exitCode: status === 'pass' ? 0 : status === 'fail' ? 1 : null,
  durationMs,
});

const base = {
  head: 'a'.repeat(40),
  branch: 'chore/x',
  dirty: false,
  startedAt: '2026-11-15T00:00:00.000Z',
};

describe('regression aggregation (T1001)', () => {
  it('runs verify before the stages that cost real builds', () => {
    expect(STAGES.map((s: Named) => s.id)).toEqual(['verify', 'demo-loop', 'dogfood']);
    expect(STAGES[0].script).toBe('verify');
  });

  it('passes only when every stage ran and passed', () => {
    const report = aggregateStages({
      ...base,
      stages: [stage('verify', 'pass'), stage('demo-loop', 'pass'), stage('dogfood', 'pass')],
    });
    expect(report.status).toBe('pass');
    expect(report.totalDurationMs).toBe(3000);
  });

  it('a failing stage fails the run and is named', () => {
    const report = aggregateStages({
      ...base,
      stages: [stage('verify', 'pass'), stage('dogfood', 'fail'), stage('demo-loop', 'not-run')],
    });
    expect(report.status).toBe('fail');
    expect(report.failed).toEqual(['dogfood']);
    expect(report.notRun).toEqual(['demo-loop']);
  });

  it('a not-run stage prevents a pass even when nothing failed', () => {
    const report = aggregateStages({
      ...base,
      stages: [stage('verify', 'pass'), stage('dogfood', 'not-run')],
    });
    expect(report.status).toBe('fail');
    expect(renderReport(report)).toContain('reported as `not-run`, never as `pass`');
  });

  it('an empty run is a failure, not an empty success', () => {
    expect(aggregateStages({ ...base, stages: [] }).status).toBe('fail');
  });

  it('the report names the revision and flags a dirty tree', () => {
    const clean = renderReport(aggregateStages({ ...base, stages: [stage('verify', 'pass')] }));
    expect(clean).toContain(base.head);
    expect(clean).not.toContain('dirty');

    const dirty = renderReport(
      aggregateStages({ ...base, dirty: true, stages: [stage('verify', 'pass')] }),
    );
    expect(dirty).toContain('working tree dirty');
    expect(dirty).toContain('uncommitted changes');
  });

  it('skips end-to-end stages when Playwright is absent instead of pretending they ran', () => {
    const missing = resolveStages({ root: '/repo', exists: () => false });
    expect(missing.map((s: Named) => s.id)).toEqual(['verify']);
    const present = resolveStages({
      root: '/repo',
      exists: (path: string) => path.endsWith('playwright'),
    });
    expect(present.map((s: Named) => s.id)).toEqual(['verify', 'demo-loop', 'dogfood']);
    expect(hasPlaywright('/repo', () => false)).toBe(false);
  });
});
