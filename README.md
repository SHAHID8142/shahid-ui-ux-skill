> Current builder entry: `AGENTS.md` and `docs/AGENT_CONTINUE_PROTOCOL.md`.
> The build gate is open (owner decision D28, `APERIO`). Publication of the product is
> **not** authorized; release, licensing and the independent audit remain owner decisions.

# SUS — Shahid UI UX Skill

**SUS** is an agent-agnostic design-intelligence skill plus a mandatory **Live Studio** for
building web UI one approved section at a time. It ships rules a coding agent can follow,
checks that make those rules falsifiable, and receipts that record what was actually run.

**Scope (owner decision D14):** web UI/UX — marketing sites, e-commerce, CRM/dashboards,
CMS admin panels, portfolios. No native mobile at v1.
**Epistemic contract (D15–D17):** no templates; the agent must argue non-best-practice requests
with evidence and stay a learner, not a believer in its training data.

## Current state

- **Built:** the portable skill (`skill/`), 36 component playbooks at a 12-part standard, the
  schema contracts (`sus.playbook`, `sus.direction-derivation`, `sus.state-machine`), the
  evaluation harness (gate evaluators, motion oracles, evidence bundles), the Live Studio
  vertical slice (overlay, spatial intent, dry-run diff, approval-gated apply, undo,
  verification loop), host adapters with a generated support matrix and a CLI capability
  matrix (`sus capabilities`) that states, per capability, what the CLI actually does and what
  still needs a capable model or a host browser, and a three-site dogfood audit.
- **Verified:** `pnpm verify` (release suite), `pnpm regression` (adds the end-to-end demo and
  the dogfood audit), `pnpm benchmark` (deterministic benchmark arm).
- **Not done, deliberately:** no human benchmark run (so **no comparative claim is
  permitted**, enforced by `pnpm claims`), no product publication, and no independent audit.
- **Task status lives in one place:** `TASKS.json`. This file does not track progress.

