# Resuming on a different machine

Everything needed to continue lives in this repository. There is no machine-local state,
no agent memory and no uncommitted work to carry across: if the clone is on the branch below
and `pnpm verify` passes, you are exactly where the build left off.

## 1. What state exists, and where

| Question | Answer lives in |
| --- | --- |
| What is done, what is next | `TASKS.json` — the **only** authority on task status |
| Why it was built this way | `docs/OWNER_DECISIONS_LOG.md`, `docs/adr/` |
| What was verified, at which revision | `docs/BUILD_COMPLETION_HANDOFF.md`, `.sus-dev/VERIFICATION/*.md` |
| Where we stopped | `.sus-dev/STATE.md` (resumption view; `SUS agent entry` in `AGENTS.md` explains the order) |
| Peer-agent messages | `.sus-dev/INBOX.md`, bus: `node scripts/coord/coordination.mjs inbox --as <agent>` |
| How to continue at all | `docs/AGENT_CONTINUE_PROTOCOL.md` (canonical procedure) |
| Narrated history | `.sus-dev/SESSION_LOG.md` |

## 2. First run on the new machine

```bash
git clone https://github.com/SHAHID8142/shahid-ui-ux-skill.git
cd shahid-ui-ux-skill
git switch chore/continuation-reconciliation      # the build branch
pnpm install --frozen-lockfile
pnpm setup      # push gate + Chromium + state consistency check (see §2.1)
pnpm verify     # expect exit 0; the test count is in its own summary line (never hard-code it here)

These three commands are also run by CI on a tree that has never been built (the `fresh-clone` job),
so if they work for CI they are meant to work for you: a red `fresh-clone` job is a bug in the
documented path, not in your machine.

If any step fails, read the first `[FAIL]`/`Error` line it printed — each checker names the file
it disagreed with, and `scripts/ensure-built.mjs` says which build artifact was missing.

### 2.1 What `pnpm setup` does, and why it is one command

It runs `git config core.hooksPath .githooks` (installs `.githooks/pre-push`, the push gate),
`pnpm --filter @sus/eval-core exec playwright install chromium` (needed by `demo:loop`, `dogfood`
and `regression`; the root-level `pnpm exec playwright ...` fails with "Command playwright not
found", because playwright is a dependency of the workspace packages and not of the root — that
was fixed on 2026-11-15 after a fresh machine hit it),
and `node scripts/check-handoff.mjs`, which refuses to call a machine ready when the recorded
state is internally inconsistent (a dirty working tree is deliberately fine here, because this
command runs mid-task as often as it runs on a fresh clone). Every step it performs is one a fresh clone is
missing, and each failure mode is silent: without the hook an unverified push is possible,
without Chromium a browser-driven check fails much later and looks like a code defect.
```

`pnpm setup` (or at minimum `pnpm hooks:install`) is not optional. A fresh clone has no `core.hooksPath`, so the push gate
is silently absent and an unverified push becomes possible — which is exactly the thing the
gate exists to prevent. `pnpm verify` does not detect the missing hook; check it explicitly:

```bash
git config --get core.hooksPath   # must print .githooks
```

## 3. What does **not** travel with the clone

These are git-ignored on purpose (see `docs/LIMITATIONS.md`); regenerate, never restore:

| Path | Regenerate with | Why it is not committed |
| --- | --- | --- |
| `evals/evidence/full-loop/<timestamp>/` | `pnpm demo:loop` | one snapshot per run; the durable record is the receipt and the regression report |
| `evals/evidence/dogfood-private/` | `pnpm dogfood` | may contain personal data; stays private until consent/licensing/PII checks |
| `evals/benchmarks/results/` (measurements) | `pnpm benchmark` | machine-dependent numbers; the *status* file the claim gate reads is committed |
| `evals/baselines/*/bundle.json` | rewritten by `pnpm verify` | churned by Lighthouse; the gate restores them, and commits must use `git add -A ':!evals/baselines'` |

`evals/reports/regression-latest.md` and the per-revision JSON **are** committed, so the last
verified revision is visible without re-running anything.

## 4. Where the work actually stands

- **The count lives in `TASKS.json`, not here.** That document alone owns task status; a number
  written into prose goes stale on the next commit, so this page does not carry one.
- **Owner actions, not build work:** **T1003** (independent audit) and **T1005** (release
  approval / publication).
- **Nothing is published.** The repository is public (D34); the product is not released.
- **Do not invent new scope.** Finish what `TASKS.json` still lists as `pending`, and treat
  issue triage (owner rule D32) as the only source of new bounded work.

## 5. If the new machine behaves differently

Almost every difference is environmental, and each has a named cause:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `pnpm demo:loop` / `dogfood` fail with "browser not found" | Chromium is installed per machine | `pnpm --filter @sus/eval-core exec playwright install chromium` |
| `pnpm verify` fails on `format:check` after your own edits | Prettier reformats on write | `npx prettier --write <files>` |
| Push refused with `RESUME REQUIRES TASK-RECOVERY REVIEW` | dirty working tree (expected mid-task) | commit or revert the intended change |
| Push refused with "next-step task IDs are not already done" | `.sus-dev/STATE.md` names a finished task | update the `Next exact steps:` line |
| Regression is slower than 132 s | cold machine / cold CI runner | expected; timings in the handoff are warm numbers |
| `pnpm support` reports drift | support matrix is hash-checked against the current artefact | `pnpm support:write`, then verify |

## 6. Continuity rule for the next agent

Read in this order and trust the earlier entries more than the later ones: the owner's current
instruction, `docs/OWNER_DECISIONS_LOG.md`, `docs/EFFECTIVE_REQUIREMENTS.json`, the baseline PRD,
ADRs, `TASKS.json`, `.sus-dev/STATE.md`, then `HANDOFF.md` and historical reports. Actual files
outrank every summary, including this one.
