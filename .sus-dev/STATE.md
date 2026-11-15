# Development state

Updated: 2026-11-15T21:40:00+06:00 (Asia/Dhaka). Moving machines: resume with
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: Pi (FreePi),
main-integration role; the ZCode peer heartbeat is stale. A second agent/host cooperates per
D33: claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df — pnpm regression 3 stages / 132.0s,
679 tests). Architecture: ADR-001/002/004/005/006 adopted, ADR-003 as amended (D29).
Repository is PUBLIC (D34); the product is unpublished.

Canonical task statuses: TASKS.json (100 of 102 done; T1003/T1005 are owner-only).
T0706 preview, T0806 security/G13, T0707 apply + rollback, T0700w CLOSED — dual-stack
feasibility GO on both Next.js and Astro. zcode stale. Concurrency: 2 workers (D33) — claim
via lease before editing.

Current task: none. Issue #10 is closed by evidence across two slices: the content queue reflows
(overflow 343 → 0 at 390px, muted text 4.46 → 5.28:1) and the invoice list carries every state the
playbooks describe (two empty kinds, loading, error keeping rows, URL-carried filters/sort/page,
announced counts, twelve records, 47-character identifiers, 200% text). `pnpm dogfood` passes
15/15. What was not run is named in the receipts: a real screen-reader session, browser zoom (text
scaling stands in), real translations, volume beyond twelve rows.

Next exact steps: nothing in the build is eligible; the remaining work is T1003 (independent
audit) and T1005 (release approval), both owner-commissioned, plus the standing issue #9 rule.
Nothing may touch `main` or publish without the owner.

Blockers: standing B003 (licence/publication, later phase) and B004 (irreversible externals
during build). Active files: none after checkpoint.

Latest checks: 2026-11-15T21:40 +06:00 — `pnpm verify` green (68 files + 3 skipped, 716 tests +
5 skipped), `SUS_DOGFOOD=1 pnpm dogfood` green 15/15, and **CI run 43729821619 success on
a92328a**. Owner issue #10 is CLOSED; issue #9 stays open by design (it is the standing
continuous-execution rule, and closing it would end the rule while the product is unpublished). Bootstrap defect fixed: `pnpm setup`
used `pnpm exec playwright install chromium`, which fails at the workspace root ("Command
playwright not found"); it is now filtered to `@sus/eval-core`, which is the package that
depends on Playwright. On this machine the missing browser made 10 verify tests fail with a
message that looks like a code defect — the first thing a fresh machine agent will now hit and
be able to read.

Format for this file: the Current-task line names ONLY live tasks; done-task ids live in
TASKS.json and SESSION_LOG, never here.
