# Full-loop demo evidence (T0708)

The bundles in this directory are **generated**, not authored: each `pnpm demo:loop` run
writes `evals/evidence/full-loop/<timestamp>/` containing `manifest.json` (the eight steps
of annotate → intent → diff → approve → apply → verify → undo) and `loop.webm` (a DOM
recording of the run).

They are git-ignored rather than committed for two reasons:

1. A committed copy is a snapshot of one run that quickly stops matching the code, which is
   the same drift problem `docs/LIMITATIONS.md` describes for hand-written matrices.
2. The regression pipeline (T1001) runs the demo on every pass, so committing each run would
   add a binary to every checkpoint for no evidential gain.

The evidence trail lives in two durable places instead:

- `.sus-dev/VERIFICATION/T0708.md` records what a run produced and what it did not prove;
- `evals/reports/regression-latest.md` names the revision at which the demo last passed.

To reproduce a bundle: `pnpm demo:loop`, then read
`evals/evidence/full-loop/<timestamp>/manifest.json`.
