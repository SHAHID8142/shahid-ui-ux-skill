/**
 * T0790 — the verification loop (apply → build → axe → shots → motion → gates).
 *
 * A studio that applies an edit and then says "something went wrong" has failed
 * the user twice. This loop exists so a failure is always *answerable*:
 *
 *  - the outcome is one of five distinct states, never a generic error —
 *    `accepted`, `preview-failed`, `apply-failed`, `verification-failed`,
 *    `rollback-blocked` — because "the preview failed" and "the change was
 *    applied and the build rejected it" demand different user actions;
 *  - a failing gate reports a concise explanation, the affected operation, a
 *    safe recovery and whether a retry is possible;
 *  - diagnostics are redacted before they are shown (they are copied into tickets
 *    and screenshots, so they must not carry credentials or personal data);
 *  - **auto-revert happens only when the transaction is intact** (DA-36). If the
 *    tree has diverged, reverting would destroy the user's work, so the loop
 *    stops and says `rollback-blocked` with the manual steps instead.
 *
 * The loop is pure orchestration: stages are injected, so the same code runs the
 * real typecheck/axe/Lighthouse gates in production and deterministic fakes in
 * tests.
 */

export type StageName = 'apply' | 'build' | 'axe' | 'shots' | 'motion' | 'gate-summary';

export type LoopOutcome =
  'accepted' | 'preview-failed' | 'apply-failed' | 'verification-failed' | 'rollback-blocked';

export type StageStatus = 'pass' | 'fail' | 'skip';

export interface StageResult {
  stage: StageName;
  status: StageStatus;
  /** One line a person can act on. Never a stack trace. */
  summary: string;
  /** Raw output, redacted before it is stored on the report. */
  detail?: string;
  /** A hard gate blocks acceptance; a soft gate is reported but does not revert. */
  hard: boolean;
}

export interface Stage {
  name: Exclude<StageName, 'gate-summary'>;
  hard: boolean;
  run: () => StageResult | Promise<StageResult>;
}

export interface RetryHint {
  possible: boolean;
  hint: string;
}

export interface FailureExplanation {
  stage: StageName;
  /** Concise: what failed, in the user's terms. */
  explanation: string;
  /** Which operation was affected (file / intent / operation id). */
  affectedOperation: string;
  /** Ordered, concrete steps. Empty is a bug, not an option. */
  recovery: string[];
  retry: RetryHint;
}

export interface VerificationReport {
  outcome: LoopOutcome;
  operationId: string;
  stages: StageResult[];
  failure: FailureExplanation | null;
  /** True only when a revert actually ran and succeeded. */
  reverted: boolean;
  /** Redacted diagnostics, safe to copy into a ticket. */
  diagnostics: string;
  startedAt: string;
  finishedAt: string;
}

export interface VerificationLoopOptions {
  operationId: string;
  /** The operation under test, named for the explanation ("app/page.tsx"). */
  affectedOperation: string;
  /** Runs the stages in order; may throw (that is a stage failure, not a crash). */
  stages: Stage[];
  /** Reverts the applied transaction. Must be transaction-specific (T0707/DA-35). */
  revert: () => { ok: boolean; conflicts: string[] };
  /**
   * Whether the transaction can still be reverted safely (DA-36): no user edits
   * landed after the apply, no files vanished, no partial write.
   */
  transactionIntact: () => boolean;
  /** Preview failure path: supplied when the loop is entered before applying. */
  previewError?: { explanation: string; recovery: string[] };
  /** Redaction applied to every piece of diagnostic text. */
  redact?: (text: string) => string;
  now?: () => string;
}

/**
 * Default redaction for diagnostics. Deliberately conservative: it masks what is
 * commonly personal or credential-bearing, and leaves code and file paths that
 * the user needs in order to act.
 */
