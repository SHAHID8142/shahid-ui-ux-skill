# SUS — Owner Decisions Log

Running record of every instruction from the owner, so nothing is lost between sessions.
Newest entries appended at the bottom. **Nothing here is implemented** unless marked.

**Format:** `Dnn | date | instruction (owner's intent) | status | where it lands`

---

| ID | Instruction | Status | Lands in |
|---|---|---|---|
| D01 | Reorganise the workspace files nicely and read everything before doing anything | done | `README.md`, `docs/`, `archive/` |
| D02 | Build the **full** version — no slimmed MVP. Time is available | fixed requirement | PRD §1, §22; amendments A1–A10 |
| D03 | Whatever is built must be **robust and heavy** — quality over speed | fixed requirement | gates G1–G12; amendments Part 2 |
| D04 | Prove the Live Studio early instead of late | approved | amendment A8 (M7.0 mapping spike) |
| D05 | Approval gates must be real code, not prompt instructions | approved | amendment A3, gates G2/G11 |
| D06 | Licence + distribution channel decided before any publication | approved | PRD §20 open decision; M9/M10 |
| D07 | "Pick the first framework" — owner did not understand this point | **needs explanation** | `PRD_GAP_ANALYSIS.md` Q1 |
| D08 | No copying of proprietary tools; independent heuristics only | fixed requirement | PRD §3, §14; research doc licensing note |
| D09 | Third-party skills, tools and MCP servers may be used | allowed | `TOOLING_CANDIDATES.md` |
| D10 | Cross-check the PRD/plan with multiple agents before building | pending (no subagent tool in this host) | `PRD_GAP_ANALYSIS.md` §4 |
| D11 | **Planning only** until the owner says the word — do not build | fixed gate | this file, §"Build gate" |
| D12 | Owner will brain-dump; items must be captured, not lost | process rule | this file |
| D13 | Full freedom to edit PRD and planning documents | allowed | amendments v1.1 |
| D14 | SUS is **first priority web/UI-UX**: websites, CMS, CRM, portfolios, e-commerce and related web interfaces | fixed priority | amendments Part 0 (scope); fixtures, playbooks, surface modes |
| D15 | **No templated skills.** No preset worlds, page skeletons, layout recipes or copy templates to paste. Output must be derived from brief + research, never filled in from a template | fixed requirement | amendments Part 0.5 (E1–E2); Direction Reasoning (A2) |
| D16 | If a request is **not best practice**, the agent must **argue and bargain with evidence**, not silently comply | fixed requirement | amendments Part 0.5 (E3–E6), dissent ledger |
| D17 | Goal: a **learner, not a believer** — its own training-data priors are hypotheses, never authority; predictions get checked and lessons persist | fixed requirement | amendments Part 0.5 (E7–E9) |
| D18 | **Framework-agnostic, decided by evidence**: owner uses Astro and Next.js; no blind stack choice | fixed requirement | amendments A2b (dual-stack spike), adapter interface in A8 |
| D19 | `APERIO` = **start work** only; does not activate the Aperio Next workflow | clarified | Build gate below |
| D20 | **CMS = the site's admin/control panel** (Operate mode), not content-driven public pages | clarified | amendments Part 0 |
| D21 | Fixtures may use copies of owner's real projects | allowed | amendments A1 |
| D22 | "HAL" was a typo; it appears in **no** original document | closed | removed from open questions |
| D23 | Deeply audit and refine the existing full project; **do not reduce anything**. Keep the master skill and mandatory Live Studio: draw/select/write instructions directly over the consuming project's running browser page, connected to its agent. Check Impeccable's Live command/workflow as a reference. Improve the agent's research, judgment and continued learning within this full scope. | clarified by owner during deep audit, 2026-11-13 | `DEEP_AUDIT_2026-11-13.md`; reconciled in amendments Part 13 — **owner to confirm wording** |

## Build gate

```
BUILD_PERMISSION = false
UNLOCK_KEYWORD  = "APERIO"   # means: start building. Does not load the Aperio Next workflow.
```

Nothing in `packages/`, `skills/`, `adapters/` or any executable artifact is created until the
owner sends `APERIO`. Planning documents, research and questions continue until then.

## Open ambiguities to clarify (not assumptions)

- **Brain dump** — the owner said a large dump is coming; **no dump content has arrived yet** in
  this session. Only the instructions above are on record. If a dump was sent elsewhere, it must be
  pasted here, or it is not part of the plan.

## Documents created so far (planning artefacts only)

**Root state files:** `README.md` (index) · `ROADMAP.md` (milestone status) · `TASKS.json`
(WBS; task count is authoritative in TASKS.json) · `HANDOFF.md` (resume file) · `DECISIONS.md` · `RISKS.md` ·
`TEST_EVIDENCE.md`

**docs/:** `SUS_MASTER_PRD_v1.0.md` (original baseline, unchanged) · `PRD_AMENDMENTS_v1.1.md` ·
`RESEARCH_AND_EXPERTISE_MODEL.md` · `PRD_GAP_ANALYSIS.md` · `COVERAGE_MATRIX.md` ·
`ADR_DRAFTS.md` · `TOOLING_CANDIDATES.md` · `OWNER_DECISIONS_LOG.md` (this file) ·
original handoff bundle: `AGENT_START_PROMPT.md`, `ROADMAP_AND_TASK_PROTOCOL.md`,
`AUDIT_AND_OPEN_DECISIONS.md`, `README_START_HERE.md`

**archive/:** `SUS_Final_PRD_Handoff_v1.0.zip` (byte-identical to the original five)
