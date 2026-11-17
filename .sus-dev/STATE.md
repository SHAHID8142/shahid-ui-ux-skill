# Development state

Updated: 2026-11-17T02:35:00+06:00
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: Pi (FreePi),
main-integration role; the ZCode peer heartbeat is stale. A second agent/host cooperates per
D33: claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df — pnpm regression 3 stages / 132.0s,
679 tests). Architecture: ADR-001/002/004/005/006 adopted, ADR-003 as amended (D29).
Repository is PUBLIC (D34); the product is unpublished.

Canonical task statuses: TASKS.json (127 of 129 done; owner-only T1003 independent audit and
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
T0706 preview, T0806 security/G13, T0707 apply + rollback, T0700w CLOSED — dual-stack
feasibility GO on both Next.js and Astro. zcode stale. Concurrency: 2 workers (D33) — claim
via lease before editing.

Current task: none in the build tree. The last checkpoint closed issue #13's remaining
agent-doable residue: G7's 400% zoom half is now **measured** as the CSS px viewport zoom produces (320×256 at device scale
factor 4) by `runHardeningMatrix`'s `zoom400` record, scored fail-closed by `evaluateZoom400`, and
a clean 320 px column without a zoom record is `not-run` in both the gate and the audit report.
The old check that asserted the zoom half stay unmeasured was itself the defect. Not measured, and
named as such everywhere: the user-agent zoom setting and text-only zoom. Issue #14's loader now exists: a
cache-only, digest-bound loader (`research-cache-loader.ts`) filled by an opt-in script, with the
provider arm's mechanics measured (3/4 topics served, caps held) and its **effectiveness** still
`not-run` because a comparison needs a host model. No guide text is copied into the repository. What is left is owner-gated and is not started by an agent: T1003 (independent
audit, which a builder must never self-certify) and T1005 (release approval and publication).
Issue #14's supply-chain half is now enforced rather than described: all 12 `uses:` lines in
`.github/workflows/ci.yml` name a 40-character commit with the resolved tag beside it, and
`packages/schemas/tests/ci-actions-pinning.test.ts` fails on a tag, a branch, a short SHA or a
drifted pin. Verified by negative control (one line reverted to `actions/checkout@v4` failed two of
the five tests). A pin fixes *which* code runs, not that it is safe, and it is not a claim of
"exact-SHA CI verified" — that needs a green run on the commit that carries it.
Issue #13 is closed on the build side: the audit composes the existing evaluators rather than
adding a second engine, and every gate in the registry is now executable except the 400% zoom
component, which is reported `not-run` on every run rather than absorbed into the 320px result.
Issue #10 is closed by evidence across two slices: the content queue reflows
(overflow 343 → 0 at 390px, muted text 4.46 → 5.28:1) and the invoice list carries every state the
playbooks describe (two empty kinds, loading, error keeping rows, URL-carried filters/sort/page,
announced counts, twelve records, 47-character identifiers, 200% text). `pnpm dogfood` passes
15/15. What was not run is named in the receipts: a real screen-reader session, browser zoom (text
scaling stands in), real translations, volume beyond twelve rows.

ROADMAP.md is now a generated view of TASKS.json (`pnpm roadmap`), and any status document that
states a stale progress figure now fails the build — which closed the places a public reader could
be misled: the roadmap said every milestone was "pending" with 100/102 done, the build handoff said
"97 of 100", and the README still denied that implementation was authorised. CI green on `e788e90`
(run 43736564619).

The documented first-run path was rehearsed on a real fresh clone (T1010) and repaired: gate scripts
now build when their compiled imports are missing, and the resume document no longer quotes a test
count it cannot keep true. Rehearsed twice after the fix, the second time **from the public remote at `4653b12`** — clone →
install → setup → verify, exit 0 (70 files + 3 skipped, 749 tests + 5 skipped), with
`[INFO] 7 build artifact(s) missing — building once` the only new line.

`pnpm regression` — the headline "everything" command the README advertises — was run at the
checkpoint `4aac091` with a clean tree: **pass**, all three stages (verify 115.5s, demo-loop 4.0s,
dogfood 24.2s), report in `evals/reports/regression-latest.md`.

CI now also runs the documented first-run path on a never-built tree (T1011, `fresh-clone` job) — and
it is green on Linux: run 43751035048, where the log shows `[INFO] 7 build artifact(s) missing —
building once` and then 70 files / 752 tests passing. A regression of that path turns CI red instead
of hiding behind the warmed verify job's pre-build.

Next exact steps: the build tree is empty, so the next action is an owner decision, not an
agent task — commission the independent audit or withhold it, then approve or defer publication.
Both remaining tasks are owner-only and require a human; no agent may start them or self-certify
the audit. Nothing may touch `main` or publish without the owner. If the owner asks to keep
building, the next move is to triage a fresh `gh issue list --state open` rather than reopen a
closed item.

Blockers: standing B003 (licence/publication, later phase) and B004 (irreversible externals
during build). Active files: none after checkpoint.

Latest checks: 2026-11-16T18:20 +06:00 — `pnpm verify` green (**76 files + 3 skipped, 873 tests
passed / 9 skipped**), 13/13 gates implemented with **61 `[PASS]`** lines (the seven G7 zoom
assertions are new), claims/handoff/roadmap consistent all green; `pnpm regression` and CI for the
checkpoint are recorded in `SESSION_LOG` and the commit message. The pin measurement is deliberately
outside this run: `scripts/research/verify-pin.mjs` is the only script that touches the network and
a build must never need it.
Owner issue #10 is CLOSED; issue #9 stays open by design (it is the standing continuous-execution
rule, and closing it would end the rule while the product is unpublished).
Bootstrap defect fixed: `pnpm setup`
used `pnpm exec playwright install chromium`, which fails at the workspace root ("Command
playwright not found"); it is now filtered to `@sus/eval-core`, which is the package that
depends on Playwright. On this machine the missing browser made 10 verify tests fail with a
message that looks like a code defect — the first thing a fresh machine agent will now hit and
be able to read.

Format for this file: the Current-task line names ONLY live tasks; done-task ids live in
TASKS.json and SESSION_LOG, never here.
