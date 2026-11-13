# SUS continuation handoff

Read AGENTS.md → docs/AGENT_CONTINUE_PROTOCOL.md → .sus-dev/STATE.md → TASKS.json →
docs/OWNER_DECISIONS_LOG.md → docs/EFFECTIVE_REQUIREMENTS.json, then inspect Git.

Planning only. No APERIO receipt, product implementation or product test success.
Task status is exclusively TASKS.json; do not infer completion from older reports.
Latest checkpoint and exact next command are in .sus-dev/STATE.md.

Work locally on chore/continuation-reconciliation. No checkpoint pushes and no new
independent reviewers. The seven historical reports are preserved with hashes in
REVIEW_SOURCES.json. Full Studio remains mandatory. Proposed ADRs remain proposals.
Unpushed commits are recoverable only in this workspace or a full transfer including
.git; opening a different machine cannot fetch these checkpoints from GitHub.

On authorization, record it once, honor effective architecture decisions, implement
one eligible micro-task, run checks, save evidence and a local atomic commit, repeat.
Only after full verified build: private push, verify remote SHA, then stop for audit.
Public release requires separate owner approval.