Resuming on another machine: [`docs/RESUME_ON_NEW_MACHINE.md`](docs/RESUME_ON_NEW_MACHINE.md).
Read [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) before trusting anything here, and
[`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) for the owner, review calendar, upgrade window
and security-reporting route.

## Commands

**One entry point (T1032):** `pnpm exec sus <command>` (or `node bin/sus.mjs …`) runs the command
that owns it — `audit`, `bestpractice`, `capture`, `evidence`, `score`, `budget` (eval-core), `scan`
(scanners), `route`, `load`, `precedence`, `capabilities`, `status` (adapters). Arguments and exit
codes pass through unchanged, so `sus audit --help` shows exactly what `sus-eval audit --help` shows.
It runs the built packages: `pnpm build` first. Nothing is published (T1005 is the owner's decision).

| Command | What it does |
| --- | --- |
| `pnpm verify` | handoff + reachability + claim checker + gate suite + lint/format/typecheck/build + direction, motion and playbook gates + support-matrix drift + all unit tests |
| `pnpm regression` | the above plus the end-to-end studio demo and the dogfood audit; writes a report naming the revision |
| `pnpm benchmark` | deterministic benchmark arm; writes the status the claim gate reads |
| `pnpm demo:loop` | the full annotate → intent → diff → approve → apply → verify → undo loop on a real Astro build |
| `pnpm dogfood` | builds and audits the three reference implementations |
| `pnpm support` / `pnpm support:status` | regenerated support matrix, drift check, CLI status text |

**Latest review:** [Deep audit — 2026-11-13](docs/DEEP_AUDIT_2026-11-13.md) records 48 findings,
standards checks, research/learning refinements and full Live Studio contracts. The owner confirmed
that the full scope and mandatory browser drawing/writing Studio remain required. Implementation
was authorised the same day (owner decision D28, 2026-11-13); no scope reduction was authorised,
and publication (T1005) is still the owner's decision.

## Layout

```text
SUS/
├── README.md                          # this index
├── ROADMAP.md                         # milestone table generated from TASKS.json (`pnpm roadmap`)
├── TASKS.json                         # full WBS: canonical task backlog, validated IDs + deps
├── HANDOFF.md                         # fresh-context resume file (protocol §D)
├── DECISIONS.md                       # append-only decision record
├── RISKS.md                           # risk register R1–R18
├── TEST_EVIDENCE.md                   # honest log: what was actually run
├── docs/
│   ├── SUS_MASTER_PRD_v1.0.md         # requirements of record (read first)
│   ├── PRD_AMENDMENTS_v1.1.md         # proposed: scope, epistemic contract, gates, rubric, studio spec
│   ├── RESEARCH_AND_EXPERTISE_MODEL.md # research: how expert designers work → mechanisms
│   ├── PRD_GAP_ANALYSIS.md            # cross-check findings F1–F20 + open questions
│   ├── COVERAGE_MATRIX.md             # what SUS covers / partially / never
│   ├── LIMITATIONS.md                 # honest limits: measured vs unmeasured, host support
│   ├── SUPPORT_MATRIX.md              # generated host tiers (`pnpm support:write`)
│   ├── BUILD_COMPLETION_HANDOFF.md    # what was built and verified, at which revision (T1006)
│   ├── GATE_REGISTRY.md               # G1–G13 → owning task, check, verdict rules, what is still not-run
│   ├── TOOLING_CANDIDATES.md          # open-source tool candidates + licences
│   ├── OWNER_DECISIONS_LOG.md         # every owner instruction, D01–D34, build gate
│   ├── ADR_DRAFTS.md                  # 6 architecture decisions; adopted per D29 (ADR-003 as amended)
│   ├── THREAT_MODEL.md                # T1–T10 threats and the retention constraints enforced in code
│   ├── AGENT_START_PROMPT.md          # paste into a coding agent to start
│   ├── ROADMAP_AND_TASK_PROTOCOL.md   # milestones, micro-task record, review gates
│   ├── AUDIT_AND_OPEN_DECISIONS.md    # audit findings + deliberately open decisions
│   ├── DEEP_AUDIT_2026-11-13.md       # current deep audit; proposed refinements, full scope retained
│   └── README_START_HERE.md           # original handoff bundle readme
└── archive/
    └── SUS_Final_PRD_Handoff_v1.0.zip # original bundle (byte-identical to docs/*.md)
```

Filenames were kept as-is so the internal cross-references between the documents
still resolve; only the folder location changed.

## What is being built (condensed)

| Area | Requirement |
|---|---|
| Portable core | `SKILL.md` per Agent Skills spec; thin entry + just-in-time loaded foundations/playbooks; no hardcoded agent or model |
| Commands | Stable intents `audit`, `unslop`, `refine`, `redesign`, `create`, `system`, `live`; real syntax per host |
| Anti-slop | 3 tiers (objective defect / contextual mismatch / aesthetic stereotype), versioned pattern registry, measured false positives — no dogma against cards, grids or gradients |
| Design intelligence | Semantic tokens, color, type, layout, a11y, components (button/CTA/nav/input first), copy + SEO, niche research with provenance |
| Motion | First-class: variants vs states, trigger→target specs, motion tokens, reduced-motion alternatives, interruption tests |
| Progressive build | Page blueprint → one section at a time → explicit user approval → implement → verify → explicit acceptance before next section |
| Project memory | `.sus/` per target project: PRODUCT, DESIGN_CONTRACT, DECISIONS, SECTION_STATUS, progress checkpoints |
| Live Studio (mandatory for GA) | Browser overlay, select/draw/annotate, spatial intent ("move heading into this box"), source-mapped dry-run diff, explicit approve, undo/rollback, localhost-only secure bridge |
| Safety | Workspace allowlist, no arbitrary command execution from annotations, sanitized untrusted page content, fail-closed on ambiguous mapping, never overwrite uncommitted user work |
| Release | Honest per-host support matrix, real tests only, published benchmark before any `superior` claim |

## Deliverable milestones

M0 discovery/ADRs → M1 toolchain & QA → M2 portable skill core → M3 research & anti-slop →
M4 design intelligence → M5 progressive workflow → M6 motion system → M7 Studio vertical slice →
M8 Studio hardening → M9 multi-agent adapters → M10 benchmarks & release.

## Known open decisions (block nothing at planning time)

1. Licence and publication channel (D06/B003) — still undecided. There is no `LICENSE`
   file; the repository being public (D34) is not that decision. Nothing is published.
2. Studio stack and first supported web framework — the slice runs on Astro and Next has one
   editing path; no host reaches the `supported` tier yet.
3. Real identities/versions of target hosts — FreePi holds a fresh receipt (`51ad458af6e0`,
   2026-11-16, 8/8) but stays `experimental` because Live Studio never ran there; ZCode's
   receipt is stale and Codex, Claude Code and Cursor have none. No host reaches `supported`
   (`docs/SUPPORT_MATRIX.md` is the generated record).
4. Telemetry, screenshot/DOM retention, remote-work policy — retention is constrained in code
   (redaction, per-record TTL, deletion by subject or revoked consent, see
   `docs/THREAT_MODEL.md` T9–T10) and the code takes the retention duration as configuration;
   the policy value itself and any evidence publication remain owner decisions. Image
   redaction and screenshot-binary retention are **not** implemented.
5. First-release playbook catalog size and order — settled at 36 built playbooks.
6. Per-host command syntax — settled per adapter; the CLI fallback is documented.
7. Benchmark fixtures, hardware and published thresholds — the deterministic arm runs; the
   human arm has no participants, so the claim gate stays closed.

## How to resume in a fresh session

1. Read `docs/OWNER_DECISIONS_LOG.md` first (owner instructions + the `APERIO` build gate),
   then `docs/SUS_MASTER_PRD_v1.0.md` and `docs/PRD_AMENDMENTS_v1.1.md`.
2. Read `docs/AGENT_START_PROMPT.md` for the required first-response output format and the
   canonical authority order (it must name the build gate — review H5).
3. Inspect the workspace before proposing anything. Implementation is already authorized
   (owner decision D28, 2026-11-13) against the adopted architecture (ADR-001/002/004/005/006,
   ADR-003 as amended by D29), so the authorisation question is settled: read the current
   state in `.sus-dev/STATE.md` and `TASKS.json` and continue the next eligible task.
