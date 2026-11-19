# Development state

Updated: 2026-11-19 (release-candidate preparation)
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: darwin/SSD
(release-prep agent, worktree `/Volumes/SSD/CODES/SUS-release-prep`); coordination bus registered
as `sus-release`. A second agent/host cooperates per D33: claim tasks via TASKS.json leases; read
`.sus-dev/INBOX.md`.

Branch: release/v0.1.0-preview.1-prep (release candidate in this worktree, cut from
chore/continuation-reconciliation @ 8ceb27f — development branch, CI green). Original main:
6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df). Architecture: ADR-001/002/004/005/006
adopted, ADR-003 as amended (D29). Repository is PUBLIC (D34); the product is unpublished.
Licence decided (D36, 2026-11-19): MIT, holder SHAHID8142, GitHub Experimental Preview channel.

Canonical task statuses: TASKS.json (182 of 184 done; owner-only T1003 independent audit and
T1005 release approval/publish remain). Every D32 owner-issue item from
triaging issues #13/#14 is done and receipted. Issue #15 (`/sus-bestpractice`) is triaged into
T1021–T1024 (scope resolver -> proposal contract -> invocation -> measured examples).
M11 is **done**: T1021 (scope resolution + focus selection), T1022 (proposal record, digest-bound
approval), T1023 (`sus-eval bestpractice` end to end) and T1024 (five measured example classes,
`docs/BESTPRACTICE_EXAMPLES.md`, `pnpm examples:check` in `pnpm verify`). M12 is the owner's
post-M11 issue triage (#16–#20) under standing rule D32: T1025 (per-hop redirect authorization,
issue #18), T1026 (live-document drift now fails the continuation gate, issue #17) and T1027
(playbook coverage record: 3/187 rules measured, 184 named gaps, issue #20) and T1028 (owner-named
hosts as untested rows, first-run quickstart, issue #16) and T1029 (review-PR inventory, protection
proposal, licence packet; issue #19) are **done**. No host journey has been performed on any host —
that half of #16 stays not-run — and branch protection, licence choice, PR closure and publication
remain owner actions. T1030 (issue #21 R2) closed the "axe cannot be scoped" limit: a selector scope in
`deep` mode is scanned with axe confined to that element, so an a11y violation is attributable to the
selection by construction; the page-wide scan and G4 verdict are unchanged. T1031 added `--scope page`,
which resolves without a browser and attributes by dimension, so a page-level defect (a missing
description reported at its own route) is proposed instead of producing an empty proposal; every SEO
check now carries observed/expected counts, because the proposal contract refuses a fact without an
observation. T1032 added one in-repo entry point (`pnpm exec sus <command>`) that hands arguments and
exit codes to the CLI that owns the command; a test compares its map against each CLI's own usage line,
so it cannot drift. T1033 gave the Live Studio the half that exists a startable surface
(`pnpm studio:bridge`, with its guards proven through the launcher) and an honest inventory in
`docs/STUDIO.md`: the loop and the bridge are built, the Studio *page* is not. T1034 quieted git's expected
"not a git repository" answer in the demo, and T1035 put "lab measurement, no field data, no comparative
claim" next to every performance number (audit.md, the G5 check detail including on a pass, budget
findings, performance proposal items) instead of relying on the limitations page being read first.
T1036 made motion measurable: one aria-expanded disclosure is driven in pointer, keyboard and
reduced-motion contexts and its traces go to the existing oracles, so G6 is pass/fail on such a page and
still not-run (with the reason) when there is nothing to drive. T1037 made a file scope say what it is:
findings name elements, a component-path scope names a file, so it states that none can be attributed,
names the scopes that can, and exits 3 instead of 0. T1038 added component-state measurement for the
two states that exist in the DOM (pressed, disabled), with loading/success/error named as not driven
because simulating them would measure a guessed class. T1039 added hover and checked (a native control is
not judged), T1040 drives a native details/summary disclosure as a second motion shape, and T1041 lets an
HTML file scope attribute its own route's findings while a component scope still refuses.
T0706 preview, T0806 security/G13, T0707 apply + rollback, T0700w CLOSED — dual-stack
feasibility GO on both Next.js and Astro. zcode stale. Concurrency: 2 workers (D33) — claim
via lease before editing.

Current task: none live for an agent. Background: the owner-commissioned
independent audit (T1003, D35) ran on 2026-11-18 and returned **FAIL** per the packet's §6
criteria (0 critical, 4 HIGH open at audit time + 1 HIGH fixed mid-audit, 9 medium, 17 low) —
receipt in `.sus-dev/VERIFICATION/T1003.md` (written by the auditor of record; findings recorded
verbatim as M13 tasks). The owner then directed the fix wave; every finding carries a fix with a
receipt and tests, and the session-expiry finding was implemented after the owner directed work on
the open issues. The release candidate is prepared on `release/v0.1.0-preview.1-prep` (worktree
`/Volumes/SSD/CODES/SUS-release-prep`): MIT licence (owner decision D36), third-party notices,
fixed quickstart install path, honest preview notes, serial verify + regression green. What is
left is owner/auditor-gated and must not be started by an agent: T1003's
verdict acceptance (the auditor or owner accepts each fix's measurement; the build agent's response
is appended to the receipt), T1005 (release approval and publication).

`pnpm verify` is green on the fix-wave tree: exit 0, 99 test files + 3 env-gated skips,
1086 tests passed / 9 skipped, 61/61 gate checks, claims 22 files, handoff/roadmap consistent.
`pnpm regression` on the final tree: see `evals/reports/regression-latest.md`. CI runs on every
push; the fresh-clone job re-runs the documented first-run path on the pushed commit.

Next exact steps: (1) push the `release/v0.1.0-preview.1-prep` branch (dev-branch checkpoint,
D30/D34) and record CI on the candidate SHA; (2) the auditor/owner reviews the appended fix
measurements in `.sus-dev/VERIFICATION/T1003.md` and accepts or contests each closed finding (the
implemented session-expiry measurement is receipted in VERIFICATION); (3) the owner decides T1005
(release approval and publication; the intended preview tag install path is documented in
`docs/QUICKSTART.md`); no agent may touch `main` or publish. If the owner asks to keep building:
triage a fresh `gh issue list --state open` rather than reopen a closed item.

Blockers: publication remains the owner gate (T1005; licence decided by D36, so B003's licence
half is closed). Active files: none after checkpoint.

Latest checks: 2026-11-20 (release candidate pushed) — the release-prep branch is on the remote
at `201fdf027abcfc9a5e2e3b6c82c13901ded720bb` (push gate: "this tree passed the release suite");
CI on that exact SHA all green (run 44588817550: verify node 22 + node 24, fresh clone, host
smoke, G13). Earlier the same session: `pnpm verify` exit 0 (101 files + 3 skipped, 1099 tests
passed / 9 skipped, 13/13 gates, claims scan set 25 files) and `pnpm regression` PASS (3 stages,
523.6 s), serial in the candidate worktree; fresh-clone install + `sus audit`/`sus bestpractice`
CLI demo exit 0; a push-gate environment incident (hook GIT_DIR hijacked the suite's fixture
repos into the real branch; also flipped `core.bare` and the `[user]` identity) was found,
repaired, and fixed at the root with a clean-env gate spawn — full sequence in
`.sus-dev/VERIFICATION/T1091.md`. 2026-11-18 (fix wave) — `pnpm verify` exit 0 (99 files + 3
skipped, 1086 tests passed / 9 skipped), 13/13 gates, claims 22/22. CI is green on the
development base SHA 8ceb27f (run 44391675332) and the evidence commit e6440b7 pushed after its
own gate run.

Format for this file: the Current-task line names ONLY live tasks; done-task ids live in
TASKS.json and SESSION_LOG, never here.
