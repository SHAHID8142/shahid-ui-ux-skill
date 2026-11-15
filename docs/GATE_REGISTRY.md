# Gate registry (T0159)

Machine-readable source of truth: `docs/GATE_REGISTRY.json` (validated by
`node scripts/check-gates.mjs`). Gate definitions G1–G12 come from the
amendments gates table; G13 (critical security/privacy) comes from the
reconciliation requirement that the critical security gate is non-waivable
(ER-SECURITY).

| ID | Gate | Blocks | Owner task(s) | Check status |
|---|---|---|---|---|
| G1 | Token-only styling | commit | T0103, T0401 | implemented (eslint rule + bad fixture) |
| G2 | Section order | commit | T0502, T0503 | not-run |
| G3 | No placeholder content | commit | T0303, T0305 | not-run |
| G4 | A11y floor | acceptance | T0152b | implemented (fail-closed evaluator + negatives) |
| G5 | Perf budget | acceptance | T0152b | implemented (fail-closed evaluator + negatives) |
| G6 | Motion parity | acceptance | T0603 | implemented (behavioural transition oracles, fail-closed; verdict emitter in eval-core) |
| G7 | Reflow | acceptance | T0551, T0152 | not-run (harness fields exist) |
| G8 | Target size | acceptance | T0152, T0152b | not-run (harness fields exist) |
| G9 | Semantics | acceptance | T0807, T0403 | not-run |
| G10 | Detector quality | release | T0305 | not-run |
| G11 | Evidence completeness | acceptance | T0154 | implemented (fail-closed evaluator + CLI) |
| G12 | Contract drift | weekly+release | T0401 | implemented (fail-closed drift gate + negatives) |
| G13 | Critical security/privacy | release | T0806 | implemented (threat model + hostile-agent suite + fail-closed negatives; `not-applicable` refused) — **never waivable** |

Rules (ER-SECURITY + amendments): unimplemented checks report **not-run**,
never pass; each landed gate ships a bad fixture proving failure;
`check_verdict` is pass/fail/not-run/not-applicable and is separate from any
acceptance disposition; exceptions cannot turn a failure into a pass; a gate
may be relaxed only by a DECISIONS.md entry (approver, reason, expiry) —
except G13, which is never waivable.
