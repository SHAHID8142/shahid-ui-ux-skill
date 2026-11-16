# Build completion handoff (T1006)

**Status:** build complete and pushed. This document is the truthful summary of what exists,
what was verified, at which revision, and what is deliberately not done. It is written by the
builder, not the auditor; the independent audit is a separate, owner-commissioned step.

- **Branch:** `chore/continuation-reconciliation`
- **Verified revision (code):** `2f344df5cce2764dcd20b4af2fcbff2dc2f9d52c` (see §2 for the exact run)
- **Remote checkpoint:** `1e5213bef73dd304f01885c8579f4da334870687`; every commit after the
  verified revision touches documentation, state records, generated summaries and one
  `.gitignore` note, with no source change (`git diff --name-only 2f344df..1e5213b`).
- **Repository visibility:** **public** (owner decision D34, which supersedes the earlier
  "private" instruction). No product release is authorized by that decision — the
  *repository* is public, the *product* is unpublished.
- **Tasks at the verified revision:** all but three of them — `T1003` (independent audit),
  `T1005` (release approval) and this checkpoint `T1006`. The first two are owner-only actions
  and are intentionally not started. Later work (T1007–T1011) landed after this handoff; the
  live count is in `.sus-dev/STATE.md` and `TASKS.json`, and `pnpm roadmap` regenerates the
  public view. This document deliberately names no current count, so it cannot go stale.

## 1. What was built

| Area | Deliverable |
| --- | --- |
| Portable skill | `skill/SKILL.md` plus nine references: `precedence`, `surfaces`, `direction`, `art-direction`, `motion-interruption`, `copy-seo`, and three `foundations-*` files (layout/responsive, colour/typography, heuristics/IA); `evals/` carries the triggering set and its deterministic-proxy result |
| Knowledge base | 36 component playbooks, each at a 12-part PRD standard with an exact variant/state matrix (`pnpm parts`, `pnpm motion`, `validate-playbooks`) |
| Contracts | `sus.playbook`, `sus.direction-derivation` (imagery plan + licensing), `sus.state-machine`, transition oracles; JSON Schema exported and drift-checked |
| Evaluation harness | fail-closed gate evaluators (G4 a11y, G5 budgets, G11 evidence), behavioural motion oracles (G6), hardening matrix, judge/agreement tooling, capture matrix |
| Live Studio | overlay + spatial intent, owner index with anchors, stale-mapping conflicts, dry-run diff, approval-gated apply with exact revert, verification loop, durable single-use receipts, capability grants, CDP transport |
| Multi-host | adapters, installer, smoke harness with artefact hashes, generated support matrix + CLI `status` |
| Evidence tracks | full-loop demo (annotate → apply → verify → undo), three-site dogfood audit, deterministic benchmark arm, sealed held-out briefs, claim checker |

## 2. What was verified, and how

Run at the verified revision, on macOS (darwin), Node 26, pnpm 11.22.0:

| Check | Command | Result |
| --- | --- | --- |
| Cross-module regression | `pnpm regression` | **pass** — 3 stages, 132.0 s (`evals/reports/regression-2f344df5cce2.json`). The newest clean run, at `4aac091`, took 143.7 s (`evals/reports/regression-4aac091d1312.json`: verify 115.5 s, demo loop 4.0 s, dogfood 24.2 s); a cold runner is slower than the ≈105 s warm `pnpm verify` quoted in §5 |
| Release suite | `pnpm verify` | **pass** — 64 files + 3 skipped, 679 tests at this revision. The suite has grown since (later tasks added files); the live figure is whatever `pnpm verify` prints, not a number copied here |
| End-to-end studio loop | `pnpm demo:loop` | **pass** — 3 tests, real Astro build, Chromium, undo byte-identical |
| Dogfood audit | `pnpm dogfood` | **pass** (runner) — 3 sites, 5 checks each; the 2 findings it first raised were fixed afterwards under T1007, see §4 |
| Deterministic benchmark | `pnpm benchmark` | **pass** — baseline arm measured on 4 surfaces; claim gate `allowed: false` |
| Install | `pnpm install --frozen-lockfile` | **pass** — already up to date |
| Secrets scan | regex sweep for private keys, AWS/GitHub/Slack tokens | **clean** (no matches) |
| Dependency licences | `pnpm licenses list` | all dependencies permissively licensed (MIT/Apache-2.0/BSD/ISC family); recorded here rather than asserted in prose |
| Ancestry reachability | `pnpm reach` | **pass** — 94/94 finished non-M10 tasks backed at the current tree (80 commit, 10 receipt, 4 files, 0 evidence) |
| Claim gate | `pnpm claims` | **pass** — no comparative or absolute claim in the publishable surface |
| Pre-push gate | `.githooks/pre-push` → `gate-push.mjs` | **pass** — the release suite runs before every push; no bypass was used |

