/**
 * T1022 — the Best Practice Proposal: what may be proposed, and what may not be applied.
 *
 * Issue #15 asks for a proposal with current behaviour, evidence, why it is suboptimal, remedy
 * and rationale, affected locations, expected UX outcome, risk, a diff and a test plan — and for
 * read-only defaults with per-hunk approval before anything is written.
 *
 * Two failure modes matter more than the shape of the record:
 *
 *  1. **Opinion wearing a measurement's clothes.** A recommendation that was not measured must not
 *     be ranked like a broken build. So an item is typed `fact` or `heuristic`: a `fact` must carry
 *     an observation and evidence, and a `heuristic` may not be P0/P1. Nothing is silently promoted.
 *  2. **Approval drifting off its content.** An approval granted for proposal A must not apply to a
 *     later, edited proposal. The proposal carries a digest of its own content and `authoriseApply`
 *     refuses a grant whose digest does not match — the same discipline the research loader applies
 *     to pinned bytes, for the same reason.
 *
 * This module never writes a file. Applying belongs to Studio's approval-gated path (T0707),
 * which already refuses to write without a live, content-bound grant and restores preimages byte
 * for byte; re-implementing that here would create the second engine issue #15 warns about.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { IsoTimestamp } from '@sus/schemas';
import type { FocusDimension, ScopeResolution } from '../audit/scope.js';
import { LAB_MEASUREMENT_NOTICE } from '../audit/contract.js';

/** Named so a consumer can refuse a proposal it does not understand. */
export const PROPOSAL_SCHEMA_VERSION = 'sus.bestpractice-proposal/1';

export const PROPOSAL_SEVERITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type ProposalSeverity = (typeof PROPOSAL_SEVERITIES)[number];

const Metric = z
  .object({
    value: z.union([z.number(), z.string()]),
    unit: z.string().min(1),
  })
  .strict();

const ProposalItem = z
  .object({
    id: z.string().min(8),
    dimension: z.enum(['responsive', 'a11y', 'motion', 'copy', 'performance', 'visual']),
    severity: z.enum(PROPOSAL_SEVERITIES),
    /** `fact` = measured; `heuristic` = judgment, and never ranked above P2. */
    kind: z.enum(['fact', 'heuristic']),
    title: z.string().min(1),
    location: z.string().min(1).nullable(),
    evidence: z.array(z.string()).default([]),
    observed: Metric.nullable(),
    expected: Metric.nullable(),
    /** Why the current state is suboptimal — the argument, not a restatement of the metric. */
    why: z.string().min(1),
    /** The remedy, and the reason this remedy rather than another. */
    remedy: z.string().min(1),
    rationale: z.string().min(1),
    /** What the user should notice after the change. */
    uxOutcome: z.string().min(1),
    /** What this change could break. */
    risk: z.string().min(1),
    testPlan: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.kind === 'fact') {
      if (item.observed === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'a fact must carry an observed measurement',
          path: ['observed'],
        });
      }
      if (item.evidence.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'a fact must cite evidence',
          path: ['evidence'],
        });
      }
    }
    if (item.kind === 'heuristic' && (item.severity === 'P0' || item.severity === 'P1')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'an unmeasured recommendation cannot be ranked P0/P1',
        path: ['severity'],
      });
    }
  });

export type ProposalItem = z.infer<typeof ProposalItem>;

const Untested = z
  .object({
    dimension: z.enum(['responsive', 'a11y', 'motion', 'copy', 'performance', 'visual']),
    reason: z.string().min(20),
  })
  .strict();

