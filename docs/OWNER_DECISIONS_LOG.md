# SUS — Owner Decisions Log

Running record of every instruction from the owner, so nothing is lost between sessions.
Newest entries appended at the bottom. **Nothing here is implemented** unless marked.

> **Historical record.** Entries are appended in order and current status lives in `TASKS.json` and
> `.sus-dev/STATE.md`; a decision's "where it lands" line may name a task that has since been
> completed. This log is the trail of owner intent, not a status source.

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

## Build gate (closed — see D28 below)

```
BUILD_PERMISSION = true        # APERIO received 2026-11-13; recorded once as D28/D29.
UNLOCK_KEYWORD  = "APERIO"     # means: start building. Does not load the Aperio Next workflow.
```

Implementation tasks in TASKS.json are executable subject to their dependencies.
Product artifacts are created from T0101 onward with per-task verification, evidence
receipts and atomic local commits (D26), plus private dev-branch checkpoint pushes (D30).

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

## 2026-11-13 — continuation protocol adoption (D24–D27)

Source: owner supplied SUS_FINAL_UNIVERSAL_BUILD_CONTINUE_PROMPT.md and explicitly
instructed “read it and act on it” in Codex. Full text: AGENT_CONTINUE_PROTOCOL.md.

- D24 | Adopt the repository-local continuation contract, full mandatory scope,
  automatic micro-task verification and durable local commits | approved process.
- D25 | No new independent audits/review agents between build start and complete
  private push; historical PRs #1–#7 are evidence only | supersedes D10's pending
  reviewer request and PRD §18 interim-review steps. No new auditor commissioned.
- D26 | Local atomic commits; final private push only after complete verified build |
  supersedes DECISIONS continuous-push entry and older handoff/start instructions.
- D27 | This adoption does not supply APERIO or approve proposed ADRs. The build
  gate remains false; no repeated per-micro-task owner approvals after authorization |
  approval requests reserved for genuinely unresolved consequential decisions.

D24 also confirms mandatory full Studio scope; D23 wording confirmation is no longer
needed for that scope. It does not approve ADR-003's particular implementation.

## 2026-11-13 — APERIO authorization and build start (D28–D31)

Source: owner message beginning "APERIO / I authorize the actual implementation of
Shahid UI UX Skill (SUS)", received 2026-11-13 in ZCode on branch
chore/continuation-reconciliation at a4533a8. This is the recorded one-time unlock;
future sessions must reuse this record, not re-request authorization.

- D28 | **APERIO received: build gate closed.** `BUILD_PERMISSION = true` from this
  commit forward. Actual implementation of the full mandatory scope is authorized per
  docs/AGENT_CONTINUE_PROTOCOL.md. Do not restart planning or repeat completed audits.
- D29 | **T0004/T0005 approved: architecture baseline adopted.** ADR-001/002/004/005/006
  are adopted as proposed; ADR-003 is adopted as amended (dual-stack experimental
  ladder with fallback implementation ladder, conservative privacy policy, no
  consumer-source writes before safety prerequisites) — the exact scope the owner
  review packet proposed. Evidence-supported, reversible recommendations (each ADR
  carries a reversal trigger) form the implementation baseline. **Irreversible external
  matters are not decided by this:** licence/distribution (D06/B003), paid services,
  publication/GA, and real customer data remain separate owner decisions.
- D30 | **Private dev-branch checkpoint pushes permitted.** Supersedes D26's strict
  no-push rule per the authority order (latest explicit owner instruction wins). Safe
  private development-branch checkpoints may be pushed for recovery and agent transfer.
  Never publish, never merge unfinished work into `main`, never change repository
  visibility without separate authorization. The final private push of the complete
  build remains the T1006 boundary.
- D31 | **Continuation and stop conditions confirmed.** The repository's durable state
  (AGENTS.md → protocol → STATE → TASKS.json → decisions) is the only resumption
  interface; a future agent receiving only `continue` must recover and proceed without
  another master prompt. Work stops only for genuine blockers, irreversible decisions
  requiring authorization, or unavailable resources — and finally at the
  BUILD_COMPLETE_PUSHED audit boundary before the separately commissioned audit.

## 2026-11-14 — issue monitoring rule (D32)

Source: owner instruction to persist a GitHub issue monitoring rule in AGENTS.md
and docs/AGENT_CONTINUE_PROTOCOL.md so every current or future agent checks open
issues before each task, prioritizes actionable findings, updates the task tree,
and continues safely on `continue`.

