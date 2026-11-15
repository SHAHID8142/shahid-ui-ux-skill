#!/usr/bin/env node
/**
 * T1001 (audit H6) — every finished non-M10 task must exist in this branch's
 * ancestry. Run as `pnpm reach`; also part of `pnpm verify`.
 *
 * Reads the log once and answers a single question: is a `done` claim backed by
 * a commit that is actually reachable from HEAD? A task id that only exists in
 * TASKS.json is a document, not a delivery.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { awaitableTasks, checkReachability } from './lib/reachability.mjs';

const tasksDoc = JSON.parse(readFileSync(new URL('../TASKS.json', import.meta.url), 'utf8'));
const logText = execFileSync('git', ['log', '--pretty=format:%B'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

const root = fileURLToPath(new URL('..', import.meta.url));
const result = checkReachability({
  tasks: awaitableTasks(tasksDoc.tasks),
  logText,
  exists: (path) => existsSync(`${root}${path}`),
});
const { commit, receipt, files, evidence } = result.byBasis;
console.log(
  `[INFO] reachability: ${result.reachable.length}/${result.checked} finished non-M10 task(s) backed (${commit} by commit id, ${receipt} by receipt, ${files} by delivered files, ${evidence} by recorded evidence; ${result.exempt.length} M10 exempt)`,
);

if (result.missing.length > 0) {
  console.error(
    `[FAIL] ${result.missing.length} task(s) marked done have no reachable backing (no commit id, no receipt, no delivered file): ${result.missing.join(', ')}`,
  );
  console.error('       A done claim with nothing behind it is a document, not a delivery.');
  process.exit(1);
}
console.log(
  '[PASS] every finished non-M10 task is backed by a commit, a receipt or a delivered file',
);
