# Pre-release governance — recorded state and owner decisions (issue #19)

Nothing in this page was performed by an agent as an administrative change. It records what the
GitHub API actually returns, what the repository actually contains, and the decisions only the owner
may take. Facts captured **2026-11-17** against `SHAHID8142/shahid-ui-ux-skill`.

## 1. Branch protection: measured, not assumed

| Read | Command | Result |
| --- | --- | --- |
| `main` protection | `gh api repos/…/branches/main/protection` | **404 Branch not protected** |
| rulesets | `gh api repos/…/rulesets` | **`[]`** (no rulesets) |
| Actions | `gh api repos/…/actions/permissions` | `enabled: true`, `allowed_actions: all`, `sha_pinning_required: false` |

So the green CI on the integration branch is evidence that a workflow ran. It is **not** an enforced
merge gate: nothing requires it, and a direct push or force-push to `main` is possible. The only gate
that exists today is local — `.githooks/pre-push` runs `pnpm verify` plus the continuation check, and
it is installed by `pnpm setup`, i.e. it binds agents that run it, not the remote.

### Proposed ruleset (owner action — deliberately not applied)

An agent must not change admin settings with irreversible consequences, and this repository's owner
has not approved a protection policy. The recommended minimum, to be applied by the owner in
Settings → Rules → New branch ruleset (or via `gh api` once approved):

| Setting | `main` | `chore/continuation-reconciliation` |
| --- | --- | --- |
| Require a pull request before merging | yes | yes (or keep direct pushes during the build, owner's call) |
| Required status checks | the `verify` job of `.github/workflows/*` on the exact SHA | same |
| Require branches to be up to date | yes | no (the branch is the integration line) |
| Block force pushes | yes | yes |
| Restrict deletions | yes | yes |
| Require linear history | owner preference | owner preference |

Verification after applying (read back, do not trust the write):

```bash
gh api repos/SHAHID8142/shahid-ui-ux-skill/branches/main/protection \
  --jq '{checks: .required_status_checks.contexts, force: .allow_force_pushes.enabled, delete: .allow_deletions.enabled}'
gh api repos/SHAHID8142/shahid-ui-ux-skill/rulesets --jq '.[].name'
```

A safe negative test is to attempt a force-push of an unmodified commit to a scratch branch configured
the same way, **never to `main`**. Until the owner approves, the honest status is: *no remote
enforcement; local pre-push gate only*.

## 2. Review PRs: inventoried, not merged

`docs/RELEASE_REVIEW_INDEX.md` is generated from `evals/governance/review-prs.json` (captured
2026-11-17) by `scripts/governance/review-index.mjs`. Seven review PRs remain open; **two**
(`#2`, `#4`) edit `TASKS.json`, `ROADMAP.md`, `HANDOFF.md` and `docs/OWNER_DECISIONS_LOG.md`. Merging
either would revert canonical state to the `main` planning baseline (`6ea7fb7`) while keeping the code
— the worst combination. `#4` also targets a review branch rather than `main`.

Recommendation (recorded, not executed): keep the five report-only PRs as external records, close
`#2` and `#4` as superseded, and adopt a maintenance policy for `review/*` branches — the reports stay
in git history either way.

## 3. Licence and distribution: decided (D36, 2026-11-19); publication still owner-gated

Decided by the owner (D36): **MIT licence**, copyright holder **SHAHID8142**, distribution channel
**GitHub Experimental Preview** — not stable GA, not npm. The repository now carries the MIT
`LICENSE` file and `skill/SKILL.md` declares MIT with third-party notices
([`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)). Earlier state, kept for the record: the
repository was public (D34) with **no `LICENSE` file** and a `license: Proprietary — all rights
reserved` declaration — a legal state, not a usable product state. What remains owner-gated: the
publication act itself (T1005) — no release, no tag, no npm package exists or is authorized by D36.

## 4. Owner-only gates that remain open

| Gate | Task | State | Who |
| --- | --- | --- | --- |
| Independent security/a11y/licence review | T1003 | `pending` | owner commissions; a builder must not self-certify |
| Release approval and publication | T1005 | `pending` | owner |
| Licence/distribution choice | D06/B003 → D36 | licence decided (MIT); publication open | owner |
| Branch protection policy | this page §1 | proposed | owner |

The evidence an independent reviewer should start from: `docs/PLAYBOOK_COVERAGE.md` (named gaps),
`docs/SUPPORT_MATRIX.md` (host states, untested rows), `docs/AUDIT_COMMAND.md` (redirect-authorization
limits from issue #18), `.sus-dev/VERIFICATION/T1025–T1029.md`, and the exact SHA + workflow run cited
in each receipt.

## 5. What an agent may do from here without new authority

- regenerate this page's inventory (`pnpm review:index`), re-read the API facts and update the table;
- keep `main` untouched and continue on `chore/continuation-reconciliation` behind the local gate;
- state, whenever asked, that no remote enforcement exists yet.

Everything else in this page — applying protection, closing PRs, choosing a licence, publishing,
merging to `main` — is an owner action.