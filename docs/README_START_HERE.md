# SUS — Agent-Agnostic Development Handoff

This bundle contains a **finalized PRD for implementation planning**, a developer-facing starting prompt, a micro-task/dependency protocol and an audit. This is a **plan**, not the actual fully implemented SUS skill or Live Studio.

## Contents

1. `SUS_MASTER_PRD_v1.0.md` — product requirements, architecture constraints, motion, anti-slop, mandatory Studio, QA and release criteria.
2. `AGENT_START_PROMPT.md` — paste into FreePi CLI, Codex, ZCode or another coding agent (only with accompanying files accessible).
3. `ROADMAP_AND_TASK_PROTOCOL.md` — initial work tree, task recording, branching/review/test/approval gates and restart protocol.
4. `AUDIT_AND_OPEN_DECISIONS.md` — resolved loopholes, pending choices and scope of the audit.

## How to use

1. Download and extract the ZIP into a **new/private working directory or your approved development repository**.
2. Start your coding agent in that workspace and paste `AGENT_START_PROMPT.md` (or instruct it to read that file).
3. Let it **inspect, plan and build the dependency tree first**. The agent must stop for your approval before implementation.
4. Approve the architecture/first small task batch only after reviewing its proposed file changes/tests.
5. On subsequent sessions, require the agent to read the PRD, current task records and `HANDOFF.md`. Never ask it to regenerate the entire product in one go.

Do not publish publicly until the distribution channel, license, security/reliability gates and user approval are finalized.
