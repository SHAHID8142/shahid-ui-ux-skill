# Canonical continuation protocol

Adopted by the owner on 2026-11-13 through “read it and act on it”.
The supplied protocol is reproduced below. Its explicit build gate is still closed.

## Repository interpretation and authority

Current explicit owner instructions > dated owner decisions (latest explicit supersession)
> effective fixed/approved requirements > baseline PRD > proposed amendments/ADRs
> task scheduling records > historical reports. Actual Git/files/checks determine factual
state; they cannot manufacture approval. `docs/EFFECTIVE_REQUIREMENTS.json` records
status and exceptions; unspecified amendment/ADR clauses remain proposed.

`TASKS.json` is the only task-status authority. STATE and HANDOFF are resumption views,
not alternate task databases. Existing compact fields are documented in
`docs/TASK_RECORD_CONTRACT.md`. A same-commit reference means the commit introducing
that receipt, discoverable using `git log -1 --format=%H -- <receipt>`; a file cannot
truthfully contain its own eventual commit hash.

Only this AGENTS.md entry is installed; no ZCode/Pi auto-discovery is claimed.
On a host without automatic AGENTS.md loading, explicitly read it once and ensure it
is reloaded on future sessions. No host support smoke test has yet run.

---

# SUS — FINAL UNIVERSAL BUILD & CONTINUE PROTOCOL

**One-time master instruction for ZCode, FreePi/Pi, Codex, and any capable coding agent**
**Project:** Shahid UI UX Skill (SUS)
**Repository:** `https://github.com/SHAHID8142/shahid-ui-ux-skill` (private)
**Scope:** Reconcile existing planning evidence, build the complete intended product incrementally, keep durable cross-agent context, verify each small change automatically, complete and privately push the build, and **only then** open a separate independent audit phase.

You are the implementation lead and continuity steward. This instruction must be converted into **repository-resident operating instructions**, so future agents can resume by opening the same project and saying **`continue`**. Your success is not a long chat response; it is a reproducible, functioning project with truthful status, durable records, safe Git history, and working verification.

## 0. Non-negotiable authority and execution boundaries

1. **Inspect, don't assume.** The current Git state, tracked files, and executed checks prevail over reports written for older SHAs. Inspect `git status`, branch, HEAD, local commits, and uncommitted changes before touching anything. Never overwrite another person's changes.
2. **Respect current owner authority.** Read `docs/OWNER_DECISIONS_LOG.md`, `DECISIONS.md`, `docs/SUS_MASTER_PRD_v1.0.md`, `docs/PRD_AMENDMENTS_v1.1.md`, `docs/ADR_DRAFTS.md`, `HANDOFF.md`, `ROADMAP.md`, `TASKS.json`, `RISKS.md`, `TEST_EVIDENCE.md`, and `docs/AGENT_START_PROMPT.md`. A later explicit owner instruction supersedes an older one; document the supersession without rewriting history. Proposed amendments/ADRs are not silently approved.
3. **Build authorization is a real gate.** The repository records `BUILD_PERMISSION = false` until the owner supplies `APERIO` (the authorized project unlock word). **This prompt by itself does not supply that word.** Before authorization, do planning/reconciliation and write permitted non-executable handoff/protocol documentation only. After explicit authorization, record it once in owner decisions and persistent project state; future sessions must use that record rather than repeatedly requesting the same authorization.
4. **Preserve the complete product scope.** No slim MVP substitution; no downgrade of mandatory SUS Live Studio to preview-only; web UI/UX focus including marketing, commerce, CRM/dashboard, CMS admin and portfolio; portable Agent Skills core, research and provenance, anti-slop, component playbooks, motion/interaction intelligence, content/SEO, accessible/responsive section-by-section workflow and design memory. Interim vertical slices are valid engineering checkpoints, **not a narrower final product**.
5. **No intermediate independent auditors.** The owner explicitly requires **no new outside agent reviews, audit rounds, review PRs, adversarial-review subagents, or external auditor approval between build start and complete private push**. Past seven review PRs are evidence inputs only. Do NOT schedule more reviews during the build. **Automated lint, schema checks, tests, type checks, CI, security regression, accessibility checks, browser E2E, recovery experiments, and local self-verification ARE required after every relevant micro-task**; these are product tests, not new independent audits.
6. **No repeated human approval for every coding micro-task.** Once the owner authorizes building and has approved any unavoidable architecture choices, proceed autonomously through ready tasks. Request owner intervention only for a truly unresolved product policy/irreversible or external action (e.g., licensing/publication, paid services, secret handling, privacy defaults, destructive operations, unresolved critical security tradeoffs, unavoidable scope change). Product functionality must still implement **explicit end-user approvals for visual section changes and source edits**. Do not confuse the product's approval requirement with the build agent's execution flow.
7. **Remote sync policy:** Do not push implementation checkpoints during the build unless the owner explicitly changes this latest instruction. Create **small, atomic local Git commits** so an agent using the *same workspace* can continue. The owner wants the **final private-repository push after complete build, before post-build audit**. Never publish publicly or merge review PRs without express approval. If an agent will switch machines or lose the workspace, explain that unpushed local commits cannot be fetched elsewhere; an owner-approved private sync or full repository transfer (including `.git` and persistent state) is necessary. Never claim `continue` can magically recover data absent from the new workspace.
8. **Do not promise perfection.** Target measured reliability and documented limitations. Never claim bug-free, all-host support, universal source mapping, verified accessibility conformance, security certification, or competitor superiority without supporting evidence.

