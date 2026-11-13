# SUS — Independent Architecture & Product Review

**Reviewer alias:** `hunyuan-hy`
**Reviewer identity:** WorkBuddy AI · model **Tencent Hunyuan Hy**
**Role assumed:** independent senior software architect, AI agent systems engineer, UI/UX expert, critical product reviewer
**Assignment:** architecture + product audit of the Shahid UI UX Skill (SUS) project. **REVIEW ONLY** — no product file was modified.

---

## 0. Review metadata and scope

| Field | Value |
|---|---|
| Repository | `https://github.com/SHAHID8142/shahid-ui-ux-skill` |
| Reviewed commit | `cda9d9dcdc2c552825d826afab52c03a823c5268` (short: **`cda9d9d`**) |
| Commit subject | `docs: reconcile deep audit — fix task graph (T1001, barriers, missing tasks), standards corrections, ADR updates` |
| Commit author / date | SHAHID8142 <shahiddesignhouse@gmail.com> · 2026-11-13T20:45:38+06:00 |
| Original base branch | `main` — pointed at `cda9d9d` when this review started |
| Base branch at publication | `main` had advanced during the review (observed `a878b71`, then `6ea7fb7`) because other review agents' reconciliations were merged. **Those later commits were NOT reviewed.** |
| Reviewed tree | `git archive HEAD` exported to `/tmp/sus-audit-cda9d9d/`; every `path:line` reference below points to that immutable snapshot |
| Review date | 2026-11-13 (GMT+6) |
| Deliverable path | `reviews/independent/hunyuan-hy-2026-11-13-cda9d9d.md` |
| Review branch | `review/independent-hunyuan-hy-2026-11-13-cda9d9d` |

### Independence statement

My analysis was completed from the primary source-of-truth documents **before** consulting any other agent's review. I did **not** open `reviews/independent/antigravity-opus-2026-11-13-cda9d9d.md`, nor any of the other agents' open PRs/review branches. `docs/DEEP_AUDIT_2026-11-13.md` was also excluded as an evidence source. During mechanical corpus-wide greps used to *verify my own findings*, a handful of lines from that file were returned incidentally as grep matches; none of them are cited or relied upon below, and no conclusion in this report derives from a prior review.

### Baseline caveat (important)

At review start the shared working tree was **dirty** (`8 modified + 1 untracked file`, including a 2,628-line change to `TASKS.json` and an untracked `docs/GATE_REGISTRY.md`) and checked out on another agent's review branch. Concurrent agents were repeatedly switching branches and merging into `main` while I worked. To keep the review reproducible I audited the **committed** snapshot `cda9d9d` only. Uncommitted working-tree edits are explicitly out of scope; some findings below may already be addressed in later `main` commits, which the owner should reconcile rather than assume.

### What I actually inspected / ran

See §11 for the exact commands. In brief: all 22 tracked files at the commit, the full 84-task graph, the archived ZIP, every local Markdown link, 45 external URLs, four primary external specifications/docs, and five npm package records. **No product test was run because no product code, test, or CI configuration exists at the reviewed commit** — I did not claim otherwise.

---

## 1. Executive summary and independent final verdict

SUS is **not a product yet**. It is a remarkably thorough, unusually self-critical *planning package*: 22 tracked files, all Markdown/JSON/ZIP, ~3,440 lines of specification, zero lines of implementation. This is stated honestly in `README.md:12` ("Current state: specification only. No code has been written yet"), `OWNER_DECISIONS_LOG.md:39` (`BUILD_PERMISSION = false`) and `TEST_EVIDENCE.md:4`. Anyone evaluating SUS against "release readiness" is evaluating a document, not software.

**What is genuinely strong:** the requirements baseline (`docs/SUS_MASTER_PRD_v1.0.md`) is among the most disciplined PRDs one will see — it pre-emptively forbids "bug-free", "works on all agents", "superior to X" and ranking guarantees; it separates objective defects from taste; it makes motion, accessibility, content and provenance first-class; it mandates fail-closed source mapping and a localhost trust boundary. The amendments add a serious epistemic contract (seven claim kinds, dissent ledger, prediction ledger, adversarial critic) and a measurement spine (rubric, evidence bundles, 12 CI gates). The ADR drafts are proper decisions with options, consequences and reversal triggers. Several claims I checked turned out to be **true**: `TASKS.json` really is structurally clean (84 unique IDs, 0 unresolved deps, 0 cycles, 0 backward deps), the archive ZIP really is 5/5 byte-identical, all local Markdown links resolve, all 45 cited external URLs are live or access-limited (none 404), and the three proposed DTCG validator packages really exist on npm.

**What is fatal to the current state:**

1. **100% planned, 0% implemented, 0% tested.** There is no `SKILL.md`, no `package.json`, no `LICENSE`, no CI, no test file, no Studio, no adapter. Every capability in the brief is a requirement, not a feature.
2. **The requirements of record are ambiguous.** `PRD_AMENDMENTS_v1.1.md:5` says "proposed, awaiting owner approval", `ROADMAP.md:4` labels it "(proposed)", `HANDOFF.md:17` lists "amendments v1.1" as approval-pending, `ADR_DRAFTS.md:3` says all six ADRs are proposed — yet `DECISIONS.md:9` records the epistemic contract as "approved" and `README.md:6-10` presents D14/D15–D17/D19 as binding. A builder cannot determine which gates are mandatory.
3. **The central architecture contradicts itself.** The owner requires "approval gates must be real code, not prompt instructions" (`OWNER_DECISIONS_LOG.md:16`) and "gates are executable" (`PRD_AMENDMENTS_v1.1.md:202`), while `SUS_MASTER_PRD_v1.0.md:87` correctly states a Markdown skill "provides **reasoning instructions**, not direct browser or code powers". On a skill-only host, every gate, evidence bundle, section lease and Studio capability degrades to unenforceable prose — exactly what the owner rejected.
4. **The highest-risk technical bet has no prerequisites.** The dual-stack DOM→source mapping spike (`T0700`) requires real Next.js **and** Astro applications, but no task in the WBS creates either, and the spike's only dependency is a single marketing fixture. A failed spike would invalidate the mandatory-Studio GA requirement *after* M4–M6 investment.
5. **The evidence trail contains false claims.** `TEST_EVIDENCE.md:92` lists fixes "applied in this pass" that are **not present** at `cda9d9d` (200-char limit, "four modes", WCAG exceptions, three-stage authorisation, transaction manifest, data-flow map). `TEST_EVIDENCE.md:14` still displays "ALL CHECKS PASSED" in the primary recorded-checks table even though `:45` and `:78` declare that claim false. For a product whose differentiator is *auditable evidence*, this is the most damaging defect.

### Final verdict

| Question | Verdict |
|---|---|
| Is the **vision** sound and worth pursuing? | **Yes**, with scope discipline. |
| Is the **specification** release-quality? | **No** — high-quality draft, not a frozen baseline. |
| Is there a **product** to ship, install, or benchmark? | **No.** |
| Should the `APERIO` build gate be lifted now? | **NO-GO.** Keep `BUILD_PERMISSION = false` until all P0 findings are closed and re-verified. |
| Overall release readiness | **0 / 5.** |
| Feasibility of the full vision as specified | **Low in one pass; plausible as a staged multi-year programme.** The "portable skill + heavy local runtime" combination is really two products with different distribution and capability models. |

I recommend **not** treating the 84-task WBS as executable until the P0 repairs in §8 are done. The single most valuable next action is a *time-boxed, executable* feasibility spike on the Live Studio mapping/write path, run **before** any knowledge-library investment.

---

## 2. Overall architecture evaluation

### 2.1 Layering and decomposition

The seven-layer architecture (`SUS_MASTER_PRD_v1.0.md:75-83`: orchestrator, foundations, playbooks, rules/evaluation, commands/adapters, Studio runtime, project-local state) is sound and conventional. The `foundations vs playbooks` split with a documented precedence order (`:173`: security/a11y → project contract → local exceptions → shared foundations → niche/playbook → trends) is a good answer to context bloat and rule duplication. Just-in-time loading (`:60`) and the token budgets in `PRD_AMENDMENTS_v1.1.md:351-354` align with the verified Agent Skills spec (metadata → <5,000-token `SKILL.md` body → on-demand resources).

**Problems:**

- **The precedence "resolver in code" cannot exist in a Markdown skill.** `PRD_AMENDMENTS_v1.1.md:354` requires a deterministic precedence resolver implemented in code. The portable skill is Markdown; any resolver would live in a script the host must be able to execute. On hosts that only load skill files, precedence is once again prose. The spec's `allowed-tools` field is explicitly *experimental* and support varies, so no portable enforcement hook exists.
- **Two products, one portability claim.** Layer 6 (Studio runtime: localhost server, CDP, AST writes, dev-server plugin) requires Node ≥22, a dev server, a browser with remote debugging, a framework instrumentable by a Vite/SWC plugin, and a CLI on `PATH`. Layer 1–5 must work on "any capable coding agent". No capability-tier model separates these. `COVERAGE_MATRIX.md:57` has one "🟡 working without any dev server" row, but no formal degradation contract per feature.
- **Packaging does not conform to its own stated baseline.** The verified Agent Skills spec requires `name` to match the **parent directory name**. `SUS_MASTER_PRD_v1.0.md:73` fixes the slug as `shahid-ui-ux-skill`, but the tentative layout at `:93` puts `SKILL.md` under `sus/` and `ADR_DRAFTS.md:24` puts the bundle under `skill/`. No task produces a directory literally named `shahid-ui-ux-skill`. This is a concrete portability defect, not a naming preference.
- **ADR-003's CDP assumption is unproven.** `ADR_DRAFTS.md:90-93` claims CDP injection means "no app code changes and no CSP fight at runtime". The competitor's public docs (verified) explicitly warn that a Content Security Policy can prevent Live controls from loading and that first-time setup must ask before changing it. CDP `Runtime.evaluate` may bypass script-src for evaluation, but overlay DOM/styles/fonts still interact with page CSP, and injecting into the page's **main world** exposes the overlay (and any token readable from page JS) to the inspected page's own scripts. No isolated-world boundary is specified.

