> Current builder entry: `AGENTS.md` and `docs/AGENT_CONTINUE_PROTOCOL.md`.
> D24–D27 supersede older interim-review, batch-approval and continuous-push instructions below.
> Build authorization remains closed; product end-user approvals remain required.

# SUS — Roadmap, Dependency Tree and Micro-Task Protocol

**Status:** initial candidate work tree. The implementation agent must inspect the repository and revise/expand before development; this is NOT a completed backlog.

## A. Initial dependency tree

Historical record, kept as written. `TASKS.json` is the only source of task status and the
executed tree drifted from this draft: M6 has T0600–T0603 (T0604/T0605 below were folded into
T0603 and the M6 fixture), and the tree grew past M10. Read this section for the intended shape
of the work, never for current IDs.

```text
M0 Discovery / architecture decisions
  T0001 Inspect repo, tools, permissions, existing files (read only)
  T0002 Confirm requirements vs PRD; document unresolved questions
  T0003 Build risk register, support-tier definitions and capability matrix
  T0004 Compare stack choices; prepare ADR proposals
  T0005 Produce master WBS and 3–5 smallest unlocked tasks; get approval
M1 Tooling and contract tests [M0]
  T0101 Repository skeleton and contribution/permission boundaries
  T0102 Test runner + smoke fixture
  T0103 Typecheck/lint/format + CI skeleton
  T0104 Schema versioning and contract-test strategy
M2 Portable Skill Core [M1]
  T0201 Minimal compliant SKILL.md + frontmatter validator
  T0202 Intent schema/router (audit/refine/unslop/create/redesign/system/live)
  T0203 Just-in-time foundation/playbook loader with conflict rules
  T0204 CLI invocation fallback / no-tool error handling
  T0205 Skill loading/selection fixtures
M3 Research and Anti-Slop [M2]
  T0301 Evidence schema, provenance catalog and offline mode
  T0302 Slop taxonomy schema + accepted-use counterexamples
  T0303 Single initial deterministic rule + negative fixture
  T0304 Scanner output JSON contract + CLI entry
  T0305 Rule suite, severity/confidence, false-positive measurements
M4 Design Foundations [M2, M3]
  T0401 Token format/roles + validation
  T0402 Color & typography skills + fixtures
  T0403 Layout/responsive and accessibility skills + fixtures
  T0404 Component playbook schema
  T0405 Button/CTA + navbar + input playbooks and state matrices
  T0406 Content/SEO and niche-research skill + tests
M5 Progressive Section Flow [M4]
  T0501 Product brief and design contract schemas
  T0502 Section state machine and approval transitions
  T0503 Change-plan/review interface and diff contract
  T0504 Approved token/decision persistence, exception policy
  T0505 Four-section fixture: no unapproved next-section implementation
M6 Motion Intelligence [M4, M5]
  T0601 Motion taxonomy, state vs variant model, motion spec schema
  T0602 Motion token system and reduced-motion semantics
  T0603 Button/input/nav motion plan playbooks
  T0604 Animation state/interruption tests + WCAG checks
  T0605 Motion visual QA/evaluation fixture
M7 Studio Vertical Slice [M1, M2, M5]
  T0701 Studio capability feasibility ADR + first framework fixture
  T0702 Local authenticated bridge with workspace allowlist
  T0703 Browser overlay + stable element selection
  T0704 Rectangle/pen/arrow annotations and serialization
  T0705 Structured visual intent: move heading to region
  T0706 Dry-run proposal preview + source mapping confidence
  T0707 Approval-gated source change + rollback
  T0708 Browser E2E demo: desktop/mobile + reconnect
M8 Studio Hardening [M7, M3, M6]
  T0801 Multi-select and between-section insertion
  T0802 Source mapping ambiguity/conflict handling
  T0803 Variants, visual diffs and viewports
  T0804 Anti-slop scanner overlay and dismissals
  T0805 Session persistence, crash/restart recovery
  T0806 CSP, origin, auth, prompt-injection, data retention tests
  T0807 Motion state inspection and reduced-motion visual QA
M9 Adapters and Distribution [M2, M8]
  T0901 Agent protocol/capability matrix and adapters interface
  T0902 FreePi and one additional host installation/skill smoke tests
  T0903 Codex, Claude Code, Cursor adapters / smoke tests
  T0904 Expand platform-by-platform only with test environments
  T0905 Global/project installation, update, uninstall and status tests
M10 Evaluation and Release [M3-M9]
  T1001 Cross-module regression suite
  T1002 Comparative visual task benchmark and result reporting
  T1003 Independent security/accessibility and license review
  T1004 Docs, examples, installer guide, changelog, support matrix
  T1005 User release approval; then publish on approved channel
```

