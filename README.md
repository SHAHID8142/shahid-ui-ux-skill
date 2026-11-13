# SUS — Shahid UI UX Skill

Planning workspace for **SUS**: an agent-agnostic design-intelligence skill + mandatory
**Live Studio** for building high-quality web UI one approved section at a time.

**Current state:** specification only. No code has been written yet.
Milestone M0 (discovery + architecture decisions) is not started.

## Layout

```text
SUS/
├── README.md                          # this index
├── docs/
│   ├── SUS_MASTER_PRD_v1.0.md         # requirements of record (read first)
│   ├── AGENT_START_PROMPT.md          # paste into a coding agent to start
│   ├── ROADMAP_AND_TASK_PROTOCOL.md   # milestones, micro-task record, review gates
│   ├── AUDIT_AND_OPEN_DECISIONS.md    # audit findings + deliberately open decisions
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
| Release | Honest per-host support matrix, real tests only, published benchmark before any "superior" claim |

## Deliverable milestones

M0 discovery/ADRs → M1 toolchain & QA → M2 portable skill core → M3 research & anti-slop →
M4 design intelligence → M5 progressive workflow → M6 motion system → M7 Studio vertical slice →
M8 Studio hardening → M9 multi-agent adapters → M10 benchmarks & release.

## Known open decisions (block nothing at planning time)

1. Publication channel + open-source license.
2. Studio stack and first supported web framework (ADR after feasibility study).
3. Real identities/versions of target hosts (FreePi, Codex, ZCode, WorkBuddy, Auto Pilot, …).
4. Telemetry, screenshot/DOM retention, remote-work policy.
5. First-release playbook catalog size and order.
6. Per-host command syntax.
7. Benchmark fixtures, hardware and published thresholds.

## How to resume in a fresh session

1. Read `docs/SUS_MASTER_PRD_v1.0.md`, then `docs/ROADMAP_AND_TASK_PROTOCOL.md`.
2. Read `docs/AGENT_START_PROMPT.md` for the required first-response output format.
3. Inspect the workspace before proposing anything; do not start implementation
   without explicit user approval of the architecture and first 3–5 micro-tasks.
