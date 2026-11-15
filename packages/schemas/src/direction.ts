/**
 * T0400 — direction derivation record.
 *
 * The generic-AI failure this guards is not "no direction": it is three
 * directions that are the same idea restated, each described in adjectives
 * ("clean, modern, bold"), chosen because one sounded best, with no record of
 * what was *refused*. A record that cannot be read back a week later, or that
 * refuses nothing, is indistinguishable from no process at all.
 *
 * So the schema is deliberately opinionated:
 *  - exactly three candidates (the brief asks for three, no more no less);
 *  - each candidate must name the defaults it refuses, as **taxonomy ids**, so
 *    "we avoided slop" becomes a checkable claim rather than an assurance;
 *  - the chosen candidate must refuse at least one *blocking* default;
 *  - two candidates may not share a thesis — three near-identical options are
 *    one option with extra steps;
 *  - the record ends in anti-references: what this direction will not do.
 *
 * Validation is pure so the CLI (`scripts/check-direction.mjs`) and tests share
 * exactly one implementation of "a derivation is honest".
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';
import { TAXONOMY } from './slop-taxonomy.js';

const taxonomyIds = new Set(TAXONOMY.map((entry) => entry.id));
const blockingIds = new Set(
  TAXONOMY.filter((entry) => entry.severity === 'blocking').map((entry) => entry.id),
);

export const DirectionCandidate = z
  .object({
    id: z.enum(['c1', 'c2', 'c3']),
    /** One sentence: the claim this direction makes about the product. */
    thesis: z.string().min(12),
    /** How the thesis shows up in composition — not an adjective list. */
    composition: z.string().min(8),
    typeMove: z.string().min(4),
    palette: z.string().min(4),
    /** What this direction deliberately does NOT do. */
    antiReferences: z.array(z.string().min(4)).min(1),
    /** Anti-slop taxonomy ids this candidate refuses (must exist). */
    defaultsRefused: z.array(z.string()).min(1),
  })
  .strict();

/**
 * T0408 — the imagery plan is part of the direction record, not a later
 * afterthought. The failure this guards is the one that ships: a hero image with
 * no known licence, no focal point (so the crop eats the subject on mobile) and
 * no weight budget (so the LCP element is a 1.4 MB JPEG).
 *
 * Licensing is mandatory per asset and cannot be a bare boolean: a licence name
 * plus a proof reference is what makes it checkable later.
 */
export const ImageryAsset = z
  .object({
    id: z.string().min(2),
    role: z.enum(['hero', 'section', 'texture', 'illustration', 'icon', 'photograph']),
    source: z.enum([
      'commissioned',
      'stock',
      'generated',
      'own-photograph',
      'css-only',
      'svg-authored',
    ]),
    /** Who/what produced it — required for stock and generated assets. */
    provider: z.string().min(2).optional(),
    licence: z
      .object({
        name: z.string().min(2),
        /** The deal-breaker: a licence that forbids commercial use kills the asset. */
        permitsCommercial: z.literal(true),
        requiresAttribution: z.boolean(),
        attributionText: z.string().min(4).optional(),
        expiresAt: z.string().nullable().optional(),
        renewalOwner: z.string().min(2).optional(),
        /** Where the proof lives (contract ref, receipt, licence URL id). */
        proofRef: z.string().min(4),
      })
      .strict(),
    /** Focal point in normalised frame coordinates, 0..1 from the top-left. */
    focalPoint: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
    /**
     * What this asset is allowed to weigh, in bytes. Zero is legitimate only for
     * an asset that is drawn by the CSS engine and never transferred; any other
     * zero is an unset field pretending to be a decision.
     */
    budgetBytes: z.number().int().min(0),
  })
  .strict();

export const ImageryPlan = z
  .object({
    strategy: z.enum(['photography-led', 'illustration-led', 'type-only', 'product-ui', 'mixed']),
    /** Why this strategy serves this product — not "images make it pop". */
    rationale: z.string().min(20),
    assets: z.array(ImageryAsset),
    /** The ceiling for the whole surface, in bytes. */
    totalBudgetBytes: z.number().int().positive(),
    /** What renders when an asset fails, is blocked, or never arrives. */
    fallback: z.string().min(8),
  })
  .strict();

export const DirectionDerivation = z
  .object({
    briefId: z.string().min(1),
    surface: z.enum(['marketing', 'commerce', 'operate', 'portfolio', 'docs', 'any']),
    candidates: z.array(DirectionCandidate).length(3),
    decision: z
      .object({
        chosen: z.enum(['c1', 'c2', 'c3']),
        /** Why this one, in terms of the brief — not "it looked better". */
        why: z.string().min(20),
        /** Why the other two lost, one entry each — both required. */
        rejected: z
          .array(z.object({ id: z.enum(['c1', 'c2', 'c3']), reason: z.string().min(8) }).strict())
          .length(2),
      })
      .strict(),
    /** Project-level anti-references, carried into the playbook. */
    antiReferences: z.array(z.string().min(4)).min(1),
    /** T0408: asset strategy, licensing, focal points and weight budgets. */
    imagery: ImageryPlan,
  })
  .strict();

export const SusDirectionDerivation = defineSusSchema(
  'sus.direction-derivation',
  1,
  DirectionDerivation,
);

export type DirectionDerivationRecord = z.infer<typeof DirectionDerivation>;

export interface DerivationViolation {
  code: string;
  detail: string;
}

/**
 * Schema first, then the semantic obligations the schema cannot express.
 * Returns violations with stable codes so a test asserts the reason.
 */
