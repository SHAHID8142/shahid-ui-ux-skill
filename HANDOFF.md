# SUS continuation handoff

Read AGENTS.md → docs/AGENT_CONTINUE_PROTOCOL.md → .sus-dev/STATE.md → TASKS.json →
docs/OWNER_DECISIONS_LOG.md → docs/EFFECTIVE_REQUIREMENTS.json, then inspect Git.

**Build phase.** APERIO was received and recorded once (OWNER_DECISIONS_LOG.md D28,
2026-11-13); do not re-request authorization. Architecture baseline: ADR-001/002/004/
005/006 adopted as proposed, ADR-003 as amended (D29). Dev-branch checkpoint pushes
are permitted (D30); the repository is PUBLIC (D34, supersedes D30's visibility
clause) but the product is NOT published and no `main` merge happens unfinished.

Task status is exclusively TASKS.json; do not infer completion from older reports.

> **Moving to another machine?** Nothing is held locally: clone, `git switch
> chore/continuation-reconciliation`, then follow `docs/RESUME_ON_NEW_MACHINE.md`.
> Build complete at 100/102 tasks; T1003 (independent audit) and T1005 (release approval)
> are owner-only. Owner issue #10 is closed by evidence: the two measured admin findings are
> fixed, and the record lists now demonstrate two empty kinds, loading, error-keeping-rows,
> URL state, twelve records and 200% text (see docs/MOBILE_RECORD_PATTERNS.md). Not run and
> named: a real screen-reader session, browser zoom, real translations.

Latest checkpoint, current task and exact next command are in .sus-dev/STATE.md.
Unpushed commits are recoverable only in this workspace or a full transfer including
.git; a different machine cannot fetch dev-branch checkpoints unless they were pushed.

Implement one eligible micro-task at a time: real tests, verified acceptance criteria,
evidence receipt + TASKS.json update + STATE/SESSION_LOG update in one atomic local
commit, then private dev-branch checkpoint push. Keep automated regression, security
and a11y checks; no new independent audit rounds until BUILD_COMPLETE_PUSHED.
Full Studio, Motion Intelligence and all mandatory scope stay non-optional (D24/D29).
Stop only for genuine blockers, irreversible externals (licence B003, publication,
paid services) or unavailable resources; record them in .sus-dev/BLOCKERS.md.
After complete verified build: private push, verify remote SHA, then stop for the
separately commissioned audit (T1003/T1005 are later owner actions).
