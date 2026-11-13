# ROADMAP — SUS (living file)

**Authoritative task list:** `TASKS.json` (87 tasks, machine-checked: unique IDs, acyclic deps, no unresolved references).
**Requirements:** `docs/SUS_MASTER_PRD_v1.0.md` + `docs/PRD_AMENDMENTS_v1.1.md` (proposed).
**Build gate:** planning only until owner sends `APERIO` (see `docs/OWNER_DECISIONS_LOG.md`).

| Milestone | Scope | Tasks | Status |
|---|---|---|---|
| M0 | Discovery, gap analysis, ADRs, WBS | T0001–T0005 | **done/review** — awaiting owner approval |
| M1 | Repo skeleton, test runner, CI, schema versioning | T0101–T0104, T0102b | pending |
| M1.5 | **Evaluation Spine** (rubric, harness, baselines, calibration, gate registry) | T0151–T0159, T0158 | pending |
| M2 | Portable skill core (SKILL.md, router, JIT loader, CLI) | T0201–T0205 | pending |
| M3 | Research honesty + anti-slop (evidence, taxonomy, scanner, corpus, trend loop) | T0301–T0305, T0310 | pending |
| M4 | Design intelligence (direction reasoning, tokens, foundations, launch playbooks) | T0400–T0409, T0405b, T0405c | pending |
| M5 | Progressive workflow (contracts, state machine, locks, gates, learning loop) | T0501–T0506, T0508 | pending |
| M5.5 | Hardening matrix | T0551 | pending |
| M6 | Motion system (state-machine schema, tokens, tests) | T0600–T0603 | pending |
| M7 | Studio: dual-stack spike → slice → event contract → verification loop | T0700–T0708, T0709, T0790 | pending — **T0700 is the go/no-go** |
| M8 | Studio hardening + second-wave playbooks | T0801–T0812 | pending |
| M9 | Adapters + installer + support matrix + dogfood sites | T0901–T0906 | pending |
| M10 | Regression, benchmark, independent review, docs, release | T1001–T1005 | pending |

## First unlocked batch (needs owner approval before any of it runs)

`T0101 → T0102 → T0103 → T0104 → T0151` (repo skeleton, fixture A, CI, schemas, rubric CLI)

## Order rationale (what changed vs the original roadmap)

1. Evaluation spine moved **before** knowledge library — quality must be measurable from day one.
2. Direction Reasoning is the first M4 task — it is the biggest lever against AI-typical output.
3. Studio spike runs early and can re-scope the plan; it does not gate knowledge work.
4. Motion gets a formal state-machine schema first, so tests are generated, not hand-written.
