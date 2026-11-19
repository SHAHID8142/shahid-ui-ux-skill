/**
 * T1091 — git hook environments must not leak into the suite the gate runs.
 *
 * Git invokes its hooks with `GIT_DIR` (and, depending on context, `GIT_WORK_TREE`,
 * `GIT_INDEX_FILE`, `GIT_PREFIX`, …) set in the environment, and everything a hook spawns
 * inherits that. The push gate runs the full `pnpm verify` suite, whose tests create fixture
 * git repositories in temp dirs (`packages/eval-core/tests/checker-hardening.test.ts`,
 * `packages/studio-bridge/tests/apply.test.ts` run `git init`/`git add -A`/`git commit` under
 * `mkdtemp`). With `GIT_DIR` inherited, those `git` commands resolve to the REAL repository:
 * the temp fixture's files were staged into the repo's index by their relative paths and
 * committed onto the checked-out branch. Observed 2026-11-19 (T1091 receipt): five ghost
 * commits (`fixture`, `init` ×4, author `t`) landed on the release-prep branch during a
 * gate-run verify; the gate's verified-tree check refused the push — the gate worked, the
 * environment lied.
 *
 * The suite must therefore run with a clean git environment. This helper strips every `GIT_*`
 * variable except the two a suite may legitimately need (`GIT_EDITOR` for interactive git
 * flows, `GIT_TERMINAL_PROMPT` so a credential prompt fails instead of hanging). Plain `git`
 * re-discovers the repository from `cwd`, which is exactly what an isolated fixture wants.
 */

const KEEP = new Set(['GIT_EDITOR', 'GIT_TERMINAL_PROMPT']);

/** `env` without the `GIT_*` variables git sets for hooks. Returns a copy. */
export function gitCleanEnv(env = process.env) {
  const clean = { ...env };
  for (const key of Object.keys(clean)) {
    if (/^GIT_/.test(key) && !KEEP.has(key)) delete clean[key];
  }
  return clean;
}