M7 may begin technical discovery before all M4/M6 knowledge is finished, but no GA declaration until all required capabilities integrate and pass.

## B. Required micro-task record

```yaml
id: T0704
milestone: M7
title: "Add rectangle annotation serialization"
status: pending # pending|blocked|active|review|done|reopened
depends_on: [T0703]
objective: "Record rectangle annotations with viewport and anchor metadata"
scoped_files: []
acceptance:
  - "Schema validates legitimate annotation"
  - "Malformed/out-of-bounds data is rejected"
  - "Undo does not mutate DOM or source"
risk: "Incorrect coordinate spaces across zoom/scroll"
tests: []
actual_test_results: []
independent_review: "not-run"
rollback: "Revert isolated patch; keep user's annotations"
approval_status: "pending"
evidence: []
```

## C. Strict processing loop

1. Select **smallest unlocked item** whose prerequisites are verified and whose implementation scope has user approval.
2. Read authoritative spec, dependency output, project contract, prior decisions and relevant source files.
3. State a narrow objective, acceptance criteria, affected file set and risks. Avoid multi-layer edits in one patch.
4. Implement; run focused typecheck/lint/unit or browser checks. Log **actual** command, stdout/exit status and environment.
5. Audit diff for unrelated changes, accessibility, security, regression and code conventions.
6. If available: independent, fresh-context reviewer receives task contract + patch + relevant source/test outputs, **not** only a self-authored summary; capture disagreements. No claim of independent review if none ran.
7. Fix findings and rerun affected tests. If tests fail or environment unavailable: stop, document exact blocker; do not invent passing results.
8. Update task record, links, decisions/risks, handoff state; commit only under host/user permissions.
9. Proceed to another development micro-task **only if its scope and milestone approvals allow it**. Section design/build progression requires explicit user acceptance at every section.
10. At milestones, run integrated regression gate and get decision on next scope.

## D. Fresh-context handoff requirements

Keep these persistent and authoritative: `ROADMAP.md`, `TASKS.json`/YAML, `DECISIONS.md`, `RISKS.md`, `TEST_EVIDENCE.md`, `HANDOFF.md` and project `.sus` contract. At each session end, refresh:

```text
COMPLETED: <IDs and verified evidence>
ACTIVE/BLOCKED: <ID and reason>
CHANGES: <files and diffs>
TESTS: <actual commands, pass/fail/not-run>
USER APPROVAL: <scope and timestamp or pending>
NEXT UNLOCKED TASK: <ID, single objective>
HOW TO RESUME: Read PRD, task protocol and HANDOFF; inspect Git status; do not repeat work.
```

A new agent should be able to continue without access to previous chat transcripts. Never store secrets or personal histories in handoff files.

## E. Parallelism and review

- Default implementation concurrency: **1**. Parallelize only demonstrably independent research/test or isolated worktrees, after resource and merge-conflict assessment.
- Subagents may be used for focused threat modeling, a11y review, motion QA, design critique, test generation or code review; their output remains untrusted until verified.
- If the host does not provide subagents, schedule a separate fresh session or independent check; do not make paid-agent usage mandatory.
- No idle “review” loops: establish a finite task checklist and evidence threshold before calling task done.

## F. Separate approval classes

- **Architecture approval:** ADR and repo structure; before committing high-impact decisions.
- **Implementation batch approval:** a bounded set of micro-tasks.
- **Section design approval:** before changing target UI section.
- **Section acceptance:** before starting next website section.
- **External action approval:** installing packages with scripts, spending money, pushing, publishing, deploying, opening ports/remoting, deleting user data.
- **GA release approval:** before marking the public product stable.

## G. Release gate policy

Reject completion claims when any relevant mandatory test is not run, security-critical issue remains open, Studio is absent, motion is untested, user sections are advanced without acceptance, or adapters are marketed without compatibility evidence. Release notes list verified support only.