export const BestPracticeProposal = z
  .object({
    schemaVersion: z.literal(PROPOSAL_SCHEMA_VERSION),
    generatedAt: IsoTimestamp,
    scope: z
      .object({
        kind: z.enum(['selector', 'component-path', 'region', 'editor-selection']),
        value: z.string().min(1),
        outcome: z.literal('resolved'),
        targets: z.array(z.string().min(1)).min(1),
        componentKind: z.string().min(1),
      })
      .strict(),
    focus: z
      .object({
        run: z.array(z.string().min(1)),
        notApplicable: z.array(Untested),
      })
      .strict(),
    items: z.array(ProposalItem),
    /** Dimensions no conclusion rests on: either not applicable, or measured and left open. */
    untested: z.array(Untested),
    /** Digest of the content above; an approval is bound to it. Written, never trusted on read. */
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    approval: z
      .object({
        required: z.literal(true),
        mode: z.literal('per-hunk'),
        applyPath: z.literal('studio-apply'),
      })
      .strict(),
    provenance: z
      .object({
        evaluator: z.string().min(1),
        node: z.string().min(1),
        platform: z.string().min(1),
        commit: z.string().min(1).nullable(),
      })
      .strict(),
  })
  .strict();

export type BestPracticeProposal = z.infer<typeof BestPracticeProposal>;

/** Canonical JSON: sorted keys, so the digest cannot change with property order. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
}

export function digestOf(input: {
  scope: unknown;
  focus: unknown;
  items: readonly unknown[];
  untested: readonly unknown[];
}): string {
  return createHash('sha256')
    .update(
      canonicalJson({
        scope: input.scope,
        focus: input.focus,
        items: input.items,
        untested: input.untested,
      }),
    )
    .digest('hex');
}

export type ProposalRefusalReason =
  'scope-not-resolved' | 'no-items' | 'fact-without-observation' | 'heuristic-ranked-blocking';

export interface ProposalRefusal {
  readonly refused: true;
  readonly reason: ProposalRefusalReason;
  readonly detail: string;
}

/**
 * Build a proposal from a resolved scope and candidate items. Refuses instead of emitting a
 * proposal whose scope was never resolved: measuring something else is not a proposal.
 */
export function composeProposal(input: {
  scope: ScopeResolution;
  items: readonly ProposalItem[];
  untested?: readonly { dimension: FocusDimension; reason: string }[];
  generatedAt?: string;
  provenance?: { evaluator: string; node: string; platform: string; commit: string | null };
}): BestPracticeProposal | ProposalRefusal {
  const { scope } = input;
  if (scope.outcome !== 'resolved' || scope.targets.length === 0 || scope.focus === null) {
    return {
      refused: true,
      reason: 'scope-not-resolved',
      detail:
        'the scope outcome is ' +
        scope.outcome +
        '; a proposal needs exactly one resolved target' +
        (scope.clarification === null ? '' : ' (' + scope.clarification + ')'),
    };
  }
  const facts = input.items.filter((item) => item.kind === 'fact');
  const factMissing = facts.find((item) => item.observed === null || item.evidence.length === 0);
  if (factMissing !== undefined) {
    return {
      refused: true,
      reason: 'fact-without-observation',
      detail: itemLabel(factMissing) + ' is typed as a fact without an observation and evidence',
    };
  }
  const blockingHeuristic = input.items.find(
    (item) => item.kind === 'heuristic' && (item.severity === 'P0' || item.severity === 'P1'),
  );
  if (blockingHeuristic !== undefined) {
    return {
      refused: true,
      reason: 'heuristic-ranked-blocking',
      detail:
        itemLabel(blockingHeuristic) + ' is unmeasured but ranked ' + blockingHeuristic.severity,
    };
  }
  if (input.items.length === 0) {
    return {
      refused: true,
      reason: 'no-items',
      detail: 'nothing was proposed; an empty proposal is not an improvement',
    };
  }

  const focus = {
    run: [...scope.focus.run],
    notApplicable: scope.focus.notApplicable.map((entry) => ({
      dimension: entry.dimension,
      reason: entry.reason,
    })),
  };
  const untested = dedupeUntested([
    ...focus.notApplicable.map((entry) => ({ dimension: entry.dimension, reason: entry.reason })),
    ...(input.untested ?? []),
  ]);
  const scopeBlock = {
    kind: scope.reference.kind,
    value: scope.reference.value,
    outcome: 'resolved' as const,
    targets: scope.targets.map((target) => target.selector),
    componentKind: scope.focus.kind,
  };
  const items = sortItems(input.items);
  const digest = digestOf({ scope: scopeBlock, focus, items, untested });
  return {
    schemaVersion: PROPOSAL_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scope: scopeBlock,
    focus,
    items,
    untested,
    digest,
    approval: { required: true, mode: 'per-hunk', applyPath: 'studio-apply' },
    provenance: input.provenance ?? {
      evaluator: 'sus-eval bestpractice 1',
      node: process.version,
      platform: process.platform + '/' + process.arch,
      commit: null,
    },
  };
}

