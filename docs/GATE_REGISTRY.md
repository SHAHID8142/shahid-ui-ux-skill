# Gate registry (T0159)

Machine-readable source of truth: `docs/GATE_REGISTRY.json` (validated by
`node scripts/check-gates.mjs`). Gate definitions G1–G12 come from the
amendments gates table; G13 (critical security/privacy) comes from the
reconciliation requirement that the critical security gate is non-waivable
(ER-SECURITY).

| ID | Gate | Blocks | Owner task(s) | Check status |
|---|---|---|---|---|
| G1 | Token-only styling | commit | T0103, T0401 | implemented (eslint rule + bad fixture) |
| G2 | Section order | commit | T0502, T0503 | implemented (plain-JS mirror of `sectionLockViolation` + bad fixture) |
| G3 | No placeholder content | commit | T0303, T0305 | implemented (filler / placeholder / unregistered-claim scanner + bad fixture) |
| G4 | A11y floor | acceptance | T0152b | implemented (fail-closed evaluator + negatives) |
| G5 | Perf budget | acceptance | T0152b | implemented (fail-closed evaluator + negatives) |
| G6 | Motion parity | acceptance | T0603 | implemented (information-token parity over recorded traces, fail-closed + bad fixture) |
| G7 | Reflow | acceptance | T0551, T0152 | implemented for both halves: 320 CSS px overflow + overflow-hiding (bad fixture), plus the 400% zoom equivalence measured as the CSS px viewport zoom produces (320x256 at device scale factor 4, bad fixture); text-only zoom and the user-agent zoom setting stay **not-run** |
| G8 | Target size | acceptance | T0152, T0152b | implemented (24x24 floor, SC 2.5.8 exceptions only + bad fixture) |
| G9 | Semantics | acceptance | T0807, T0403 | implemented (heading ladder, main landmark, click-only controls, focus indicator + bad fixture) |
| G10 | Detector quality | release | T0305 | implemented (precision >= 0.95 and recall >= 0.95 on the labelled corpus, fail-closed + bad fixture) |
| G11 | Evidence completeness | acceptance | T0154 | implemented (fail-closed evaluator + CLI) |
| G12 | Contract drift | weekly+release | T0401 | implemented (fail-closed drift gate + negatives) |
| G13 | Critical security/privacy | release | T0806 | implemented (threat model + hostile-agent suite + fail-closed negatives; `not-applicable` refused) — **never waivable** |

Measured gate checks live in `scripts/lib/gates/*.mjs`: pure functions over fixture
data (no browser, no clock, no randomness), run by `node scripts/check-gates.mjs`
against a good *and* a bad fixture — so a check that stops discriminating is itself a
failure. G10's targets (0.95 / 0.95) and their provenance are recorded in the JSON
rather than in the checker, because a target that lives only in the checker can be
lowered by editing the checker.

A gate component the harness cannot measure is reported **not-run** and never counted
as covered. G7 still carries one: the user-agent zoom setting and text-only zoom are not
driven, so they stay not-run. Its 400% zoom equivalence *is* measured now — as the CSS px
viewport zoom produces (320x256 at device scale factor 4), which the 320 px phone column
does not stand in for — and a clean 320 px column with no zoom record is not-run, not pass.

Rules (ER-SECURITY + amendments): unimplemented checks report **not-run**,
never pass; each landed gate ships a bad fixture proving failure;
`check_verdict` is pass/fail/not-run/not-applicable and is separate from any
acceptance disposition; exceptions cannot turn a failure into a pass; a gate
may be relaxed only by a DECISIONS.md entry (approver, reason, expiry) —
except G13, which is never waivable.
