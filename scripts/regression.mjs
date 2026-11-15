/**
 * T1001 — cross-module regression: one command, everything, recorded.
 *
 * `pnpm regression` runs the release suite and the end-to-end stages that are
 * deliberately outside it (they cost real builds: the full-loop demo and the
 * dogfood audit), then writes a report that names the exact revision.
 *
 * Three rules make the report trustworthy rather than decorative:
 *
 * 1. **A stage that did not run is `not-run`.** Missing Playwright, a killed
 *    build, an absent fixture: all report `not-run`, never `pass`. This is the
 *    gate-registry rule applied to a whole pipeline.
 * 2. **The report names the revision and the cleanliness of the tree.** A green
 *    report against a dirty tree proves something about a different commit.
 * 3. **Stages stop the run when they fail**, but every failure is still written
 *    down — a report that omits the stage that broke is worse than no report.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aggregateStages, renderReport, resolveStages } from './lib/regression.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = `${ROOT}evals/reports`;

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function runStage(stage) {
  const started = Date.now();
  const result = spawnSync('pnpm', [stage.script], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, CI: process.env.CI ?? '1' },
  });
  const durationMs = Date.now() - started;
  const code = result.status;
  const status =
    code === 0
      ? 'pass'
      : code === null
        ? 'not-run'
        : stage.allowExitCodes?.includes(code)
          ? 'pass'
          : 'fail';
  return { id: stage.id, command: `pnpm ${stage.script}`, status, exitCode: code, durationMs };
}

const stages = resolveStages({ root: ROOT });
const head = git(['rev-parse', 'HEAD']);
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
const dirty = git(['status', '--porcelain']).length > 0;

const results = [];
for (const stage of stages) {
  process.stdout.write(`\n=== regression stage: ${stage.id} (pnpm ${stage.script})\n`);
  const result = runStage(stage);
  results.push(result);
  if (result.status !== 'pass') break; // fail fast, but keep the record
}
// Stages after a break were never attempted: record them as not-run, explicitly.
for (const stage of stages) {
  if (!results.some((result) => result.id === stage.id)) {
    results.push({
      id: stage.id,
      command: `pnpm ${stage.script}`,
      status: 'not-run',
      exitCode: null,
      durationMs: 0,
    });
  }
}

const report = aggregateStages({
  head,
  branch,
  dirty,
  startedAt: new Date().toISOString(),
  stages: results,
});

mkdirSync(OUT_DIR, { recursive: true });
const stamp = head.slice(0, 12) || 'no-head';
writeFileSync(`${OUT_DIR}/regression-${stamp}.json`, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(`${OUT_DIR}/regression-latest.md`, renderReport(report));

const totalSeconds = (report.totalDurationMs / 1000).toFixed(1);
console.log(
  `\n${report.status.toUpperCase()} — ${report.stages.length} stages in ${totalSeconds}s`,
);
console.log(`report: evals/reports/regression-latest.md`);
process.exit(report.status === 'pass' ? 0 : 1);
