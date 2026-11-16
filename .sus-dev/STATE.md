# Development state

Updated: 2026-11-16T16:20:00+06:00
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: Pi (FreePi),
main-integration role; the ZCode peer heartbeat is stale. A second agent/host cooperates per
D33: claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df — pnpm regression 3 stages / 132.0s,
679 tests). Architecture: ADR-001/002/004/005/006 adopted, ADR-003 as amended (D29).
Repository is PUBLIC (D34); the product is unpublished.

Canonical task statuses: TASKS.json (108 of 110 done; only T1003 independent audit and
T1005 release approval/publish remain, both owner-only). Every D32 owner-issue item from
triaging issues #13/#14 is done and receipted.
T0706 preview, T0806 security/G13, T0707 apply + rollback, T0700w CLOSED — dual-stack
feasibility GO on both Next.js and Astro. zcode stale. Concurrency: 2 workers (D33) — claim
via lease before editing.

Current task: none in the build tree. The last owner-issue item closed (issue #14 research
source: the pin's digests are now **measured**, not assumed — `scripts/research/verify-pin.mjs`
fetched the licence and all four guides twice by independent transports and recorded them; the
responsive-table guard is executable and tested by 22 tests; three pilots carry measured
before/after evidence). A servable pin is a precondition, not the measurement: no shipped loader
supplies fetched text to a paired run, so the provider arm stays `not-run` and no guide text is
quoted anywhere. What is left is owner-gated and is not started by an agent: T1003 (independent
audit, which a builder must never self-certify) and T1005 (release approval and publication).
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

Latest checks: 2026-11-16T16:18 +06:00 — `pnpm verify` green (**75 files + 3 skipped, 862 tests
passed / 9 skipped**; the two new files are `packages/scanners/tests/verify-pin.test.ts` and the
research-provider rewrite), 13/13 gates implemented with 55 `[PASS]` lines, claims/handoff/roadmap
consistent all green; earlier `SUS_DOGFOOD=1 pnpm dogfood` 15/15 and **CI run 43831171205 success on
`88e4431`** (the host-entry-point fix). The pin measurement is deliberately outside this run:
`scripts/research/verify-pin.mjs` is the only script that touches the network and a build must never
need it.
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