function dedupeUntested(
  entries: readonly { dimension: FocusDimension; reason: string }[],
): { dimension: FocusDimension; reason: string }[] {
  const seen = new Map<FocusDimension, string>();
  for (const entry of entries) {
    const existing = seen.get(entry.dimension);
    // Two reasons for the same dimension are both facts: "this is not applicable" and
    // "this part of it was measured and left open". Dropping either would hide why a
    // dimension carries no conclusion.
    seen.set(
      entry.dimension,
      existing === undefined || existing === entry.reason
        ? entry.reason
        : existing + ' · ' + entry.reason,
    );
  }
  return [...seen.entries()].map(([dimension, reason]) => ({ dimension, reason }));
}

/** Worst first; measured facts before heuristics at the same severity. */
function sortItems(items: readonly ProposalItem[]): ProposalItem[] {
  const rank = (s: ProposalSeverity) => PROPOSAL_SEVERITIES.indexOf(s);
  return [...items].sort(
    (a, b) =>
      rank(a.severity) - rank(b.severity) ||
      (a.kind === b.kind ? 0 : a.kind === 'fact' ? -1 : 1) ||
      a.dimension.localeCompare(b.dimension),
  );
}

/** Stable id for an item: the same defect keeps its identity across runs. */
export function proposalItemId(input: {
  dimension: string;
  location: string | null;
  title: string;
}): string {
  return createHash('sha256')
    .update(input.dimension + '|' + (input.location ?? '') + '|' + input.title)
    .digest('hex')
    .slice(0, 16);
}

function itemLabel(item: ProposalItem): string {
  return item.id + ' (' + item.dimension + ': ' + item.title + ')';
}

export type ApplyDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reason:
        'no-approval' | 'stale-digest' | 'unknown-hunk' | 'untested-dimension' | 'empty-approval';
      readonly detail: string;
    };

/**
 * Decide whether an approval may apply this proposal. Every refusal is a reason to stop, never a
 * warning: an approval that does not name the exact content it approved is not an approval.
 */
export function authoriseApply(
  proposal: BestPracticeProposal,
  grant: { readonly digest: string; readonly hunkIds: readonly string[] },
): ApplyDecision {
  if (grant.hunkIds.length === 0) {
    return {
      allowed: false,
      reason: 'empty-approval',
      detail: 'no hunk was approved; approving nothing applies nothing',
    };
  }
  if (grant.digest !== proposal.digest) {
    return {
      allowed: false,
      reason: 'stale-digest',
      detail:
        'the approval was granted for proposal ' +
        grant.digest.slice(0, 12) +
        ' but this proposal is ' +
        proposal.digest.slice(0, 12) +
        '; the content changed after approval',
    };
  }
  const ids = new Set(proposal.items.map((item) => item.id));
  const unknown = grant.hunkIds.filter((id) => !ids.has(id));
  if (unknown.length > 0) {
    return {
      allowed: false,
      reason: 'unknown-hunk',
      detail: 'approved hunk(s) not in this proposal: ' + unknown.join(', '),
    };
  }
  const untestedDimensions = new Set(proposal.untested.map((entry) => entry.dimension));
  const approvedItems = proposal.items.filter((item) => grant.hunkIds.includes(item.id));
  const onUntested = approvedItems.find((item) => untestedDimensions.has(item.dimension));
  if (onUntested !== undefined) {
    return {
      allowed: false,
      reason: 'untested-dimension',
      detail:
        'hunk ' +
        onUntested.id +
        ' changes a dimension that was never measured (' +
        onUntested.dimension +
        '), so the improvement could not be verified',
    };
  }
  return { allowed: true };
}