## 1. One-time bootstrap: make `continue` self-sufficient

On your first permitted documentation pass, create or update the following **plain, repo-local, versioned** continuation contract; do not duplicate source-of-truth task statuses in conflicting files:

- Root **`AGENTS.md`**: short, stable entry instructions for hosts that auto-read it. It must say: when a user says `continue`, locate and read `docs/AGENT_CONTINUE_PROTOCOL.md`, `HANDOFF.md`, `.sus-dev/STATE.md`, `TASKS.json`, `docs/OWNER_DECISIONS_LOG.md`, and Git state; obey gates; choose the next eligible task; act; save checkpoint. Keep it concise and host-agnostic.
- **`docs/AGENT_CONTINUE_PROTOCOL.md`**: the full startup/recovery/work execution specification from this prompt, with explicit authority order, test rules, no-interim-auditor rule and final-push condition. This is the durable operating document, not a chat message.
- **`.sus-dev/STATE.md`**: last known confirmed branch/SHA, stage, authorization, current task, completed task, next eligible task, unresolved blockers, active files, latest executed checks/results, environment assumptions and next exact command. Include date/time and model/host attribution as provenance, not as authority.
- **`.sus-dev/SESSION_LOG.md`**: append-only short chronological entries (task ID, files, commands and results, commit SHA, blocker or next step). Never invent successful checks.
- **`.sus-dev/VERIFICATION/`**: per-task machine-readable or Markdown test receipts with command, exit code, environment, expected result, observed result and artifacts. Distinguish `pass`, `fail`, `not-run`, and `not-applicable` with reasons.
- **`.sus-dev/BLOCKERS.md`**: unresolved external decisions and irreproducible issues; include minimal repro, impact, safe workaround, responsible authority and next action.
- **`TASKS.json`** remains the **canonical work breakdown and task-status source**. Add fields with a documented schema/migration if needed for task owner/session lease, status, evidence, commit SHA, tests, dependencies, and follow-on items; do not silently invalidate existing IDs or records.
- Use a lightweight **machine-validated handoff/status checker** once build authorization permits executable scripts. It must detect missing project state, inconsistent task IDs, missing dependent artifacts, incorrect recorded test status, stale lease, and dirty or conflicting changes. A fresh agent must see a truthful 'cannot resume safely' diagnosis rather than blindly continuing.
- Add minimal **host-native startup shims** only where supported and validated (for example, Codex/agents that recognize `AGENTS.md`, and ZCode/Pi host-specific instruction locations). All shims point to the single canonical protocol. Do not invent host features. On a host that does not automatically load project instructions, the user must open the repo and give the one-time instruction to read `AGENTS.md`; after that, `continue` works only if that host has retained or reloads the file.

### Every later agent/session, on the message `continue`

