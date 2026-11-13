# SUS — Independent Architecture & Product Review

**Reviewer agent:** ZCode (GLM, `account:zai-start-plan/GLM-5.3-Flash`) — independent review session, agent name `zcode-glm`
**Reviewed repository:** `SHAHID8142/shahid-ui-ux-skill` (private)
**Reviewed commit (baseline of this entire review):** `cda9d9dcdc2c552825d826afab52c03a823c5268` (`cda9d9d`), branch `main`
**Review date:** 2026-11-13
**Review type:** Documentation/specification audit only. **No product code exists in this repository; nothing was implemented, modified, or executed beyond read-only inspection and validation scripts.**
**Independence statement:** This review was completed **before** reading any other agent's review. Another agent's review file (`reviews/independent/antigravity-opus-2026-11-13-cda9d9d.md`, committed to `main` as `a503b23` *during* this session) was **not opened or read**. The repository's own planning/audit documents *are* the artifact under review and were read as evidence, but every load-bearing claim in them was re-verified independently (method in Appendix A). Where I confirm or refute the repo's own records, that is stated explicitly.

---

## 1. Executive summary

SUS is an **agent-agnostic design-intelligence skill + mandatory Live Studio** for building web UI one approved section at a time. The repository currently contains **only planning artifacts**: a 484-line master PRD, a 488-line amendments document, a research model, gap analysis, coverage matrix, 6 ADR drafts, tooling candidates, a deep audit (48 findings), owner-decision log, and a machine-checked WBS (`TASKS.json`). No `SKILL.md`, no packages, no tests, no product code.

**What is genuinely strong.** This is one of the more rigorous planning corpora I have audited. The epistemic contract (no templates; seven claim kinds; challenge protocol; prediction/lesson lifecycle) is well conceived and mostly operationalized as gates and schemas rather than prose. The Live Studio specification (CDP-attached overlay, per-language syntax-aware writes, transaction manifests, three-stage authorization, localhost trust boundary with DNS-rebinding/token/Chrome-136-profile specifics) is unusually concrete. The WBS at `cda9d9d` is structurally valid — I independently reproduced: **84 tasks, 0 duplicate IDs, 0 unresolved dependencies, 0 cycles, 0 backward milestone dependencies, and all five claimed barrier edges present**. The honesty culture (evidence log, "not-run is never pass", coverage matrix of limitations) is the right differentiator.

**What is wrong.** The committed revision **contradicts itself in its own authoritative reconciliation record**, and the workspace is being modified concurrently outside version control. Specifically:

1. `docs/PRD_AMENDMENTS_v1.1.md` Part 13 (committed) states that findings F16–F21, F26–F33, F36 and F45 were "accepted and applied in this revision" — but the committed file still contains the **pre-correction text** for every one of those areas (uncorrected WCAG gates G4–G9 at lines 209–214, invented mapping confidences at line 321, `git stash create` recovery at line 327, 200-char description limit at line 351). The actual corrections exist only as **uncommitted working-tree changes**.
2. The working tree diverged **during this review session** (8 files modified + 1 untracked between 21:02 and 21:04 local), changing `TASKS.json` from 84 to 87 tasks. Committed docs cite the 87-task state that does not exist at the reviewed commit.
3. Committed documents disagree on basic machine-checkable facts (task counts 84/87/73 across five files; three nonexistent task IDs referenced by committed `ROADMAP.md`), and `TEST_EVIDENCE.md` itself contains a second false claim ("task counts updated to 84 in README/ROADMAP/HANDOFF").

For a product whose core thesis is *"auditable quality — every claim traceable"* (RESEARCH_AND_EXPERTISE_MODEL.md §5), these integrity defects are not cosmetic: they corrupt the exact record a builder would rely on after `APERIO`.

