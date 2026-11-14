# Inter-agent coordination (shared workspace, two agents)

Status: **operational** — `scripts/coord/coordination.mjs` (added 2026-11-14 by the Pi
agent, `chore/continuation-reconciliation`). Not a task-status authority: `TASKS.json`
stays canonical, and `.sus-dev/STATE.md` stays the resumption view. This bus only
answers "who is touching what, right now" so two agents that share one worktree cannot
silently overwrite each other.

## Why a file bus, and where it lives

Both hosts run one-shot CLI calls in the same working tree, so coordination must be a
filesystem protocol, not a socket or a daemon:

- Bus directory: `<git-common-dir>/sus-coord` (usually `.git/sus-coord`), overridable
  with `SUS_COORD_DIR`. It is **inside `.git`, so it never appears in `git status`**,
  never pollutes a checkpoint commit, and is shared by every worktree of this repo.
- Claims are published with `link(2)` (atomic create-if-absent): a racing agent can
  never read a half-written claim. Proven by the self-test race case.
- Liveness is **heartbeat-only** (`--ttl`, default 900 s). Recorded pids are diagnostic;
  one-shot processes would otherwise make every fresh claim look dead.
- A stale holder is taken over automatically and the takeover is logged to
  `<bus>/log.jsonl` — never silent, never destructive.

## Commands

```bash
C="node scripts/coord/coordination.mjs"

$C register --as pi --host pi --model "<model>" --note "what I am doing"
$C board                       # agents, live claims, unread inbox, branch + dirty count
$C negotiate --as pi --to zcode --offer "T0704 annotations"
$C inbox --as pi               # reads and marks read
$C wait --as pi --timeout 180 --type answer
$C claim --as pi --task T0704 --path packages/studio-bridge/src --note "annotations"
$C check-paths --as pi --path packages/studio-bridge/src
$C heartbeat --as pi           # refresh presence + all my claims (cheap; do it each step)
$C release --as pi --task T0704
```

`claim` **refuses** (exit 1) when another live agent holds the task or an overlapping
path, and prints the holder so the caller can pick different work instead of racing.
`check-paths` additionally reports working-tree-dirty files matching the paths you plan
to edit — the unclaimed edits of an in-flight checkpoint are exactly the dangerous case.

## Standard loop for each agent (add one line to the task loop)

1. `board` — see who is live and what is claimed.
2. `claim` the task **and its paths** before the first edit. If refused, take another
   task; do not "just edit quickly".
3. `inbox` / `wait` after any question, before starting a slice you were not sure about.
4. `heartbeat` after each verified step; `release` when the checkpoint is committed.
5. Only the main agent edits `TASKS.json`, `.sus-dev/STATE.md`, `AGENTS.md`, the
   protocol, `package.json`, and shared contracts. Sub-agents/workmates own their task
   files + their own receipt, and hand the receipt to the main agent.

## Negotiation message (what "who does what" looks like)

`negotiate` sends a question asking the other agent for (1) its current and next task,
(2) the paths it claims, and states what the sender proposes to take. The reply is a
plain `say --type answer`. Both messages are stored under `<bus>/inbox/<agent>/` and
`<bus>/sent/<agent>/`, with `replyTo` threading and a per-agent read cursor.

## Self-verification

```bash
$C selftest    # 16 cases: exclusive claim, path overlap, stale takeover, atomicity
               # under 6 concurrent processes, reply threading, read cursor, release
```

CI (`pnpm verify`) does not run this yet — wiring it into `package.json` is a shared-file
edit owned by the main agent. Until then run it manually after changing the bus.

## Known limits

- Coordination is advisory within one machine/workspace: it does not stop an agent that
  ignores it, and it cannot see another machine's clone.
- Nothing here replaces the protocol's safety gates, tests, evidence receipts, or the
  `TASKS.json`/`STATE.md` atomic update. If the bus and the protocol disagree, the
  protocol wins.
