# Cross-module regression report (T1001)

Revision: `537438f34f32a614ab03feb1228df303b8b7ac1b` on `chore/continuation-reconciliation` — **working tree dirty**
Started: 2026-11-15T10:22:30.192Z
Total: 129.8s
Verdict: **pass**

| Stage | Command | Status | Exit | Duration |
| --- | --- | --- | --- | --- |
| verify | `pnpm verify` | pass | 0 | 103.9s |
| demo-loop | `pnpm demo:loop` | pass | 0 | 3.7s |
| dogfood | `pnpm dogfood` | pass | 0 | 22.2s |

The tree was dirty when this ran, so the verdict describes a revision plus uncommitted changes.