- D32 | **Open-issue monitoring gate.** Before each task: check open issues
  (`gh issue list --state open`); triage and prioritize actionable findings;
  map fixes into TASKS.json as bounded task records; execute with real tests
  and receipts; update the issue with evidence, closing only when its stated
  acceptance is met; then resume the previous task. Recorded in AGENTS.md and
  docs/AGENT_CONTINUE_PROTOCOL.md (Open-issue monitoring gate). Applied
  immediately: issue #8 (CI verification + fail-open G4/G5 gates) triaged and
  mapped to T0103b.

## 2026-11-14 — two-agent cooperation (D33)

Source: owner instruction — one more agent/host joins the project; the two
agents must cooperate, communicate, split tasks between them, ALWAYS check
each other's tasks (reporting problems found, fixes, and improvements), and
maintain an inbox.

- D33 | **Paired-agent cooperation contract.** (a) Tasks are claimed via the
  TASKS.json lease protocol (owner + lease fields); both agents' leases are
  recorded in the shared STATE.md. (b) The durable repository state is the
  inter-agent communication channel: TASKS.json (claims), .sus-dev/STATE.md
  (who is working on what), .sus-dev/SESSION_LOG.md (handoffs), and
  .sus-dev/INBOX.md (async messages — every agent reads it on `continue`).
  (c) **Mutual task checking is mandatory and owner-ordered**: for each
  completed task, the OTHER agent runs a bounded peer-review pass — re-run the
  recorded tests, read the diff, and record findings (problems found, fixes
  applied, improvement suggestions) in the task receipt under "Peer review"
  and/or the inbox. This owner-ordered mutual check operates BETWEEN the two
  commissioned workers; it does not reinstate the independent-auditor rounds
  banned by D25 (external audit remains a post-build owner action).
  (d) Shared records (TASKS.json, STATE, decisions, protocol) are edited by
  the owning agent; conflicts resolve by rebase-and-reconcile with both
  agents' entries preserved. (e) Work splits avoid file collisions; the
  continuation checker's lease detection arbitrates.
- D33a | **Channel precedence (peer finding mmwfuyfhh-3a44de, accepted).** The
  machine bus (`node scripts/coord/coordination.mjs`) is AUTHORITATIVE for task
  claims, path ownership, and findings; `.sus-dev/INBOX.md` is prose handoffs
  and review narrative only — it cannot arbitrate. The D33 per-task loop gains
  `coordination.mjs step --as <agent>` as its gate. Leases also mirror into
  TASKS.json rows (owner+lease) so both records agree.

## 2026-11-14 — repository visibility (D34, owner issue #11)

Source: owner issue #11 "Owner-approved: make SUS repository public now to
reduce GitHub Actions minutes (safe visibility migration)" — an explicit owner
authorization channel per D32.

- D34 | **Repository visibility: private → public during active development.**
  Supersedes D30's "never change repository visibility" constraint FOR THIS
  SPECIFIC CHANGE only; D30's other content (no public product launch, no
  unfinished merges to main, no npm publication, BUILD_COMPLETE_PUSHED boundary,
  final-audit sequencing) is untouched. Preflight ran before the flip: secret
  pattern scan over all 22 refs' reachable history (0 hits), no .env/credential/
  key files ever added, archive zip = owner's own PRD documents only, no large
  binary blobs, PRs #1-7 + issues = our own review/decision text, dependency
  licences standard (MIT-family registry packages), workflow hardened to
  least-privilege `permissions: contents: read`, no `pull_request_target`,
  no repository secrets in use. No LICENSE file: default all-rights-reserved —
  repo visibility is NOT the D06 product-licence decision, which stays pending.
  Post-flip verification required (visibility read-back, anonymous access,
  fresh CI on the exact SHA) before issue #11 closes.

## 2026-11-17 — independent audit commissioned (D35)

Source: owner instruction "go ahead" in response to the build agent's proposal to commission T1003
(the independent security/a11y/licence review) at the post-build checkpoint. The build had reached the
point where every measurable gap was closed and only owner decisions remained, which is the sequence
AGENTS.md requires: complete the build, verify the final checkpoint push (T1006), then stop for a
separately commissioned audit.

- D35 | **T1003 is hereby commissioned.** The commission packet is `docs/AUDIT_PACKET.md` (scope,
  attack surfaces with file pointers, severity rubric, reproduction commands, reporting protocol, exit
  criteria). A public GitHub issue carries the same text so an auditor can claim it without repository
  access to the owner's machine. The packet is written by the interested party and says so in §0: its
  claims are claims, and the auditor is instructed to falsify them, to re-run five receipts at random,
  and to report "nothing found" only alongside an enumeration of what was tried.
