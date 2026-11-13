# Task record contract — planning-v1.2

Additive migration from planning-v1.1; all original IDs and statuses preserved.
`id`, `m`, `title`, `obj`, `deps`, `files`, `acc`, `tests`, `risk`, `rollback`,
`status`, `approval`, `evidence` retain their meanings. Missing evidence means no
executed receipt; `tests` lists intended checks, never proves execution.

New optional fields: `phase` (planning/build/post-build-audit/publication), `owner`,
`lease` (null or session, task, branch, base SHA, acquired/expires, fencing generation),
`commit` (explicit hash or same-commit receipt reference), `children`, `results`.
Statuses remain pending/review/done; blockage is an explicit blocker reference,
not an invented completion. Legacy done tasks remain historical, not re-certified.

No active task may be concurrently leased. Expiry alone does not authorize takeover:
inspect worktree/process evidence and preserve edits. Runtime enforcement is T0010.
A parent cannot complete until required children and receipts pass. Expand broad
parents before implementation; estimates are guidance, never completion evidence.
Receipts record task, command, environment, expected/observed, exit code, artifacts,
and exactly pass/fail/not-run/not-applicable (reason required for the latter two).
Acceptance/exception disposition is separate and must not rewrite a test verdict.

T0006 is bootstrap; T0007 is final pre-build reconciliation. No new independent
review is implied. T0010 implements the status checker only after authorization.
T1006 is verified final private push; T1003 occurs after T1006, and T1005 remains
separately authorized public release. Build completion excludes those later phases.
