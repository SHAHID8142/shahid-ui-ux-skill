# Private GitHub Actions CI verification report (owner issue #8, task T0103b)

- Date: 2026-11-14. Prepared by: builder session (ZCode, GLM) per the D32
  open-issue gate. Evidence: `gh run list/view` against the private repository
  (SHAHID8142/shahid-ui-ux-skill); logs quoted from run IDs below.
- Final state: **latest HEAD e5ce983f37203b046a406e869fa1af718bd76d08 is green
  on the private repository's Actions**, Node 22 + Node 24, run
  https://github.com/SHAHID8142/shahid-ui-ux-skill/actions/runs/43489224416
  (steps: install → continuation checker → lint → format → stylelint →
  typecheck → Playwright chromium install → tests → fixture builds).
  Actual test counts from that run's logs: **9 test files, 52/52 tests passed
  on Node 22 and on Node 24** (matches the local suite).

## Run enumeration (10 runs, reconciled — the owner's observed count was 8)

| # | Run ID | Commit | Trigger | First failing step (failures only) | Classification | Remediation |
|---|---|---|---|---|---|---|
| 1 | 43466827337 | a6fd1e6 | push | Format check | CI-config: ci.yml edited by sed after the last prettier pass | Fixed commit bde1986 |
| 2 | 43468037108 | cf6d8df | push | Format check | CI-config: generated json-schema files not prettier-formatted | Generated artifacts excluded from prettier; commit b20f5e8 |
| 3 | 43468234662 | b20f5e8 | push | — (success, Node 22+24; 22 tests then) | — | — |
| 4 | 43468458222 | 56270ca | push | — (success) | — | — |
| 5 | 43468563545 | 4cbccea | push | — (success) | — | — |
| 6 | 43473615285 | 2083e7c (T0151) | push | Continuation checker | by-design catch: stale T0102 evidence path (superseded smoke test deleted in T0151) | Evidence corrected; commit c117aba (checker caught it locally too) |
| 7 | 43474277197 | 4f0f80f (T0152) | push | Continuation checker | same stale-evidence cause | same fix |
| 8 | 43475467941 | 9dc7f73 (T0152b) | push | Continuation checker | same stale-evidence cause | same fix |
| 9 | 43481467051 | c117aba (T0102b) | push | Typecheck | toolchain: `pnpm -r exec tsc` ran on tsconfig-less Astro fixtures; cross-package types read unbuilt dist/ | root script now `build` + `typecheck` (`pnpm -r --if-present run typecheck`); `astro check` hang removed; commit e5ce983 |
| 10 | 43488130448 | 9e18db3 (D32) | push | Typecheck | toolchain: eval-core imports @sus/schemas types from unbuilt dist/ on fresh checkout (locally masked by a manual build) | build-first typecheck (same fix, verified by wiping dist/ locally before rerun); commit e5ce983 |

Classification summary: 2 CI-config (formatting), 3 continuation-checker
catches of real record staleness (by design, not CI defects), 2 toolchain
ordering (build-before-typecheck), 1 successor of the same. No test/code
failures in CI: the browser-dependent tests never got to run before this fix
because earlier steps failed first.

## Actions taken per issue #8 requirements

1. **All runs enumerated** with IDs/SHAs/steps above (10 runs, not 8 — the
   count grew while the issue was written).
2. **Private-repo execution confirmed**: every run above executed in
   SHAHID8142/shahid-ui-ux-skill (private) via push triggers on
   `chore/continuation-reconciliation`; permissions default (no elevated
   privileges added). Workflow triggers: push on non-main branches + PRs.
3. **Latest HEAD covered by fresh complete CI**: run 43489224416, exact
   headSha e5ce983f… (equals local `git rev-parse HEAD`), success on Node 22
   and Node 24, **52/52 tests per node** (log-verified, not asserted).
4. **stylelint added to CI** (new step) and verified in that run. **Browser
   dependency verified**: new `playwright install --with-deps chromium` step
   precedes tests; the 52-test suite includes the Playwright harness, axe and
   Lighthouse integration tests that require it — they ran and passed on
   both nodes. Fixture builds (all 4) added as a CI step and passed.
5. **G4/G5 fail closed** (commit e5ce983):
   - `evaluateG4([])` → fail ("no axe scans recorded"); malformed violations
     arrays and unknown impact values → fail (invalid evidence);
   - `evaluateG5([])` → fail; missing matching budget → fail; **null/NaN
     metrics → fail** ("FAIL CLOSED") — `runLighthouse` now emits `null` for
     absent/non-finite Lighthouse metrics instead of silent zeroes, and
     retries (max 3) only while a required metric is absent;
   - negative/positive tests added (10/10 in the a11y-budgets suite).
6. **Real logs and links**: this report quotes run IDs, SHAs, failing steps
   and log-derived test counts; receipts distinguish CI-log-verified facts
   from agent assertions.
7. **Report location**: `.sus-dev/VERIFICATION/CI_ACTIONS_PRIVATE.md` (this
   file), linked in issue #8 before closing.

## Residual limitations (recorded, not hidden)

- `actions/checkout@v4` et al. emit a Node-20 deprecation warning (forced to
  Node 24 runtime); harmless today, action bumps are routine maintenance.
- ubuntu-latest is migrating to Ubuntu 26 per GitHub's runner notice — future
  routine maintenance, no action required now.
- Lighthouse LCP can be missing under load: runner retries (max 3) and, if
  still absent, the metric is null and **G5 fails closed** — the gate never
  silently passes on missing data.
- CI minutes for chromium download (~100 MB/node) are accepted as the cost of
  real browser evidence.
