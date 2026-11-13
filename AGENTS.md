# SUS agent entry

On `continue`, read `docs/AGENT_CONTINUE_PROTOCOL.md`, `HANDOFF.md`,
`.sus-dev/STATE.md`, `TASKS.json`, `docs/OWNER_DECISIONS_LOG.md`, and
`docs/EFFECTIVE_REQUIREMENTS.json`. Inspect Git status, branch, HEAD, recent commits,
worktrees and diffs before edits. Actual files outrank stale summaries.

Obey authorization and task dependencies; choose the next eligible micro-task,
verify it, save evidence and an atomic local checkpoint, then continue.
Preserve unrelated edits and live leases. TASKS.json alone owns task status.
No implementation until the owner's explicit APERIO authorization is recorded.
No intermediate independent audits; no checkpoint pushes. Complete build and verify
final private push before stopping for a separately commissioned audit.
The canonical protocol supersedes older per-task review/push instructions.
