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

  return { ok: violations.length === 0, violations, record };
}
