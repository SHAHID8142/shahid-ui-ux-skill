# DECISIONS

Append-only. Format: `date | decision | rationale | alternatives | approval | scope`.

## Planning-phase decisions (owner)

- 2026-11-13 | Full product, no slim MVP; slow but robust and heavy | owner D02/D03 | slim v0.1 rejected | approved | global
- 2026-11-13 | Scope: web UI/UX (marketing, e-commerce, CRM/admin, CMS admin, portfolio); native out of v1 | D14, D20 | multi-platform rejected | approved | PRD §1, coverage matrix
- 2026-11-13 | Epistemic contract: no templates; challenge non-best-practice with evidence; learner-not-believer | D15–D17 | template/world-catalogue approach rejected | approved | amendments Part 0.5
- 2026-11-13 | Framework-agnostic; Studio spike on Next.js AND Astro before commitment | D18 | single-stack lock-in rejected | approved | ADR-003, A2b
- 2026-11-13 | `APERIO` = start build; does not load Aperio Next workflow | D19 | — | approved | build gate
- 2026-11-13 | GitHub private repo `SHAHID8142/shahid-ui-ux-skill`; continuous commit+push | owner | — | approved | repo
- 2026-11-13 | Evaluation spine (M1.5) precedes knowledge library (M2–M4) | research: unfalsifiable requirements F1–F6 | knowledge-first rejected | proposed → owner | milestone order
- 2026-11-13 | Gates G1–G12 enforced in CI, not in prose | D05 | prompt-only discipline rejected | proposed → owner | amendments Part 2
- 2026-11-13 | Rubric: 12 axes, 3 tiers; judged scores never gate CI | F2, ui-craft practice | single score rejected | proposed → owner | amendments Part 3
- 2026-11-13 | CDP-attached Studio overlay; dev plugin optional for mapping | ADR-003 | runtime instrumentation-only rejected | proposed → owner | ADR-003
- 2026-11-13 | TypeScript everywhere, zero-install npx at v1 | Q7 default | Rust core deferred | proposed → owner | ADR-006

## Open decisions requiring owner input

- ADR-001…006 approval (each individually)
- Licence + public channel (D06 — before any publication)
- Telemetry/retention policy (none by default proposed)
- Benchmark thresholds (set in M1.5 from measured baselines, not invented)

## 2026-11-13 — explicit supersession

D24–D27 and docs/AGENT_CONTINUE_PROTOCOL.md supersede continuous commit+push and
intermediate outside review requirements. Commit locally; final private push after
verified build, then stop for independent audit. Public release remains separate.
Full scope remains required; preview-only and automatic scope cuts cannot satisfy it.
No proposed ADR or architecture choice was approved by this adoption.
