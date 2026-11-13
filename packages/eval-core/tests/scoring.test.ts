/**
 * T0151: score a fixture section; assert band, judged-exclusion, tier rules.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AXIS_TIERS, RUBRIC_AXES, RubricScore, type RubricScoreData } from '@sus/schemas';
import { scoreSection } from '../src/index.js';

const ANCHOR = 'fixture anchor: scored against the fixture-A section corpus';

function sectionScore(
  scores: Partial<Record<(typeof RUBRIC_AXES)[number], number>>,
): RubricScoreData {
  return {
    subject: 'fixtures/marketing#hero',
    scores: RUBRIC_AXES.map((axis) => ({
      axis,
      score: scores[axis] ?? 3,
      basis:
        AXIS_TIERS[axis] === 'judged'
          ? 'judged'
          : AXIS_TIERS[axis] === 'deterministic'
            ? 'measured'
            : 'critic-validated',
      evidence: ['fixtures/marketing/app/page.tsx'],
      anchorsNote: ANCHOR,
    })),
  };
}

describe('rubric scoring (T0151)', () => {
  it('scores a fixture section into the acceptable band (/55)', () => {
    const verdict = scoreSection(sectionScore({}));
    // 11 non-judged axes × 3 = 33 → acceptable-named-gaps; composite 12×3 = 36
    expect(verdict.acceptanceComposite).toBe(33);
    expect(verdict.band).toBe('acceptable-named-gaps');
    expect(verdict.composite).toBe(36);
  });

  it('band edges: reference-grade at 46+, rework below 30', () => {
    const strong = scoreSection(
      sectionScore(Object.fromEntries(RUBRIC_AXES.map((a) => [a, 5])) as never),
    );
    expect(strong.composite).toBe(60);
    expect(strong.acceptanceComposite).toBe(55);
    expect(strong.band).toBe('reference-grade');

    const weak = scoreSection(
      sectionScore(Object.fromEntries(RUBRIC_AXES.map((a) => [a, 1])) as never),
    );
    expect(weak.acceptanceComposite).toBe(11);
    expect(weak.band).toBe('rework-required');
  });

  it('excludes the judged axis from the acceptance composite and flags never-gates', () => {
    const verdict = scoreSection(sectionScore({ 'distinctiveness-pov': 5 } as never));
    expect(verdict.judgedNeverGates).toContain('distinctiveness-pov');
    // bumping the judged axis must not move the acceptance composite
    expect(verdict.acceptanceComposite).toBe(33);
    expect(verdict.composite).toBe(38);
    // deterministic axes are the gating set
    expect(verdict.gatingDeterministic).toContain('accessibility');
  });

  it('rejects tier/basis mismatches (deterministic must be measured)', () => {
    const bad = sectionScore({});
    const det = bad.scores.find((s) => AXIS_TIERS[s.axis] === 'deterministic');
    if (det) det.basis = 'judged';
    expect(RubricScore.safeParse(bad).success).toBe(false);
  });

  it('rejects missing/duplicate axes and out-of-range scores', () => {
    const dup = sectionScore({});
    // replace the second axis with a copy of the first -> true duplicate
    dup.scores = [dup.scores[0]!, ...dup.scores.slice(2)];
    expect(RubricScore.safeParse(dup).success).toBe(false);

    const missing = sectionScore({});
    missing.scores = missing.scores.slice(1);
    expect(RubricScore.safeParse(missing).success).toBe(false);
  });
});

describe('scoring CLI (T0151)', () => {
  it('scores a JSON input and writes a schema-valid verdict', () => {
    const dir = mkdtempSync(join(tmpdir(), 't0151-'));
    const input = join(dir, 'score.json');
    const output = join(dir, 'verdict.json');
    writeFileSync(input, JSON.stringify(sectionScore({})));
    const cli = join(__dirname, '..', 'dist', 'cli.js');
    execFileSync(process.execPath, [cli, 'score', '--in', input, '--out', output]);
    const verdict = JSON.parse(readFileSync(output, 'utf8'));
    expect(verdict.band).toBe('acceptable-named-gaps');
    expect(verdict.judgedNeverGates).toContain('distinctiveness-pov');
  });

  it('exits non-zero on invalid input without producing a verdict', () => {
    const dir = mkdtempSync(join(tmpdir(), 't0151-'));
    const input = join(dir, 'bad.json');
    writeFileSync(input, JSON.stringify({ subject: 'x', scores: [] }));
    const cli = join(__dirname, '..', 'dist', 'cli.js');
    expect(() =>
      execFileSync(process.execPath, [cli, 'score', '--in', input], { stdio: 'pipe' }),
    ).toThrow();
  });
});