### 2.2 Knowledge management and project memory

The `.sus/` contract (`PRODUCT.md`, `DESIGN_CONTRACT.md`, `DECISIONS.md`, `SECTION_STATUS.md`, `progress/`, `:133-139`) plus the requirement that it is **per target project** (`:141`) is well conceived. The append-only dissent ledger, prediction ledger and lesson lifecycle (`PRD_AMENDMENTS_v1.1.md:83-118`) are genuinely novel and defensible. Cross-project lesson sharing with an explicit sanitised publication boundary (`:116-118`) is a good privacy instinct.

**Problems:** provenance rules are not applied to the project's own research (F-24); no authoring/review/staleness owner for the knowledge library is encoded as a machine-readable registry (F-10/F-27); and the "no templates" rule conflicts with the Direction Engine schema (F-23).

### 2.3 Multi-agent compatibility

Eleven host adapters are listed in `SUS_MASTER_PRD_v1.0.md:117-128` and a backlog of eleven products at `:346`. `COVERAGE_MATRIX.md:59-66` is honestly conservative: FreePi is a "development host" requiring a smoke test, one additional host is "supported", everything else is "experimental". This is good. But **zero hosts have been verified**, the exact identity of "Auto Pilot" is explicitly unresolved (`:346`), and `docs/TOOLING_CANDIDATES.md:64-69` leaks a host-specific note ("MCP / asset tooling available in this environment", `mcp__thesvg`) into a document that is supposed to be agent-agnostic. `PRD_GAP_ANALYSIS.md:52` states "this host has no subagent tool" — a transient host limitation recorded as a planning fact; `HANDOFF.md:40-41` already flags this correctly, and the current multi-review exercise proves it was stale.

### 2.4 Security posture

The Studio security requirements (`SUS_MASTER_PRD_v1.0.md:324-332`, `PRD_AMENDMENTS_v1.1.md:341-347`, `ADR_DRAFTS.md:98-100`) are unusually mature: loopback-only binding, DNS-rebinding guard, HMAC session tokens, Zod validation, payload caps, workspace allowlist via realpaths, prompt-injection quarantine, append-only audit log, fail-closed on ambiguous mapping, no production injection, no arbitrary command execution. T0806 even tests indirect injection via drawings, OCR, screenshots and recalled lessons at the action boundary.

**But:** token storage wording is ambiguous and possibly unsafe (F-18); rollback via `git stash create` can lose untracked/concurrent user work (F-17); "no outbound network calls" contradicts the research subsystem (F-19); and `*.log` is gitignored while an append-only audit log is required (F-28).

---

## 3. Requirements completeness and contradictions

### 3.1 Completeness

Coverage is broad: vision, personas, non-goals, operating principles, architecture, knowledge modules, progressive workflow, anti-slop, motion, content/SEO, Studio, commands, project memory, research provenance, engineering/testing, acceptance gates, milestones, builder protocol, risks, change control, references, Definition of Done. §16's Gate A–L table and §22's Definition of Done are explicit. **Missing or thin:**

- No **requirements traceability matrix** mapping each §1–§22 requirement to a task ID, a test ID and a status.
- No **effort/cost/team model**; 84 tasks are assumed executable with "concurrency 1" and no budget.
- No **failure-mode UX specification** beyond "what failed / why / smallest fix / rerun command" (`PRD_GAP_ANALYSIS.md:44`).
- No **telemetry/retention decision**, no **licence**, no **distribution channel**, no **maintenance owner** — all acknowledged as open (`PRD:455-460`, `DECISIONS.md:21-24`) but without an owner or deadline.
- No **support-tier definition for the runtime** (skill-only / CLI / Studio), which is the single biggest architectural omission.
- No **accessibility conformance target for the Studio overlay's drawing interaction** beyond "overlay passes axe; full keyboard path documented" (T0807); keyboard-drawing and screen-reader descriptions of spatial annotations are not specified.

### 3.2 Contradictions (each verified at the cited lines)

| # | Contradiction | Evidence A | Evidence B |
|---|---|---|---|
| C1 | Is v1.1 binding? | `PRD_AMENDMENTS_v1.1.md:5` "proposed, awaiting owner approval"; `:420` "Implementation does not start until both are recorded here"; `ROADMAP.md:4` "(proposed)"; `HANDOFF.md:17` approval pending | `DECISIONS.md:9` epistemic contract "approved"; `README.md:6-10` D14/D15–17 presented as fixed |
| C2 | "No templates, ever" vs a structured direction template | `PRD_AMENDMENTS_v1.1.md:43-50` E1 forbids "preset visual worlds", "page skeletons", "auto-generated palettes", "exemplars ... as assets to reuse" | `:141-146` A2 "strategy taxonomy", "Banned Defaults list", "3 candidate directions"; `:273-287` Direction Engine YAML with `type`, `palette`, `composition`, `material`, `imagery`, `motion_character` — a complete visual-world schema |
| C3 | "No blanket bans on motifs" vs a banned-defaults detector | `SUS_MASTER_PRD_v1.0.md:48` "No blanket bans on common design motifs (gradients, cards, 12-column grids, glass effects)" | `PRD_AMENDMENTS_v1.1.md:142` "Banned Defaults list"; `:289-294` uniqueness check measures distance from it (mitigated: advisory only) |
| C4 | Gates are code vs gates are prose on skill-only hosts | `OWNER_DECISIONS_LOG.md:16`, `PRD_AMENDMENTS_v1.1.md:202` "Gates are executable" | `SUS_MASTER_PRD_v1.0.md:87` skill provides "reasoning instructions, not direct browser or code powers" |
| C5 | Description limit 200 vs 1,024 | `PRD_AMENDMENTS_v1.1.md:351` "≤ 200 chars" | `ADR_DRAFTS.md:60-62`, `RESEARCH_AND_EXPERTISE_MODEL.md:82`, verified spec: max **1,024** |
| C6 | Four surface modes vs three benchmark modes / four fixtures that cover three modes | `PRD_AMENDMENTS_v1.1.md:27-29` "Four surface modes (Persuade / Operate / Read / Experience)"; Part 0 table `:15-21` has **no Read row** | `:132-134` 4 fixtures = Persuade / Persuade+Operate / Operate / Experience-Read; `:362` "≥6 briefs × 3 modes"; `COVERAGE_MATRIX.md:18` gives Read its own row (Docs/blog/help) |
| C7 | "Playbook order follows COVERAGE_MATRIX §2 exactly" | `PRD_AMENDMENTS_v1.1.md:30-33` declares an explicit ordered sequence and "No playbook may jump the queue" | `COVERAGE_MATRIX.md:24-27` is an **unordered** comma list with a different order (data table, product grid, PDP, cart, checkout appear after footer/modal/toast, not before); `TASKS.json:716,725,689` T0405b/T0405c/T0407 all depend only on T0405, so no order is enforced |
| C8 | "Prove Studio early / re-scope before M4–M6 investment" | `OWNER_DECISIONS_LOG.md:15` D04; `PRD_AMENDMENTS_v1.1.md:182-185` A8 "else re-scope Studio before M4–M6 investment"; `ROADMAP.md:31` "Studio spike runs early" | Only `T0701` depends on `T0700`; no M4/M5/M6 task has `T0700` in its ancestry; `TASKS.json` `meta.concurrency = 1`; `ROADMAP.md:25` first batch is T0101→T0151 |
| C9 | "Avoid arbitrary thresholds" vs arbitrary thresholds | `SUS_MASTER_PRD_v1.0.md:393` "avoid arbitrary percentages masquerading as validated thresholds" | `PRD_GAP_ANALYSIS.md:22` F6 invents LCP ≤2.5 s / CLS ≤0.1 / INP ≤200 ms / CSS ≤60 KB / font ≤150 KB; `PRD_AMENDMENTS_v1.1.md:215` G10 "precision ≥ **target** and recall ≥ **target**" (placeholder never filled) |
| C10 | WCAG floor vs gate mechanics | `PRD_AMENDMENTS_v1.1.md:209-214` G7 "horizontal scroll at 320/390/768/1024/1440 = 0", G8 "≥24×24 CSS px" | Verified WCAG 2.2: 1.4.10 Reflow exempts content requiring 2-D layout (incl. **data tables**); 2.5.8 Target Size (Minimum) has five exceptions (spacing, equivalent, inline, user-agent, essential). `COVERAGE_MATRIX.md:26` makes "data table (Operate core)" a launch playbook |
| C11 | "No outbound network calls" vs live research | `ADR_DRAFTS.md:100` "no outbound network calls" | `SUS_MASTER_PRD_v1.0.md:59` "use tools and current sources"; `:292` "Research competitor titles/messages"; `:364` reference inventory with retrieval dates |
| C12 | "AST-only writes" vs required source languages | `PRD_AMENDMENTS_v1.1.md:325-328` ts-morph / recast / jscodeshift only, "never regex or text replacement" | `TASKS.json:442-450` T0700 requires write paths for `.tsx/.astro/.css/content`; `ADR_DRAFTS.md:30-31` Astro/Vite + Next.js SWC instrumentation; none of the three named AST tools parse `.astro`, CSS or Markdown content |
| C13 | Evidence log claims fixes not in the tree | `TEST_EVIDENCE.md:92` "Part 8 description limit 1,024", "Part 9 ... four modes", "G4–G9 restated per actual WCAG criteria", "§7.2 transaction manifest", "§7.4 three-stage authorization", "§7.5 Chrome 136 + data-flow map + action boundary" | `PRD_AMENDMENTS_v1.1.md:351` still 200; `:362` still "3 modes"; `:212-213` G7/G8 still lack exceptions; `:325-347` §7.2/7.4/7.5 contain none of those additions |
| C14 | Counts and ranges drift | `README.md:26`, `ROADMAP.md:3`, `HANDOFF.md:9` = 84 tasks | `OWNER_DECISIONS_LOG.md:55`, `RISKS.md:13` = 73 tasks; `ROADMAP.md:10-21` ranges omit T0102b, T0152b, T0158, T0310, T0405b/c, T0506, T0508, T0709, T0809/T0810, T0906 |
| C15 | "First unlocked batch" is actually locked | `ROADMAP.md:23-25` "First unlocked batch: T0101 → …" | `TASKS.json:53` T0005 `status: "review"`, `approval: "pending"`; `TASKS.json:65` T0101 `deps: ["T0005"]`; `ROADMAP_AND_TASK_PROTOCOL.md:108` requires verified prerequisites **and** approval. Computed unlocked set = **0 tasks** |
| C16 | Confidence tiers vs go/no-go threshold | `PRD_AMENDMENTS_v1.1.md:321-323` discrete tiers 1.0 / 0.6 / 0.3, "below 0.6 never edits" | `:183` / `TASKS.json:445` "≥90% ... confidence ≥0.8" — with discrete tiers, ≥0.8 means **only** stamped 1.0 mappings qualify; the 0.6 tier can never help |