/** Escape a title for Markdown so page content cannot inject structure into a report. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[<>&`|*_[\]\\]/g, (char) => '\\' + char);
}

const SEVERITY_MEANING: Record<ProposalSeverity, string> = {
  P0: 'blocks the task or breaks accessibility',
  P1: 'degrades the task measurably',
  P2: 'friction worth fixing when nearby',
  P3: 'polish',
};

export function renderProposalMarkdown(proposal: BestPracticeProposal): string {
  const lines: string[] = [];
  lines.push('# Best practice proposal — ' + escapeMarkdown(proposal.scope.targets.join(', ')));
  lines.push('');
  lines.push(
    'Scope: `' +
      escapeMarkdown(proposal.scope.kind + ' ' + proposal.scope.value) +
      '` → ' +
      escapeMarkdown(proposal.scope.componentKind) +
      ' · proposal digest `' +
      proposal.digest.slice(0, 16) +
      '`',
  );
  lines.push('');
  lines.push(
    'Read-only by default: nothing is written until hunks are approved in Studio, and an approval ' +
      'is bound to the digest above.',
  );
  lines.push('');
  if (proposal.items.length === 0) {
    lines.push('No item met the bar for a proposal.');
  } else {
    lines.push('| severity | kind | dimension | what | location |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const item of proposal.items) {
      lines.push(
        '| ' +
          item.severity +
          ' | ' +
          item.kind +
          ' | ' +
          item.dimension +
          ' | ' +
          escapeMarkdown(item.title) +
          ' | ' +
          (item.location === null ? '—' : '`' + escapeMarkdown(item.location) + '`') +
          ' |',
      );
    }
    for (const item of proposal.items) {
      lines.push('');
      lines.push(
        '### ' + item.severity + ' · ' + escapeMarkdown(item.title) + ' (' + item.id + ')',
      );
      lines.push('');
      lines.push(
        '- **' + SEVERITY_MEANING[item.severity] + '** · ' + item.kind + ' · ' + item.dimension,
      );
      if (item.observed !== null || item.expected !== null) {
        lines.push(
          '- Observed: ' +
            (item.observed === null
              ? 'not measured'
              : escapeMarkdown(String(item.observed.value)) +
                ' ' +
                escapeMarkdown(item.observed.unit)) +
            ' · Expected: ' +
            (item.expected === null
              ? '—'
              : escapeMarkdown(String(item.expected.value)) +
                ' ' +
                escapeMarkdown(item.expected.unit)),
        );
      }
      if (item.dimension === 'performance') {
        // The number is a lab measurement; the proposal states that where the number is.
        lines.push('- Measurement basis: ' + escapeMarkdown(LAB_MEASUREMENT_NOTICE));
      }
      lines.push('- Why: ' + escapeMarkdown(item.why));
      lines.push('- Remedy: ' + escapeMarkdown(item.remedy));
      lines.push('- Rationale: ' + escapeMarkdown(item.rationale));
      lines.push('- Expected outcome: ' + escapeMarkdown(item.uxOutcome));
      lines.push('- Risk: ' + escapeMarkdown(item.risk));
      lines.push('- Test plan: ' + item.testPlan.map(escapeMarkdown).join('; '));
      if (item.evidence.length > 0) {
        lines.push('- Evidence: ' + item.evidence.map(escapeMarkdown).join(', '));
      }
    }
  }
  lines.push('');
  lines.push('## Not measured');
  if (proposal.untested.length === 0) {
    lines.push('Every dimension in scope was measured.');
  } else {
    for (const entry of proposal.untested) {
      lines.push('- **' + entry.dimension + '** — ' + escapeMarkdown(entry.reason));
    }
  }
  lines.push('');
  return lines.join('\n');
}
