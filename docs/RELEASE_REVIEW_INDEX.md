# Release review index — open review pull requests

> Generated from `evals/governance/review-prs.json` by `scripts/governance/review-index.mjs`.
> Do not edit by hand; `pnpm review:index` fails when this page and the snapshot disagree.
> Snapshot captured 2026-11-16 with `gh pr list --state open --json number,title,headRefName,headRefOid,baseRefName,createdAt,files,isDraft`.

This page is an inventory, not an instruction. **Nothing here is merged, closed or deleted by an
agent**: closing a review PR is an owner/maintenance decision (issue #19 item 1).

**7** open review PRs — 5 report-only, 2 state-overwriting.

| PR | Base | Head | Snapshot | Files | Classification | Recommended action |
| --- | --- | --- | --- | --- | --- | --- |
| [#1](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/1) | `main` | `review/antigravity-opus-2026-11-13` | `a503b236` (2026-11-13) | 1 | **report-only** | safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog |
| [#2](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/2) | `main` | `review/kilo-2026-11-13` | `6c1e1043` (2026-11-13) | 12 | **state-overwriting** (touches `HANDOFF.md`, `ROADMAP.md`, `TASKS.json`, `docs/OWNER_DECISIONS_LOG.md`) | keep the report, do not merge: the PR rewrites canonical state from an old baseline; close it as superseded (owner/maintenance decision) or cherry-pick the report file only |
| [#3](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/3) | `main` | `review/independent-zcode-glm-2026-11-13-cda9d9d` | `5125e4af` (2026-11-13) | 1 | **report-only** | safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog |
| [#4](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/4) | `review/antigravity-opus-2026-11-13` | `review/independent-cline-2026-11-13` | `1b2af406` (2026-11-13) | 11 | **state-overwriting** (touches `HANDOFF.md`, `ROADMAP.md`, `TASKS.json`, `docs/OWNER_DECISIONS_LOG.md`) | keep the report, do not merge: the PR rewrites canonical state from an old baseline; close it as superseded (owner/maintenance decision) or cherry-pick the report file only |
| [#5](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/5) | `main` | `review/sus-independent-copilot-sdk-2026-11-13-92f3e5c` | `8ecd6d73` (2026-11-13) | 1 | **report-only** | safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog |
| [#6](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/6) | `main` | `review/independent-hunyuan-hy-2026-11-13-cda9d9d` | `dfd4deca` (2026-11-13) | 1 | **report-only** | safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog |
| [#7](https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/7) | `main` | `review/codex-2026-11-13-a878b715` | `50caa523` (2026-11-13) | 1 | **report-only** | safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog |

## Why "state-overwriting" is the dangerous class

Those PRs were written against the planning baseline (`main` at `6ea7fb7`). Their
`TASKS.json`/`ROADMAP.md`/`HANDOFF.md`/`OWNER_DECISIONS_LOG.md` edits describe a repository that
no longer exists: 123 tasks and M11/M12 have happened since. Merging one would not "bring in a
review", it would revert the canonical record to an older snapshot while keeping the code — the
worst of both. The reports themselves stay reachable on their branches and in git history.

## What the owner is being asked for

- a decision to close the superseded PRs (individually or as a batch), and
- a maintenance policy for `review/*` branches: keep, archive, or delete after the report is
  copied into `reviews/independent/` on `main`.

Until then the PRs stay open, which is a known, recorded state — not an accident.
