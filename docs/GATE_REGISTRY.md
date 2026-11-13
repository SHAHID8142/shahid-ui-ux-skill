# GATE REGISTRY — G1–G12 ownership and executable checks

Status: **proposed** (M0 review artefact, part of architecture approval).

Rule: a gate exists only when it has (1) an owning task that implements its check, (2) a command
that produces a machine-readable verdict, and (3) a test proving the check fails on a deliberately
bad fixture. A gate without an owner is not a gate — it is a wish. The validator in
`scripts/check_gate_registry.*` (task T0159) fails CI if this table and `TASKS.json` disagree.

Verdicts are exactly: `pass` · `fail` · `not-run` · `not-applicable` (with reason). `not-run` is
never reported as `pass`.

| Gate | Name | Owning task | Check (command → verdict) | Enforced at | Status |
|---|---|---|---|---|---|
| G1 | Token-only styling | T0401 | token lint over component scope → `pass/fail` + exempted refs | commit | not implemented |
| G2 | Section order | T0505 | read `.sus/SECTION_STATUS.md`, compare to changed files → `pass/fail` | commit | not implemented |
| G3 | No placeholder content | T0406 | content lint (lorem/TODO/unregistered numeric claim) → `pass/fail` | commit | not implemented |
| G4 | A11y floor | T0152b + T0807 | axe run → `fail` on serious/critical; criteria→evidence map completeness reported separately | acceptance | not implemented |
| G5 | Perf budget | T0152b | per-route lab run vs budget table; field data stored as its own field, never inferred | acceptance | not implemented |
| G6 | Motion parity | T0603 (+T0602) | motion trace + reduced-motion equivalent walkthrough → `pass/fail` | acceptance | not implemented |
| G7 | Reflow | T0807 | 320 CSS-px equivalence + 400% zoom, with WCAG 1.4.10 exceptions recorded | acceptance | not implemented |
| G8 | Target size | T0807 | measured target sizes vs SC 2.5.8 + recorded exceptions | acceptance | not implemented |
| G9 | Semantics | T0406 + T0807 | heading/landmark/focus audit → `pass/fail`; conventions listed separately from WCAG | acceptance | not implemented |
| G10 | Detector quality | T0305 | precision/recall on labelled corpus vs published targets | release | not implemented |
| G11 | Evidence completeness | T0154 | schema validation of the evidence bundle → `pass/fail` | acceptance | not implemented |
| G12 | Contract drift | T0401 (+T0503) | token diff: code tokens vs `DESIGN_CONTRACT.md` → divergence report | weekly + release | not implemented |

## Non-waivable vs waivable

- **Non-waivable:** G1, G2, G3, G11, and the violation classes inside G4/G7/G8/G9 that map to
  WCAG 2.2 A/AA success criteria in scope.
- **Waivable with a recorded, expiring exception:** G5 budgets (temporary overage with owner
  sign-off and expiry), G6 (documented, equivalent alternative), G12 (planned migration window).
- **Never waivable:** a `not-run` verdict recorded as `pass`.

## Adding a gate

A new gate requires: id, name, owning task (must exist in `TASKS.json`), executable check producing
one of the four verdicts, a negative fixture, and an entry in the amendments Part 2 table. Anything
less is a design opinion, and design opinions belong in the rubric, not in the gate list.
