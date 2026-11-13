/**
 * Design Quality Rubric v1 contract (T0151, amendments Part 3).
 *
 * Twelve axes, each 1–5 with written anchors. Composite = 60. The judged axis
 * (Distinctiveness) is excluded from the 11-axis acceptance composite (max 55)
 * and never gates CI (tier rule). Bands are a review aid, not a certified grade.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const RUBRIC_AXES = [
  'hierarchy',
  'composition',
  'typography',
  'color-surface',
  'spacing-rhythm',
  'motion-interaction',
  'content-copy',
  'accessibility',
  'responsive-edge',
  'consistency-system',
  'distinctiveness-pov',
  'performance',
] as const;

export const RUBRIC_TIERS = ['deterministic', 'hybrid', 'judged'] as const;

/** Tier per axis (amendments Part 3 table). */
export const AXIS_TIERS: Record<(typeof RUBRIC_AXES)[number], (typeof RUBRIC_TIERS)[number]> = {
  hierarchy: 'hybrid',
  composition: 'hybrid',
  typography: 'hybrid',
  'color-surface': 'deterministic',
  'spacing-rhythm': 'deterministic',
  'motion-interaction': 'hybrid',
  'content-copy': 'hybrid',
  accessibility: 'deterministic',
  'responsive-edge': 'deterministic',
  'consistency-system': 'deterministic',
  'distinctiveness-pov': 'judged',
  performance: 'deterministic',
};

export const JUDGED_AXES = Object.entries(AXIS_TIERS)
  .filter(([, tier]) => tier === 'judged')
  .map(([axis]) => axis) as Array<(typeof RUBRIC_AXES)[number]>;

export const ScoreValue = z.number().int().min(1).max(5);

/** One axis score: value + the evidence that justifies it (repo-relative refs). */
export const AxisScore = z
  .object({
    axis: z.enum(RUBRIC_AXES),
    score: ScoreValue,
    /** How this score was produced: measured, critic-validated, or judged. */
    basis: z.enum(['measured', 'critic-validated', 'judged']),
    evidence: z.array(z.string().min(1)).min(1),
    anchorsNote: z.string().min(1),
  })
  .strict();

/** A complete scored section: all 12 axes exactly once. */
export const RubricScore = z
  .object({
    subject: z.string().min(1),
    scores: z.array(AxisScore).length(RUBRIC_AXES.length),
  })
  .strict()
  .refine((r) => new Set(r.scores.map((s) => s.axis)).size === RUBRIC_AXES.length, {
    message: 'each axis must be scored exactly once',
  })
  .refine(
    (r) =>
      r.scores.every((s) => {
        const tier = AXIS_TIERS[s.axis];
        if (tier === 'deterministic') return s.basis === 'measured';
        if (tier === 'judged') return s.basis === 'judged';
        return s.basis === 'measured' || s.basis === 'critic-validated';
      }),
    { message: 'axis basis must match its tier (deterministic=measured, judged=judged)' },
  );

export const SusRubricScore = defineSusSchema('sus.rubric-score', 1, RubricScore);

/** Scoring verdict produced by the CLI (@sus/eval-core). */
export const ScoringVerdict = z
  .object({
    subject: z.string().min(1),
    /** 12-axis composite, max 60 — reported for continuity, never gates. */
    composite: z.number().int().min(12).max(60),
    /** 11-axis acceptance composite (judged axis excluded), max 55. */
    acceptanceComposite: z.number().int().min(11).max(55),
    band: z.enum([
      'reference-grade',
      'strong-minor-cleanup',
      'acceptable-named-gaps',
      'rework-required',
    ]),
    /** Judged axes flagged: never gates CI (tier rule). */
    judgedNeverGates: z.array(z.enum(RUBRIC_AXES)),
    gatingDeterministic: z.array(z.enum(RUBRIC_AXES)),
  })
  .strict();

export const SusScoringVerdict = defineSusSchema('sus.scoring-verdict', 1, ScoringVerdict);

/** Inferred data types for consumers (zod schemas are values, not types). */
export type RubricScoreData = z.infer<typeof RubricScore>;
export type ScoringVerdictData = z.infer<typeof ScoringVerdict>;
export type AxisScoreData = z.infer<typeof AxisScore>;
