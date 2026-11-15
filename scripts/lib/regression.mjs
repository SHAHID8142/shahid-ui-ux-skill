/**
 * T1001 — pure parts of the cross-module regression pipeline.
 *
 * Kept separate from the runner so the aggregation rules can be tested without
 * spawning builds: the claim "the whole build regresses cleanly" is exactly the
 * claim that must not depend on a human reading a log.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The stages, in order. `verify` already contains the gate suite, lint,
 * typecheck, build, the five domain checks and the unit tests; the three after
 * it cost real builds and are therefore outside `verify` — but they are part of
 * the regression claim, which is the point of T1001.
 */
export const STAGES = [
  { id: 'verify', script: 'verify' },
  { id: 'demo-loop', script: 'demo:loop', requires: 'playwright' },
  { id: 'dogfood', script: 'dogfood', requires: 'playwright' },
];

/**
 * Resolves which stages can actually run here. A missing prerequisite marks the
 * stage `not-run` at the end of the run rather than silently dropping it.
 */
export function resolveStages({ root, exists = existsSync }) {
  const stages = [];
  for (const stage of STAGES) {
    if (stage.requires === 'playwright' && !hasPlaywright(root, exists)) continue;
    stages.push(stage);
  }
  return stages;
}

/**
 * Playwright is a workspace dependency, so it is hoisted under the package that
 * declares it rather than at the repository root. Any of these locations being
 * present means the end-to-end stages can run.
 */
export function hasPlaywright(root, exists = existsSync) {
  const candidates = [
    join(root, 'node_modules', 'playwright'),
    join(root, 'packages', 'studio-bridge', 'node_modules', 'playwright'),
    join(root, 'packages', 'eval-core', 'node_modules', 'playwright'),
  ];
  return candidates.some((path) => exists(path));
}

/**
 * Aggregates stage results. Fail closed: no stages is a failure, any `fail` is a
 * failure, and any `not-run` keeps the run from claiming `pass` — a pipeline
 * that could not exercise a stage has not verified it.
 */
export function aggregateStages({ head, branch, dirty, startedAt, stages }) {
  const list = Array.isArray(stages) ? stages : [];
  const failed = list.filter((stage) => stage.status === 'fail').map((stage) => stage.id);
  const notRun = list.filter((stage) => stage.status === 'not-run').map((stage) => stage.id);
  const totalDurationMs = list.reduce((sum, stage) => sum + (stage.durationMs ?? 0), 0);
  const status = list.length > 0 && failed.length === 0 && notRun.length === 0 ? 'pass' : 'fail';
  return { head, branch, dirty, startedAt, totalDurationMs, stages: list, failed, notRun, status };
}

/** The committed human view. Names the revision so a green claim has a subject. */
export function renderReport(report) {
  const lines = [
    '# Cross-module regression report (T1001)',
    '',
    `Revision: \`${report.head}\` on \`${report.branch}\`${report.dirty ? ' — **working tree dirty**' : ''}`,
    `Started: ${report.startedAt}`,
    `Total: ${(report.totalDurationMs / 1000).toFixed(1)}s`,
    `Verdict: **${report.status}**`,
    '',
    '| Stage | Command | Status | Exit | Duration |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const stage of report.stages) {
    lines.push(
      `| ${stage.id} | \`${stage.command}\` | ${stage.status} | ${stage.exitCode ?? '—'} | ${(stage.durationMs / 1000).toFixed(1)}s |`,
    );
  }
  if (report.failed.length > 0) {
    lines.push('', `Failed stages: ${report.failed.join(', ')}`);
  }
  if (report.notRun.length > 0) {
    lines.push(
      '',
      `Not run: ${report.notRun.join(', ')} — reported as \`not-run\`, never as \`pass\`.`,
    );
  }
  if (report.dirty) {
    lines.push(
      '',
      'The tree was dirty when this ran, so the verdict describes a revision plus uncommitted changes.',
    );
  }
  return `${lines.join('\n')}\n`;
}
