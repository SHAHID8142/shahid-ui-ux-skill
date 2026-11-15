#!/usr/bin/env node
/**
 * ensure-built.mjs (T1010) — build the workspace when the compiled entry points
 * the gate scripts import are missing, so a pristine clone can run `pnpm check`
 * and `pnpm verify` without a manual build step first.
 *
 * No-op (exit 0) when everything is present, which is the normal case and keeps
 * the fast path fast.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildHint, missingBuildArtifacts } from './lib/ensure-built.mjs';

const ROOT = process.cwd();
const missing = missingBuildArtifacts({ exists: (artifact) => existsSync(join(ROOT, artifact)) });

if (missing.length === 0) process.exit(0);

console.log(
  `[INFO] ${missing.length} build artifact(s) missing — building once before the checks run`,
);
const build = spawnSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', shell: false });
if (build.status !== 0) {
  console.error(buildHint(missing));
  process.exit(build.status ?? 1);
}

const stillMissing = missingBuildArtifacts({
  exists: (artifact) => existsSync(join(ROOT, artifact)),
});
if (stillMissing.length > 0) {
  console.error(buildHint(stillMissing));
  process.exit(1);
}
console.log('[PASS] workspace built; gate scripts have their entry points');
