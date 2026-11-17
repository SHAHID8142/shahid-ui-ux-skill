/**
 * Audit report contract (T1013, issue #13).
 *
 * The report is validated before it is written: a missing field is a hard
 * validation failure, never a silent default, so a consumer can trust that an
 * absent value was deliberately reported rather than quietly zeroed.
 *
 * Two invariants the schema enforces rather than documents:
 *  - a not-run check must carry a reason (silence is not a result);
 *  - a P0/P1 finding can never be a needs-review item (human judgment is never
 *    promoted to a measured blocking verdict).
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { IsoTimestamp } from '@sus/schemas';
import type { AuditCheckStatus, AuditEffort, AuditSeverity } from './contract.js';
import {
  AUDIT_CHECKS,
  AUDIT_SEVERITIES,
  AUDIT_SEVERITY_MEANING,
  LAB_MEASUREMENT_NOTICE,
} from './contract.js';

const CheckStatus = z.enum(['pass', 'fail', 'not-run']);
const Severity = z.enum(['P0', 'P1', 'P2', 'P3']);
const Effort = z.enum(['quick-win', 'structural']);

/** One executed (or deliberately skipped) check. */
export const AuditCheckResult = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    gate: z.string().min(1).nullable(),
    status: CheckStatus,
    /** Why the check did not run, or what was measured. Required when not-run. */
    reason: z.string().min(1).optional(),
    detail: z.array(z.string().min(1)),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === 'not-run' && value.reason === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'a not-run check must state a reason: a missing measurement is not a result',
      });
    }
  });

export type AuditCheckResult = z.infer<typeof AuditCheckResult>;

/** A measured value with the unit it is expressed in: a bare number is not evidence. */
export const MetricValue = z
  .object({
    value: z.union([z.number(), z.string()]),
    unit: z.string().min(1),
  })
  .strict();

export type MetricValue = z.infer<typeof MetricValue>;

/**
 * The machine-readable evidence behind one finding (issue #13 section 4).
 *
 * Every key is required, so a consumer can tell 'deliberately reported as unknown'
 * (null) from 'nobody recorded it' (a shape that cannot be produced at all). An
 * artefact path and its sha256 must appear together or not at all: a hash without a
 * file points at nothing, and a file without a hash cannot be checked later.
 *
 * `confidence` separates an instrument reading from a heuristic inference. The
 * anti-slop rules are pattern matches, not measurements, and saying so is the
 * difference between evidence and an opinion. `unjudged` is reserved for items only
 * a human can decide, and those can never carry a confirmed verdict.
 *
 * Environment and run provenance stay at report level (`report.provenance`) on
 * purpose: one run has one environment, and a per-finding copy could disagree.
 */
export const AuditObservation = z
  .object({
    /** Which evaluator produced the verdict, e.g. evaluateG5 or checkSeo. */
    evaluator: z.string().min(1),
    /** The requirement the finding violates; null only when the rule is boolean. */
    expected: MetricValue.nullable(),
    /** What was measured; null when the rule is boolean or nothing numeric applies. */
    observed: MetricValue.nullable(),
    /** Selector in the rendered page, or file:line in source. Never invented. */
    location: z.string().min(1).nullable(),
    /** Recorded artefact this finding points at, relative to the report directory. */
    artifact: z.string().min(1).nullable(),
    /** sha256 of the artefact; present only together with the artefact path. */
    artifactHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/, 'expected a sha256 hex digest')
      .nullable(),
    confidence: z.enum(['measured', 'inferred', 'unjudged']),
    verdict: z.enum(['confirmed', 'unconfirmed']),
    remediation: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.artifact !== null && value.artifactHash === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['artifactHash'],
        message:
          'a recorded artefact must carry its sha256: an unhashed artefact cannot be checked',
      });
    }
    if (value.artifact === null && value.artifactHash !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['artifact'],
        message: 'an artefact hash without an artefact path points at nothing',
      });
    }
    if (value.confidence === 'measured' && value.expected !== null && value.observed === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['observed'],
        message: 'a measured finding against a threshold must report what was observed',
      });
    }
    if (value.confidence === 'unjudged' && value.verdict === 'confirmed') {
      ctx.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'an unjudged item cannot carry a confirmed verdict: only a human can confirm it',
      });
    }
    if (value.confidence === 'measured' && value.verdict === 'unconfirmed') {
      ctx.addIssue({
        code: 'custom',
        path: ['verdict'],
        message:
          'a measured observation cannot be unconfirmed: the measurement is the confirmation',
      });
    }
  });

export type AuditObservation = z.infer<typeof AuditObservation>;