---

## 4. Feature-by-feature assessment

**Legend:** `PLANNED` = specified only; `IMPLEMENTED` = artifact exists in the repo; `TESTED` = a test executed with recorded output; `UNVERIFIED` = a claim that depends on an unproven external/runtime assumption.

At `cda9d9d`: **Planned 100% · Implemented 0% · Tested 0% · Unverified 100%.** The only artifacts that exist are documents. No feature below has an implementation or a test.

| # | Brief evaluation area | Planned (spec evidence) | Implemented | Tested | Unverified assumptions |
|---|---|---|---|---|---|
| 1 | Product vision, requirements, scope | `SUS_MASTER_PRD_v1.0.md:16-30`, `PRD_AMENDMENTS_v1.1.md:11-37` | ✗ | ✗ | Scope authority (C1); 4-mode model (C6) |
| 2 | Master Skill, sub-skills, playbooks, knowledge mgmt | `PRD:71-83, 143-173`, `ADR_DRAFTS.md:48-72` | ✗ no `SKILL.md` | ✗ | Spec-conformant packaging (F-12); precedence resolver in code (F-04); 12-part playbook × 15 launch playbooks (F-20) |
| 3 | Multi-agent compatibility, install, invocation, portability | `PRD:342-348`, `COVERAGE_MATRIX.md:59-66`, `ADR-002` | ✗ no adapter | ✗ | 11 host identities; per-host command syntax; installer; generated support matrix |
| 4 | Research intelligence, anti-slop, design quality | `PRD:221-240`, `RESEARCH_AND_EXPERTISE_MODEL.md`, `PRD:287-295` | ✗ | ✗ | Labelled corpus, precision/recall targets, blind judge calibration, fresh-context critic on the actual host |
| 5 | Section-by-section dev, tokens, approval workflows | `PRD:175-219`, `PRD:350-360`, gates G1–G3/G11 | ✗ | ✗ | That a section lease and G2 can be enforced in CI on a skill-only host (F-04) |
| 6 | Motion, states, transitions, a11y, perf, validation | `PRD:242-285`, `PRD_AMENDMENTS_v1.1.md:172-179` | ✗ | ✗ | State-machine schema; interruption tests; reduced-motion parity; G6/G7/G8 correctness (F-14) |
| 7 | Mandatory Live Studio, drawing prompts, source mapping, agent comms, security, previews, recovery | `PRD:297-340`, `PRD_AMENDMENTS_v1.1.md:317-347`, `ADR-003` | ✗ | ✗ | CDP injection vs CSP/isolated world; ≥90% mapping on two stacks; AST writes for `.astro`/CSS/content; `git stash create` rollback (F-05/F-16/F-17/F-18) |
| 8 | Content, copywriting, SEO, a11y, responsive | `PRD:287-295`, `PRD_AMENDMENTS_v1.1.md:161-170,176-179` | ✗ | ✗ | i18n/RTL depth, +40% string growth, claims register, art-direction licensing |
| 9 | Roadmap, dependencies, micro-tasks, testing, independent verification | `TASKS.json`, `ROADMAP.md`, `ROADMAP_AND_TASK_PROTOCOL.md`, `TEST_EVIDENCE.md` | **Partial** — documents only | **Structural checks only** (`TEST_EVIDENCE.md:13-14, 98-105`), many claims false (F-03) | 15–60 min sizing (F-20); evidence fields (F-08); unlocked batch (F-09) |
| 10 | Security, reliability, maintainability, perf, release readiness, feasibility | `PRD:366-393, 429-449, 478-480`, `RISKS.md` | ✗ | ✗ | Zero critical defects policy, licence, channel, telemetry, retention, external security review |

**Positives that were independently verified (not merely claimed):**

- `TASKS.json`: 84 tasks, 0 duplicate IDs, 0 unresolved dependency references, 0 cycles, 0 backward-milestone dependencies — **PASS**.
- Archive `SUS_Final_PRD_Handoff_v1.0.zip`: all 5 Markdown members **byte-identical** to `docs/` — **PASS**.
- Local Markdown links: **0 broken** — **PASS**.
- Cited external URLs: 45 probed, 41 × HTTP 200, 2 × 403 (bot protection), 2 × 429 (rate limited), **0 × 404** — citations are largely real, not fabricated.
- `open-design-tokens` (0.7.0, MIT), `@design-token-kit/cli` (3.2.0, Apache-2.0), `dispersa` (1.5.0, MIT) all exist on npm — the tooling shortlist is not invented.

---

## 5. Severity-ranked findings

Severity: **P0** blocks any build approval · **P1** blocks GA / invalidates the plan · **P2** material quality/feasibility risk · **P3** hygiene.

### P0 — Critical

**F-01 · P0 · The reviewed artifact is a specification, not a product**
- **Impact:** every downstream claim (portability, gates, Studio, benchmarks, "GA") is unverifiable. A reviewer cannot assess code quality, security or performance because none exists.
- **Evidence:** `git ls-tree -r HEAD` = 22 files, all `.md`/`.json`/`.zip`; `find` for `*.ts|*.tsx|*.js|*.py|package.json|SKILL.md|*.yml|*.lock|LICENSE|*.test.*` = **0 results**; no `.github/`, no `tests/`. `README.md:12`; `TEST_EVIDENCE.md:4,32-33`; `OWNER_DECISIONS_LOG.md:39,43-44`; git history contains no source file in any commit.
- **Recommendation:** keep `BUILD_PERMISSION = false`. Publish an explicit "planning only" badge and a separate, tiny, *executable* vertical slice (one host + one framework + one section + one gate + one test) before any GA language is used.
- **Verification:** `git ls-tree -r HEAD | grep -E '\.(ts|tsx|js|py)$|SKILL\.md|package\.json'` returns ≥1 result **and** a recorded passing test command exists in `TEST_EVIDENCE.md`.

**F-02 · P0 · No authoritative, machine-readable requirements baseline**
- **Impact:** a builder at `APERIO` cannot decide whether "no templates", "gates in code", "four fixtures", "12 gates" or the six ADRs are binding. Silent divergence between agents is near-certain — the exact failure mode the PRD's change-control section (`:463`) tries to prevent.
- **Evidence:** C1 above; `PRD_AMENDMENTS_v1.1.md:5,420`; `ADR_DRAFTS.md:3,185-189`; `DECISIONS.md:9,13-17,21-24`; `HANDOFF.md:17-18`; `ROADMAP.md:4`.
- **Recommendation:** create one `REQUIREMENTS.json` (or equivalent) with `{id, source_section, text_sha256, status: fixed|proposed|approved|rejected, owner, approval_date, supersedes}` for every PRD §1–§22 clause, amendment A1–A11, E1–E9, G1–G12 and ADR-001–006. Make all other docs render from it.
- **Verification:** `python tools/check_requirements.py` exits 0 with **0 ambiguous** entries and every amendment/ADR carries an explicit approval receipt.

**F-03 · P0 · The evidence log records fixes that do not exist at the reviewed commit**
- **Impact:** the product's claimed differentiator is auditable evidence; a false evidence trail is worse than no trail. It also caused a prior "ALL CHECKS PASSED" false positive (`TEST_EVIDENCE.md:14` vs `:45,78`) and will mislead the next fresh-context agent, which is explicitly told to trust durable files (`AGENT_START_PROMPT.md:34`).
- **Evidence:** `TEST_EVIDENCE.md:92` vs `PRD_AMENDMENTS_v1.1.md:351` (still "≤ 200 chars"), `:362` (still "3 modes", no sample-size rationale), `:209-214` (G7/G8 still without WCAG exceptions), `:325-347` (§7.2 no transaction manifest/per-language path; §7.4 no three-stage authorisation; §7.5 no Chrome 136 note/data-flow map/action boundary). `TEST_EVIDENCE.md:14` "ALL CHECKS PASSED" retained in the primary table; `:44-45,78` declare it false.
- **Recommendation:** mark superseded rows inline (`~~ALL CHECKS PASSED~~ → SUPERSEDED`); generate evidence rows from captured command output only; add `tools/verify_evidence.py --commit <sha>` that re-asserts every claimed fix against the named file at the named commit and fails CI on mismatch.
- **Verification:** the verifier runs on `cda9d9d` and reports the exact list of unapplied claims; after repair it reports 0 mismatches.

