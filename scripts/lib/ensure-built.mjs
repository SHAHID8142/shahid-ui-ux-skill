/**
 * Build artifacts the gate scripts import (T1010).
 *
 * Why this exists: on 2026-11-15 a pristine clone ran the documented first-run
 * path (`install → setup → verify`) and `pnpm verify` died at `gates:full` with
 *
 *   Error [ERR_MODULE_NOT_FOUND]: Cannot find module
 *   '…/packages/eval-core/dist/index.js' imported from scripts/check-gates.mjs
 *
 * because `check-gates.mjs` (and `check-direction.mjs`, `generate-support.mjs`)
 * import compiled packages, and nothing built them yet. On a machine that had
 * been working for days the `dist` directories existed, so every local run was
 * green — the documented resume path only ever broke for the person the document
 * was written for. `scripts/ensure-built.mjs` now builds first when an artifact
 * is missing, and the artifact list lives here so a new compiled package cannot
 * be forgotten silently.
 */

/** Compiled entry points the scripts and gates import. Keep in sync with package `main` fields. */
export const REQUIRED_ARTIFACTS = [
  'packages/adapters/dist/index.js',
  'packages/eval-core/dist/index.js',
  'packages/scanners/dist/index.js',
  'packages/schemas/dist/index.js',
  'packages/studio-bridge/dist/index.js',
  'packages/studio-web/dist/index.js',
  'packages/tokens/dist/index.js',
];

/**
 * Which required artifacts are absent. `exists` is injected so the check is pure
 * and a test can describe a fresh clone without deleting a real `dist`.
 */
export function missingBuildArtifacts({ artifacts = REQUIRED_ARTIFACTS, exists } = {}) {
  if (typeof exists !== 'function') throw new TypeError('missingBuildArtifacts needs an exists()');
  return artifacts.filter((artifact) => !exists(artifact));
}

/** The sentence a person needs to see when the build is the thing that is missing. */
export function buildHint(missing) {
  const list = (missing ?? []).map((artifact) => `  - ${artifact}`).join('\n');
  return [
    'This command imports compiled packages, and these build artifacts are missing:',
    list,
    '',
    'Fix: pnpm build   (or `pnpm setup`, which leaves a fresh clone ready).',
    '`pnpm check` and `pnpm verify` now do this automatically, so seeing this message means',
    'the build itself failed — scroll up for the compiler error.',
  ].join('\n');
}