/** A measured quality finding, ordered P0 to P3. */
export const AuditFinding = z
  .object({
    /** Stable id: same target, route, viewport and rule produce the same id. */
    id: z.string().regex(/^[0-9a-f]{12}$/, 'expected a 12-character hex id'),
    severity: Severity,
    effort: Effort,
    /** Check id the finding came from, so a reader can trace it. */
    check: z.string().min(1),
    route: z.string().min(1).nullable(),
    viewport: z.string().min(1).nullable(),
    title: z.string().min(1),
    detail: z.string().min(1),
    /** Pointers into the record set, e.g. a gate id or a source location. */
    evidence: z.array(z.string().min(1)),
    /** The measured evidence behind this finding (expected, observed, artefact). */
    observation: AuditObservation,
    /** True when a human must judge it; such items never auto-pass. */
    needsReview: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.needsReview && (value.severity === 'P0' || value.severity === 'P1')) {
      ctx.addIssue({
        code: 'custom',
        path: ['severity'],
        message: 'a P0/P1 finding must be measured: human-judgment items cannot block as P0/P1',
      });
    }
    const blocking = value.severity === 'P0' || value.severity === 'P1';
    if (blocking && value.observation.confidence !== 'measured') {
      ctx.addIssue({
        code: 'custom',
        path: ['observation', 'confidence'],
        message: 'a P0/P1 finding needs a measured observation: a heuristic cannot block a release',
      });
    }
    if (value.needsReview && value.observation.confidence !== 'unjudged') {
      ctx.addIssue({
        code: 'custom',
        path: ['observation', 'confidence'],
        message: 'a needs-review finding must say the item is unjudged',
      });
    }
  });

export type AuditFinding = z.infer<typeof AuditFinding>;

/** Counts, derived and then verified against the findings list. */
export const AuditSummary = z
  .object({
    P0: z.number().int().min(0),
    P1: z.number().int().min(0),
    P2: z.number().int().min(0),
    P3: z.number().int().min(0),
    quickWins: z.number().int().min(0),
    structural: z.number().int().min(0),
    needsReview: z.number().int().min(0),
    incomplete: z.boolean(),
  })
  .strict();

export type AuditSummary = z.infer<typeof AuditSummary>;

