# Cross-module regression report (T1001)

Revision: `2242f3ef32f595c629723b1863e713af1371c69a` on `chore/continuation-reconciliation` — **working tree dirty**
Started: 2026-11-18T19:36:35.399Z
Total: 522.6s
Verdict: **pass**

| Stage | Command | Status | Exit | Duration |
| --- | --- | --- | --- | --- |
| verify | `pnpm verify` | pass | 0 | 489.0s |
| demo-loop | `pnpm demo:loop` | pass | 0 | 6.0s |
| dogfood | `pnpm dogfood` | pass | 0 | 27.7s |

The tree was dirty when this ran, so the verdict describes a revision plus uncommitted changes.