**Independent final verdict: conditional go.** The product vision, architecture, and methodology are sound and unusually well specified — better than most pre-code planning I review. But **do not send `APERIO`** until (a) the pending reconciliation corrections are actually committed (or Part 13's claims are re-worded), (b) the task-graph barrier gaps I verified are closed, and (c) a single canonical start manifest resolves the conflicting entry points. All three are small, well-scoped planning-phase fixes (est. 1–2 sessions), detailed in §6–§8.

---

## 2. Scope, method, and status of what was inspected

### 2.1 What I actually inspected

| Artifact | Depth |
|---|---|
| All 19 tracked Markdown documents + 1 untracked (`docs/GATE_REGISTRY.md`) | Read in full |
| `TASKS.json` at HEAD (84 tasks) and working tree (87 tasks) | Parsed and validated programmatically (Appendix A) |
| `archive/SUS_Final_PRD_Handoff_v1.0.zip` | Byte-compared against `docs/` members (5/5 identical — independently reproduced) |
| Git history (9 commits), status, working-tree diffs | Inspected; mid-review divergence logged |
| Product source, `SKILL.md`, packages, tests | **Do not exist.** Nothing to run. |
| Impeccable Live (competitor) | **Not inspected by me**; I reviewed only the repo's documented claims about it. No runtime was launched. |

### 2.2 What I verified independently vs. what I take on the repo's word

Independently **verified by script**: task-count integrity, dependency graph (cycles/unresolved/backward), five barrier edges, T1001/T1002/T1003/T1005 ancestry coverage, orphan tasks, ZIP byte-identity, cross-document count claims, audit finding counts (48 = 35 High + 13 Medium), committed-vs-worktree divergence (file list, mtimes, diffs).

Taken on the repo's word (not re-verifiable from this repo): external source claims (WCAG clauses, Chrome 136 behavior, Node EOL dates, Impeccable feature counts, license labels on candidate tools). I spot-checked internal consistency of these claims but did not fetch the primary sources; where the repo itself already flags them as "verify at adoption," I treat them as proposals.

### 2.3 Repo-state observation (process, not product)

Between the start of this session and report writing, a concurrent process modified 8 tracked files and added `docs/GATE_REGISTRY.md` (mtimes 21:02:10–21:04:34), and at 21:12 committed another agent's review to `main` (`a503b23`). I did not interfere with those changes and reviewed the committed state throughout. This event is itself a finding (§6, H2) because SUS's own design prescribes single-writer discipline with leases for *consuming* projects while its own workspace currently has multiple concurrent writers.

---

## 3. Overall architecture evaluation

### 3.1 The architecture is coherent and appropriately layered

The seven-layer design (PRD §5.1: orchestrator → foundations → playbooks → rules/evaluation → commands/adapters → Studio runtime → project-local state) cleanly separates *reasoning instructions* (Markdown skill) from *runtime powers* (Studio, scanners), with adapter contracts isolating host protocols (§5.2). Key architectural decisions are sound:

- **Packaging:** official Agent Skills layout as canonical, host entries as generated artifacts, triggering confined to the ≤1,024-char description, `evals/evals.json` shipped (ADR-002). Reversal triggers are defined. Good.
- **Studio bridge:** CDP-attached overlay + optional dev-server plugin for `data-sus-id` stamping; variant preview via on-disk writes consumed by the framework's own HMR (ADR-003). This avoids forked builds and CSP fights *by construction*, with the Chrome 136 dedicated-profile caveat correctly captured (committed ADR-003 line 89). The security posture (127.0.0.1 bind, Host/Origin allowlist, HMAC session token, CSP nonce, Zod validation, payload caps, append-only audit) matches the threat surface.
- **Tokens:** DTCG 2025.10 as *format*, honest about its community-report status (F9 correctly resolved at HEAD; ADR-004), internal semantic layer as contract, exports as derived outputs. Good.
- **Schemas:** Zod-authored with generated JSON Schema, `$id`+`version`, versioned migrations (ADR-005). Good.
- **Runtime:** TypeScript/Node 22 LTS, zero-install npx, pnpm workspaces, reversibility triggers defined (ADR-001/006 — both corrected at HEAD: Node 22 floor committed at ADR-006 line 169). Good.

### 3.2 Architectural weaknesses and unsolved hard parts

1. **The hardest problem is correctly identified but has no designed solution:** edit-owner resolution for shared components, repeated instances, and style-vs-content-vs-data ownership (audit F29). The spec prescribes *probing* it in the T0700 spike (acceptance includes "selection → edit-owner resolution → preview → apply → cleanup", verified in TASKS.json) — appropriate for planning stage, but the go/no-go metric is currently defined on an invented confidence scale (§6, M1 below), which would let the spike "pass" on a number that is not a measurement.
2. **Framework-agnostic write path (Next.js App Router + Astro)** is a genuinely hard multi-parser problem. The committed §7.2 still says "AST-based edits (ts-morph / recast / jscodeshift) only" — which is wrong for `.astro` sources; the corrected per-language write path exists only uncommitted. As committed, the spec would push builders toward a JSX-only mental model.
3. **Concurrency design is good for consumers but not applied to SUS itself.** Lease generation/fencing is specified for consuming projects (T0504 acceptance: "expired worker cannot apply after re-acquire (F35)" — committed) while the SUS repo currently has concurrent uncommitted writers (H2).
4. **Two-protocol separation (A11)** is committed and correct; it just needs to be enforced by the loader, not stated (ties to H5).

### 3.3 Architecture score: 4/5 for a specification (nothing is implemented; design quality is what can be graded)

---

## 4. Requirements completeness and contradictions

### 4.1 Completeness — unusually high, with specific residuals

The v1.0 PRD's 22 sections plus amendments Parts 0–13 cover scope, personas, workflows, non-goals, operating principles, knowledge architecture, progressive workflow, anti-slop, motion, content/SEO, Studio, commands, project memory, provenance, engineering/testing, acceptance gates, milestones, builder protocol, risks, open decisions, references, and Definition of Done. Gap analysis F1–F20 and deep audit F01–F48 systematically close unfalsifiable requirements.

Residual gaps I independently confirm at HEAD:

| Gap | Evidence | Impact |
|---|---|---|
| No whole-task/user-flow research deliverable (audit F05) | Part 13 at HEAD has **no recorded disposition** for F05; no task in the 84-task WBS covers user-flow/IA validation | Section-level polish without journey-level validation; contradicts PRD §6's own IA/heuristics module |
| Review-fallback policy conflict unresolved (audit F42) | Amendments Part 4 ¶6: "no independent critic → cannot be marked GA-acceptable" vs PRD §18.6: isolated pass/deterministic fallback permitted | A GA decision could be argued either way; the audit flagged it; no owner ruling recorded |
| 11 of 48 audit findings have no recorded disposition in Part 13 at HEAD | F05, F08, F09, F10, F13, F14, F22, F34, F35, F42, F43 absent from the committed disposition list (I counted 37/48 dispositioned) | A fresh agent cannot tell which findings are adopted, pending, or rejected |
| Part 9 claims protocol lacks four-mode coverage at HEAD | Committed amendments line 363 requires "n ≥ 20 raters per brief" but no four-surface-mode brief coverage; audit F43 criticized "six briefs × three modes" | Benchmark could under-cover claimed surfaces |
| Maintenance ownership has acceptance criteria but no owning task | T1004 acceptance includes F48 items (verified); no dedicated maintenance/review-calendar task exists | "Robust and heavy" needs an operator, not just a checklist line |

### 4.2 Contradictions — the substantive ones are resolved in design but corrupted in commit state

Design-level contradictions from v1.0 (F7 dogma-vs-stereotype, F8 AA/AAA, F9 DTCG status, F10 schedule-vs-mandate, F12 lock, F11 untestable host target) are all addressed in the amendments. However, the **committed** state introduces a new, self-inflicted contradiction class: the reconciliation record asserts corrections that the same commit does not contain (§6, H1). This is worse than the original findings because it wears the badge of having fixed them.

---

## 5. Feature-by-feature assessment

Status legend: **Planned** (specified, no code) · **Spec-corrected** (correction exists uncommitted only) · **Unverified** (no test possible). *Nothing in this repo is implemented or tested; that is honest and consistent with the build gate.*

| # | Area | Assessment | Status | Key evidence |
|---|---|---|---|---|
| 1 | **Vision, requirements, scope** | Strong. D14 scope table, four surface modes, explicit out-of-scope list, epistemic contract D15–D17. Scope documents are internally consistent at the design level. | Planned; scope contradictions resolved in design | PRD §1–§4; amendments Part 0, Part 0.5 |
| 2 | **Master skill architecture, sub-skills, playbooks** | 12-part playbook schema (PRD §6) is thorough but still reads recipe-shaped; F03's "questions/mechanisms/tradeoffs" redefinition is recorded in Part 13 but the §6 schema text itself is unchanged at HEAD. Precedence resolver "in code, not prose" is committed (Part 8) — good, and testable. | Planned; F03 refinement partially reflected | PRD §6; amendments Part 8 |
| 3 | **Multi-agent compatibility, install, portability** | Honest tiering (supported/experimental/untested), smoke-test-before-label rule (T0902), generated `compatibility.json` (A9), CLI fallback. FreePi correctly downgraded from "supported" to "development host" in the committed coverage matrix (TEST_EVIDENCE defect #7). | Planned | COVERAGE_MATRIX §4; ADR-002; ROADMAP_AND_TASK_PROTOCOL §F/G |
| 4 | **Research intelligence & anti-slop** | Best-in-class design on paper: 7 claim kinds (committed, amendments line 52), E1–E9 contract, three-tier findings with G10 precision/recall corpus gate, labelled negative corpus, "no fabricated citations" acceptance, offline honesty. Residual: F08 (schema-valid ≠ true) and F09 (research questions/stopping) have no recorded disposition at HEAD; T0301's acceptance as written can pass on citation metadata alone. | Planned; F08/F09 corrections unrecorded | amendments Part 0.5, Part 2 G10; TASKS T0301–T0305, T0310 |
| 5 | **Section workflow, tokens, approval gates** | 5A/5B split committed; section state machine; lease fencing (T0504, committed); shared-impact reopening (T0505, committed); approval receipts version-bound (T0508, committed: "duplicate click applies at most once", "changed content invalidates approval"). G2 section-order gate. Strong. | Planned | TASKS T0501–T0508; amendments Part 2 |
| 6 | **Motion & interaction intelligence** | Comprehensive: variants vs states, trigger→target spec fields, motion tokens, interruption tests, reduced-motion parity. But at HEAD the gate definitions (G6) and the reduced-motion semantics carry pre-correction text ("every declared transition has a reduced-motion branch" — the exact over-simplification audit F19 flagged); corrected text is uncommitted. M6.5 state-machine schema with generated tests is committed as a concept (T0600 series). | Planned; G6 semantics spec-corrected (uncommitted) | PRD §9; amendments Part 2; TASKS M6 |
| 7 | **Live Studio** | The deepest spec: drawing/select/write over the running page, spatial intent compiled to constraints (pixels never reach source — §7.3), three distinct authorizations (generate/preview/apply — §7.4 corrected text uncommitted), transaction manifest, event/session contract (T0709, committed), recovery. Security: localhost-only, origin/DNS-rebinding guard, bridge-held secret, Chrome 136 profile (committed ADR-003). Residual at HEAD: §7.1 publishes invented confidences 1.0/0.6/0.3 (line 321) while T0700's go/no-go thresholds on the same invented scale (TASKS T0700 acceptance) — the corrected "evidence tiers" language is uncommitted. Studio accessibility (F34) lands at T0807 — late but present. | Planned; §7.1/§7.2/§7.4/§7.5 corrections uncommitted | PRD §11; amendments Part 7; TASKS T0700–T0709, T0790 |
| 8 | **Content intelligence, SEO, a11y, responsive** | Claims register, no-invented-metrics rule, M4.7 content-first, M4.8 art direction (committed as A4/A5), hardening matrix T0551 with locale depth (F46 — verified in T0551 acceptance), G3 placeholder gate, honest SEO (no word-count myths, PRD §10). Residual: F05 user-flow gap (above). | Planned | amendments A4/A5, A7; TASKS T0406–T0408, T0551 |
| 9 | **Roadmap, tasks, testing, verification** | Task graph structurally valid at HEAD (verified). But: barrier coverage incomplete (H4), T1001 deps mis-described as "terminal tasks of M3–M9" (TEST_EVIDENCE line 91 — inaccurate), orphan eval tasks T0156/T0158 (nothing consumes them), and count drift across five documents (H3). Evaluation spine (M1.5) before knowledge library is the right ordering. | Planned; graph needs barrier completion | TASKS.json (validated); TEST_EVIDENCE |
| 10 | **Security, reliability, release readiness** | Threat model is unusually complete for pre-code: action-boundary authorization (F31 — corrected text uncommitted; committed §11.3 has sanitization-only language), data-flow map (F33 — uncommitted), retention policy open (recorded), claims protocol Part 9 (n≥20 floor committed but no four-mode coverage at HEAD), release gates G1–G12 + Definition of Done §22. GATE_REGISTRY.md (ownership, verdict vocabulary, non-waivable classes) exists but is **untracked**. | Planned; security refinements uncommitted | amendments Part 7.5, Part 9, Part 2; docs/GATE_REGISTRY.md (untracked) |

---

## 6. Severity-ranked findings (loopholes, missing requirements, risks)

Each finding: evidence → impact → recommendation → verification criteria. IDs are this review's own (H = High, M = Medium, L = Low). High = resolve before `APERIO` / affected implementation.

### H1 — High · The reconciliation record claims corrections that the committed revision does not contain

**Evidence (all line numbers from committed files at `cda9d9d`):**
- `docs/PRD_AMENDMENTS_v1.1.md` Part 13 (lines ~432–448) states: "Accepted and applied in this revision: … F16–F20 (gates restated per actual WCAG criteria and exceptions), F21 (lab vs field separated), … F26–F33 (Studio event contract, preview authorization, evidence tiers, per-language write path, transaction manifest, action-boundary security, concrete auth, data-flow map), F36 (failure UX), … F45 (description limit corrected to spec's 1,024)".
- The same committed file still contains the pre-correction text: line 209 `G4 … zero violations at serious/critical` (no criteria→evidence map); line 210 `G5 … LCP/CLS/INP field proxy` (lab/field not separated); line 211 `G6 … every declared transition has a reduced-motion branch` (no WCAG-2.2 applicability); line 212 `G7 … horizontal scroll at 320/390/768/1024/1440 = 0` (omits WCAG 1.4.10 exceptions); line 213 `G8 … ≥24×24 … (WCAG 2.2 2.5.8)` (omits SC 2.5.8 exceptions); §7.1 line 321 `Confidence: **1.0** stamped id · **0.6** … · **0.3**` (the "invented confidence values" F28 flagged); §7.2 line 327 `Pre-write snapshot via git stash create` (the recovery anti-pattern F30 flagged); line 351 `total catalogue entry ≤ 200 chars` (the wrong limit F45 flagged — spec allows 1,024).
- The corrected versions of all of the above exist **only as uncommitted working-tree edits** (verified by `git diff docs/PRD_AMENDMENTS_v1.1.md`).

**Impact:** A builder resuming from `main` reads Part 13, believes the WCAG/security/write-path corrections are in force, and implements against definitions the project's own audit demonstrated to be wrong (e.g., G7 as committed *contradicts WCAG 1.4.10* — it would fail legitimate data tables; G4 as committed conflates axe severity with AA conformance). This is the second inaccurate claims record in this repository's history (the first being the "ALL CHECKS PASSED" false entry, TEST_EVIDENCE line 14, superseded at line 44) — and it sits inside the document that defines the claims-honesty contract (Part 9, Part 0.5 E5). It directly undermines the product thesis of auditable honesty.

**Recommendation:** Either (a) land the pending working-tree corrections as one reviewed reconciliation commit, or (b) if they are not ready, re-word Part 13 to "accepted as proposals, pending commit <sha>" — never record "applied" in the same commit that does not apply them. Adopt the GATE_REGISTRY rule permanently: a change record and the change itself must land in the same commit.

**Verification criteria:** `git show HEAD:docs/PRD_AMENDMENTS_v1.1.md | grep -cE "field proxy|git stash create|≤ 200 chars|zero violations at serious|Confidence: \*\*1.0\*\*"` → `0`; committed G4–G9 match committed `docs/GATE_REGISTRY.md` rows; Part 13's "applied" list matches a script that greps each claimed correction.

### H2 — High · Concurrent, uncommitted modification of the authoritative planning state (including during this review)

**Evidence:** Session-start `git status`: 2 modified files + 1 untracked. Current: **8 modified + 1 untracked** (`HANDOFF.md`, `README.md`, `RISKS.md`, `ROADMAP.md`, `TASKS.json`, `docs/DEEP_AUDIT_2026-11-13.md`, `docs/OWNER_DECISIONS_LOG.md`, `docs/PRD_AMENDMENTS_v1.1.md`, `docs/GATE_REGISTRY.md`), mtimes 21:02:10–21:04:34, and a third-party review commit (`a503b23`) landed on `main` at 21:12:15. `TASKS.json` changed 84 → 87 tasks mid-review (adding T0159, T0811, T0812 — which committed `ROADMAP.md` already referenced).

**Impact:** (1) Review/verification baselines become ambiguous — the very failure mode F41 and R10 (context/handoff drift) describe, now happening in real time. (2) Weeks of planning state (gate registry, WCAG corrections, 87-task graph) exist only in an uncommitted tree that any concurrent process can clobber. (3) SUS prescribes lease/fencing discipline for consuming projects (T0504) but its own workspace violates one-writer discipline. (4) Multiple agents committing reviews to `main` without coordination creates a collision hazard for the `reviews/independent/` workflow itself.

**Recommendation:** Commit the coherent pending set as a single reconciliation commit (or stash it deliberately); adopt a one-writer rule for the SUS repo (its own `.sus` lease design applied to itself); route review PRs through branches, as this review does.

**Verification criteria:** `git status --porcelain=v1` empty (or intentionally explained); `git log -1` shows the reconciliation commit; every file's mtime ≤ its last commit time.

### H3 — High · Cross-document count/reference drift in the committed state (second false entry in TEST_EVIDENCE)

**Evidence (all at HEAD, independently recomputed):**
- Committed `TASKS.json` = **84 tasks**. But committed `ROADMAP.md:3` says "87 tasks, machine-checked"; `ROADMAP.md:11` lists "T0151–T0159" and `:19` "T0801–T0812" — **T0159, T0811, T0812 do not exist in the committed TASKS.json**; committed `RISKS.md:13` (R7) says "87 tasks"; committed `HANDOFF.md:9` says "87 tasks, validated" while `HANDOFF.md:50` says "TASKS.json now 84 tasks" (**self-contradiction within one file**); `HANDOFF.md:47` claims the audit inspected "all 87 task records" while the audit's own verification table (DEEP_AUDIT §13) says **73** (correct for its baseline `7c9975a`); `OWNER_DECISIONS_LOG.md:55` says "73-task WBS, validated" (stale).
- `TEST_EVIDENCE.md:95` claims "README/ROADMAP/HANDOFF: task counts updated to 84" — **false** for ROADMAP and HANDOFF at HEAD. Only `README.md:26` ("84 tasks") is correct.
- (For fairness: the *uncommitted* 87-task worktree would fix ROADMAP/RISKS but *still* contradicts TEST_EVIDENCE's "84" claim and HANDOFF's internal contradiction — the drift pattern repeats.)

**Impact:** `ROADMAP.md` advertises itself as "machine-checked … no unresolved references" while naming three nonexistent IDs — precisely the class of defect (unresolved reference) the project recorded as its worst audit moment. A resumed agent trusting ROADMAP/HANDOFF gets wrong baselines; the evidence log accrues a second false entry, eroding the "only actual command output counts" rule.

**Recommendation:** Make counts and task-ID ranges **generated artifacts** from `TASKS.json` (the T0159 validator already proposes this for gates — extend it to prose claims: every "N tasks" claim and every `T\d+…` ID named in tracked .md must match the committed TASKS.json). Fix at HEAD, not only in the worktree.

**Verification criteria:** A script (see Appendix A) reports 0 mismatches for: task-count claims across README/ROADMAP/HANDOFF/RISKS/OWNER_DECISIONS_LOG; task-ID references in ROADMAP/GATE_REGISTRY; HANDOFF internal consistency.

### H4 — High · Barrier encoding incomplete: release/regression gates can pass without mandatory deliverables

**Evidence (computed ancestry over committed TASKS.json):**
- `T1001` (cross-module regression suite) ancestry **excludes** M8 hardening tasks **T0801–T0804** (multi-select, mapping ambiguity/conflict handling, viewport visual diffs, scanner overlay) and **T0809** (second-wave playbooks), plus M7's **T0709** (session/event contract) and M4's **T0400** (direction engine), **T0406–T0408** (content/SEO, art direction).
- `T1005` (release approval + publish) ancestry excludes **16 implementation tasks**: T0103 (CI), T0102b (fixtures B–D), T0156 (token/cost budgets), T0158 (behavioral eval suite), T0400, T0406–T0408, T0709, T0801–T0804, T0809, T0903, T0906.
- `T0156` and `T0158` are **orphans** — no task depends on them and they appear in no release ancestry (also T0801–T0804, T0406).
- `TEST_EVIDENCE.md:91` describes the fix as "T1001 deps enumerated (**terminal tasks of M3–M9**)" — inaccurate: the 17 deps are non-terminal tasks, and the terminal tasks of M4/M7/M8/M9 are exactly the excluded ones.

**Impact:** §22 Definition of Done and the audit's own F38 require Studio hardening, behavioral evaluation, and content modules to gate release. As committed, a "regression green → release" path exists with multi-select, ambiguity handling, scanner overlay, session/event contract, behavioral evals, and direction engine all unfinished. The reconciliation claim "barriers encoded as dependencies" (Part 13) is therefore only partially true.

**Recommendation:** Add explicit completion barriers: `T1001 ← {T0801, T0802, T0803, T0804, T0809}`; `T1002 ← {T0156, T0158}`; `T1005 ← {T0103, T0102b, T0400, T0406, T0407, T0408, T0709, T0906}`; keep T1003 ← T0904 (verified present). State the dep-selection rule (e.g., "T1001 deps = all M3–M9 tasks", or "all terminal tasks") so future enumeration is checkable rather than narrative.

**Verification criteria:** Scripted assertion: ancestry(T1001) ⊇ all M8 task IDs; ancestry(T1005) ⊇ every task in M1–M9; no orphans among tasks whose acceptance says "recorded/measured/released"; the assertion ships as a repo test (fits T0159's validator).

### H5 — High · Startup authority conflict: the "universal" start prompt still omits the build gate and epistemic contract (audit F01 confirmed live at HEAD)

**Evidence:** `docs/AGENT_START_PROMPT.md:5–8` loads exactly three files (`SUS_MASTER_PRD_v1.0.md`, `ROADMAP_AND_TASK_PROTOCOL.md`, `AUDIT_AND_OPEN_DECISIONS.md`) — none of which contain `APERIO`, D14–D23, or the amendments. `README.md:83–88` ("How to resume") gives a second order that also omits `OWNER_DECISIONS_LOG.md` and the amendments. `HANDOFF.md:21–25` gives a third order that includes them. Part 13 marks F01 as "partial (approval statuses)" at HEAD — but the three conflicting entry points remain.

**Impact:** A faithful fresh agent can complete the entire first-response protocol and begin implementation after ordinary batch approval **without ever seeing the keyword gate** — the exact failure the audit predicted. The D19 gate ("build only after `APERIO`") is the owner's most important control and it is reachable only via one of three divergent paths.

**Recommendation:** Create one canonical start manifest (`docs/START_HERE.md` or equivalent) with the authority order from F01 (current owner instruction → approved decision entries → effective requirements → proposals → historical), and make `AGENT_START_PROMPT.md`, `README.md`, and `HANDOFF.md` all point to it and load nothing else first. Give every amendment an explicit approval-status field.

**Verification criteria:** The audit's own proof test, run by the owner: a fresh session receiving only the advertised start prompt identifies the full Studio scope, the research/learning contract, **and the APERIO build gate** without being told.

### M1 — Medium · Studio go/no-go metric is defined on invented confidence numbers at HEAD (F28 uncorrected at HEAD)

**Evidence:** Committed amendments §7.1 line 321 publishes "Confidence: 1.0 / 0.6 / 0.3"; committed `TASKS.json` T0700 acceptance: "≥90% single-node mapping at confidence ≥0.8 on ≥1 stack, else re-scope". The corrected "evidence tiers, not calibrated confidences … wrong-target and abstention rates tracked" text is uncommitted. Audit F28 explains why stamped IDs don't disambiguate repeated instances.

**Impact:** The earliest high-stakes decision in the plan (M7.0 go/no-go, which re-scopes Studio investment) would be made against a number that is a tier label, not a measurement; a stack could "pass" on tier-1 stamps while wrong-target rates are unacceptable.

**Recommendation:** Adopt the drafted (uncommitted) tier language plus measured wrong-target/abstention rates against a labelled fixture; re-express T0700's thresholds against those rates.

**Verification criteria:** Committed amendments contain no uncalibrated confidence claims; T0700 acceptance references measured rates vs labelled ground truth; the spike fixture includes repeated-instance cases (per F28).

### M2 — Medium · Behavioral-evaluation and cost-budget tasks are wired to nothing

**Evidence:** T0156 (token/cost budget) and T0158 (behavioral/reasoning eval suite) have no dependents and appear in no release ancestry (computed; see H4). E9 (calibration as product metric) requires these outputs to influence acceptance and the claims protocol.

**Impact:** The audit's central "measure judgment, not artifacts" refinement (F14) and the token-cost concern (F17) can silently never run, or run and be ignored — the "step that is skippable will be skipped" failure the research model itself predicts.

**Recommendation:** Wire T0156/T0158 into T1002 (benchmark) and T1005 (release); require E9 calibration records in the Part 6 evidence bundle schema.

**Verification criteria:** ancestry(T1002) ⊇ {T0156, T0158}; evidence-bundle schema includes calibration fields.

### M3 — Medium · No user-task/flow research deliverable (F05 undispositioned)

**Evidence:** See §4.1 table. Part 13 lists no disposition for F05; no task covers flow/IA validation; PRD §6 includes IA/heuristics foundations but the WBS never exercises them at journey level.

**Impact:** SUS optimizes per-section craft; multi-section journeys (checkout steps, onboarding, dashboards) can pass section gates while failing as flows — a known failure mode in data-dense Operate surfaces that SUS explicitly targets (D14 priority 3).

**Recommendation:** Add a task (e.g., T0410 "User-flow/task model per page blueprint") producing: entry points, goals, IA, state transitions, recovery, success criteria — validated at the page-blueprint checkpoint; record F05's disposition in Part 13 either way.

**Verification criteria:** Part 13 lists F05 with owner/task; the four fixture apps each carry a flow model in their baseline evidence.

### M4 — Medium · Schedule realism and multi-session tasks

**Evidence:** 84 committed tasks at "15–60 minute reviewable units or smaller" (PRD §18.2). Tasks like T0702 (authenticated bridge with allowlist/HMR/reconnect), T0806 (CSP/origin/auth/prompt-injection/retention suite), T0152 (screenshot harness 3 viewports × 2 themes), and T0405b/c (playbook batches) are realistically multi-session; audit F40 says exactly this ("split broad multi-module tasks when implementing").

**Impact:** Estimate drift, motivation risk during a long gated build, and pressure to batch tasks together (which the protocol then has to police).

**Recommendation:** Accept consciously (D02/D03 say slow is fine): tag expected multi-session tasks in TASKS.json; re-baseline estimates after the first 10 implementation tasks (add to protocol §C step 10).

**Verification criteria:** TEST_EVIDENCE records per-task durations after the first batch; deviations >2× trigger the R7 escalation already defined.

### M5 — Medium · Benchmark claims apparatus gaps at HEAD (F43 undispositioned)

**Evidence:** Committed Part 9 (line 363) requires blind A/B with n≥20-per-brief floor but does **not** require brief coverage of all four surface modes (added only uncommitted); F43's overfitting critique (dev/calibration/held-out separation — R15 exists) has no Part 13 disposition at HEAD; A10's dogfood sites double as fixtures (tension F43 flagged; T0906 exists but separation rules are unstated at HEAD).

**Impact:** First benchmark could under-cover claimed surfaces or overfit dogfood fixtures, making the eventual "superiority" claim (Part 9) attackable on precisely the grounds the project's own audit raised.

**Recommendation:** Land the drafted Part 9 fix; add an explicit fixture/separation policy (dev fixtures vs calibration vs held-out, held-out never inspected during tuning — R15 already says this; encode it in T1002's acceptance).

**Verification criteria:** Committed Part 9 requires four-mode coverage; T1002 acceptance names the separation policy; F43 dispositioned in Part 13.

### L1 — Low · `docs/GATE_REGISTRY.md` is untracked while committed docs depend on it

Committed ROADMAP lists M1.5 as including "gate registry"; the untracked GATE_REGISTRY references T0159 (nonexistent at HEAD) and `scripts/check_gate_registry.*` (no such file). It is a good artifact — it just needs to be committed together with its task (H1/H2 resolution).

### L2 — Low · AGENT_START_PROMPT's host list predates the honest tiering

`AGENT_START_PROMPT.md:3` says "any capable coding agent (FreePi CLI, Codex, ZCode, etc.)" — acceptable as instruction, but it should inherit the supported/experimental/untested vocabulary from the coverage matrix to avoid "works everywhere" drift the PRD itself prohibits (§12).

### L3 — Low · Research-model secondary sourcing

RESEARCH_AND_EXPERTISE_MODEL §2/§5 lean on secondary articles (summaries, blog posts) for load-bearing claims (e.g., Impeccable's 62-rule count via a third-party blog). Audit F08 already flagged "reposts are not corroboration". Fine as planning input; must be re-verified against primary sources before any detector or claim ships (the doc itself says this — keep the promise).

---

## 7. Proposed improvements (with reasoning)

1. **One reconciliation commit** (H1+H2+H3+L1): land the already-drafted corrections (amendments gates/§7.1–7.5/Part 8/Part 9, GATE_REGISTRY, T0159/T0811/T0812, count fixes across README/ROADMAP/HANDOFF/RISKS/OWNER_DECISIONS_LOG) as a single, described commit; then re-run the full validation suite (graph + cross-doc) and record the *actual* output in TEST_EVIDENCE. Rationale: the content already exists in the working tree; the defect is process (uncommitted state), not substance. The same commit must update TEST_EVIDENCE with a *superseding* entry for the false "updated to 84" claim (history preserved, per the repo's own convention).
2. **Barrier completion + dependency-selection rule** (H4+M2): encode the missing edges and write the rule into the TASKS.json `meta` so future enumerations are mechanically checkable. Rationale: barriers are the only thing that makes "robust and heavy" survive schedule pressure; prose barriers already failed once (F38).
3. **Canonical start manifest** (H5): one file, explicit authority order, referenced by all three entry points. Rationale: three divergent entry points is two too many for a product whose first milestone is literally "a fresh agent can resume without chat history".
4. **Disposition completion** (M3+M5+F08/F09/F10/F13/F14/F22/F34/F35/F42/F43): every audit finding gets exactly one of {applied, proposal-pending-owner, rejected-with-reason, deferred-with-owner-date}. Rationale: an incomplete reconciliation record is indistinguishable from an unaudited one.
5. **Prose-claim validator before any build** (extension of T0159): cross-check counts, task-ID references, and gate-table agreement across tracked docs; wire into CI (M1's first real CI task T0103). Rationale: this review found the third class of drift in the "machine-checked" chain; the check is cheap and permanent.
6. **Apply SUS's own concurrency design to SUS** (H2): a repo-level one-writer rule (or a trivial `locks/` convention) until the real tooling exists. Rationale: the project prescribes fencing for consumers while its own workspace experienced a concurrent-writer incident during audit.
7. **User-flow deliverable** (M3): one task at blueprint stage; flows are where Operate-mode quality actually lives, and SUS's stated differentiation (auditable quality) should extend to journeys, not just sections.

---

## 8. Scorecard (0–5)

| Dimension | Score | Justification |
|---|---:|---|
| Product vision & requirements definition | **4.5** | Rare depth and honesty; unfalsifiable requirements systematically closed; residual: F05 gap, F42 conflict |
| Architecture & technical design (spec) | **4** | Layered, reversible, honest degradation; correct capture of Chrome-136/Node-22 realities; hardest problems identified with spike plans |
| Specification internal consistency (as committed) | **2** | Part 13 vs. file content contradiction; count drift across five files; three dangling task IDs |
| Anti-slop & design-quality methodology | **4** | Three tiers + G10 corpus + calibration + advisory-only uniqueness; F03/F04/F15 refinements mostly landed |
| Motion & accessibility design | **4** | State/variant model, interruption, reduced-motion parity; gate semantics corrections uncommitted (−1 while uncommitted) |
| Live Studio specification | **3.5** | Deepest and best part; uncommitted security/write-path refinements; go/no-go metric on invented scale at HEAD |
| Multi-agent / portability planning | **4** | Honest tiers, smoke-test rule, generated matrix; AGENT_START_PROMPT host wording predates tiering |
| Task graph & planning rigor | **3** | Structurally valid (verified) but barrier gaps, orphan eval tasks, inaccurate dep description |
| Evidence honesty & verification discipline | **2** | Excellent *intent* (evidence log, not-run vocabulary) undermined by two false entries (ALL CHECKS PASSED; counts-updated-to-84) and the applied-vs-committed gap |
| Documentation quality & handoff hygiene | **3** | Strong corpus; HANDOFF self-contradiction and stale OWNER_DECISIONS_LOG entry |
| Implementation maturity | **0** | Nothing exists — by explicit design (build gate). Not a defect; it is the declared state. |
| Release readiness *process* (not product) | **4** | Gates, DoD, claims protocol, GATE_REGISTRY vocabulary all defined pre-code |

**Overall: 3.3 / 5 as-committed · 4.3 / 5 as-designed-and-pending-commit.** The gap between those two numbers is precisely the finding of this review.

---

## 9. Recommended development priorities (before and after `APERIO`)

**Before `APERIO` (planning phase, est. 1–2 sessions):**
1. Reconciliation commit (H1/H2/H3/L1) → re-run validations → superseding TEST_EVIDENCE entry.
2. Barrier completion + dep-selection rule + orphan wiring (H4/M2).
3. Canonical start manifest (H5) + fresh-session probe.
4. Disposition completion for the 11 un-dispositioned findings (M3/M5 etc.).
5. Owner approvals, recorded in DECISIONS.md: ADR-001…006 individually; amendments v1.1 as a whole; first batch T0101→T0102→T0103→T0104→T0151.

**First build batch (after `APERIO`), unchanged from the plan — endorsed:** T0101 skeleton → T0102 fixture A → T0103 CI → T0104 schema strategy → T0151 rubric CLI. The evaluation-spine-first ordering is correct.

**Highest-risk engineering items to schedule attention for:** T0700 mapping spike (with corrected metrics, M1), T0702 bridge security, T0806 security suite, T0158 behavioral evals, T0400 direction engine (the single biggest lever against AI-typical output, per the research model).

---

## 10. Suggested micro-tasks with testable acceptance criteria

All are planning-phase, low-risk, and independent of the build gate:

| ID | Task | Acceptance criteria (testable) |
|---|---|---|
| PT-1 | Reconciliation commit | `git show HEAD:…PRD_AMENDMENTS_v1.1.md` contains zero matches for pre-correction markers (grep list in H1); committed gates == GATE_REGISTRY rows; count claims consistent (script in Appendix A reports 0 mismatches); TEST_EVIDENCE gains a superseding entry naming the false claim |
| PT-2 | Barrier completion | Scripted assertions: ancestry(T1001) ⊇ all M8 IDs; ancestry(T1005) ⊇ all M1–M9 implementation IDs; no orphans among T0156/T0158/T0801–T0804/T0406; assertions added as repo test |
| PT-3 | Canonical start manifest | One `docs/START_HERE.md` with authority order; AGENT_START_PROMPT/README/HANDOFF each reference it first; fresh-session probe (F01 proof) passes |
| PT-4 | Disposition completion | Part 13 covers all 48 findings with exactly one disposition each; grep `F0[5-9]|F1[0-4]|F2[2]|F3[4-5]|F4[2-3]` finds each with a status word |
| PT-5 | Prose-claim validator (T0159 pre-implementation) | Script fails on the *current* HEAD state (demonstrate failure before fix), passes after PT-1/PT-2; wired as the seed of T0103's CI |
| PT-6 | F05 flow-model task | New task with acceptance: flow model per fixture app; recorded in Part 13 |

---

## 11. Questions requiring product-owner decisions

1. **Approve the pending uncommitted reconciliation set as one commit?** It contains the WCAG gate corrections, Studio security refinements, GATE_REGISTRY, and the 87-task graph (H1/H2). Alternative: reject and re-scope — but then Part 13 must be re-worded.
2. **F05 (user-flow research):** required deliverable (my recommendation) or consciously deferred with recorded rationale?
3. **F42 conflict:** when no independent reviewer is available, does the GA-acceptable rule win (amendments Part 4) or the deterministic-fallback rule (PRD §18.6)? One owner ruling needed; currently contradictory.
4. **D23 wording:** Part 13 flags it as unverifiable relay — please confirm the exact instruction on record.
5. **Concurrency policy for this workspace:** is the multi-writer editing (including another agent's review committed to `main` mid-session) intended? If yes, a coordination convention is needed for `reviews/independent/` (naming is currently collision-free by accident).
6. **Timing of D06 (license + channel):** decide before M9 (adapters) or at M10 (release)? The plan says "before any publication" — a concrete gate would help.
7. **`APERIO` precondition:** confirm that PT-1…PT-4 + recorded approvals are the intended preconditions, per HANDOFF's "NEXT ACTION".

---

## 12. Status ledger — planned / implemented / tested / unverified

| Class | Items |
|---|---|
| **Implemented (product)** | **None.** No `SKILL.md`, no packages, no scanners, no Studio, no tests, no CI. Honest and by design (build gate `APERIO`, D19). |
| **Implemented (planning artifacts)** | 19 tracked docs + TASKS.json; archive; WBS; ADR drafts; coverage matrix; gap analysis; deep audit; evidence log. |
| **Verified by this review** | TASKS.json structural integrity at HEAD (84 tasks; graph valid; 5 barriers present); ZIP byte-identity 5/5; audit self-counts (48 = 35 High + 13 Medium); README count consistency; ADR-003/006 corrections committed; T0504/T0505/T0508/T0551/T1004 acceptance coverage of F25/F35/F24/F46/F48; launch-set playbook component coverage in task text |
| **Verified as FALSE at HEAD** | Part 13 "applied" claims for F16–F21/F26–F33(partial)/F36/F45 (corrections uncommitted); TEST_EVIDENCE "counts updated to 84 in README/ROADMAP/HANDOFF"; ROADMAP/HANDOFF/RISKS task counts (87 vs 84); ROADMAP task-ID ranges (T0159/T0811/T0812); HANDOFF "all 87 task records" (audit inspected 73); "T1001 deps = terminal tasks of M3–M9" |
| **Unverified / not-runnable** | All product behavior claims (motion, a11y, scanner precision, Studio mapping, security, benchmarks) — no implementation exists; external-source claims (WCAG clause text, Chrome 136, Node EOL, tool licenses, Impeccable counts) — flagged for re-verification at adoption per the repo's own rules |
| **Pending owner decision** | ADR-001…006 approval; amendments v1.1 approval; first-batch approval; D06 license/channel; D23 confirmation; F05/F42 rulings; `APERIO` |

---

## Appendix A — Verification method (reproducible)

All checks were run read-only against the committed state (`git show HEAD:…`) and the working tree, using Python 3 standard library (`json`, `zipfile`, `re`) plus git. No repo file was modified; the review was written in a separate worktree.

1. **Graph validation:** parse `TASKS.json`; assert unique IDs; resolve every `deps` entry against the ID set (unresolved = fail); DFS cycle detection; backward-dependency check via milestone order; status counts.
2. **Barrier/ancestry check:** compute full dependency ancestry of T0201, T0708, T0153, T1003, T0707, T1001, T1002, T1003, T1004, T1005; assert the five claimed barrier targets; list all M-milestone tasks absent from each release-critical ancestry; identify orphan tasks (no dependents).
3. **Cross-document claims:** regex scan of tracked .md files for task-count claims ("73/84/87 tasks") and task-ID references (T0159/T0811/T0812); compare against committed TASKS.json; HANDOFF internal-consistency check.
4. **Reconciliation-integrity check:** grep committed `PRD_AMENDMENTS_v1.1.md` for pre-correction markers (`field proxy`, `git stash create`, `≤ 200 chars`, `zero violations at serious`, `Confidence: **1.0**`, `reduced-motion branch`, `320/390/768`) vs Part 13's "applied" list.
5. **Archive check:** `zipfile` byte-compare of all five members (path prefix `SUS-PRD-Handoff/`) against `docs/` counterparts.
6. **Audit self-consistency:** count `### F` headers (48) and `— High/Medium` severities (35/13).
7. **Commit-state diff:** `git diff` per file at session start vs. report time; mtimes via `ls -lT`.

**Key results reproduced in this report:** §6 H1–H5, M1–M5; §12 ledger. Any maintainer can reproduce every claim above with the same seven steps.

---

*End of independent review. This report contains no product changes; it is a review artifact only.*
