# Issue #12 receipt — handoff consistency must fail the build

- **Issue:** #12 (P1, opened 2026-11-14). **Agent:** pi. **Verdict:** PASS.
- **Files:** `scripts/lib/handoff.mjs` (new), `scripts/lib/handoff.d.mts` (new),
  `scripts/check-handoff.mjs` (new), `packages/schemas/tests/handoff.test.ts` (new,
  10 fixtures), `package.json` (verify/check wiring), plus the reconciliation edits
  below.

## What the issue claimed, and what was true when I started

Re-checked against HEAD rather than trusting the report:

| Claim | Status at HEAD before this fix |
| --- | --- |
| STATE.md done-count vs TASKS.json | counts already matched (79/100) — but nothing enforced it |
| `meta.note` = "no product code exists", concurrency note "planning progress only" | **true**, 79 done tasks |
| "never public" in active guidance while the repo is public (D34) | **true** in AGENTS.md, HANDOFF.md, `EFFECTIVE_REQUIREMENTS.json`, protocol header, `package.json`, ci.yml comment |
| checker does not fail on any of the above | **true** |

So the issue was accurate on three of four counts and stale on the first: the
counts had been reconciled by the agents doing the work, but the *guard* was
missing, which is why they drifted in the first place.

## The guard

`scripts/check-handoff.mjs` (+ pure functions in `scripts/lib/handoff.mjs`) fails
with stable codes: `state-count-missing`, `state-count-drift`, `state-total-drift`,
`meta-claims-no-code`, `meta-planning-only`, `stale-visibility`, `invalid-lease`,
`lease-on-done-task`. It is wired into `pnpm verify` **first**, so it runs before
any code gate — handoff lies are cheap to check and expensive to believe.

Two design choices worth stating:

- **History survives.** A line that records a supersession ("supersedes D30's
  *never public*") is exempt; a live claim fails. The append-only decision log is
  not rewritten to make a checker green — that is the point of an append-only log.
- **Checks read structure, not prose.** Counts come from TASKS.json and the STATE
  line format; leases come from structured fields. The only pattern matching is
  the visibility claim list, which the issue explicitly asked for and which is
  fixture-tested line by line.

## Reconciliation performed

- `TASKS.json.meta`: `concurrency` is now an object distinguishing `host_workers`
  (D33 two-agent leases, 2) from `owner_sub_agent_ceiling` (Issue #9, 2) with a
  note that neither raises the other; `note` states the real completion rule; new
  `visibility` field states public repository / unpublished product.
- `AGENTS.md`, `HANDOFF.md`: visibility reconciled with D34, D30's clause marked
  superseded in place.
- `docs/EFFECTIVE_REQUIREMENTS.json` ER-SYNC: statement corrected and the original
  wording preserved in `superseded_clause`.
- `docs/AGENT_CONTINUE_PROTOCOL.md`: header says public repository / unpublished
  product; §5 keeps its heading but carries a dated wording note explaining that
  the "private push" it originally named is a verified checkpoint on a dev branch.
- `package.json` description, `.github/workflows/ci.yml` comment: same distinction,
  explicitly not a GA/product-publication claim (D06 licensing untouched).

## Verification

| Check | Result |
| --- | --- |
| `node scripts/check-handoff.mjs` | PASS, consistent (79/100 on both sides) |
| Fixtures | 10/10 — 5 negative (real drifts), 1 private-repo positive, others structural |
| Mutation: drop the count-drift check | 1 fixture fails (the 63-vs-67 case) |
| `pnpm handoff` in `verify` | runs first; a seeded drift fails the release suite |
| Full `pnpm verify` | see commit |

## Not done here (honest)

- I did not touch D06 licensing or make any publication claim.
- The checker does not verify *semantic* progress (that a done task's evidence
  exists); that is the continuation checker's job and remains separate.