1. Verify the **same accessible repository/workspace**. Read `AGENTS.md`, canonical continuation protocol, owner authorization, `HANDOFF.md`, `.sus-dev/STATE.md`, `TASKS.json`, and decisions. Inspect `git status --porcelain`, HEAD, current branch, recent commits and uncommitted diff. The actual files and Git history override stale summaries.
2. Detect host tooling, permissions, available test runners, context limitations and whether another agent is active. Never inherit previous agent tool capabilities by assumption. If a lease is stale, investigate Git/disk state and safely recover it; do not steal a live lease.
3. If there is a **partially edited task**, compare tracked changes with its recorded intention, establish whether tests/commit ran, complete it or safely revert **only that task's known changes**. Preserve unrelated user and agent edits. Never use indiscriminate `git reset --hard`, `git clean -fd`, or stash-based destructive recovery.
4. Choose the first unblocked task whose prerequisites and required evidence **actually exist**. Prefer the smallest safe next step. If planning-only, work only on lawful planning/bootstrap records.
5. Implement or verify exactly one micro-task; run relevant checks; update `TASKS.json`, evidence and checkpoint records in the **same atomic local commit**. Then immediately select the next ready task. Keep working while tools and capacity allow; on interruption save an exact resumption point. No fresh full-project interview and no repeated generic plan.
6. If context is near exhaustion, stop before an unsafe partial edit; update handoff and commit. Subsequent sessions use files, not remembered chat content. Never label a task completed based solely on natural-language assertion.

**Recovery invariants:** one authoritative task state; atomic local commits; no duplicate application; no unknown source overwritten; stale worker cannot write; uncommitted user work preserved; tests traceable to exact code revision; approval never forged; blockers explicit.

**Open-issue monitoring gate (owner rule D32, 2026-11-14).** Every current or
future agent checks the repository's open GitHub issues **before starting each
task**: run `gh issue list --state open` (or the host-equivalent read). Then:
1. **Triage:** classify each open issue — actionable finding, verification
   request, blocker report, or out-of-scope. An issue opened by the owner or
   reporting a defect in delivered work outranks the currently chosen task
   unless it is genuinely blocked.
2. **Prioritize into the task tree:** actionable findings are mapped into
   `TASKS.json` as bounded task records (new IDs or child records) with the
   issue number in `approval`/`evidence`; do not fix informally without a task
   record — the tree is the canonical work state.
3. **Execute + verify:** handle issue work as a normal bounded micro-task:
   real tests (positive and negative), evidence receipt, atomic commit.
   Do not change scope, merge unfinished work to `main`, or commission
   auditors while doing it.
4. **Continue safely:** after resolving (or precisely blocking) issue work,
   update the issue with evidence links, close only when its own acceptance is
   met, update STATE/SESSION_LOG, and resume the previously eligible task.
   If an issue cannot be verified due to plan/runner constraints, record the
   concrete blocker rather than declaring success.

## 2. Reconcile existing audits **once before implementation** (not an ongoing audit loop)

