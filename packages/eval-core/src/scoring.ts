/**
 * Rubric scoring (T0151, amendments Part 3).
 *
 * Composite /60 (12 axes, continuity only) and acceptance composite /55
 * (judged axis excluded). Bands: 46–55 reference-grade · 39–45 strong ·
 * 30–38 acceptable with named gaps · <30 rework. The judged axis is flagged
 * never-gates-CI; deterministic axes are the CI-gating set. A composite can
 * never compensate for a failed blocking gate — gates are checked separately.
 */
import {
  AXIS_TIERS,
  JUDGED_AXES,
  RUBRIC_AXES,
  RubricScore,
  type RubricScoreData,
  type ScoringVerdictData,
} from '@sus/schemas';

export function scoreSection(input: RubricScoreData): ScoringVerdictData {
  const parsed = RubricScore.safeParse(input);
  if (!parsed.success) {
    throw new Error(`invalid rubric score: ${parsed.error.issues.map(String).join('; ')}`);
  }
  const scores = new Map(parsed.data.scores.map((s) => [s.axis, s.score]));
  const composite = [...scores.values()].reduce((a, b) => a + b, 0);
  const acceptanceComposite = RUBRIC_AXES.filter((a) => AXIS_TIERS[a] !== 'judged').reduce(
    (sum, a) => sum + (scores.get(a) ?? 0),
    0,
  );
  const band =
    acceptanceComposite >= 46
      ? 'reference-grade'
      : acceptanceComposite >= 39
        ? 'strong-minor-cleanup'
        : acceptanceComposite >= 30
          ? 'acceptable-named-gaps'
          : 'rework-required';

  return {
    subject: parsed.data.subject,
    composite,
    acceptanceComposite,
    band,
    judgedNeverGates: [...JUDGED_AXES],
    gatingDeterministic: RUBRIC_AXES.filter((a) => AXIS_TIERS[a] === 'deterministic'),
  };
}
