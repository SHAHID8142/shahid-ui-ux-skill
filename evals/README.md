# evals/ — evaluation assets

Measured evidence for the evaluation layer. Nothing here is a claim about SUS output
quality unless a measurement in one of these directories says so; the vocabulary is
`pass` / `fail` / `not-run` / `not-applicable`, and an absent measurement is `not-run`,
never a pass.

| Directory | What is in it |
| --- | --- |
| `baselines/` | The no-skill reference pages (one per surface). Frozen: a pilot must not "fix" the baseline to look better. |
| `briefs/` | Task briefs used by the evaluation runs. |
| `budgets/` | Performance budgets consumed by the G5 checks. |
| `directions/` | Direction fixtures for the direction checker. |
| `judge/` | The blind-judge protocol material. The human arm of the benchmark is still `not-run`. |
| `benchmarks/` | Benchmark protocol, sealed results and `results/` outputs (`pnpm benchmark`). |
| `evidence/` | Generated run evidence. Private bundle contents are git-ignored. |
| `host-smoke/` | Per-host smoke receipts produced by `node scripts/coord/smoke-host.mjs`. No host is at `supported`. |
| `reports/` | Generated regression reports (`pnpm regression`). |
| `research/` | The Modern Web Guidance pin, its compatibility note, its pilots, and the provenance catalogue. Start at [`research/modern-web-guidance/COMPATIBILITY.md`](research/modern-web-guidance/COMPATIBILITY.md). |
| `spikes/` | Time-boxed spike outputs and their verdicts. |

Generated files (`**/evidence/**`, `bundle.json`, `capture.json`, `reports/`,
`benchmarks/results/`) are formatter-exempt; see `.prettierignore`.