export function checkDerivation(input: unknown): {
  ok: boolean;
  violations: DerivationViolation[];
  record: DirectionDerivationRecord | null;
} {
  const parsed = DirectionDerivation.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      record: null,
      violations: parsed.error.issues.map((issue) => ({
        code: `schema:${issue.path.join('.') || '(root)'}`,
        detail: issue.message,
      })),
    };
  }

  const record = parsed.data;
  const violations: DerivationViolation[] = [];

  for (const candidate of record.candidates) {
    for (const id of candidate.defaultsRefused) {
      if (!taxonomyIds.has(id)) {
        violations.push({
          code: 'unknown-default',
          detail: `${candidate.id} refuses "${id}", which is not in the anti-slop taxonomy`,
        });
      }
    }
  }

  const chosen = record.candidates.find((candidate) => candidate.id === record.decision.chosen)!;

  if (!chosen.defaultsRefused.some((id) => blockingIds.has(id))) {
    violations.push({
      code: 'chosen-refuses-nothing-blocking',
      detail: `${chosen.id} is chosen but refuses no blocking default — the choice is not defended`,
    });
  }

  const theses = record.candidates.map((candidate) => candidate.thesis.trim().toLowerCase());
  if (new Set(theses).size !== theses.length) {
    violations.push({
      code: 'duplicate-thesis',
      detail: 'two candidates share a thesis; three restatements are one option',
    });
  }

  const rejectedIds = record.decision.rejected.map((entry) => entry.id);
  const expectedRejected = record.candidates
    .map((candidate) => candidate.id)
    .filter((id) => id !== record.decision.chosen);
  for (const id of expectedRejected) {
    if (!rejectedIds.includes(id)) {
      violations.push({
        code: 'unexplained-rejection',
        detail: `${id} was not chosen and no reason is recorded`,
      });
    }
  }

  // The project anti-references must be about this direction, not a copy of a
  // candidate's: at least one must not appear verbatim in any candidate list.
  const candidateRefs = new Set(record.candidates.flatMap((candidate) => candidate.antiReferences));
  if (record.antiReferences.every((entry) => candidateRefs.has(entry))) {
    violations.push({
      code: 'anti-references-borrowed',
      detail:
        'every project anti-reference is copied from a candidate — nothing is refused at project level',
    });
  }

  const plan = record.imagery;

  // 1. Type-only surfaces may not smuggle assets in, and every other strategy
  //    that claims imagery needs at least one asset to be credible.
  if (plan.strategy === 'type-only' && plan.assets.length > 0) {
    violations.push({
      code: 'type-only-with-assets',
      detail: 'the plan claims a type-only strategy but ships assets — one of the two is untrue',
    });
  }
  if (plan.strategy !== 'type-only' && plan.assets.length === 0) {
    violations.push({
      code: 'strategy-without-assets',
      detail: `strategy "${plan.strategy}" names no assets, so it is a wish, not a plan`,
    });
  }

  const seen = new Set<string>();
  let allocated = 0;
  for (const asset of plan.assets) {
    if (seen.has(asset.id)) {
      violations.push({
        code: 'duplicate-asset-id',
        detail: `asset id "${asset.id}" appears twice — budgets would double-count`,
      });
    }
    seen.add(asset.id);
    allocated += asset.budgetBytes;

    // 2. Provenance that a licence record cannot be checked against is theatre.
    if ((asset.source === 'stock' || asset.source === 'generated') && !asset.provider) {
      violations.push({
        code: 'provider-unrecorded',
        detail: `${asset.id} is ${asset.source} but names no provider — the licence cannot be verified`,
      });
    }

    // 3. Attribution that is required but not written is a licence breach.
    if (asset.licence.requiresAttribution && !asset.licence.attributionText) {
      violations.push({
        code: 'attribution-text-missing',
        detail: `${asset.id} requires attribution but no attribution text is recorded`,
      });
    }

    // 4. An expiring licence needs an owner, or it silently lapses.
    if (asset.licence.expiresAt && !asset.licence.renewalOwner) {
      violations.push({
        code: 'expiry-without-owner',
        detail: `${asset.id} expires on ${asset.licence.expiresAt} but nobody owns the renewal`,
      });
    }

    // 5. Only CSS-drawn assets may weigh nothing.
    if (asset.budgetBytes === 0 && asset.source !== 'css-only') {
      violations.push({
        code: 'zero-budget-without-css',
        detail: `${asset.id} allows 0 bytes but is ${asset.source} — the budget was never set`,
      });
    }

    // 6. Per-asset budget can never exceed the surface ceiling.
    if (asset.budgetBytes > plan.totalBudgetBytes) {
      violations.push({
        code: 'asset-exceeds-total-budget',
        detail: `${asset.id} alone allows ${asset.budgetBytes} bytes, more than the whole surface (${plan.totalBudgetBytes})`,
      });
    }
  }

  // 7. The sum is what actually ships: over-allocating silently is how a page
  //    ends up 4 MB "because every image was within its own budget".
  if (allocated > plan.totalBudgetBytes) {
    violations.push({
      code: 'weight-budget-exceeded',
      detail: `assets allow ${allocated} bytes against a ${plan.totalBudgetBytes}-byte ceiling`,
    });
  }

  // 8. A focal point at the exact centre means nobody chose it.
  for (const asset of plan.assets) {
    if (asset.focalPoint.x === 0.5 && asset.focalPoint.y === 0.5 && asset.role === 'hero') {
      violations.push({
        code: 'focal-point-unchosen',
        detail: `${asset.id} is a hero with a centre focal point — the crop was not decided`,
      });
    }
  }

  return { ok: violations.length === 0, violations, record };
}