**F-04 · P0 · Portability and enforceability are mutually exclusive as specified**
- **Impact:** on any host that loads skill files but cannot execute a local CLI/Node runtime, G1–G12, evidence bundles, section leases, `.sus/` state machines and Studio are unenforceable prose. The product would then violate its own owner decision D05 while still claiming "supported".
- **Evidence:** `SUS_MASTER_PRD_v1.0.md:87`; `OWNER_DECISIONS_LOG.md:16`; `PRD_AMENDMENTS_v1.1.md:202,354`; `COVERAGE_MATRIX.md:57,66`; verified Agent Skills spec: only `SKILL.md` + optional `scripts/`/`references/`/`assets/`, `allowed-tools` **experimental** with varying support.
- **Recommendation:** define three explicit runtime tiers — **T1 skill-only** (reasoning + honest `unavailable` capability reporting), **T2 CLI-capable** (gates, evidence, state), **T3 Studio-capable** (browser bridge) — with a published feature×tier matrix. Ship `sus doctor --probe` that detects tier at install time. No gate may report `pass` in a tier where it did not execute; report `unavailable` instead.
- **Verification:** install-smoke fixture for each tier; on a T1 fixture, `sus status` lists all gates as `unavailable`, never `pass`, and the docs' support matrix is generated from those results.

**F-05 · P0 · The Live Studio feasibility spike has no executable prerequisites**
- **Impact:** `T0700` is the project's single go/no-go gate and the highest-risk bet (`RISKS.md:7`). It requires DOM→source mapping on **two real apps** (Next.js App Router **and** Astro), but the WBS never creates either app. The spike cannot be run as specified; a late NO-GO would invalidate the mandatory-Studio GA requirement after M4–M6 investment.
- **Evidence:** `TASKS.json:442-450` (`T0700` objective "Next.js AND Astro (A2b)", `deps: ["T0102"]`); `TASKS.json:74-80` (`T0102` = "fixture app A (marketing surface)", stack unspecified); `TASKS.json:689-697` (`T0102b` = three more surface fixtures, stack unspecified). A regex scan of `TASKS.json` finds "Next.js" and "Astro" **only** inside `T0700`'s own objective. `PRD_AMENDMENTS_v1.1.md:151-155` (A2b), `:182-185` (A8).
- **Recommendation:** add `T0102c` (Next.js App Router app) and `T0102d` (Astro app) with explicit stack/language fields, licence/provenance, and a dev-server smoke test; make `T0700` depend on both; add a `stack` field to every fixture task record.
- **Verification:** a graph assertion confirms `T0700`'s transitive ancestry contains both stack fixtures; the spike report records a confidence distribution for each stack separately.

### P1 — High

**F-06 · P1 · `T0153` promises 4-fixture baselines but only 1 fixture is in its dependency ancestry**
- **Impact:** the Evaluation Spine's exit evidence (`PRD_AMENDMENTS_v1.1.md:135`) can be marked "done" with a single fixture. Every later rubric score, calibration and benchmark inherits a broken baseline.
- **Evidence:** `TASKS.json:130-137` `T0153` `deps: [T0151, T0152, T0152b, T0154]`, acceptance "baseline evidence bundles committed for 4 surfaces"; `TASKS.json:689-697` `T0102b` creates fixtures B/C/D. My transitive-ancestry computation: `T0102b` **absent**, `T0102` **present**. `T0153` has 12 ancestors, none of which is `T0102b`.
- **Recommendation:** add `T0102b` to `T0153.deps`; add a generic CI check that any acceptance criterion mentioning "N fixtures/surfaces/hosts" has N producing tasks in its ancestry.
- **Verification:** ancestry assertion passes; a dry-run of the scheduler cannot select `T0153` before all four fixture tasks are `done`.

