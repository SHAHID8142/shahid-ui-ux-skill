# T1003 — commission packet for the independent audit

**Status:** commissioned by the owner (D35, 2026-11-17). **Not started, not passed, not self-certified.**
TASKS.json keeps `T1003 = pending` until an independent auditor writes the receipt. The build's author must
not edit the verdict.

**Audited revision:** the tree at the checkpoint named in §1. Read `git rev-parse HEAD` yourself; do not
trust a revision quoted in any document, including this one.

---

## 0. Read this before trusting anything below

This packet was written by the agent that built the product. That makes every sentence in it a **claim by an
interested party**. Its job is to save you time finding the surfaces, not to tell you what is true.

Three habits make your review worth more than the build's own receipts:

1. **Distrust the receipts.** `.sus-dev/VERIFICATION/T####.md` files are self-reports. Pick five at random,
   run their stated commands, and see whether the output matches. Past rounds in this repository found
   receipts that overstated what was measured; one claimed a green CI run that was red.
2. **Prefer a defect you can reproduce in one command** over a defect described in prose. A finding without a
   reproduction is a review note, not a finding.
3. **Check that "not measured" never reads as "pass".** The dominant failure mode of this codebase is a check
   that quietly becomes vacuous — `not-run` rendered as a green tick, an assertion that stopped asserting, a
   gate that passes because it measures nothing. `docs/LIMITATIONS.md` is where the author admits the gaps;
   read it as a list of places to attack.

---

## 1. What is being audited

| Item | Value |
| --- | --- |
| Repository | `SHAHID8142/shahid-ui-ux-skill` (public since D34) |
| Branch | `chore/continuation-reconciliation` |
| Checkpoint | T1006, the verified final push before this audit |
| Node / pnpm | 26.13.1 / 11.22.0 |
| Build state claimed by the author | `pnpm verify` green: 96 test files + 3 skipped, 1050 tests passing, 61/61 gates |
| Task state claimed by the author | `TASKS.json`: pending exactly T1003 and T1005 (T1003 was commissioned after this row was written; absolute done/total counts rot with every task — read `git show HEAD:TASKS.json` yourself for the count at the revision you audit) |

Verify all five lines yourself. A wrong row here is a finding in itself (severity: high — the documents would
be describing a tree that is not the one under review).

---

## 2. Scope

### In scope

1. **Bridge and apply path** — the component that can execute commands on the owner's machine.
   `packages/studio-bridge/src/` (`bridge-server`, `apply`, `session`, `index`), `scripts/studio/bridge.mjs`.
   Questions: authentication and token lifetime, origin checks, path traversal in apply, symlink escape,
   TOCTOU between approval and write, digest binding of an approval to a hunk, what a malicious page served
   from an authorized origin can do, log/redaction of secrets.
2. **Network authorization** — `packages/eval-core/src/harness/net-guard.ts`,
   `authorized-proxy.ts`, and the per-hop redirect decision (T1025). Questions: can a redirect, a
   sub-resource, a `file://` navigation, a service worker, or an `iframe` reach an unauthorized host? Is a
   refusal fatal (no report written) or silently partial?
3. **The honesty engine** — `packages/eval-core/src/audit/` (`contract.ts`, `compose.ts`, `pipeline.ts`,
   `report.ts`) and `packages/eval-core/src/bestpractice/` (`proposal.ts`, `from-audit.ts`, `command.ts`).
   Questions: which code paths can produce a `pass` without a measurement? Where is `not-run` converted to a
   different status? Does `fact-without-observation` cover every proposal item? Can a check's status disagree
   with the findings it pushed (this happened once — see T1039)?
4. **Gates** — `scripts/lib/gates/`, `scripts/check-gates.mjs`, `docs/GATE_REGISTRY.json`. Questions: which
   gate can pass on an empty fixture set? Are gates run in CI, or only locally? Is a gate's "verified" state
   earned or asserted?
5. **Supply chain and CI** — `.github/workflows/*`, `package.json` scripts, lockfile, the `.githooks` push
   gate. Questions: are third-party actions pinned to a commit? Is `permissions:` least-privilege? Can a pull
   request from a fork execute code with secrets? Is the push gate bypassable with `--no-verify`, and if so,
   does CI catch what it skips? Note CI checks out with `fetch-depth: 1`: a test that reads git history is a
   latent CI-only failure (this happened once — commit `3a7415b`).
6. **Licence and borrowed text** — the repository must contain no copied third-party guide text, and
   `skill/SKILL.md` declares `license: Proprietary — all rights reserved` with no LICENSE file. Questions:
   any upstream prose, rule text or fixture copied in? Are dependency licences compatible with the declared
   position? The product licence itself is the owner's open decision (D06) and is **not** yours to settle.
7. **Claims** — `docs/`, `README.md`, and the claim gate (`scripts/check-claims.mjs`,
   `scripts/lib/claims.mjs`). Questions: does any document claim more than a measurement supports? "Verified"
   used for "not measured"? Comparative claims without a paired run?

### Out of scope (owner decisions, not findings)

- Choice of product licence (D06), publication/release (T1005), branch-protection policy, closing superseded
  review PRs #2/#4, and any repository setting. Report them as "owner decision pending" if you must mention
  them; do not treat the absence of a decision as a defect in the code.
- Host-specific journeys on FreePi / zcode / WorkBuddy / Auto Pilot. No host journey has been run on any host;
  that gap is documented (`docs/SUPPORT_MATRIX.md`, `docs/LIMITATIONS.md`) and is not a hidden claim.