- D35a | **The build agent may not certify T1003.** It may prepare the packet, reproduce the audit's
  evidence, fix what the auditor finds, and answer findings with measurements. It may not write
  `.sus-dev/VERIFICATION/T1003.md` and may not move `T1003` to `done`; that record belongs to the
  auditor and, for acceptance, to the owner. This preserves the independence the task exists to buy.
- D35b | **Findings are closed by the owner or the auditor, not by the fixer.** A finding is closed when
  the measurement it demanded is accepted, per `docs/AUDIT_PACKET.md` §5. Severity follows the rubric in
  §4, where a systematically vacuous gate is a *critical*: the product's value is that its verdicts are
  honest, so a verdict that is wrong in the safe-looking direction is worse than a missing feature.
- D35c | **Licence and release stay owner decisions.** An audit finding about the licence choice (D06)
  or publication (T1005) is reported as "owner decision pending", not as a defect. The auditor is not
  asked to settle either.

## 2026-11-19 — release channel and licence selected (D36)

Source: the owner's release-preparation directive ("SUS — RELEASE-CANDIDATE RECONCILIATION AND
PREPARATION"), which states the selections explicitly and instructs that they not be asked again:
**GitHub Experimental Preview** (not stable GA, not npm), **MIT licence**, copyright holder
**SHAHID8142**. Final publication, independent audit acceptance and any merge into `main` remain
separately controlled. This is the decision the licence packet (`docs/LICENSE_DECISION_PACKET.md`)
option A asked for; it is recorded here so no future session re-requests it.

- D36 | **Licence: MIT, holder SHAHID8142; distribution channel: GitHub Experimental Preview.**
  The repository gains the MIT `LICENSE` file (reconciled from draft PR #23 with the current code,
  not blindly applied), `skill/SKILL.md` declares the MIT licence with third-party notices
  (`docs/THIRD_PARTY_NOTICES.md`), and release-facing documents describe an explicitly
  **experimental** preview. What D36 does **not** authorize: publishing the release/tag (still
  T1005, owner-gated), merging to `main`, npm publication, altering protection rules, and closing
  T1003 (the independent audit's verdict acceptance remains auditor/owner-gated, D35a/D35b). The
  preview is a preparation of the candidate, not the publication.
- D36a | **Preview honesty constraints carry into release notes.** The notes must not claim the
  Studio page exists (it does not), that slash commands work universally (no host has a verified
  binding), that screen-reader conformance is proven (no AT session has run), or that a human
  benchmark ran (none has). These are the standing claim-gate rules applied to the release surface.
- D36b | **Third-party provenance caveat stays open.** No upstream guide text was copied (D06/D08)
  and `.sus-cache/` is never committed; dependency licences are catalogued in
  `docs/THIRD_PARTY_NOTICES.md` (MPL-2.0, LGPL-3.0 prebuilts, FSL-1.1 dev-only, data licences) and
  must be regenerated at release time, not hard-coded, because the lockfile changes.

## 2026-11-21 — publication of the experimental preview directed (D37)

Source: the owner's direct instruction "complete all task make it ready to use ASAP" (2026-11-21),
following the Codex preliminary review round (#32/#25 fixes landed, docs corrected, branches
reconciled, serial clean-SHA verification green, CI green at the exact SHA). This is the T1005
release approval, exercised for the channel the owner already selected (D36: GitHub Experimental
Preview — not stable GA, not npm).

- D37 | **Publish `v0.1.0-preview.1` as a GitHub prerelease at the verified candidate SHA.**
  Executed by the release agent under this directive: the tag is pushed, the GitHub release is
  created marked **pre-release/experimental**, and the release page carries the honest notes
  (what works, what does not exist, what was never run). The release receipt records the exact
  SHA, tag and URL (`.sus-dev/VERIFICATION/T1005.md`).
- D37a | **What D37 does not do:** it does not close or accept T1003 — the independent audit's
  verdict acceptance stays with the auditor/owner (D35a/D35b unchanged); the builder has formally
  requested the Codex re-audit of the published SHA on issue #22. It does not merge anything into
  `main` (that remains a separate owner decision), does not publish npm (never planned for this
  channel), and does not authorize stable/GA claims (the claim gate stays closed).
- D37b | **Recorded risk acceptance:** the owner directs publication **ahead of final independent
  audit acceptance**, in full knowledge of the disclosure state: 31 T1003 findings carry builder
  fixes with receipts; two new Codex preliminary findings (#32, #25) are fixed with real HTTP
  tests; the release notes and LIMITATIONS state every unmeasured area (no AT session, no human
  benchmark, no host at `supported`, no Studio page).
