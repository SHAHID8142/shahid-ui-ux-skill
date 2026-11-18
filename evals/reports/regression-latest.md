# Cross-module regression report (T1001)

Revision: `23f7c9ee2f7893cf7cfcf4e823c781484f26497b` on `chore/continuation-reconciliation` — **working tree dirty**
Started: 2026-11-18T17:47:26.618Z
Total: 511.8s
Verdict: **pass**

| Stage | Command | Status | Exit | Duration |
| --- | --- | --- | --- | --- |
| verify | `pnpm verify` | pass | 0 | 474.8s |
| demo-loop | `pnpm demo:loop` | pass | 0 | 8.3s |
| dogfood | `pnpm dogfood` | pass | 0 | 28.7s |

The tree was dirty when this ran, so the verdict describes a revision plus uncommitted changes.
