# Development state

Updated: 2026-11-15T20:45:00+06:00 (Asia/Dhaka). Moving machines: resume with
docs/RESUME_ON_NEW_MACHINE.md (install, branch, `pnpm setup`, `pnpm verify`). Host: Pi (FreePi),
main-integration role; the ZCode peer heartbeat is stale. A second agent/host cooperates per
D33: claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD complete (BUILD_PERMISSION=true, APERIO recorded as D28;
BUILD_COMPLETE_PUSHED=true at release revision 2f344df — pnpm regression 3 stages / 132.0s,
679 tests). Architecture: ADR-001/002/004/005/006 adopted, ADR-003 as amended (D29).
Repository is PUBLIC (D34); the product is unpublished.

Canonical task statuses: TASKS.json (99 of 101 done; T1003/T1005 are owner-only).
T0706 preview, T0806 security/G13, T0707 apply + rollback, T0700w CLOSED — dual-stack
feasibility GO on both Next.js and Astro. zcode stale. Concurrency: 2 workers (D33) — claim
via lease before editing.

Current task: none. Issue #10 work landed as the admin reference implementation fix: the two
measured dogfood findings are closed by measurement (overflow 343 → 0 at 390px, muted text
4.46 → 5.28:1), proved by a browser test with a negative control, and `pnpm dogfood` now passes
15/15 checks. Issue #10 stays OPEN only for its unverified acceptance items (empty/loading/error
states, translated labels, 200% text scaling and browser zoom, many-record volume, a real
assistive-technology session).

Next exact steps: pick up issue #10's remaining acceptance items in bounded tasks (next
candidate: queue empty/loading/error states plus long-ID and volume coverage on the admin
fixture, with its own receipt). T1003 independent audit and T1005 release approval remain
owner-commissioned; nothing else may touch `main` or publish.

Blockers: standing B003 (licence/publication, later phase) and B004 (irreversible externals
during build). Active files: none after checkpoint.

Latest checks: 2026-11-15T20:45 +06:00 — `pnpm verify` green (see the T1007 receipt for the
final count), `SUS_DOGFOOD=1 pnpm dogfood` green 15/15. Bootstrap defect fixed: `pnpm setup`
used `pnpm exec playwright install chromium`, which fails at the workspace root ("Command
playwright not found"); it is now filtered to `@sus/eval-core`, which is the package that
depends on Playwright. On this machine the missing browser made 10 verify tests fail with a
message that looks like a code defect — the first thing a fresh machine agent will now hit and
be able to read.

Format for this file: the Current-task line names ONLY live tasks; done-task ids live in
TASKS.json and SESSION_LOG, never here.
