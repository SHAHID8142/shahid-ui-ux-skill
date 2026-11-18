# Development state

Updated: 2026-11-18 (fix wave complete)
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: Pi (FreePi),
main-integration role; the ZCode peer heartbeat is stale. A second agent/host cooperates per
D33: claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df — pnpm regression 3 stages / 132.0s,
679 tests). Architecture: ADR-001/002/004/005/006 adopted, ADR-003 as amended (D29).
Repository is PUBLIC (D34); the product is unpublished.

Canonical task statuses: TASKS.json (181 of 183 done; owner-only T1003 independent audit and
T1005 release approval/publish remain, both owner-only, and the M12 hardening queue T1026–T1029
from issue triage is open). Every D32 owner-issue item from
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

Current task: none live for an agent. The owner-commissioned independent audit (T1003, D35)
ran on 2026-11-18 via five fresh-context subagents and returned **FAIL** per the packet's §6
criteria: 0 critical, 4 HIGH open + 1 HIGH fixed mid-audit, 9 medium, 17 low — receipt in
`.sus-dev/VERIFICATION/T1003.md` (written by the auditor of record; findings recorded verbatim as
M13 tasks T1046–T1075). The owner then directed the fix wave; it is complete: every open HIGH and
medium carries a fix with a receipt and tests (commits 680c9ac..765be5f plus eac8967 and the
teardown-robustness follow-up), and 30 of the 31 findings are closed with fixes (1 deferred, T1062). What is left is
owner/auditor-gated and must not be started by an agent: T1003's verdict acceptance (the auditor
or owner accepts each fix's measurement; the build agent's response is appended to the receipt),
T1005 (release approval and publication), and T1062 (session expiry — deferred by the fix wave
with the rationale recorded in TASKS.json; the owner accepts or rejects the deferral).

`pnpm verify` is green on the fix-wave tree: exit 0, 99 test files + 3 env-gated skips,
1086 tests passed / 9 skipped, 61/61 gate checks, claims 22 files, handoff/roadmap consistent.
`pnpm regression` on the final tree: see `evals/reports/regression-latest.md`. CI runs on every
push; the fresh-clone job re-runs the documented first-run path on the pushed commit.

Next exact steps: (1) the auditor/owner reviews the appended fix measurements in
`.sus-dev/VERIFICATION/T1003.md` and accepts or contests each closed finding; (2) the owner
decides T1005 (release approval and publication) and the deferred T1062; (3) no agent may touch
`main` or publish. If the owner asks to keep building: triage a fresh `gh issue list --state open`
rather than reopen a closed item.

Blockers: standing B003 (licence/publication, owner gate). Active files: none after checkpoint.

Latest checks: 2026-11-18 (fix wave) — `pnpm verify` exit 0 (99 files + 3 skipped, 1086 tests
passed / 9 skipped, zero unhandled errors after the proxy-teardown fix), 13/13 gates with
61 `[PASS]` lines, claims 22/22, handoff consistent (166 of 169 tasks done; pending T1003, T1005,
T1062-deferred). The flake class the audit recorded (T1003-16) is reduced at the source: proxy
sockets and serveLocal carry error handlers, and the baselines suite binds an ephemeral port.

Format for this file: the Current-task line names ONLY live tasks; done-task ids live in
TASKS.json and SESSION_LOG, never here.