export function redactDiagnostics(text: string): string {
  return (
    text
      // absolute home directories → ~ (a path with a username in it)
      .replace(/\/(?:Users|home)\/[^/\s]+/g, '~')
      .replace(/[A-Za-z]:\\Users\\[^\\\s]+/g, '%USERPROFILE%')
      // bearer tokens and API keys
      .replace(/\b(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, '$1[redacted]')
      // sk_live_…, pk_test_…, rk_… — optional environment segment included
      .replace(/\b(?:sk|pk|rk)_(?:live|test)?_?[A-Za-z0-9]{6,}\b/g, '[redacted-key]')
      .replace(/\bghp_[A-Za-z0-9]{10,}\b/g, '[redacted-token]')
      // emails
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[redacted-email]')
      // long hex digests are noise in a user-facing explanation, but keep short ones
      .replace(/\b[0-9a-f]{32,}\b/gi, '[digest]')
  );
}

const RECOVERY: Record<StageName, string[]> = {
  apply: [
    'Nothing was written: the approval and the plan did not describe the same change.',
    'Re-open the preview and approve the diff you actually saw.',
  ],
  build: [
    'The change was reverted, so the project is back to its previous state.',
    'Fix the reported type or build error, then re-run the preview.',
  ],
  axe: [
    'The change was reverted because it introduced an accessibility failure.',
    'Fix the element the report names (label, contrast or landmark) and retry.',
  ],
  shots: [
    'The change was reverted because a viewport shot could not be captured.',
    'Check that the preview server is running and the route still renders.',
  ],
  motion: [
    'The change was reverted because it violated the motion policy.',
    'Respect prefers-reduced-motion or remove the offending transition, then retry.',
  ],
  'gate-summary': [
    'The change was reverted because a required gate did not pass.',
    'Run the failing gate locally, fix it, then re-run the preview.',
  ],
};

function stageLabel(stage: StageName): string {
  switch (stage) {
    case 'apply':
      return 'applying the change';
    case 'build':
      return 'building the project';
    case 'axe':
      return 'checking accessibility';
    case 'shots':
      return 'capturing viewports';
    case 'motion':
      return 'checking motion';
    case 'gate-summary':
      return 'the gate summary';
  }
}

/**
 * Runs the loop once. Order is the safety order: a failing hard gate stops the
 * run, and the revert decision is made from *transaction integrity*, not from
 * how far the stages got.
 */
export async function runVerificationLoop(
  options: VerificationLoopOptions,
): Promise<VerificationReport> {
  const now = options.now ?? (() => new Date().toISOString());
  const redact = options.redact ?? redactDiagnostics;
  const startedAt = now();
  const results: StageResult[] = [];

  const buildReport = (
    outcome: LoopOutcome,
    failure: FailureExplanation | null,
    reverted: boolean,
  ): VerificationReport => ({
    outcome,
    operationId: options.operationId,
    stages: results,
    failure,
    reverted,
    diagnostics: redact(
      [
        `outcome: ${outcome}`,
        `operation: ${options.affectedOperation}`,
        ...results.map(
          (result) =>
            `[${result.status}] ${result.stage}: ${result.summary}${result.detail ? `\n${result.detail}` : ''}`,
        ),
      ].join('\n'),
    ),
    startedAt,
    finishedAt: now(),
  });

  // 1. Preview failures never reach apply: nothing was written, so nothing is
  //    reverted and the user's annotations are untouched.
  if (options.previewError) {
    return buildReport(
      'preview-failed',
      {
        stage: 'apply',
        explanation: options.previewError.explanation,
        affectedOperation: options.affectedOperation,
        recovery: options.previewError.recovery,
        retry: { possible: true, hint: 'Re-open the preview once the cause is fixed.' },
      },
      false,
    );
  }

  let applyFailed = false;
  for (const stage of options.stages) {
    let result: StageResult;
    try {
      result = await stage.run();
    } catch (error) {
      // A stage that throws is a failed stage with a redacted message, never a
      // crashed loop: the user still gets an outcome and a recovery path.
      result = {
        stage: stage.name,
        status: 'fail',
        summary: `the ${stage.name} check could not run`,
        detail: redact(error instanceof Error ? error.message : String(error)),
        hard: stage.hard,
      };
    }
    results.push({ ...result, hard: stage.hard });
    if (result.status === 'fail') {
      if (stage.name === 'apply') applyFailed = true;
      if (stage.hard) break;
    }
  }

  results.push({
    stage: 'gate-summary',
    status: results.some((result) => result.status === 'fail') ? 'fail' : 'pass',
    summary: results.every((result) => result.status === 'pass')
      ? 'every gate passed'
      : `failing gates: ${results
          .filter((result) => result.status === 'fail')
          .map((result) => result.stage)
          .join(', ')}`,
    hard: false,
  });

  const failing = results.find((result) => result.status === 'fail' && result.hard);
  const softFailing = results.find((result) => result.status === 'fail');

  if (!failing && !applyFailed) {
    if (!softFailing) return buildReport('accepted', null, false);
    // soft gates are reported, but they do not revert a completed change
    return buildReport(
      'accepted',
      {
        stage: softFailing.stage,
        explanation: softFailing.summary,
        affectedOperation: options.affectedOperation,
        recovery: [
          'The change was applied; this gate did not block it.',
          ...RECOVERY[softFailing.stage],
        ],
        retry: { possible: true, hint: 'Re-run this gate from the report to confirm a fix.' },
      },
      false,
    );
  }

  if (applyFailed) {
    // Nothing was written, so there is nothing to revert.
    return buildReport(
      'apply-failed',
      {
        stage: 'apply',
        explanation: failing ? failing.summary : 'the change could not be applied',
        affectedOperation: options.affectedOperation,
        recovery: RECOVERY.apply,
        retry: { possible: true, hint: 'Re-preview and approve again before retrying.' },
      },
      false,
    );
  }

  const failureStage = failing!;

  // DA-36: revert only when the transaction is intact. A diverged tree makes a
  // revert destructive, so the loop reports the blockage instead of "helpfully"
  // overwriting the user's concurrent edit.
  if (!options.transactionIntact()) {
    return buildReport(
      'rollback-blocked',
      {
        stage: failureStage.stage,
        explanation: `${failureStage.summary} — and the change cannot be reverted automatically because files changed after it was applied`,
        affectedOperation: options.affectedOperation,
        recovery: [
          'Your own edits were left untouched on purpose (reverting would have discarded them).',
          'Review the diff in the report and revert the studio change by hand.',
          'Re-run the preview afterwards to confirm the gates pass.',
        ],
        retry: {
          possible: false,
          hint: 'Retry is unavailable until the tree matches the applied transaction.',
        },
      },
      false,
    );
  }

  const revert = options.revert();
  if (!revert.ok) {
    return buildReport(
      'rollback-blocked',
      {
        stage: failureStage.stage,
        explanation: `${failureStage.summary} — the automatic revert hit a conflict`,
        affectedOperation: options.affectedOperation,
        recovery: [
          `Conflicting files: ${revert.conflicts.join(', ') || '(unreported)'}`,
          'Resolve those files by hand, then re-run the preview.',
        ],
        retry: { possible: false, hint: 'Retry after the conflicting files are resolved.' },
      },
      false,
    );
  }

  return buildReport(
    'verification-failed',
    {
      stage: failureStage.stage,
      explanation: failureStage.summary,
      affectedOperation: options.affectedOperation,
      recovery: RECOVERY[failureStage.stage],
      retry: {
        possible: true,
        hint: `Fix the ${stageLabel(failureStage.stage)} failure, then re-run the preview.`,
      },
    },
    true,
  );
}
