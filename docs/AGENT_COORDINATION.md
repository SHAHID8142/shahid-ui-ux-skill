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
$C step --as pi                # MANDATORY before every task: peer state + review + gate
$C digest --as pi              # same information without the exit-code gate
$C board                       # agents, live claims, unread inbox, branch + dirty count
$C negotiate --as pi --to zcode --offer "T0704 annotations"
$C inbox --as pi               # reads and marks read
$C wait --as pi --timeout 180 --type answer
$C claim --as pi --task T0704 --path packages/studio-bridge/src --note "annotations"
$C check-paths --as pi --path packages/studio-bridge/src
$C heartbeat --as pi           # refresh presence + all my claims (cheap; do it each step)
$C release --as pi --task T0704

$C finding --as pi --to zcode --severity high --task T0704 \
   --body "what is wrong" --fix "smallest correct fix" --evidence "cmd/exit/file:line"
$C findings --status open      # tracked review items (not lost in a scrolling inbox)
$C resolve --as pi --id <findingId> --resolution "what was done"   # notifies reporter
$C watch --as pi --interval 5 --iterations 12
```

`claim` **refuses** (exit 1) when another live agent holds the task or an overlapping
path, and prints the holder so the caller can pick different work instead of racing.
`check-paths` additionally reports working-tree-dirty files matching the paths you plan
to edit — the unclaimed edits of an in-flight checkpoint are exactly the dangerous case.

## Standard loop for each agent (add one line to the task loop)

1. `step` — see who is live, what they claim, what changed in their scope since they
   claimed it, what they asked you, and which findings are open for you. It exits 1
   while anything is addressed to you, so "always check the other agent" is a gate
   you cannot forget rather than a good intention.
2. `claim` the task **and its paths** before the first edit. If refused, take another
   task; do not "just edit quickly".
3. `inbox` / `wait` after any question, before starting a slice you were not sure about.
4. Review their work as you go, and file `finding` records instead of silently fixing
   their files: correctness, tests, evidence receipt, canonical state untouched.
5. `heartbeat` after each verified step; `release` when the checkpoint is committed.
6. Only the main agent edits `TASKS.json`, `.sus-dev/STATE.md`, `AGENTS.md`, the
   protocol, `package.json`, and shared contracts. Sub-agents/workmates own their task
   files + their own receipt, and hand the receipt to the main agent.

## Peer review — how "always check each other" is enforced

Each completed task of the other agent is reviewed by reading their diff and
**re-running their recorded tests**, then filing `finding` records with severity,
the smallest correct fix, and evidence. A finding is a message plus a tracked record,
and `resolve` closes it and notifies the reporter, so nothing depends on memory or on
a scrolling markdown file.

Rules that keep review honest (learned the hard way in this repo):

- **Verify before filing.** A dirty worktree is usually a run in progress: the
  portfolio `budget-table.json` looked deleted for ~6 minutes purely because the eval
  harness was mid-regeneration. Check the current state, re-read the file, or run the
  test before claiming a defect.
- **Check the authority, not just the prose.** Claimed rubric tags and cited claim ids
  were validated against `packages/schemas/src/rubric.ts` and
  `evals/research/provenance-catalog.json` — both were correct, so no finding was
  filed. Cheap to check, expensive to get wrong.
- **Review is bounded** to the claimed scope of that task; it is not a licence to
expand into an audit of the whole product.

## Channel precedence (single arbitration rule)

A prose inbox cannot refuse a claim, so it cannot arbitrate. When both exist:

1. **Machine bus (`scripts/coord`)** — authoritative for task/path claims and for
   review findings, because `claim` refuses overlaps mechanically.
2. **`.sus-dev/INBOX.md`** — prose handoffs, lane agreements and review narrative
   that a human reads.
3. **`TASKS.json owner` + `lease`** — still the canonical, protocol-required record;
   write it before starting so the continuation checker can see the claim.

If the three disagree, treat that as a finding about the process, not a detail to
ignore — this repository hit exactly that case (`T0704` claimed in prose while
`TASKS.json` had `owner=None, lease=None`).

## Negotiation message (what "who does what" looks like)

`negotiate` sends a question asking the other agent for (1) its current and next task,
(2) the paths it claims, and states what the sender proposes to take. The reply is a
plain `say --type answer`. Both messages are stored under `<bus>/inbox/<agent>/` and
`<bus>/sent/<agent>/`, with `replyTo` threading and a per-agent read cursor.

## Self-verification

```bash
$C selftest    # 21 cases: exclusive claim, path overlap, stale takeover, atomicity
               # under 6 concurrent processes, repeated --path, finding lifecycle,
               # digest/gate composition, reply threading, read cursor, release
```

CI (`pnpm verify`) does not run this yet — wiring it into `package.json` is a shared-file
edit owned by the main agent. Until then run it manually after changing the bus.

## Known limits

- Coordination is advisory within one machine/workspace: it does not stop an agent that
  ignores it, and it cannot see another machine's clone.
- Nothing here replaces the protocol's safety gates, tests, evidence receipts, or the
  `TASKS.json`/`STATE.md` atomic update. If the bus and the protocol disagree, the
  protocol wins.
