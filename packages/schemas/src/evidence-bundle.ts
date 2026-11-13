/**
 * Evidence bundle contract (T0154) — the unit of recorded verification for a
 * scored subject. Gate ownership: G11 (evidence completeness) — a bundle
 * missing shots, metrics, or gate verdicts is REJECTED, not downgraded.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const ViewportName = z.enum(['mobile', 'tablet', 'desktop']);
export const ThemeName = z.enum(['light', 'dark']);

export const CaptureShot = z
  .object({
    viewport: ViewportName,
    theme: ThemeName,
    /** Repo-relative path to the archived screenshot. */
    path: z.string().min(1),
  })
  .strict();

export const PageMetricsData = z
  .object({
    url: z.string().min(1),
    horizontalOverflow: z.boolean(),
    overflowingElements: z.array(z.string()),
    cls: z.number(),
    lcpMs: z.number().min(0),
    smallTapTargets: z.array(
      z.object({ selector: z.string(), width: z.number(), height: z.number() }).strict(),
    ),
    landmarks: z.array(z.string()),
    headings: z.array(z.object({ level: z.number().int(), text: z.string() }).strict()),
  })
  .strict();

export const GateResultData = z
  .object({
    gate: z.enum(['G4', 'G5', 'G11']),
    status: z.enum(['pass', 'fail']),
    detail: z.array(z.string()),
  })
  .strict();

/**
 * A complete bundle. Completeness (G11) is enforced in-schema: at least one
 * shot, one metrics record, and at least the recorded gate verdicts must be
 * present. A bundle missing any of the three is rejected outright.
 */
export const EvidenceBundle = z
  .object({
    subject: z.string().min(1),
    /** What produced the subject (e.g. 'no-skill baseline', 'sus-assisted'). */
    provenance: z.string().min(1),
    generatedAt: z.string().min(4),
    shots: z.array(CaptureShot).min(1),
    metrics: z.array(PageMetricsData).min(1),
    gates: z.array(GateResultData).min(1),
    /** Optional rubric scores (T0151 schema shape, loosely typed here). */
    rubricScores: z
      .array(
        z
          .object({
            axis: z.string().min(1),
            score: z.number().int().min(1).max(5),
            basis: z.enum(['measured', 'critic-validated', 'judged']),
            evidence: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .optional(),
    notes: z.array(z.string()).optional(),
  })
  .strict();

export const SusEvidenceBundle = defineSusSchema('sus.evidence-bundle', 1, EvidenceBundle);

export type EvidenceBundleData = z.infer<typeof EvidenceBundle>;
export type GateResult = z.infer<typeof GateResultData>;

/** G11: evidence completeness — the gate T0154 owns. */
export function evaluateG11(bundle: EvidenceBundleData): GateResult {
  const detail: string[] = [];
  let status: 'pass' | 'fail' = 'pass';
  if (bundle.shots.length === 0) {
    status = 'fail';
    detail.push('no archived shots — G11 requires screenshot evidence');
  }
  if (bundle.metrics.length === 0) {
    status = 'fail';
    detail.push('no metrics records — G11 requires DOM metric evidence');
  }
  const gating = bundle.gates.filter((g) => g.gate === 'G4' || g.gate === 'G5');
  if (gating.length === 0) {
    status = 'fail';
    detail.push('no G4/G5 gate verdicts recorded — G11 requires gate outcomes');
  }
  if (status === 'pass') {
    detail.push(
      `complete: ${bundle.shots.length} shot(s), ${bundle.metrics.length} metrics record(s), ${gating.length} gate verdict(s)`,
    );
  }
  return { gate: 'G11', status, detail };
}
