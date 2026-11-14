/**
 * Visual Intent Schema v1 (T0705, amendments §7.3) — constraints, not pixels.
 *
 * Drawn annotations compile into this; pixel coordinates never reach source.
 * An ambiguous target NEVER guesses: it produces unknowns[] + focused
 * clarification questions (acc).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const RELATIONSHIPS = ['above', 'below', 'between', 'inside', 'instead-of'] as const;
export const ALIGNMENTS = ['start', 'center', 'end', 'baseline'] as const;
export const REFLOW_MODES = ['stack', 'inline', 'hide-below', 'reorder'] as const;

export const Target = z
  .object({
    selector: z.string().min(1),
    susId: z.string().nullable(),
    /** >= 0.6 required for an unambiguous target; below → clarification. */
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const Constraint = z
  .object({
    kind: z.enum(['relationship', 'order', 'alignment', 'max-measure', 'reflow', 'content']),
    /** Kind-specific payload in a small closed vocabulary. */
    relationship: z.enum(RELATIONSHIPS).optional(),
    alignment: z.enum(ALIGNMENTS).optional(),
    orderIndex: z.number().int().min(0).optional(),
    maxMeasureCh: z.number().int().min(10).max(120).optional(),
    reflow: z.enum(REFLOW_MODES).optional(),
    text: z.string().max(500).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    const needs = {
      relationship: c.relationship,
      order: c.orderIndex,
      alignment: c.alignment,
      'max-measure': c.maxMeasureCh,
      reflow: c.reflow,
      content: c.text,
    } as Record<string, unknown>;
    if (needs[c.kind] === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `constraint kind "${c.kind}" requires its payload field`,
        path: [c.kind],
      });
    }
  });

export const VisualIntent = z
  .object({
    id: z.string().min(1),
    /** The annotation(s) this intent was compiled from. */
    fromAnnotationIds: z.array(z.string()).min(1),
    target: Target,
    relationship: z.enum(RELATIONSHIPS).optional(),
    orderIndex: z.number().int().min(0).optional(),
    alignment: z.enum(ALIGNMENTS).optional(),
    maxMeasure: z.number().int().min(10).max(120).optional(),
    priority: z.enum(['must', 'should', 'could']).default('should'),
    reflow: z.enum(REFLOW_MODES).optional(),
    userText: z.string().max(500),
    constraints: z.array(Constraint),
    /** Honest ambiguity: focused clarification questions, never guesses. */
    unknowns: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.target.confidence < 0.6 && v.unknowns.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'ambiguous target (confidence < 0.6) requires focused unknowns[] — not a guess',
        path: ['unknowns'],
      });
    }
    // An intent either expresses constraints OR records unknowns — a
    // no-constraint, no-unknowns intent would be a silent guess.
    const hasConstraint =
      v.relationship !== undefined ||
      v.orderIndex !== undefined ||
      v.alignment !== undefined ||
      v.maxMeasure !== undefined ||
      v.reflow !== undefined ||
      v.constraints.length > 0;
    if (!hasConstraint && v.unknowns.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'an intent must express constraints or record unknowns (never neither)',
        path: ['unknowns'],
      });
    }
  });

export const SusVisualIntent = defineSusSchema('sus.visual-intent', 1, VisualIntent);
export type TargetData = z.infer<typeof Target>;
export type ConstraintData = z.infer<typeof Constraint>;
export type VisualIntentData = z.infer<typeof VisualIntent>;
