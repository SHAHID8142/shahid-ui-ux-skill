# Cross-module regression report (T1001)

Revision: `8ceb27f17ba95f00ee32e8c42075758bfcde8277` on `release/v0.1.0-preview.1-prep` — **working tree dirty**
Started: 2026-11-19T17:50:25.841Z
Total: 523.6s
Verdict: **pass**

| Stage | Command | Status | Exit | Duration |
| --- | --- | --- | --- | --- |
| verify | `pnpm verify` | pass | 0 | 494.6s |
| demo-loop | `pnpm demo:loop` | pass | 0 | 5.1s |
| dogfood | `pnpm dogfood` | pass | 0 | 23.9s |

The tree was dirty when this ran, so the verdict describes a revision plus uncommitted changes.