export const AuditTarget = z
  .object({
    kind: z.enum(['local-path', 'authorized-url']),
    /** Path, when the target was a directory. */
    path: z.string().min(1).nullable(),
    /** Base URL, when the target was or included a served origin. */
    url: z.string().min(1).nullable(),
    routes: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type AuditTarget = z.infer<typeof AuditTarget>;

export const AuditReport = z
  .object({
    schemaVersion: z.literal(1),
    command: z.literal('sus-eval audit'),
    generatedAt: IsoTimestamp,
    mode: z.enum(['quick', 'deep']),
    target: AuditTarget,
    /** Viewport names from the fixed contract. */
    viewports: z.array(z.string().min(1)).min(1),
    checks: z.array(AuditCheckResult),
    /** Sorted P0 to P3 then check, route, viewport, id: reproducible ordering. */
    findings: z.array(AuditFinding),
    summary: AuditSummary,
    /** Items only a human can judge; always listed, never silent. */
    needsReview: z.array(z.string().min(1)),
    provenance: z
      .object({
        evaluator: z.string().min(1),
        node: z.string().min(1),
        platform: z.string().min(1),
        /** Browser build reported by Playwright, or null when no browser ran. */
        browser: z.string().min(1).nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const expected = summariseFindings(value.findings, value.checks, value.mode);
    const keys = ['P0', 'P1', 'P2', 'P3', 'quickWins', 'structural', 'needsReview'] as const;
    for (const key of keys) {
      if (value.summary[key] !== expected[key]) {
        ctx.addIssue({
          code: 'custom',
          path: ['summary', key],
          message: 'summary.' + key + ' disagrees with the findings list (' + expected[key] + ')',
        });
      }
    }
    if (value.summary.incomplete !== expected.incomplete) {
      ctx.addIssue({
        code: 'custom',
        path: ['summary', 'incomplete'],
        message: 'summary.incomplete disagrees with the required-check status',
      });
    }
    const sorted = sortFindings(value.findings);
    const sameOrder = sorted.every((f, i) => f.id === value.findings[i]?.id);
    if (!sameOrder) {
      ctx.addIssue({
        code: 'custom',
        path: ['findings'],
        message: 'findings must be sorted P0 to P3 with stable tie-breaking',
      });
    }
  });

export type AuditReport = z.infer<typeof AuditReport>;

/** Deterministic id for a finding: same inputs, same id, across runs and machines. */
export function stableFindingId(input: {
  readonly check: string;
  readonly route: string | null;
  readonly viewport: string | null;
  readonly title: string;
  /**
   * The element the finding is about. Two tap targets with the same title are two
   * findings, not one: without the location in the id the second collapses into the
   * first and its evidence disappears (found while building a scoped proposal, T1023).
   */
  readonly location?: string | null;
}): string {
  const material = [
    input.check,
    input.route ?? '-',
    input.viewport ?? '-',
    input.title,
    input.location ?? '-',
  ].join('|');
  return createHash('sha256').update(material).digest('hex').slice(0, 12);
}

const SEVERITY_RANK: Readonly<Record<AuditSeverity, number>> = { P0: 0, P1: 1, P2: 2, P3: 3 };

/** Stable ordering: severity, then check, route, viewport, id. */
export function sortFindings(findings: readonly AuditFinding[]): AuditFinding[] {
  return [...findings].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    const byCheck = a.check.localeCompare(b.check);
    if (byCheck !== 0) return byCheck;
    const byRoute = (a.route ?? '').localeCompare(b.route ?? '');
    if (byRoute !== 0) return byRoute;
    const byViewport = (a.viewport ?? '').localeCompare(b.viewport ?? '');
    if (byViewport !== 0) return byViewport;
    return a.id.localeCompare(b.id);
  });
}

/** Derive the summary from the findings and checks. Single source of truth. */
/**
 * True when a not-run check leaves the requested mode incomplete. A check that is
 * optional, or not part of this mode, may be not-run without making the report
 * incomplete; an unknown check id fails closed and counts as required.
 */
export function requiredIn(checkId: string, mode: string): boolean {
  const descriptor = AUDIT_CHECKS.find((c) => c.id === checkId);
  if (descriptor === undefined) return true;
  if (!descriptor.required) return false;
  return descriptor.modes.includes(mode as never);
}

export function summariseFindings(
  findings: readonly AuditFinding[],
  checks: readonly AuditCheckResult[],
  mode: string,
): AuditSummary {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const entry of findings) counts[entry.severity] += 1;
  return {
    ...counts,
    quickWins: findings.filter((f) => f.effort === 'quick-win').length,
    structural: findings.filter((f) => f.effort === 'structural').length,
    needsReview: findings.filter((f) => f.needsReview).length,
    incomplete: checks.some((c) => c.status === 'not-run' && requiredIn(c.id, mode)),
  };
}

/**
 * Exit code from the report: 3 (incomplete) wins over 1 (blocking findings),
 * because an unrun required check must never be mistaken for a clean run.
 */
export function exitCodeFor(report: AuditReport): 0 | 1 | 3 {
  const blocking = report.findings.some((f) => f.severity === 'P0' || f.severity === 'P1');
  const failed = report.checks.some((c) => c.status === 'fail');
  if (report.summary.incomplete) return 3;
  if (blocking || failed) return 1;
  return 0;
}

/** Human-judgment items the audit will never score as a pass. */
export const NEEDS_REVIEW_ITEMS: readonly string[] = [
  'blind human A/B rating of the design against a reference',
  'a real screen-reader session (VoiceOver, NVDA, TalkBack)',
  'browser zoom at 200 percent text and 400 percent page zoom',
  'real translations and right-to-left layout',
  'content volume beyond the fixtures (long names, many rows, no results)',
  'host support beyond the recorded smoke evidence in docs/SUPPORT_MATRIX.md',
];

/** Narrow helpers so callers never hand-build a report shape. */
export function checkResult(
  id: string,
  title: string,
  gate: string | null,
  status: AuditCheckStatus,
  detail: readonly string[],
  reason?: string,
): AuditCheckResult {
  return reason === undefined
    ? { id, title, gate, status, detail: [...detail] }
    : { id, title, gate, status, detail: [...detail], reason };
}

/**
 * Build a finding. `evaluator` and `remediation` are required on purpose: a finding
 * that cannot say which evaluator produced it or what to do about it is not
 * actionable, and the type system should refuse it rather than the reviewer.
 */
export function finding(input: {
  readonly check: string;
  readonly severity: AuditSeverity;
  readonly effort: AuditEffort;
  readonly title: string;
  readonly detail: string;
  readonly route?: string | null;
  readonly viewport?: string | null;
  readonly evidence?: readonly string[];
  readonly needsReview?: boolean;
  readonly evaluator: string;
  readonly remediation: string;
  readonly expected?: MetricValue | null;
  readonly observed?: MetricValue | null;
  readonly location?: string | null;
  readonly artifact?: string | null;
  readonly artifactHash?: string | null;
  readonly confidence?: 'measured' | 'inferred' | 'unjudged';
  readonly verdict?: 'confirmed' | 'unconfirmed';
}): AuditFinding {
  const route = input.route ?? null;
  const viewport = input.viewport ?? null;
  const confidence = input.confidence ?? 'measured';
  return {
    id: stableFindingId({
      check: input.check,
      route,
      viewport,
      title: input.title,
      location: input.location ?? null,
    }),
    severity: input.severity,
    effort: input.effort,
    check: input.check,
    route,
    viewport,
    title: input.title,
    detail: input.detail,
    evidence: [...(input.evidence ?? [])],
    observation: {
      evaluator: input.evaluator,
      expected: input.expected ?? null,
      observed: input.observed ?? null,
      location: input.location ?? null,
      artifact: input.artifact ?? null,
      artifactHash: input.artifactHash ?? null,
      confidence,
      verdict: input.verdict ?? (confidence === 'unjudged' ? 'unconfirmed' : 'confirmed'),
      remediation: input.remediation,
    },
    needsReview: input.needsReview ?? false,
  };
}

/** Markdown rendering of the report. Same data, no extra claims. */
/** Does this report contain a performance number at all? Then it needs the lab-vs-field notice. */
function reportsPerformance(report: AuditReport): boolean {
  return (
    report.findings.some((finding) => finding.check === 'lighthouse-budgets') ||
    report.checks.some((check) => check.id === 'lighthouse-budgets')
  );
}

export function renderAuditMarkdown(report: AuditReport): string {
  const checkRows = report.checks.map(
    (c) =>
      '| `' +
      c.id +
      '` | ' +
      (c.gate === null ? '-' : c.gate) +
      ' | ' +
      c.status +
      ' | ' +
      (c.reason ?? c.detail[0] ?? '') +
      ' |',
  );
  const findingRows =
    report.findings.length === 0
      ? ['| - | - | - | - | - | - |']
      : report.findings.map(
          (f) =>
            '| ' +
            f.severity +
            ' | `' +
            f.id +
            '` | ' +
            f.title +
            ' | ' +
            f.observation.confidence +
            ' | ' +
            f.effort +
            ' | ' +
            (f.route ?? '-') +
            ' | ' +
            (f.viewport ?? '-') +
            ' |',
        );
  const detailBlocks =
    report.findings.length === 0
      ? ['No finding: nothing to remediate in this run.']
      : report.findings.flatMap((f) => {
          const o = f.observation;
          const span = (m: MetricValue | null): string =>
            m === null ? 'not numeric' : String(m.value) + ' ' + m.unit;
          return [
            '### ' + f.severity + ' ' + f.title + ' (`' + f.id + '`)',
            '',
            '- check: `' + f.check + '` - evaluator: `' + o.evaluator + '`',
            '- expected: ' + span(o.expected) + ' - observed: ' + span(o.observed),
            '- location: ' +
              (o.location ?? 'not localised') +
              ' - confidence: ' +
              o.confidence +
              ' (' +
              o.verdict +
              ')',
            '- artefact: ' +
              (o.artifact === null
                ? 'none recorded'
                : o.artifact + ' (sha256 ' + (o.artifactHash ?? '') + ')'),
            '- why: ' + f.detail,
            '- fix: ' + o.remediation,
            '',
          ];
        });

  const targetLabel = report.target.path ?? report.target.url ?? '(none)';
  const severityRows = AUDIT_SEVERITIES.map(
    (severity) =>
      '| ' +
      severity +
      ' | ' +
      report.summary[severity] +
      ' | ' +
      AUDIT_SEVERITY_MEANING[severity] +
      ' |',
  );
  return [
    '# Audit report: ' + targetLabel,
    '',
    'Mode: `' + report.mode + '` - generated ' + report.generatedAt,
    'Routes: ' + report.target.routes.join(', ') + ' - viewports: ' + report.viewports.join(', '),
    '',
    '## Summary',
    '',
    report.summary.incomplete
      ? '> At least one required check did not run. This report is incomplete and must not be read as a pass.'
      : '> Every required check produced a result.',
    '',
    '| severity | count | meaning |',
    '| --- | --- | --- |',
    ...severityRows,
    '',
    ...(reportsPerformance(report)
      ? ['> Performance numbers are a **' + LAB_MEASUREMENT_NOTICE + '**.', '']
      : []),
    'Quick wins: ' +
      report.summary.quickWins +
      ' - structural: ' +
      report.summary.structural +
      ' - needs review: ' +
      report.summary.needsReview,
    '',
    '## Checks',
    '',
    '| id | gate | status | detail |',
    '| --- | --- | --- | --- |',
    ...checkRows,
    '',
    '## Findings',
    '',
    '| severity | id | title | confidence | effort | route | viewport |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...findingRows,
    '',
    '## Findings in detail',
    '',
    ...detailBlocks,
    '',
    '## Needs review (never auto-passed)',
    '',
    ...report.needsReview.map((item) => '- ' + item),
    '',
    '## Remediation',
    '',
    'A proposed fix is written to a plan file and requires explicit approval before it is',
    'applied. The audit itself never edits the target and never applies a fix.',
    '',
  ].join(String.fromCharCode(10));
}
