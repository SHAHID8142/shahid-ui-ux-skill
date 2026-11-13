/**
 * Section brief + design contract (T0501, amendments 5A).
 *
 * A SectionBrief is the working agreement for ONE section: content
 * requirements, constraints, token-contract reference. The DesignContract
 * binds the whole page: token contract + direction thesis + section order.
 * Together they make the progressive workflow machine-checkable (T0502+).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const SectionBrief = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'section id: lowercase-hyphen'),
    surface: z.enum(['marketing', 'commerce', 'operate', 'portfolio']),
    component: z.string().min(1),
    /** What content this section MUST contain (no placeholders — G3). */
    contentRequirements: z.array(z.string().min(1)).min(1),
    /** Explicit constraints (tokens, a11y, brand, motion intent). */
    constraints: z.array(z.string().min(1)).default([]),
    /** Token contract this section styles through (G1). */
    tokensRef: z.string().min(1),
    /** Domain behaviors that apply (T0406 contract ids). */
    behaviorIds: z.array(z.string()).default([]),
    /** Acceptance rubric subject (T0151) for scoring this section. */
    rubricSubject: z.string().min(1),
  })
  .strict();

export const SectionOrder = z
  .object({
    pageId: z.string().min(1),
    /** Ordered section ids — N+1 may not start before N is accepted (G2). */
    sections: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const DesignContract = z
  .object({
    version: z.literal(1),
    pageId: z.string().min(1),
    /** Path to the canonical token contract (ADR-004). */
    tokensRef: z.string().min(1),
    /** Path to the direction thesis (T0400) once it exists. */
    directionRef: z.string().optional(),
    order: SectionOrder,
    briefs: z.array(SectionBrief).min(1),
  })
  .strict()
  .superRefine((c, ctx) => {
    const briefIds = new Set(c.briefs.map((b) => b.id));
    for (const s of c.order.sections) {
      if (!briefIds.has(s)) {
        ctx.addIssue({
          code: 'custom',
          message: `order references section "${s}" without a brief`,
          path: ['order'],
        });
      }
    }
    for (const b of c.briefs) {
      if (b.tokensRef !== c.tokensRef) {
        ctx.addIssue({
          code: 'custom',
          message: `brief ${b.id} styles through a different token contract than the page`,
          path: ['briefs'],
        });
      }
    }
  });

export const SusDesignContract = defineSusSchema('sus.design-contract', 1, DesignContract);
export type SectionBriefData = z.infer<typeof SectionBrief>;
export type DesignContractData = z.infer<typeof DesignContract>;