**F-07 · P1 · "Prove Studio early" is a slogan, not a scheduled gate**
- **Impact:** with `concurrency = 1` and the documented first batch, the go/no-go spike will in practice happen at M7 — after M4 (direction engine, 15 playbooks), M5 and M6. A NO-GO then wastes most of the plan.
- **Evidence:** only `T0701` lists `T0700` as a dependency; `T0400`, `T0501`, `T0600` have no `T0700` ancestor (computed); `TASKS.json:8` `"concurrency": 1`; `ROADMAP.md:18,25,31`; `PRD_AMENDMENTS_v1.1.md:182-185`; `OWNER_DECISIONS_LOG.md:15`.
- **Recommendation:** either encode `T0700` as a completion barrier for M4+ (making A8's "before M4–M6 investment" literal), or explicitly rewrite A8 and add a dated, owner-approved "spike window" to the roadmap with an allowed concurrency exception for research tasks.
- **Verification:** a topological schedule produced from `TASKS.json` places `T0700` before the first M4 task; or the owner signs a recorded exception.

**F-08 · P1 · The task record schema cannot represent the project's own evidence discipline**
- **Impact:** "tests actually run (pass/fail/not-run)" and "independent review status" (`AGENT_START_PROMPT.md:52`) cannot be persisted, so the mandated audit trail is impossible to produce from `TASKS.json`. The protocol's own template (`ROADMAP_AND_TASK_PROTOCOL.md:85-104`) requires `actual_test_results`, `independent_review` and `evidence`.
- **Evidence:** computed key coverage: `independent_review` 0/84, `actual_test_results` 0/84, `owner` 0/84, `evidence` **5/84**; 46/84 tasks have exactly **one** acceptance criterion. `ROADMAP_AND_TASK_PROTOCOL.md:99-103`; `SUS_MASTER_PRD_v1.0.md:423`.
- **Recommendation:** add a JSON Schema for task records with those fields mandatory; backfill all 84 with explicit `not-run` / empty arrays; generate the schema validator and a `task-schema` CI job from it.
- **Verification:** `python tools/validate_tasks.py` reports 84/84 valid, 0 missing fields; no task can transition to `done` without `actual_test_results` and `independent_review` populated.

**F-09 · P1 · The declared "first unlocked batch" is not unlocked**
- **Impact:** a fresh-context agent following §C.1 finds **zero** eligible tasks and either stalls or silently skips the approval gate — the opposite of the intended safe start.
- **Evidence:** computed unlocked set (all deps with `status == done`) = **0**; `TASKS.json:49,59` T0004/T0005 `status: "review"`, `approval: "pending"`; `TASKS.json:65-71` T0101 `deps: ["T0005"]`; T0002/T0003 are `done` but `approval: "pending"`; `ROADMAP.md:23-25`; `ROADMAP_AND_TASK_PROTOCOL.md:108`.
- **Recommendation:** close M0 formally (owner signs ADRs + WBS + first batch, T0004/T0005 → `done`, approval → `approved`) or rename the section "Proposed first batch — blocked on M0 acceptance". Add a scheduler command that computes the unlocked set from data rather than prose.
- **Verification:** `python tools/next_task.py` returns exactly the five documented IDs with status `unlocked`.

**F-10 · P1 · Hand-maintained counts, ranges and gate ownership have drifted**
- **Impact:** status files contradict each other; a fresh agent cannot tell whether there are 73 or 84 tasks; 10 added tasks are invisible in the roadmap; gates have no explicit owner map.
- **Evidence:** `README.md:26` / `ROADMAP.md:3` / `HANDOFF.md:9` = 84 vs `OWNER_DECISIONS_LOG.md:55` / `RISKS.md:13` = 73; `HANDOFF.md:47` "18 pre-existing Markdown files" vs `TEST_EVIDENCE.md:88` "19 files"; `ROADMAP.md:10-21` ranges vs computed milestone membership (M1.5 actually 8 tasks, M4 12, M5 7, M7 11, M8 9, M9 6, M3 6, M1 5). `TASKS.json` has no `gates` field; literal G-ID mentions cover G1–G8, G10, G12 but **not G9 or G11**. `docs/GATE_REGISTRY.md` existed only as an untracked working-tree file, not in the commit.
- **Recommendation:** generate `ROADMAP.md` counts/ranges, the support matrix and the gate registry from `TASKS.json` + `REQUIREMENTS.json` in CI; forbid hand-written numbers in status docs; add `make docs-check`.
- **Verification:** `docs-check` fails if any count/range/gate-owner claim disagrees with the machine-readable sources.

**F-11 · P1 · Skill packaging violates the verified Agent Skills spec in three ways**
- **Impact:** a `SKILL.md` built to §8 would have a too-short description (skill never triggers), a mismatched `name`/directory (validation fails), and would treat a non-existent spec requirement as mandatory.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:351` (≤200 chars) vs verified spec "description: Max 1024 characters"; `SUS_MASTER_PRD_v1.0.md:73` slug `shahid-ui-ux-skill` vs `:93` layout `sus/SKILL.md` and `ADR_DRAFTS.md:24` `skill/` vs verified spec "name ... **Must match the parent directory name**"; `RESEARCH_AND_EXPERTISE_MODEL.md:82-83` attributes `evals/evals.json` and description-triggering tests to the spec, but the verified specification page contains **no** `evals/` directory or triggering-test requirement (those come from Anthropic's separate skill-creator guidance).
- **Recommendation:** fix §8 to 1,024; define the distributable artifact as a directory literally named `shahid-ui-ux-skill/` (or set `name` accordingly) with a packaging/transformation task; relabel `evals/evals.json` as a SUS-internal convention; run `skills-ref validate` plus a should-trigger/should-not-trigger eval in CI.
- **Verification:** `skills-ref validate ./dist/shahid-ui-ux-skill` passes; triggering eval reports measured precision/recall on a labelled prompt set.

**F-12 · P1 · G7/G8 gates would produce false failures and one statistic is wrong**
- **Impact:** a data table (a launch playbook) legitimately scrolls horizontally at 320 px; inline links and spacing-compliant small targets legitimately fail a naive 24×24 check. Blocking "acceptance" gates would reject conformant UI and train users to waive gates wholesale.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:212-213`; verified WCAG 2.2: 1.4.10 Reflow "Except for parts of the content which require two-dimensional layout" (explicitly data tables), 2.5.8 five exceptions, **86** success criteria (not 87); `COVERAGE_MATRIX.md:26`; `TOOLING_CANDIDATES.md:12` claims "≈33% of **87** criteria — **measured**, not assumed" with no measurement recorded.
- **Recommendation:** restate G7/G8 with the actual normative exception text and a `DECISIONS.md` waiver mechanism with named approver + expiry (already specified at `:219-220` but not applied); correct 87→86; remove "measured" until a measurement artifact exists; make axe coverage a documented estimate.
- **Verification:** two fixtures — (a) a data table at 320 px with a recorded 2-D-layout exception passes G7, (b) an inline text link passing the spacing exception passes G8 — plus a negative fixture that still fails both.

**F-13 · P1 · Source-mapping confidence metric is internally inconsistent**
- **Impact:** the go/no-go number measures instrumentation coverage, not mapping quality. The 0.6 heuristic tier can never contribute, so the "degrades gracefully" promise in ADR-003 is untestable.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:321-323` discrete tiers {1.0, 0.6, 0.3} with "below 0.6 never edits" vs `:183` / `TASKS.json:445` "≥90% ... confidence ≥0.8"; `ADR_DRAFTS.md:107-108` reversal trigger also uses "≥90% mapping confidence".
- **Recommendation:** define confidence as a continuous, calibrated score with a documented formula and a per-tier distribution report; or restate the metric as "≥90% of picked nodes resolve at tier 1.0 on ≥1 stack" and add a second metric for heuristic-tier accuracy.
- **Verification:** the spike report publishes a confusion matrix per tier and per stack, with a reproducible command.

**F-14 · P1 · "AST-only writes" cannot be satisfied on the mandated second stack**
- **Impact:** the write path is the core of Live Studio. If `.astro`, CSS and content/Markdown cannot be edited by the named AST tools, either the "never regex" rule is broken or the second spike stack cannot be supported — contradicting D18 and the GA mandate.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:325-328` (ts-morph / recast / jscodeshift / Prettier); `TASKS.json:445-448` requires `.tsx/.astro/.css/content` write paths; `ADR_DRAFTS.md:30-31,91-93`; `TOOLING_CANDIDATES.md:31` "Next.js SWC plugin / Turbopack loader" — custom SWC plugins in Next.js are experimental, version-coupled and wasm-based; `ADR_DRAFTS.md:34` defers Svelte/Vue compilers.
- **Recommendation:** add explicit per-language editor adapters (Astro compiler, PostCSS/CSS AST, Markdown/MDX AST) with a **refuse-and-report** path for unsupported syntax; add a Babel-transform fallback ADR for Next.js; time-box a Next.js instrumentation feasibility test inside the spike.
- **Verification:** the spike performs one apply + one clean revert on each of `.tsx`, `.astro`, `.css` and a content file, with `typecheck && build` green after each.

**F-15 · P1 · Rollback via `git stash create` risks losing user work**
- **Impact:** `git stash create` produces a commit object of tracked changes only; it does not capture untracked files and does not freeze the index/worktree. Restoring after a build/verify cycle can conflict with edits the user made during the preview window — directly violating "never overwrite uncommitted user work" (`SUS_MASTER_PRD_v1.0.md:64,449`) and "preserve uncommitted changes" (`:331`).
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:327-328`; `SUS_MASTER_PRD_v1.0.md:331,449`; `ADR_DRAFTS.md:95-96` (variant preview writes candidate changes to disk while the user's app is live).
- **Recommendation:** replace with a transaction manifest (list of absolute realpaths + SHA-256 before/after + byte-level snapshots outside git), a clean-worktree precondition, and a conflict re-check immediately before apply; abort on any hash change.
- **Verification:** fault-injection test where a file is modified between preview and apply → tool aborts, reports the conflict, and the user's bytes are unchanged; untracked-file test → preserved.

**F-16 · P1 · Bridge token storage and execution world are ambiguous / unsafe as written**
- **Impact:** read literally, the HMAC session token is placed in a **non-`HttpOnly`** cookie inside the origin of the untrusted inspected page. Any script on that page could read it and authorise source writes — defeating the entire localhost trust boundary. CDP injection into the page's main world (unspecified isolation) compounds this.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:343` "per-session HMAC token in a non-`HttpOnly`-by-accident cookie or header" (garbled); `:345-347` "treat page text as data — **strip instruction-like content** before it reaches the agent"; `ADR_DRAFTS.md:90,98-100` CDP injection, CSP nonce, "DOM text treated as data (prompt-injection quarantine)"; `TASKS.json` T0806 correctly says injection must be rejected **at the action boundary**. Filtering natural language is not a sound primary defence; the two statements disagree.
- **Recommendation:** specify an isolated world / separate origin for the overlay; token in an `HttpOnly; SameSite=Strict; Secure`-where-applicable cookie or a header held only by the trusted bridge client, never exposed to page JS; short TTL + rotation + revocation; make the **action boundary** (not text filtering) the primary control, with filtering as defence-in-depth.
- **Verification:** a hostile fixture page runs `document.cookie` / `window` enumeration and attempts an unauthorised apply; the token is not readable and the operation is rejected with a logged audit entry.

**F-17 · P1 · WBS tasks are not 15–60 minute reviewable units**
- **Impact:** "one micro-task at a time" becomes theatre; estimates, gates and independent review are meaningless when a single task contains six full playbooks or three production websites.
- **Evidence:** `TASKS.json:716-723` T0405b = 5 playbooks, `:725-732` T0405c = 6 playbooks, `:779-786` T0906 = 3 dogfood sites, `:652-659` T1002 = 6 briefs × 3 modes + n≥20 blind raters, T1005 = release + licence + channel + publish; each has **one** acceptance criterion. `SUS_MASTER_PRD_v1.0.md:158-172` requires **12 parts per playbook** (including research references, visual examples, failure cases, state matrices, motion, a11y, responsive, copy/SEO). `AGENT_START_PROMPT.md:26`, `SUS_MASTER_PRD_v1.0.md:418` require 15–60 minute units.
- **Recommendation:** decompose one playbook per task; split benchmark, dogfood sites and release into their own task chains; add `effort_estimate`, `deliverable_artifact` and ≥2 measurable acceptance criteria per task; regenerate the WBS.
- **Verification:** 100% of tasks have exactly one primary artifact, ≥2 objectively checkable acceptance criteria, and a recorded estimate ≤60 minutes (or an explicit owner-approved exception).

**F-18 · P1 · The "no templates" epistemic rule contradicts the Direction Engine design**
- **Impact:** this is the project's most distinctive owner decision (D15). A builder must choose between implementing A2/Part 5 (a structured visual-world schema — arguably a template) or E1 (which forbids it). Either choice silently violates a "fixed requirement". The same tension exists between E1 and the 12-part playbook schema that prescribes concrete dimensions, colour roles and spacing.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:43-50` (E1), `:141-146` (A2 strategy taxonomy + Banned Defaults + 3 candidate directions), `:273-287` (Direction Engine YAML: `type`, `palette`, `composition`, `material`, `imagery`, `motion_character`), `:289-294` (uniqueness check); `SUS_MASTER_PRD_v1.0.md:158-172`.
- **Recommendation:** define "template" operationally: taxonomy entries and playbooks may contain **constraints, tradeoffs, evidence and failure cases**, but no concrete renderable values (hex, px, font family names, asset URLs, complete layouts). Add a knowledge-lint rule enforcing this, and record the boundary as an owner-approved interpretation.
- **Verification:** `knowledge-lint` rejects any taxonomy/playbook entry containing a concrete value token; one brief still produces three materially distinct, reasoned directions (`PRD_AMENDMENTS_v1.1.md:145-146`).

**F-19 · P1 · Research provenance does not meet the PRD's own §14 standard**
- **Impact:** the "evidence-based design judgment" foundation is itself unevidenced. Without retrieval dates, classification, licence and claim mapping, the anti-fabrication guarantee (`PRD:59`, `:364`, gate B) is unenforceable and stale competitor facts go unnoticed.
- **Evidence:** `SUS_MASTER_PRD_v1.0.md:364` requires title, URL, retrieval date, classification, licence, credibility notes, claims supported, last review date; `RESEARCH_AND_EXPERTISE_MODEL.md:104-136` gives bare URLs (plus one book citation), **no per-source dates/classification/licence/claim mapping**; `:7-8` says claims are marked `[evidence]`/`[inference]`, but the tables at `:28-41` and `:58-69` are mostly unmarked and `:73` asserts "Verified public behaviour as of research date `[evidence]`" without per-claim sources; `:77` describes Impeccable Live as "alpha", while the verified live docs say **"Live Mode is in beta"**.
- **Recommendation:** ship `REFERENCES.json` with the eight required fields; knowledge-lint enforces completeness and rejects unmarked claims; add retrieval dates and a scheduled re-review job; re-baseline the competitive floor with dated sources.
- **Verification:** 100% of cited claims resolve to a reference record with retrieval date + classification + licence; a lint violation fixture fails CI.

### P2 — Medium

**F-20 · P2 · Competitive differentiation is thin and the baseline is stale**
- **Impact:** SUS declares Studio "mandatory" and "must aim to outperform Impeccable Live" (`PRD:26`), but the competitor's verified public Live Mode already supports element selection, strokes/comments, multi-variant comparison, page-wide "Steer", element insertion, direct text editing, session recovery, CSP setup guidance, and Vite / Next.js / SvelteKit / Astro / Nuxt / static HTML. `COVERAGE_MATRIX.md:19-20` marks static HTML and non-JS stacks ❌ for Studio. SUS v1 would therefore ship **behind** on compatibility while claiming superiority.
- **Evidence:** `SUS_MASTER_PRD_v1.0.md:26,338-340`; `RESEARCH_AND_EXPERTISE_MODEL.md:75-85`; `COVERAGE_MATRIX.md:19-20,50`; verified `https://impeccable.style/docs/live/`.
- **Recommendation:** re-baseline with a dated feature matrix; define 2–3 genuinely differentiating, *measurable* outcomes (evidence bundle completeness, section-gate enforcement, source-map accuracy, approval/undo reliability) rather than feature parity; keep Part 9's claims protocol.
- **Verification:** a dated comparison page exists with protocol + measured results + raw data before any comparative claim appears.

**F-21 · P2 · Four surface modes are not consistently covered by fixtures or benchmark**
- **Impact:** "Read" has no row in the Part 0 priority table and no standalone fixture; Part 9 benchmarks only 3 modes. Coverage claims cannot be validated.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:15-21,27-29,132-134,362`; `COVERAGE_MATRIX.md:18`; `TASKS.json:74,689` (4 fixtures).
- **Recommendation:** decide whether Read is first-class; if yes add a fifth fixture and align `T1002` to 4 modes; if no, restate "four modes" as "three fixture modes + Read as an advisory critique lens".
- **Verification:** a generated coverage table asserts each declared mode has ≥1 fixture and ≥1 benchmark brief.

**F-22 · P2 · Node/runtime statements are factually stale at the adoption date**
- **Impact:** pinning "the active LTS line" to Node 22 in November 2026 creates an already-outdated support and security story for a product that has not started.
- **Evidence:** `ADR_DRAFTS.md:169-170` "Node ≥ 22 LTS — **the active LTS line at adoption**; Node 20 reached end-of-life in April 2026"; verified `nodejs.org/en/about/previous-releases`: v22 (first released Apr 2024), v24 (May 2025), v26 (May 2026) all in LTS, v20 marked EOL with last update Mar 2026.
- **Recommendation:** state a floor **plus a supported range** (`≥22`, CI-tested on 22/24/26), re-verified at each release; separate "minimum" from "recommended".
- **Verification:** CI matrix runs the toolchain on every supported LTS line and `sus doctor` reports the detected line accurately.

**F-23 · P2 · G10 has placeholder thresholds; several other gates have unmeasured numbers**
- **Impact:** "precision ≥ target and recall ≥ target" can never pass or fail; the release gate for detector quality is undefined. Other numeric gates (G6 5 s, G8 44 px, F6's LCP/CLS/INP/byte budgets) are asserted without measurement, contradicting `PRD:393`.
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:215,211,213`; `PRD_GAP_ANALYSIS.md:22`; `SUS_MASTER_PRD_v1.0.md:393`; `RISKS.md:10` "false-positive rate above **target**".
- **Recommendation:** set thresholds only from measured baselines in M1.5, record the measurement command + corpus size + confidence interval, and store them in a versioned `thresholds.json` referenced by gates.
- **Verification:** every gate's threshold resolves to a recorded measurement artifact; CI fails on a dangling "target".

**F-24 · P2 · "No outbound network calls" conflicts with research intelligence**
- **Impact:** implemented literally in the bridge package, it blocks live competitor/standards research; implemented loosely, it creates an unreviewed egress path for screenshots/DOM — a privacy risk given the redaction requirements.
- **Evidence:** `ADR_DRAFTS.md:100`; `SUS_MASTER_PRD_v1.0.md:59,292,364`; `PRD_AMENDMENTS_v1.1.md:330` screenshot/DOM retention + opt-in telemetry.
- **Recommendation:** scope the prohibition to the bridge (`bridge: zero egress`) and define a separate, explicitly consented `research` egress policy with domain allowlist, redaction, retention and offline mode.
- **Verification:** an egress test asserts the bridge opens no outbound socket; research capability has its own allowlist test and an offline-mode test that marks sources `unverified`.

**F-25 · P2 · Task-graph claims of "ALL CHECKS PASSED" were produced by a checker with a blind spot**
- **Impact:** the prior structural check skipped non-`T`-prefixed strings (`M3–M9 tasks`), producing a false clean bill of health. The current graph is clean, but the *checker* is not proven to catch the whole class of defect, and the false result is still visible in the primary table.
- **Evidence:** `TEST_EVIDENCE.md:14,44-45,55,78`; my independent recomputation confirms the current graph is clean (84 IDs, 0 unresolved, 0 cycles, 0 backward deps) but also found **F-06**, a real ancestry defect the "ALL CHECKS PASSED" family of checks did not detect.
- **Recommendation:** publish the checker as a committed script (not an ad-hoc `python3 -c`), version it, and add negative-test fixtures for unresolved refs, cycles, backward deps, missing-artifact dependencies and stale counts.
- **Verification:** the committed checker fails on each seeded defect and passes on the clean graph; output is captured in `TEST_EVIDENCE.md`.

**F-26 · P2 · Benchmark protocol has no power/sample justification and no owner**
- **Impact:** "≥6 briefs × 3 modes, blind human A/B n ≥ 20 raters per brief" (`PRD_AMENDMENTS_v1.1.md:362-364`) is a costly human-subjects exercise with no recruitment plan, consent/retention policy, cost, or statistical justification — and it is bundled into a single task (`TASKS.json:652-659`).
- **Evidence:** `PRD_AMENDMENTS_v1.1.md:359-364`; `TASKS.json:652-659`; `PRD:391-393`; `DECISIONS.md:24`.
- **Recommendation:** publish a benchmark protocol with power analysis, rater recruitment/consent, data retention, hardware, and a cost estimate; split into ≥5 tasks; get owner approval before spending.
- **Verification:** protocol document exists with a reproducible `make benchmark` command and raw data release plan.

**F-27 · P2 · No maintenance/ownership model for the knowledge library or the release**
- **Impact:** 15 launch playbooks + second wave + scheduled trend reviews + cross-project lesson promotion require an ongoing owner, review cadence and staleness policy; none is assigned. Licence, channel, telemetry and retention also have no owner or deadline.
- **Evidence:** `PRD:364,455-460`; `PRD_GAP_ANALYSIS.md:42`; `DECISIONS.md:21-24`; `RISKS.md:19` (model-shift decay) but no named maintainer.
- **Recommendation:** add `MAINTAINERS.md` with named roles (even if it is only the owner), a review SLA per knowledge class, and a dated decision calendar for licence/channel/telemetry.
- **Verification:** every knowledge file has a `last_reviewed` + `owner` in its frontmatter; a scheduled CI job reports stale files.

**F-28 · P2 · "Outperform" and "GA" language coexists with zero measured evidence**
- **Impact:** despite the claims protocol, aspirational wording in the PRD (`PRD:10,26`) can leak into marketing. `README.md:15-18` also embeds audit-process metadata ("Latest review: 48 findings") in the product README, blurring spec and process.
- **Evidence:** `SUS_MASTER_PRD_v1.0.md:10,26`; `PRD_AMENDMENTS_v1.1.md:359-364`; `README.md:15-18`; `COVERAGE_MATRIX.md:68-74` (good limitation statements that should be the public voice).
- **Recommendation:** move process/audit metadata to `docs/`; make `COVERAGE_MATRIX.md:68-74` the README's public claims section; add a `claim-checker` lint that rejects comparative adjectives without a benchmark artifact ID.
- **Verification:** `claim-checker` fails on a seeded "SUS is superior to X" string and passes on the current docs.

### P3 — Hygiene

**F-29 · P3 · `.gitignore` ignores `*.log` while §7.5 requires an append-only audit log**
- **Impact:** the mandated bridge audit log would be untracked by default, undermining the "every apply/revert is auditable" guarantee.
- **Evidence:** `.gitignore:23`; `PRD_AMENDMENTS_v1.1.md:347`; `ADR_DRAFTS.md:100`.
- **Recommendation:** store audit logs in a dedicated, explicitly tracked location (or a structured append-only file with a non-`.log` extension) with a retention policy; add an exception rule.
- **Verification:** a seeded apply/revert produces a committed/exportable audit entry that survives a clean clone.

**F-30 · P3 · Host-specific assumptions leaked into portable documents**
- **Impact:** contradicts D18 / agent-agnosticism and will confuse external contributors.
- **Evidence:** `TOOLING_CANDIDATES.md:64-69` "MCP / asset tooling available in **this environment**", `mcp__thesvg`; `PRD_GAP_ANALYSIS.md:52` "This host has no subagent tool"; `docs/AGENT_START_PROMPT.md:3` names three specific CLIs.
- **Recommendation:** move environment-specific notes to `HANDOFF.md`; express capabilities as a detected matrix, never as a fact about "this host".
- **Verification:** a portability lint finds no tool-name references in `docs/` spec files.

**F-31 · P3 · Tooling licence table claims a "verified-now" marker that is never used**
- **Impact:** minor credibility issue; every row is `⚠️ verify-at-adoption`, so the ✅ legend at `TOOLING_CANDIDATES.md:5` is misleading.
- **Evidence:** `TOOLING_CANDIDATES.md:4-5,9-21`.
- **Recommendation:** either verify a subset now with recorded commands (I verified three packages exist and their licences: `open-design-tokens` MIT, `@design-token-kit/cli` Apache-2.0, `dispersa` MIT) or remove the ✅ legend.
- **Verification:** each ✅ row has a recorded `npm view` / licence-check command with a date.

---

## 6. Proposed improvements (reasoned, highest value first)

1. **Freeze one normative requirements source.** Reason: C1 and F-02 are the root cause of most downstream ambiguity. A single machine-readable index with approval receipts makes the `APERIO` gate meaningful and gives every later agent an unambiguous contract.
2. **Make evidence self-verifying.** Reason: the product's differentiator is auditable evidence (F-03, F-08, F-25). A committed verifier that re-asserts every claim against a commit SHA is cheap and converts the project's stated value into an actual property.
3. **Introduce runtime capability tiers and a `sus doctor --probe`.** Reason: resolves F-04 without abandoning portability. It also gives the honest support matrix (A9, `compatibility.json`) real data instead of prose.
4. **Run the Studio spike first, with real apps.** Reason: F-05/F-07/F-13/F-14 all converge on one unproven bet. A two-week time-boxed spike with published confidence numbers decides whether the mandatory-Studio GA requirement is achievable at all; everything else (knowledge library, rubric, playbooks) is valuable even if Studio is re-scoped.
5. **Fix the WBS as data, not prose.** Reason: F-06/F-08/F-09/F-10/F-17 are all symptoms of hand-maintained text. Generate roadmap counts, ranges, gate registry and unlocked-task lists from `TASKS.json`; add a JSON Schema and a CI checker with negative fixtures.
6. **Align gates with the actual normative standards.** Reason: F-12/F-23. A gate that rejects conformant UI will be disabled by users; correctness here protects the whole "gates are real" premise.
7. **Operationalise the epistemic contract.** Reason: F-18/F-19. Turn "no templates" into a lint rule and "evidence" into a required schema; otherwise E1–E9 remain admirable prose.
8. **Re-baseline the competitive floor and the release story.** Reason: F-20/F-28. Dated, measured comparison is the only defensible route to any superiority claim; until then publish the honest limitations from `COVERAGE_MATRIX.md:68-74`.

---

## 7. Scorecard (0–5)

Scale: 0 = absent · 1 = poor · 2 = weak · 3 = adequate · 4 = strong · 5 = excellent.

| # | Quality dimension | Score | Rationale |
|---|---|---:|---|
| 1 | Product vision & clarity of intent | **4.0** | Compelling, differentiated, honest about limits; scope authority ambiguous (C1) |
| 2 | Requirements completeness | **4.0** | §1–§22 + amendments + gates + DoD cover nearly everything; traceability, effort model and runtime tiers missing |
| 3 | Internal consistency | **2.0** | 16 verified contradictions (C1–C16); stale counts; false evidence claims |
| 4 | Overall architecture soundness | **3.0** | Good layering and ADRs; portability-vs-enforcement conflict; two products under one install story |
| 5 | Master Skill / sub-skills / playbooks / knowledge mgmt | **3.5** | Strong conceptual design; spec violations (F-11), no artifacts, no ownership model |
| 6 | Multi-agent compatibility, install, invocation, portability | **2.0** | Honest labels but 0 hosts verified, 11 speculative adapters, host-specific leakage |
| 7 | Research intelligence & anti-AI-slop methodology | **3.5** | Best-in-class thinking; provenance machinery missing and one stale competitor fact |
| 8 | Section workflow, tokens, approval gates | **3.5** | Well specified; unenforceable on T1 hosts; WBS sizing breaks the loop |
| 9 | Motion, states, transitions, a11y, performance, validation | **4.0** | The strongest section; G7/G8 standard errors and placeholder thresholds |
| 10 | Mandatory Live Studio (spec completeness) | **3.5** | Very detailed; security thoughtful but ambiguous in critical places |
| 11 | Mandatory Live Studio (technical feasibility) | **1.5** | Unproven CDP/CSP assumptions, no stack fixtures, AST gap, brittle rollback, experimental SWC plugin |
| 12 | Content, copy, SEO, a11y, responsive | **4.0** | Mature, anti-fabrication, no ranking myths; i18n depth thin |
| 13 | Roadmap, dependencies, micro-task execution | **2.0** | Graph structurally clean but sizing/ancestry/unlocked-state/gate-ownership defects |
| 14 | Testing & independent verification | **1.0** | Zero product tests; evidence log contains unapplied fix claims; a false "ALL CHECKS PASSED" |
| 15 | Security & privacy | **3.0** | Broad threat coverage; token storage, execution world, rollback and egress ambiguities |
| 16 | Reliability / maintainability / performance | **2.0** | All aspirational; no code, no ownership, no retention policy |
| 17 | Release readiness | **0.0** | No product, no licence, no channel, no CI, no benchmark |
| 18 | Overall feasibility of the full scope | **2.5** | Feasible only as a staged programme with an early go/no-go spike and explicit scope triage |

**Weighted overall (planning maturity): ≈ 3.0 / 5.**
**Weighted overall (product / release maturity): ≈ 0.3 / 5.**

These two numbers should never be conflated. The documents are good; the product does not exist.

---

## 8. Recommended development priorities

**P0 — before `APERIO` is even considered (all are documentation/data changes only)**
1. `REQUIREMENTS.json` + approval receipts → closes F-02, C1.
2. Evidence verifier + superseded-row repair → closes F-03, F-25.
3. Runtime tier model + capability probe design + spec-compliant packaging → closes F-04, F-11.
4. WBS data repair: T0102c/T0102d stack fixtures, T0153 dependency, T0700 barrier, task schema, generated roadmap → closes F-05, F-06, F-07, F-08, F-09, F-10.

**P1 — first executable batch (still tiny)**
5. Time-boxed dual-stack mapping/write spike with published confidence numbers and a go/no-go decision record. **This is the single highest-value action in the entire plan.**
6. Gate correctness: WCAG exceptions, `thresholds.json`, spec-conformance validator, `knowledge-lint`.
7. Studio security contract v1: isolated world, token handling, transaction manifest, egress policy.
8. `REFERENCES.json` + dated competitive re-baseline.

**P2 — after a GO decision**
9. Thin vertical slice: one host, one framework, one section, one gate, one real E2E test with recorded output.
10. Only then expand M1.5 evaluation spine → M2 skill core → M3/M4 knowledge.

**P3 — explicitly defer**
11. Eleven host adapters, 15+ playbooks, three dogfood sites, n≥20-rater benchmark, public release. None of these should start before a GO on the spike.

---

## 9. Suggested micro-tasks with testable acceptance criteria

Each is scoped to one artifact and one verifiable command. IDs are proposals, not edits to `TASKS.json`.

| ID | Objective | Files | Acceptance criteria | Test / verification command | Rollback |
|---|---|---|---|---|---|
| MT-01 | Single normative requirements index | `REQUIREMENTS.json` (new), `tools/check_requirements.py` | Every PRD §1–§22 clause, A1–A11, E1–E9, G1–G12, ADR-001–006 has `id`, `source`, `sha256`, `status`, `owner`, `approval_date`; 0 ambiguous | `python tools/check_requirements.py` → exit 0, `ambiguous=0` | Delete file; docs unchanged |
| MT-02 | Evidence-claim verifier | `tools/verify_evidence.py`, `TEST_EVIDENCE.md` | For each "fix applied" row, the claimed string is asserted at the named commit; the `ALL CHECKS PASSED` row is inline-marked SUPERSEDED | `python tools/verify_evidence.py --commit cda9d9d` → prints unapplied claims; after repair `mismatches=0` | Revert doc only |
| MT-03 | Fix skill format constraints | `docs/PRD_AMENDMENTS_v1.1.md` §8, `docs/RESEARCH_AND_EXPERTISE_MODEL.md` §5 | 1,024-char description; `evals/evals.json` relabelled as SUS-internal; `name`/directory rule stated | `grep -n '200 chars' …` → 0 matches; `skills-ref validate` on a generated fixture skill → pass | Revert 2 lines |
| MT-04 | Define distributable skill layout | `docs/ADR_DRAFTS.md` ADR-001/002, `docs/SUS_MASTER_PRD_v1.0.md` §5.3 | Canonical artifact directory literally equals the `name`; packaging transformation task added to WBS | A generated `dist/shahid-ui-ux-skill/SKILL.md` passes `skills-ref validate`; name/dir match | Revert ADR text |
| MT-05 | Add stack fixtures and fix ancestry | `TASKS.json` (T0102c, T0102d, T0153, T0700) | `T0700` ancestry contains both Next.js and Astro fixture tasks; `T0153` ancestry contains all 4 surface fixtures; each fixture record has a `stack` field | `python tools/validate_tasks.py --ancestry` → 0 violations; 0 unresolved deps; 0 cycles | Restore `TASKS.json` from commit |
| MT-06 | Task schema + CI validator | `schemas/task.schema.json`, `tools/validate_tasks.py`, all 84 records | 84/84 have `actual_test_results`, `independent_review`, `owner`, `evidence`, `effort_estimate`, `gates`; negative fixtures fail | `python tools/validate_tasks.py` → 84/84 valid; seeded-defect suite → 5/5 correctly rejected | Revert schema + records |
| MT-07 | Generate roadmap from data | `tools/gen_roadmap.py`, `ROADMAP.md`, `README.md`, `RISKS.md`, `OWNER_DECISIONS_LOG.md` | No hand-written counts/ranges; all counts equal `len(tasks)`; all milestone ranges equal computed membership | `make docs-check` → 0 drift findings | Regenerate |
| MT-08 | WCAG-correct gates | `docs/PRD_AMENDMENTS_v1.1.md` G7/G8, `thresholds.json`, `TOOLING_CANDIDATES.md` | 1.4.10 2-D-layout exception and 2.5.8 five exceptions encoded; "87"→"86"; "measured" removed | Two positive + one negative gate fixture pass/fail as expected | Revert gate rows |
| MT-09 | Runtime tier probe design | `docs/COMPATIBILITY_TIERS.md` (new), `compatibility.json` schema | T1/T2/T3 defined with a feature×tier matrix; every gate has an explicit `unavailable` state; no gate can report `pass` without execution | Schema validation + a simulated T1 host returns `unavailable` for all gates | Delete new doc |
| MT-10 | Studio security contract v1 | `docs/PRD_AMENDMENTS_v1.1.md` §7.2/7.5, `docs/ADR_DRAFTS.md` ADR-003 | Isolated world specified; `HttpOnly; SameSite=Strict` token; rotation/revocation; transaction manifest replaces `git stash create`; bridge egress scoped | Hostile-page fixture cannot read token or authorise an apply; concurrent-edit fault injection aborts with bytes intact | Revert doc sections |
| MT-11 | Research provenance registry | `REFERENCES.json`, `tools/knowledge_lint.py` | Every cited claim resolves to a record with URL, retrieval date, classification, licence, credibility, claims supported, last review; `[evidence]`/`[inference]` markers complete | `python tools/knowledge_lint.py` → 0 missing fields; stale-competitive-fact detector flags "alpha" | Delete registry |
| MT-12 | Operationalise "no templates" | `docs/PRD_AMENDMENTS_v1.1.md` E1 clarification, `tools/knowledge_lint.py` | Boundary defined as constraints/evidence only; concrete value tokens (hex, px, font family, asset URL) rejected in taxonomy/playbooks | Lint rejects a seeded `#3B82F6` entry; one brief still yields 3 distinct reasoned directions | Revert doc + rule |

---

## 10. Questions requiring product-owner decisions

| # | Question | Why it blocks | Suggested default |
|---|---|---|---|
| Q1 | Is `PRD_AMENDMENTS_v1.1.md` **approved in whole**, or only the owner decisions D14–D23? Which of A1–A11, E1–E9, G1–G12 are binding at `APERIO`? | C1/F-02 — no builder can proceed safely | Approve per-section with an approval receipt; leave the rest `proposed` |
| Q2 | Are ADR-001…006 individually approved, amended or rejected — especially ADR-003 (CDP bridge) and ADR-006 (Node floor)? | `ADR_DRAFTS.md:185-189` requires individual decisions | Approve 001/002/004/005; hold 003 until the spike; amend 006 to a supported range |
| Q3 | What is the **minimum host tier** that may be labelled "supported" at GA — T1 (skill-only), T2 (CLI) or T3 (Studio)? | F-04 — determines whether the core value proposition exists on most hosts | T2 minimum for "supported"; T1 labelled "advisory only"; GA requires T3 on ≥1 stack |
| Q4 | If the `T0700` spike returns **NO-GO**, is the mandatory-Live-Studio GA requirement relaxed, or is the release cancelled? | F-05/F-07 — the fallback changes the entire roadmap | Pre-agree a written fallback: "Studio = variant-preview-only, labelled beta; no full GA claim" |
| Q5 | May SUS instrument the owner's real Next.js/Astro projects for the spike (dev-server plugin, `data-sus-id` stamping, temporary CSP changes)? | F-05/F-14 — needs real apps and explicit permission | Yes, on disposable copies, with an instrumentation teardown test |
| Q6 | Is **Read** a first-class surface mode requiring its own fixture and benchmark briefs, or a critique lens? | F-21/C6 — changes fixture corpus from 4 to 5 and `T1002` from 3 to 4 modes | Make Read first-class; add a 5th fixture; align Part 9 |
| Q7 | Who owns and funds the blind human A/B benchmark (≥6 briefs, n≥20 raters/brief), including consent, retention and raw-data release? | F-26 — currently one task with no plan | Publish protocol first; defer recruitment until a GO on the spike |
| Q8 | Which open-source licence and which distribution channel, and by what date? | `PRD:455`, `DECISIONS.md:22`, D06 — blocks any public release | Decide at M9; repo stays private until then |
| Q9 | What is the policy for telemetry, screenshot/DOM retention, secret redaction, and staging/remote access (Q4 in `PRD_GAP_ANALYSIS.md:69`)? | F-24 — currently "none by default proposed" without a decision | Local-only, no telemetry, 7-day screenshot retention, staging explicitly out of v1 |
| Q10 | Are evidence bundles (screenshots 3 viewports × 2 themes, motion traces) committed to the consuming project's repo, or stored elsewhere with a retention cap? | `PRD_AMENDMENTS_v1.1.md:296-315`, F-29, `.gitignore` — affects repo bloat and privacy | Hash + diff storage in `.sus/EVIDENCE/`, 90-day cap, no screenshots in git by default |
| Q11 | How is "no templates" reconciled with the Direction Engine YAML and the 12-part playbook schema? | F-18 — the most distinctive requirement is ambiguous | Adopt the constraint-only interpretation in MT-12 and record it as an owner-approved interpretation |
| Q12 | What is the intended **team/time envelope** and who maintains the knowledge library after v1? | F-17/F-27 — 84 tasks, 15+ playbooks, scheduled reviews | Single maintainer (owner) + quarterly review; re-scope if no capacity |

---

## 11. Verification log — exactly what was run

| # | Check | Command (abridged) | Actual result |
|---|---|---|---|
| 1 | Repo identity / commit / branches / remotes | `git status -b`, `git rev-parse HEAD`, `git log`, `git remote -v`, `gh auth status` | HEAD `cda9d9d` at review start; `origin` = target repo; `gh` authenticated as SHAHID8142 with `repo` scope |
| 2 | Immutable snapshot for line citations | `git archive HEAD \| tar -x -C /tmp/sus-audit-cda9d9d` | 22 files exported; 3,440 lines of `.md`/`.json` |
| 3 | Tracked-file inventory | `git ls-tree -r --name-only HEAD`; `find … -name '*.ts' -o …` | 22 files, all docs/JSON/ZIP; **0 source, 0 test, 0 CI, 0 `SKILL.md`, 0 `LICENSE`** |
| 4 | `TASKS.json` graph | Python: JSON parse, ID duplicates, unresolved deps, DFS cycle detection, milestone-order check, key coverage, transitive ancestry | **84 tasks**, 0 duplicates, 0 unresolved refs, 0 cycles, 0 backward deps; 3 done / 2 review / 79 pending; 0 unlocked tasks under `deps done`; `evidence` 5/84; `independent_review`/`actual_test_results`/`owner` 0/84; 46/84 with 1 acceptance criterion; **T0102b absent from T0153 ancestry**; **T0700 absent from M4/M5/M6 ancestry** |
| 5 | Archive integrity | Python `zipfile` byte comparison of 5 ZIP members vs `docs/` | **5/5 SAME** |
| 6 | Local link integrity | Python regex over all `.md` files resolving relative link targets | **0 broken local links** |
| 7 | External citation reachability | `curl -L -s -o /dev/null -w '%{http_code}'` over 45 distinct URLs | **41 × 200, 2 × 403 (bot protection), 2 × 429 (rate limited), 0 × 404**; 403/429 not proof of content validity |
| 8 | npm dependency existence | `npm view open-design-tokens / @design-token-kit/cli / dispersa / style-dictionary / ts-morph` | All exist: 0.7.0 MIT · 3.2.0 Apache-2.0 · 1.5.0 MIT · 5.8.0 Apache-2.0 · 28.0.0 MIT |
| 9 | Agent Skills specification | `WebFetch https://agentskills.io/specification` (twice) | `description` **max 1,024**; `name` **must match parent directory**; 3-stage progressive disclosure; `SKILL.md` <5,000 tokens / <500 lines recommended; `allowed-tools` **experimental**; validation via `skills-ref`; **no `evals/evals.json` and no triggering-test requirement** |
| 10 | DTCG status | `WebFetch https://www.designtokens.org/tr/2025.10/` | **Final Community Group Report, 28 Oct 2025; "not a W3C Standard nor on the W3C Standards Track"** — the PRD's "community report" wording is correct |
| 11 | WCAG 2.2 | `WebFetch https://www.w3.org/TR/WCAG22/` | **86** success criteria; 2.3.3 = AAA; 2.5.8 = AA with 5 exceptions; 1.4.10 = AA with a 2-D-layout exception incl. data tables |
| 12 | Competitive baseline | `WebFetch https://impeccable.style/docs/live/` | "**Live Mode is in beta**"; Vite / Next.js / SvelteKit / Astro / Nuxt / static HTML; strokes + comments, 3 variants, page-wide Steer, insert element, text edit, session recovery, CSP setup guidance |
| 13 | Node release status | `WebFetch https://nodejs.org/en/about/previous-releases`, `WebSearch` | v22 (Apr 2024), v24 (May 2025), v26 (May 2026) all LTS; v20 EOL — "Node 22 = active LTS at adoption" is stale |
| 14 | PR tooling / concurrency | `gh pr list`, `git branch -avv`, `git ls-remote --heads origin` | 3+ open independent-review PRs from other agents; `main` advanced from `cda9d9d` → `a878b71` → `6ea7fb7` during the review |

**Not run (honest):** no unit/integration/E2E/accessibility/visual/security/performance tests — none exist. No browser was launched, no Studio attached, no benchmark executed, no dependency installed, no LLM judge run, no product behaviour observed. No other agent's review file or PR content was opened.

---

## 12. Limitations and closing statement

This is a **document-level** audit of commit `cda9d9d`. It cannot and does not certify runtime behaviour, security, accessibility or performance — there is no runtime. Line numbers refer to the exported snapshot, not to the current working tree or to later `main` commits. Several other agents were working in the same working tree concurrently; my findings are anchored to the commit to remain reproducible, and findings that may have been fixed in later commits should be reconciled by the owner rather than assumed resolved.

The project deserves credit for its intellectual honesty: it explicitly refuses to claim what it has not measured, and most of the structural claims I tested were true. The defects above are not failures of ambition — they are failures of *closure*: ambiguous authority, a hand-maintained evidence trail, and an unproven central technical bet hidden behind a very large, very confident document set. Fix those four things and SUS has a credible path to a real product. Leave them and `APERIO` will produce an impressive-looking but unverifiable one-shot build — precisely the outcome `AGENT_START_PROMPT.md:54` warns against.

**Independent final verdict: NO-GO for build approval and GA; CONDITIONAL GO for continued planning. Keep `BUILD_PERMISSION = false` until all P0 findings are closed and independently re-verified.**

---

*Review completed 2026-11-13 by `hunyuan-hy` (WorkBuddy AI · Tencent Hunyuan Hy). No product files were modified.*