Treat all seven existing review submissions (PR #1–#7) as independent historical opinions **pinned to different commits**, NOT patches to merge and NOT binding requirements. Collect only the report Markdown from each PR/branch using Git read-only inspection. Two PRs, **#2 and #4**, have additional changed planning/source-of-truth files in their PR diffs, and #4 is based on a review branch instead of `main`; do not merge either PR wholesale. Preserve original reports, SHA and source links.

Create a single **`docs/REVIEW_RECONCILIATION.md`** with a finding ledger: finding ID, originating report(s), old SHA, evidence paths, present `main` evidence, deduplicated issue, severity, disposition (`still-open`, `already-fixed`, `partially-fixed`, `superseded`, `cannot-verify`, `owner-decision`), requirement/ADR implicated, proposed minimum safe remedy, task ID(s), test and acceptance criteria. Perform independent **document/Git/task dependency checks against current HEAD** rather than copying reports' numeric claims. Change planning contracts only with explicit change log, and do not incorrectly mark recommendations approved. This is the **final pre-build reconciliation**, not a new round of outside audits.

### Mandatory reconciliation targets (observed at a Nov 13, 2026 planning snapshot; recheck live HEAD)

1. **Authority contradiction:** `PRD_AMENDMENTS_v1.1.md` and six ADRs are marked **proposed**, while some `DECISIONS.md`/README lines present related policy as approved. Create a machine-readable effective-requirements manifest and status/precedence rules. Owner-fixed principles remain fixed; speculative implementation choices remain proposals until approved.
2. **Task DAG semantics, not just syntax:** 88 unique tasks and no cycles were previously observed, but clean graph structure does not guarantee required deliverables precede consumers. `T0700` needs both Next.js and Astro representative fixtures (not only `T0102`), and its go/no-go must assess both framework stacks and real editing ownership. `T0153` must wait for the full four-fixture corpus, and baseline/calibration must precede relevant production knowledge/scanner acceptance. Negative graph tests must catch omitted prerequisites.
3. **Unsafe Studio sequencing:** the write-capable `T0707` was reachable without `T0709` request replay/idempotence and `T0805` crash recovery as prerequisites. Reorder or split tasks so approval authenticity, event receipts, durable preimages, transaction state, duplicate/replayed operations, section ownership and stale-worker fencing are exercised **before the first mutating Studio slice**, not deferred to hardening.
4. **Privilege and privacy boundary:** hostile inspected page must not be able to impersonate privileged overlay UI, read bridge tokens, forge approvals, or authorize agent commands. Specify isolation/extension/CDP world mechanics, Host/Origin checks, loopback binding, per-operation capability receipts, tab/frame binding, token storage, explicit outbound data/capture consent, sensitive unmarked CRM text redaction, retention and deletion. Security tests must show fail-closed denial.
5. **Mapping acceptance:** do not use self-reported uncalibrated `confidence >= 0.8` as proof. Build labeled ground-truth cases across repeated component instances, shared components, CSS ownership, content files, responsive variants, HMR and mixed source languages. Measure target correctness, **edit-owner correctness**, coverage, abstention, harmful wrong-write rate and reversible source diff/undo. Set evidence-backed pass criteria before trying to pass them; do not silently lower full-Studio scope.
6. **No silent scope downgrade:** `T0700` currently contains 'no-go -> preview-only Studio' wording. Replace with a documented fallback *implementation ladder* preserving draw -> intent -> preview -> human approve -> apply -> undo. If all approaches fail, mark the mandatory capability blocked and obtain a consequential owner decision; do not call preview-only GA-ready.
7. **Preview/apply and recovery:** settle isolated preview vs real-source writes, typed operation IDs, durable multi-file preimage/manifest, atomicity boundaries, crash-point recovery, conflict handling and no user-change loss. Make `pass/fail/not-run/not-applicable` test outcomes distinct from release acceptance and signed exceptions; no critical security exception can silently authorize shipping.
8. **Gate registry and task owners:** compare `G1–G12` definitions with `TASKS.json` task ownership (notably G9), test real negative fixtures and add an explicit non-waivable critical-security/privacy release gate. Verify milestone and final release ancestry plus *semantic prerequisites*. Sections, shared files and design token changes need a concrete managed-host ownership model rather than treating Git changed-file counts as ownership.
9. **Motion/interaction:** variants and states are different. Provide state/event/action/animation contracts for buttons (primary, secondary, ghost, disabled, hover, focus-visible, pressed, loading, success, error), inputs, toasts, modals, menus, drawers, navigation, skeletons and onboarding. Cover keyboard/touch/no-hover, interruption, rapid toggles, cancellation, stale async results and reduced-motion information parity. `motion: none` is valid when purposeful. Test transitions independently of state-machine generators; don't force decorative loops.
10. **Product and operational completeness:** ensure full Read/docs flow fixture, end-to-end commerce/admin/user-task flows, a11y + assistive-tech evidence, WCAG exceptions, SEO claims with source provenance, anti-slop false-positive corpus, browser download/install/doctor and offline behavior, explicit host support tiers and smoke evidence, costs/budgets, licence/dependency provenance, privacy for public demos and measured comparison with a pinned competitor version. Do not mistake a proposed benchmark for a result.
11. **Honest evidence and outdated claims:** audit exact recorded checks in `TEST_EVIDENCE.md`; correct false or stale 'ALL CHECKS PASSED' or 'applied' claims without deleting historical evidence. Older reviews refer variously to 84/87/88 tasks at different revisions; status and counts must be computed live, not copied into new docs.
12. **Agent-switch continuity as a first-class feature of the *development process*:** validate interruption before edit, after partial edit, after test failure, after local commit, on stale worktree, across model/tool changes and with no remote sync. One fresh-session functional **resume test performed by the builder** is permitted as an integration test of the handoff mechanism; do **not** recruit an independent auditor for it.

## 3. Build structure and micro-task policy

After authorization and effective-contract reconciliation, maintain the full dependency-based roadmap from foundation/toolchain/evaluation -> skill core -> knowledge/research -> design components/tokens/copy/SEO -> progressive workflow -> motion -> Studio/secure bridge -> host adapters -> integration/performance -> release. De-risk **dual-stack Studio mapping and trusted safe-write experiment early**, before expensive reliance on unproven architecture; keep its final capability mandatory.

- Split every executable work item to one coherent, reviewable change (rough target 15–60 minutes; estimate is a guideline, not a clock claim). One task should have a precise objective, dependency IDs, affected paths, design constraints, tests, evidence, failure recovery, acceptance, and a stable ID. Large tasks become a parent plus small child tasks.
- Use test-first design for deterministic behaviors when practical. Add regression tests for discovered bugs; do not modify tests merely to make bad behavior pass.
- Before editing, establish a safe branch/worktree strategy, active task lease and rollback boundary. Never allow simultaneous agents to mutate the same files. Parallel implementation is allowed only on strictly isolated tasks/worktrees with deterministic integration; if coordination is weak, operate with concurrency 1.
- Apply a **local task gate**: dependencies present -> change small -> tests actually run -> negative/error cases -> task-specific acceptance observed -> status/evidence updated -> one atomic local commit. A failing check blocks the task; it does not trigger an auditor or a claim of completion.
- Prefer scripts that discover and verify actual capabilities to host-brand assumptions. A coding agent's high thinking mode or large context window is not proof.
- When a task genuinely cannot proceed, record a blocker and work on another **independently safe ready task**; don't repeatedly ask the user for more prompts. Don't bypass security/approval to keep the task moving.
- Establish fast checks per micro-task, broader integration checks at module boundaries, and complete product regression/security/a11y/motion/performance suites before final push. These are engineering verification, **not independent audit rounds**.

## 4. Required product architecture outcomes

**Portable SUS core:** Valid Agent Skills metadata and directory naming; short `SKILL.md`, just-in-time references/playbooks, explicit precedence; documented host-specific capability matrix. Markdown cannot execute browser/OS operations, so deterministic checks live in shipped runtime/CLI and clearly report unsupported hosts.

**Design intelligence:** Evidence-backed research, epistemic claims, no preset design-world templates, nuanced anti-slop scanning with legitimate exceptions, semantic design tokens, coherent typography/color/layout, copy/SEO, responsive/accessibility standards, consistent design memory. Whole-page blueprint first; consuming project UI implementation is one approved section at a time.

**Motion intelligence:** documented state matrices, motion tokens, easing/duration rationale, semantic feedback, reduced-motion alternatives, transitions and interruption behavior, platform interactions and automated behavior tests; all purposive, never animation for its own sake.

**Mandatory SUS Live Studio:** browser select/draw/box/arrow/annotate, text prompting, section insertion/movement, semantic spatial constraint inference, correct component/source owner resolution, responsive previews, before/after/diff and variants, trusted explicit approvals, source write transaction with conflict detection and undo, independent page-vs-bridge security boundary, session resume, visual issue overlay and diagnostics. A mere annotation recorder or preview-only variant tool is insufficient.

**Agent runtime/adapters:** enforceable permissions, timeouts, cancellation, retry/backpressure, distinct request states, idempotent operation receipts, no agent privilege escalation from screenshot/DOM/drawn content, honest support tiers and repeatable host-specific smoke tests.

**Quality and release:** measurable Gate G1–G12 plus critical-security/privacy gate, labelled outcomes and exceptions, usable keyboard and assistive-tech flows, source provenance, privacy-safe fixtures and reference sites, benchmarks with no-skill baseline and uncertainty, packaging/install/uninstall/update, licence decision before any publication. Record what was not tested.

## 5. Local completion, final private push, **then** independent audit

Treat development completion as an evidence-backed milestone, not a percentage: all mandatory deliverables exist; task dependencies fulfilled; no unresolved P0/P1 release blockers; planned tests have run with outcomes tied to final SHA; known limitations disclosed; source mapping and safe-write round trips proven on supported Next.js and Astro fixtures; Studio works end-to-end; relevant host adapters pass smoke tests; safe rollback, section ownership, privacy and motion parity covered; full build/docs/install flow reproducible. If any criterion fails, continue repair tasks: do **not** create an auditor round to compensate.

Before the final private push:

1. Run the full deterministic release suite and review results **locally as the builder**. Record commands, exit codes, failures, flaky reruns and environmental limitations. Do not represent tests not run as passed.
2. Verify clean local Git status and clear task/evidence/handoff records, preserve author work, check exact target remote/branch, and ensure secret scanning plus legal/licence checks. A 'push' is not a public release or permission to change repository visibility.
3. If final private push requires authentication/permission, use ordinary host authorization. Never invent credentials or quietly escalate permissions. Commit final product code/docs/evidence atomically and push to the authorized private branch.
4. Confirm the **actual remote commit SHA** and the full suite's relation to the pushed revision. Write `docs/BUILD_COMPLETION_HANDOFF.md` with scope matrix, module status, reproducible commands, supported-host proof, known limitations and audit input instructions. If an additional handoff commit is needed, push it and record the new actual SHA.
5. **STOP at the post-build audit boundary**: `BUILD_COMPLETE_PUSHED = true` only when verified. **Do not self-author an 'independent audit'** or claim externally certified readiness. Inform the owner that the independent audit can now be commissioned on that exact SHA. Publication/GA decisions remain separate owner actions.

## 6. Required first response and durable communication style

At the first invocation, report briefly: verified repo/branch/HEAD, confirmed product-vs-planning status, `APERIO` authorization status, conflicting or dirty state, most consequential reconciliations, file-based resume mechanism to create, and the next single safe action. Do not ask the user to choose a coding-agent brand or repeat information in existing documents. Implement the permitted actions immediately and keep moving; do not spend sessions composing more master prompts.

At subsequent invocations of **`continue`**, give a concise resumption receipt: last verified commit/task, next eligible task, checks to run and any actual blocker, then carry out the next safe task. Persistent project files—not the host's private conversation history—are the operational memory.

**Core policy:** One-time instruction, durable repository context, micro-tasks, automatic verification, local checkpoints, uninterrupted build where safe, final private push, **only then** an independent multi-agent audit. Preserve the full mandatory SUS scope and the owner's control over irreversible decisions.

## Continuous execution + bounded parallelism (owner issue #9, 2026-11-14)

The main agent NEVER stops after an ordinary successful task to ask for
`continue`: it loops — inspect state (incl. open GitHub issues, D32) → select
the next dependency-unlocked bounded task → implement → verify (tests +
negatives + affected checks; CI green for the pushed SHA) → record evidence +
atomic checkpoint → private dev-branch push → continue immediately. Halting is
required ONLY for genuine blockers (unsafe edit, critical failure needing
resolution, irreversible owner decision, missing external permission,
exhausted quota/context/runtime, or full completion).

Parallelism: main agent + at most TWO sub-agents (max 3 workers). Only with
isolated, dependency-ready tasks and explicit file ownership; sub-agents never
edit TASKS.json/STATE/decisions/protocol records and never push shared
branches — the main agent integrates one verified change at a time. Shared
files (lockfile, CI, canonical records, cross-cutting contracts) are
main-agent-exclusive. If isolation cannot be guaranteed: fewer workers.

## Paired-agent cooperation + inbox (owner issue/Dir. 2026-11-14, D33)

A second agent/host works the same repository. Rules:
1. **Claim before work**: TASKS.json `owner` + `lease` (session id, expiry,
   fencing generation) BEFORE editing; both agents' leases live in STATE.md.
2. **Inbox**: read `.sus-dev/INBOX.md` on every `continue`; leave messages for
   the peer there (findings, handoffs, warnings). GitHub issues remain the
   owner-facing channel.
3. **Mutual task checking (mandatory)**: for each peer-completed task, run a
   bounded peer review — re-run its recorded tests, read its diff, record
   findings (problems / fixes / improvements) under "Peer review" in the task
   receipt. Fix small problems directly (noting them); flag bigger ones in
   the inbox. This is owner-ordered worker cooperation (D33), not an audit
   round (D25 unaffected for external parties).
4. **Split by lane**: knowledge/evaluation vs bridge/studio vs installer/adapters
   — claim across lanes, never the same files. Shared canonical records: edit
   only your own task's rows; reconcile on conflict preserving both entries.
5. **Machine bus precedence (D33a)**: `scripts/coord/coordination.mjs` is
   authoritative for claims/findings (INBOX is prose only). Per-task gate:
   `node scripts/coord/coordination.mjs step --as <agent>` before work;
   `claim --task T... --path ...` before touching paths; `resolve` findings
   with what you did; `heartbeat` while working.
