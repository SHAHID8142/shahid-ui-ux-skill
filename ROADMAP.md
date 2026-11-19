# ROADMAP — SUS (living file)

**Authoritative task list:** `TASKS.json` (counts and statuses computed from TASKS.json; current receipt in .sus-dev/VERIFICATION/).
**Requirements:** `docs/SUS_MASTER_PRD_v1.0.md` + effective manifest
`docs/EFFECTIVE_REQUIREMENTS.json` (ADR-001/002/004/005/006 adopted; ADR-003 as amended).
**Build gate:** closed — APERIO recorded as OWNER_DECISIONS_LOG.md D28 (2026-11-13).

The table below is **generated** from `TASKS.json`; `node scripts/check-roadmap.mjs` fails the
build when the two disagree, so this page cannot drift again. It was hand-written until
2026-11-15, when it still called every milestone "pending" with 100 of 102 tasks done.

<!-- roadmap:table start — generated from TASKS.json by `node scripts/check-roadmap.mjs --write` -->
| Milestone | Scope | Tasks | Status |
|---|---|---|---|
| M0 | Discovery, gap analysis, ADRs, WBS | T0001–T0007 (7 tasks) | **done** — 7/7 |
| M1 | Repo skeleton, test runner, CI, schema versioning | T0010–T0104 (9 tasks) | **done** — 9/9 |
| M1.5 | **Evaluation Spine** (rubric, harness, baselines, calibration, gate registry) | T0151–T0159 (9 tasks) | **done** — 9/9 |
| M2 | Portable skill core (SKILL.md, router, JIT loader, CLI) | T0201–T0205 (5 tasks) | **done** — 5/5 |
| M3 | Research honesty + anti-slop (evidence, taxonomy, scanner, corpus, trend loop) | T0301–T0310 (6 tasks) | **done** — 6/6 |
| M4 | Design intelligence (direction reasoning, tokens, foundations, launch playbooks) | T0400–T0409 (13 tasks) | **done** — 13/13 |
| M5 | Progressive workflow (contracts, state machine, locks, gates, learning loop) | T0501–T0508 (7 tasks) | **done** — 7/7 |
| M5.5 | Hardening matrix | T0551 (1 task) | **done** — 1/1 |
| M6 | Motion system (state-machine schema, tokens, tests) | T0600–T0603 (4 tasks) | **done** — 4/4 |
| M7 | Studio: dual-stack spike → slice → event contract → verification loop | T0700–T0790 (16 tasks) | **done** — 16/16 |
| M8 | Studio hardening + second-wave playbooks | T0801–T0812 (11 tasks) | **done** — 11/11 |
| M9 | Adapters + installer + support matrix + dogfood sites | T0901–T0906 (6 tasks) | **done** — 6/6 |
| M10 | Regression, benchmark, independent review, docs, release | T1001–T1020 (20 tasks) | **18/20 done** — pending: T1003, T1005 |
| M11 | Scoped best-practice workflow (/sus-bestpractice, issue #15) | T1021–T1024 (4 tasks) | **done** — 4/4 |
| M12 | Post-M11 hardening from issue triage (#16-#20, D32) | T1025–T1045 (21 tasks) | **done** — 21/21 |
| M13 | Independent audit (T1003, D35) findings — the fixes and their measurements | T1046–T1089 (44 tasks) | **done** — 44/44 |
| M14 | Release-candidate preparation (MIT licence D36, preview install path, honest preview notes) | T1091–T1095 (5 tasks) | **1/5 done** — pending: T1092, T1093, T1094, T1095 |
<!-- roadmap:table end -->

## What is left

Nothing in the build tree. Every milestone is complete except **M10**, and M10's two open tasks
are the ones a builder must not do for itself:

- **T1003 — independent audit.** A separately commissioned reviewer, not this build loop
  (D30/D32 forbid interim auditors). A builder that certifies its own independence has certified
  nothing.
- **T1005 — release approval.** The owner's decision to publish the product. The repository is
  public (D34); the product is not published.

Everything else is done, verified by the release suite, and evidenced in
`.sus-dev/VERIFICATION/`. The last five tasks were added by D32 triage of the owner's open
issues and are now closed with receipts:

- **T1012, T1013 — the `/sus audit` command** (issue #13): an honest invocation contract, a
  read-only pipeline that composes the gate evaluators and scanners rather than duplicating them,
  and an evidence/report contract that keeps `not-run` visible and never emits a machine `pass`
  for a human judgment.
- **T1014 — seven gates the registry reported as not-run** (G2, G3, G6, G7, G8, G9, G10) are now
  executable, each with a passing and a failing fixture, so an "unchecked" gate no longer hides
  behind an implemented one.
- **T1015 — stale capability and status text**, reconciled against the tree: SKILL.md no longer
  calls itself a skeleton, the capability matrix marks shipped capabilities built while keeping a
  degradation sentence per row, and no document names a closed finding as open.
- **T1016 — the Modern Web Guidance research source** (issue #14), pinned by revision, with a
  bounded offline-first provider, a checkable guard for the responsive-table pattern that breaks
  screen-reader header association, and three pilots with measured before/after.

Owner issue #10 (mobile record-list quality) is closed; issue #9 — "never stop after an ordinary
task" — stays open because it is a standing rule for any resuming agent, not an unfinished task.


## Order rationale (what changed vs the original roadmap)

1. Evaluation spine moved **before** knowledge library — quality must be measurable from day one.
2. Direction Reasoning is the first M4 task — it is the biggest lever against AI-typical output.
3. Read-only dual-stack mapping precedes bridge work; trusted safe-write experiment T0700w gates production direction/playbook investment. Full Studio cannot be silently reduced.
4. Motion gets a formal state contract; independent behavioral tests verify generated transitions.

## Current continuation and phase boundaries

T0006 bootstrap → T0007 final reconciliation; T0010 executable resume checker after
authorization. T1006 is the final verified checkpoint push; T1003 is the separate post-build
audit, and T1005 is later owner-approved publication. No new interim auditors.
