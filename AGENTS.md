# SUS agent entry

On `continue`, read `docs/AGENT_CONTINUE_PROTOCOL.md`, `HANDOFF.md`,
`.sus-dev/STATE.md`, `TASKS.json`, `docs/OWNER_DECISIONS_LOG.md`, and
`docs/EFFECTIVE_REQUIREMENTS.json`. Inspect Git status, branch, HEAD, recent commits,
worktrees and diffs before edits. Actual files outrank stale summaries.

Obey authorization and task dependencies; choose the next eligible micro-task,
verify it, save evidence and an atomic local checkpoint, then continue.
Preserve unrelated edits and live leases. TASKS.json alone owns task status.
The owner's APERIO authorization is recorded (OWNER_DECISIONS_LOG.md D28, 2026-11-13):
implementation is authorized; do not re-request it. Architecture baseline: ADR-001/
002/004/005/006 adopted, ADR-003 as amended (D29). No intermediate independent audits;
private dev-branch checkpoint pushes are permitted (D30) — never public, never
unfinished merges into `main`. Complete the build and verify the final private push
(T1006) before stopping for a separately commissioned audit.
The canonical protocol supersedes older per-task review/push instructions.
