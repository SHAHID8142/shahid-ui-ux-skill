/**
 * T0155: judge session mechanics — anonymization, pass validation,
 * agreement computation with below-target flagging. Uses synthetic scores;
 * the real calibration run writes evals/judge/calibration-1/.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeAgreement,
  createJudgeSession,
  recordPass,
  type JudgeSubmission,
} from '../src/judge.js';
import { RUBRIC_AXES } from '@sus/schemas';

const subs: JudgeSubmission[] = [
  { label: 'secret-marketing', material: 'page with hero + features' },
  { label: 'secret-commerce', material: 'page with grid + cart' },
];

function fullScores(value: number): Record<string, Record<string, number>> {
  return {
    A: Object.fromEntries(RUBRIC_AXES.map((a) => [a, value])),
    B: Object.fromEntries(RUBRIC_AXES.map((a) => [a, value])),
  };
}

describe('judge session mechanics (T0155)', () => {
  it('anonymizes labels, shuffles order, hides mapping from materials', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    const session = createJudgeSession(dir, subs);
    expect(Object.values(session.mapping).sort()).toEqual(['secret-commerce', 'secret-marketing']);
    const materials = readFileSync(join(dir, 'materials.json'), 'utf8');
    expect(materials).not.toContain('secret-marketing');
    expect(Object.keys(session.order)).toHaveLength(2);
  });

  it('validates passes: unknown alias, unknown axis, missing axis, out-of-range score', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    createJudgeSession(dir, subs);
    expect(() => recordPass(dir, 'j', { Z: { hierarchy: 3 } })).toThrow(/unknown alias/);
    expect(() => recordPass(dir, 'j', { A: { bogus: 3 } })).toThrow(/unknown axis/);
    expect(() => recordPass(dir, 'j', { A: { hierarchy: 3 } })).toThrow(/missing axis/);
    const bad = fullScores(3);
    bad.A = { ...bad.A!, hierarchy: 9 };
    expect(() => recordPass(dir, 'j', bad)).toThrow(/out of 1..5/);
  });

  it('computes agreement and flags below-target axes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    createJudgeSession(dir, subs);
    const stable = fullScores(4);
    recordPass(dir, 'j1', stable);
    const drifting = fullScores(4);
    // one axis drifts by 2 on both aliases, another by 1
    for (const alias of ['A', 'B']) {
      drifting[alias] = {
        ...drifting[alias]!,
        typography: 2,
        'color-surface': 3,
      };
    }
    recordPass(dir, 'j1', drifting);
    const report = computeAgreement(dir);
    expect(report.pairsCompared).toBe(1);
    expect(report.axes).toHaveLength(12);
    const typo = report.axes.find((a) => a.axis === 'typography')!;
    expect(typo.exactMatchRate).toBe(0);
    expect(typo.meanAbsDiff).toBe(2);
    expect(report.belowTargetAxes).toContain('typography');
    // color-surface drifts by 1: fails exact target but within mean-abs-diff target
    const color = report.axes.find((a) => a.axis === 'color-surface')!;
    expect(color.meanAbsDiff).toBe(1);
    expect(report.belowTargetAxes).not.toContain('color-surface');
    const stableAxes = report.axes.filter((a) => !['typography', 'color-surface'].includes(a.axis));
    for (const a of stableAxes) expect(a.belowTarget).toBe(false);
  });

  it('refuses agreement with fewer than two passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-'));
    createJudgeSession(dir, subs);
    expect(() => computeAgreement(dir)).toThrow(/>= 2 recorded passes/);
  });
});