Security, privacy, accessibility, motion and install are each covered by an executable check
rather than by a statement: G13 hostile-agent suite and threat model for security/privacy,
axe-based gates plus labelled-controls/reflow/focus checks for accessibility, the motion
oracle plus playbook motion lint for motion, `frozen-lockfile` install for install.

## 3. What is deliberately not done

- **No product publication.** No release, no package publish, no site deployment. The
  repository is public by owner decision; the product is unpublished by the same authority.
- **No independent audit.** `T1003` is owner-commissioned and has not happened. This
  document describes what the builder verified, which is not the same thing.
- **No release approval.** `T1005` is an owner decision.
- **No comparative claim.** The benchmark's `sus-assisted` and `human` arms are `not-run`
  (no assisted artefacts; no recruited participants), so `comparativeClaimAllowed` returns
  `false` and `pnpm claims` enforces it. Nothing in these docs claims SUS is better than any
  alternative.
- **No invented human results.** The protocol states the power calculation (41 raters per
  arm for a 0.5-point effect at sd 0.8) and says plainly that n = 20 is underpowered for
  that effect.

## 4. Findings carried into the audit

| Finding | Where | Status |
| --- | --- | --- |
| Admin reference implementation overflows horizontally by 343 px at 390 px | `docs/DOGFOOD_FINDINGS.md` F1 | **fixed** (T1007) — 0 overflow at 320/390/768/1440; the baseline concern was checked, not assumed: `evals/baselines/admin/page.html` is a separate static capture that nothing regenerates from the fixture |
| Admin footer/env-note contrast 4.46:1 (0.04 under AA) | `docs/DOGFOOD_FINDINGS.md` F2 | **fixed** (T1007) — `--muted: #5f6775` measures 5.28:1 on the page and 5.70:1 on panels |
| Issue #10 (mobile CMS/CRM reflow) | GitHub | **closed** 2026-11-15 — the reflow (T1007) and the record-list states/volume slice (T1008) landed; the receipt names what no run covered: no assistive-technology session, no browser zoom as distinct from text scaling |
| Issue #9 (continuous execution) | GitHub | open by design — it is the standing execution rule |
| Issue #12 (handoff drift) | GitHub | **closed** — checker shipped and in `verify` |
| Provenance thinness: three claim ids, so most rules are `convention` | `docs/LIMITATIONS.md` §3 | open — content gap, not a defect token to wave away |
| Playbook acceptance sentences are stated, not executed | `docs/LIMITATIONS.md` §3 | open |

There are **no unresolved P0/P1 blockers** in the sense of a gate that fails. All thirteen
gates (G1–G13) are implemented and verified — `pnpm gates:full` reports 13/13. G7 still holds
one measurement that is `not-run` by construction: the user-agent zoom setting and text-only
zoom, which headless Chromium does not drive (`docs/GATE_REGISTRY.md`). Its 400 % zoom
equivalence is measured as the CSS px viewport zoom produces (320x256 at device scale
factor 4). A gate that has not been measured says so rather than claiming to pass.

## 5. How to resume and re-verify

```bash
git switch chore/continuation-reconciliation
pnpm install --frozen-lockfile
pnpm verify        # the release suite (≈105–120 s warm; 115.5 s in the newest regression)
pnpm regression    # adds demo loop + dogfood, writes a report naming the revision
pnpm benchmark     # deterministic benchmark arm; writes the claim-gate status
```

Fresh-context continuity lives in `AGENTS.md`, `docs/AGENT_CONTINUE_PROTOCOL.md`,
`HANDOFF.md`, `.sus-dev/STATE.md` and `TASKS.json` — with `TASKS.json` as the only authority
on task status.

## 6. Checkpoint history after the verified revision

| Commit | What it adds | Why the verified revision still stands |
| --- | --- | --- |
| `2f344df` | the code and knowledge base | the run in §2 was made at this revision |
| `1fd463f` | this handoff, the T1006 receipt, TASKS/STATE record | documentation only |
| `1e5213b` | a tracked note where the generated full-loop bundles live, plus the `.gitignore` negation that keeps it | configuration and documentation; it fixed a remote-CI check that the local gate could not see, because the bundles were still on the local disk |

Remote CI status on the pushed commit: **success** (`gh run list` — run 43706523472, 4 m 28 s,
both Node 22 and Node 24 matrices).

## 7. Completion flags

`BUILD_COMPLETE_PUSHED` is set in `.sus-dev/STATE.md` only after the remote SHA was confirmed
equal to the pushed commit and the pre-push gate passed on that exact tree. The independent
audit (`T1003`) is stopped before, as required.