---

## 3. Evidence you can reproduce

```bash
git switch chore/continuation-reconciliation && git pull
pnpm install --frozen-lockfile
pnpm setup            # push gate + Chromium + state consistency
pnpm verify           # the whole suite: tests, gates, lint, format, claims, examples, playbooks
node scripts/check-gates.mjs
node packages/adapters/dist/cli.js status    # host tiers + evidence freshness
pnpm support                                  # support matrix current?
```

Then attack specific claims:

Each block below was run by the author at the checkpoint; the comment states what it printed then. Treat
that as the expected baseline to compare against, not as proof.

```bash
# Unauthorized host: is the refusal fatal (no report written, exit 2)?
node packages/eval-core/dist/cli.js audit --url http://example.com --out /tmp/a1
#   → error: host "example.com" is not authorized: pass --authorize example.com … ; exit=2

# An HTML file scope attributes its own route and proposes (2 items here, exit 0):
node packages/eval-core/dist/cli.js bestpractice --path fixtures/bestpractice --scope-kind component-path \
  --scope "$PWD/fixtures/bestpractice/states-flat/index.html" --out /tmp/bp1 --mode deep
#   → 2 item(s), 2 measured, 0 blocking; exit 0. The "N finding(s) outside the scope" count is
#     machine-dependent (±8 run-to-run on a loaded machine — the state probes measure, they do
#     not count), so the stable expectations are the exit code and the item/blocked counts.

# A component scope refuses: exit 3, not 0, with the remedy named:
node packages/eval-core/dist/cli.js bestpractice --path fixtures/bestpractice --scope-kind component-path \
  --scope "$PWD/packages/eval-core/src/index.ts" --out /tmp/bp2 --mode deep; echo "exit=$?"
#   → a file scope cannot attribute the 80 finding(s) the audit measured … ; exit=3

# The bridge: does it print a token, and can it be driven without one?
node scripts/studio/bridge.mjs --port 8791 --json
```

Scope paths resolve against the target unless given as absolute paths; a relative source path that does not
exist under the target is refused as `scope not-found` (exit 2), which is the intended behaviour and worth
checking rather than assuming.

**These commands were re-run on a fresh `--depth 1` clone at `e5b6ad2`** (install from the lockfile, build,
then the three blocks above), not only in the author's working tree. That exercise found a real defect: a
scope path spelled through a symlink (macOS `/tmp` -> `/private/tmp`) derived no route and fell back to the
"cannot attribute" refusal, so the same file was attributable under one spelling and not another. Fixed in
T1042 by canonicalising both paths; the packet's command line is unchanged because the behaviour was wrong,
not the instruction.

Gate registry, limitations and the claim gate are the three places where an overstatement would hide:
`node scripts/check-claims.mjs`, `docs/LIMITATIONS.md`, `docs/GATE_REGISTRY.json`.

---

## 4. Severity rubric

Judge by what an owner would suffer, not by tidiness.

| Severity | Meaning |
| --- | --- |
| **Critical** | Code execution, secret disclosure, or a write outside the approved hunk/tree reachable by an attacker or a plausible user action. Also: an audit verdict that is systematically wrong in the direction of "safe" (a vacuous gate counts here). |
| **High** | A claim the product's own documents make that the code cannot support; a refusal that is not fail-closed; a check that passes with no measurement; licence/IP exposure. |
| **Medium** | A measurable gap that misleads without endangering: misleading wording, an unattributed finding reported as clean, a stale matrix row. |
| **Low** | Maintainability, naming, test hygiene, duplication — fix when nearby, never block a release for it. |

If you find **no** critical or high issue, say so plainly and say what you tried. "Nothing found" from a
reviewer who enumerates their attempts is worth more than silence.

---

## 5. How to report

- **One finding per item**, with: severity, the file and line, a one-command reproduction, what actually
  happened, what should have happened, and the smallest fix you see. Template at the end of this file.
- Post them **on this issue** (one comment per finding, or one comment with a numbered list). Do not open a PR
  that silently fixes things: the build agent integrates, so that the diff and its evidence stay reviewable.
- **You write the receipt**: `.sus-dev/VERIFICATION/T1003.md`, with your verdict (`pass`, `pass-with-findings`,
  or `fail`), the revision you audited, the commands you ran, and the finding IDs. The build agent must not
  edit that file afterwards except to append its response.
- The build agent will record each finding in `TASKS.json` as a task with `T1003-<n>` in its title and will
  reply here with the fix commit and its own measurement. **A finding is closed when you or the owner accepts
  the measurement**, not when the agent says it is fixed.

---

## 6. Exit criteria for T1003

T1003 passes when all of the following are true:

1. Every finding has a severity and a reproduction, and no **critical** is open.
2. Every open **high** is either fixed with a measurement, or explicitly accepted in writing by the owner.
3. The reviewer states which claims in §1 they verified and which they did not.
4. `.sus-dev/VERIFICATION/T1003.md` exists, names the audited revision, and carries a verdict.

The build agent stopping here is deliberate: a task that certifies its own independence certifies nothing.

---

## 7. Finding template

```md
### T1003-<n> — <one-line summary>

- **Severity:** critical | high | medium | low
- **Where:** path:line
- **Reproduce:** exact command(s), and the output you got
- **Expected:** what should have happened
- **Observed:** what did
- **Blast radius:** who is affected and how bad it is
- **Smallest fix:** one or two sentences
- **Why the build's own evidence missed it:** optional, and useful
```