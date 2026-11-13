# Blind judge protocol (T0155)

Purpose: calibrate and constrain rubric judging so scores are reproducible and
axes that resist consistent judgment get flagged, not averaged away.

## Session flow

1. **Anonymize.** The session builder lists submissions (subject label +
   judge-facing material: page structure text + measured metrics summary).
   The CLI assigns aliases A/B/C… in a shuffled presentation order and keeps
   the alias→subject mapping in `session.json` (secret until reveal).
2. **Judge.** For each alias, the judge scores all 12 rubric axes 1–5 with
   the written anchors from amendments Part 3. The judge records one pass per
   `judge record` call; a pass must score every axis of every alias.
3. **Agree.** `judge agree` compares consecutive passes per axis:
   - exact-match rate (target ≥ 0.8), and
   - mean absolute difference (target ≤ 1.0);
   an axis is **below target** when it fails both. Below-target axes are
   flagged in the report and surfaced to the acceptance conversation; they do
   not silently pass (tier rule: judged scores never gate CI).

## Judge constraints

- The judge scores only the anonymized material in `materials.json` — never
  file paths, provenance, or bundle identities.
- Basis is recorded by the caller (`judged` for the POV axis; judged scores
  never affect exit codes).
- Visual-only judgments require actual screenshot inspection; a judge without
  vision must say so and judge structure+metrics only. Limitation is recorded
  in the agreement report, not hidden.

## Calibration run 1 (builder, 2026-11-14)

- Judge: builder session (GLM via ZCode), `judgeId: builder-glm-1`.
- Submissions: the four T0153 baselines (marketing, commerce, admin,
  portfolio) anonymized.
- Method: two recorded passes from the same judge → **intra-judge
  self-consistency** (this measures stability, NOT inter-rater reliability —
  recorded limitation: one judge, no vision, immediate repetition).
- Output: `evals/judge/calibration-1/agreement.json` + below-target axes.

## Target adoption

The 0.8 / 1.0 targets are the protocol's initial defaults, subject to owner
review with the first calibration numbers (T1002 revisits before release).
