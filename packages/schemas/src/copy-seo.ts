/**
 * Copy/SEO + domain behavior contracts (T0406, DA-47).
 *
 * Claims register: every factual claim in shipped copy cites a provenance
 * claim id (T0301) — unregistered numeric claims are the fake-precision
 * scanner category. Domain behavior contracts separate NON-WAIVABLE
 * constraints (truthfulness, recoverable payment states, duplicate-submit
 * protection, auditability) from owner-taste decisions — the schema makes
 * the separation structural, not prose.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const ClaimsRegisterEntry = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    /** The copy-facing claim as it will appear. */
    claim: z.string().min(1),
    /** Provenance claim id backing it (evals/research/provenance-catalog.json). */
    provenanceId: z.string().regex(/^[a-z0-9-]+$/),
    placement: z.string().min(1),
  })
  .strict();

export const ClaimsRegister = z
  .object({
    version: z.literal(1),
    entries: z.array(ClaimsRegisterEntry),
  })
  .strict();

export const BehaviorKind = z.enum(['non-waivable', 'owner-taste']);

export const DomainBehavior = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    surface: z.enum(['commerce', 'operate', 'marketing', 'portfolio', 'any']),
    requirement: z.string().min(1),
    kind: BehaviorKind,
    /** Owner-taste behaviors name who decided (recorded decision). */
    decidedBy: z.string().optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.kind === 'owner-taste' && !b.decidedBy) {
      ctx.addIssue({
        code: 'custom',
        message: 'owner-taste behaviors must name the recorded decision (decidedBy)',
        path: ['decidedBy'],
      });
    }
  });

/** The DA-47 non-waivable floor (kind enforcement in schema). */
export const REQUIRED_COMMERCE_BEHAVIORS = [
  'commerce-truthfulness',
  'commerce-payment-recoverable',
  'commerce-duplicate-submit-protection',
];
export const REQUIRED_OPERATE_BEHAVIORS = [
  'operate-roles',
  'operate-bulk-action-clarity',
  'operate-auditability',
];

export const DomainBehaviorContract = z
  .object({
    version: z.literal(1),
    behaviors: z.array(DomainBehavior),
  })
  .strict()
  .superRefine((c, ctx) => {
    const ids = new Set(c.behaviors.map((b) => b.id));
    for (const req of REQUIRED_COMMERCE_BEHAVIORS) {
      if (!ids.has(req)) {
        ctx.addIssue({
          code: 'custom',
          message: `missing non-waivable commerce behavior: ${req}`,
          path: ['behaviors'],
        });
      }
    }
    for (const req of REQUIRED_OPERATE_BEHAVIORS) {
      if (!ids.has(req)) {
        ctx.addIssue({
          code: 'custom',
          message: `missing non-waivable operate behavior: ${req}`,
          path: ['behaviors'],
        });
      }
    }
    const waivables = c.behaviors.filter(
      (b) =>
        REQUIRED_COMMERCE_BEHAVIORS.includes(b.id) || REQUIRED_OPERATE_BEHAVIORS.includes(b.id),
    );
    for (const b of waivables) {
      if (b.kind !== 'non-waivable') {
        ctx.addIssue({
          code: 'custom',
          message: `${b.id} is non-waivable by policy but marked ${b.kind}`,
          path: ['behaviors'],
        });
      }
    }
  });

export const SusClaimsRegister = defineSusSchema('sus.claims-register', 1, ClaimsRegister);
export const SusDomainBehaviorContract = defineSusSchema(
  'sus.domain-behavior-contract',
  1,
  DomainBehaviorContract,
);
export type ClaimsRegisterEntryData = z.infer<typeof ClaimsRegisterEntry>;
export type DomainBehaviorData = z.infer<typeof DomainBehavior>;
