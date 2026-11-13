/**
 * Research evidence + provenance (T0301, DA-09).
 *
 * SUS knowledge claims carry provenance: a registered source, a verification
 * method, and a revisit trigger. Validation is OFFLINE (pure schema over
 * local records — network checks belong to the trend-review loop, T0310).
 * A fabricated citation fails validation: URLs must be well-formed, claims
 * must cite a source, and unverifiable sources cannot back strong claims.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const Source = z
  .object({
    url: z.string().url(),
    title: z.string().min(1),
    publisher: z.string().min(1),
    /** ISO date the source was published (best known). */
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    accessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export const VerificationMethod = z.enum([
  'read-full-source',
  'replicated-measurement',
  'secondary-report',
  'hearsay',
]);

export const Strength = z.enum(['fact', 'strong-claim', 'tentative', 'hypothesis']);

/** A claim's strength must be backed by its verification depth (honest mapping). */
export const ResearchClaim = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'claim id: lowercase-hyphen'),
    claim: z.string().min(1),
    strength: Strength,
    verification: VerificationMethod,
    source: Source,
    /** Trend-loop fields (T0310): first/last observation + revisit trigger. */
    firstObserved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    revisit: z.enum(['durable', 'volatile']),
    /** For volatile claims: months until a re-verification is required. */
    revisitMonths: z.number().int().min(1).max(60).optional(),
  })
  .strict()
  .refine(
    (c) =>
      // hearsay can only back hypotheses; strong claims need full reads or
      // replicated measurement (no fabricated citation passes)
      !(
        (c.strength === 'fact' || c.strength === 'strong-claim') &&
        (c.verification === 'hearsay' || c.verification === 'secondary-report')
      ),
    { message: 'fact/strong-claim requires read-full-source or replicated-measurement' },
  );

export const ResearchPlan = z
  .object({
    id: z.string().min(1),
    questions: z.array(z.string().min(1)).min(1),
    /** Max tokens/pages/minutes for this research pass (T0156 ties in). */
    budget: z
      .object({
        tokens: z.number().int().positive().optional(),
        sources: z.number().int().positive(),
      })
      .strict(),
    stopRule: z.string().min(1),
    revisitTrigger: z.string().min(1),
  })
  .strict();

export const ProvenanceCatalog = z
  .object({
    version: z.literal(1),
    claims: z.array(ResearchClaim),
    plans: z.array(ResearchPlan).optional(),
  })
  .strict();

export const SusProvenanceCatalog = defineSusSchema('sus.provenance-catalog', 1, ProvenanceCatalog);

export type SourceData = z.infer<typeof Source>;
export type ResearchClaimData = z.infer<typeof ResearchClaim>;
export type ResearchPlanData = z.infer<typeof ResearchPlan>;
export type ProvenanceCatalogData = z.infer<typeof ProvenanceCatalog>;
