# Benchmark protocol (T1002, PRD Part 9)

Status: **protocol only**. No comparative claim may be made from this repository
until every requirement below is met; the current machine-readable status is
`evals/benchmarks/results/status.json`, and the claim gate
(`comparativeClaimAllowed` in `scripts/lib/benchmark.mjs`) returns `allowed: false`
today.

This document exists because the alternative — writing "measurably better" and
hoping — is the failure PRD Part 9 was amended to prevent.

## 1. The question

Does an interface built with SUS rules score higher than the same interface built
without them, judged blind by designers on the rubric, with deterministic
accessibility/layout/motion metrics as a second, non-human axis?

The no-skill baseline is the comparison floor. It is *not* a competitor; the
pinned competitor arm is described in §6 and is currently absent.

## 2. Arms

| Arm | What it is | Current state |
| --- | --- | --- |
| `baseline` | The same brief built without the skill (`evals/baselines/<surface>/page.html`, generated unassisted) | **measured** — see `results/status.json` |
| `sus-assisted` | The same brief built with the skill active | **not-run** — no assisted artefacts exist yet |
| `human` | Blind designers scoring both outputs on the rubric | **not-run** — no participants recruited |

An arm that has not been measured is recorded as `not-run`. It is never recorded
as a win, a tie, or "pending approval".

## 3. Sets, and why they are separate

| Set | Where | Rule |
| --- | --- | --- |
| Development briefs | `evals/briefs/briefs.md` (4, one per surface mode) | may be inspected freely; used to build the rubric and the skill |
| Calibration cases | `evals/briefs/held-out/` naming excluded; calibration uses the fixtures | used to check inter-rater agreement before the real run |
| Held-out evaluation briefs | `evals/briefs/held-out/` (3) | **sealed**: identified by SHA-256 in `evals/benchmarks/seals.json`, never inspected during tuning |

The held-out set is small on purpose. It is enough to detect gross overfitting and
not enough to tune against without noticing. A seal mismatch means the set was
edited after being set aside, and the run is void (`checkSeals` fails).

## 4. Sampling and power (DA-43)

`n ≥ 20` per brief is a **floor to validate**, not a sample size derived from a
power argument. The protocol requires the argument, so it is computed:

For a two-sample comparison of rubric means (two-sided, normal approximation,
α = 0.05, power = 0.80):

- smallest professionally interesting difference **0.5 points** on the 1–5 scale,
  with a within-arm standard deviation of **0.8**: **n = 41 per arm**;
- a more conservative spread of **1.0**: **n = 63 per arm**.

Reproduce with `sampleSizePerArm({ effect, sd })` in `scripts/lib/benchmark.mjs`.
Consequence, stated plainly: **20 raters per brief is underpowered for a 0.5-point
effect**, so either the effect size threshold is raised (a 1.0-point difference with
sd 0.8 needs 11 per arm) or the run needs ~41–63 raters per arm. The protocol
chooses: a **1.0-point difference** is the minimum claimable effect, and the run
targets **n = 20 per arm per brief** as the floor that a 1.0-point claim survives.
Anything smaller is reported as "no detectable difference at this sample size".

## 5. Blinding

- Outputs are stripped of identifying metadata; file names are opaque ids.
- Arm order is randomised per rater with a recorded seed.
- Raters score both arms of the same brief, in random order, and are told nothing
  about provenance.
- The rubric is fixed **before** the run and is not adjusted afterwards; changing
  it voids the run rather than re-scoring it.
- Raters disclose whether they have seen SUS before; that is reported, not filtered.

## 6. Conditions, pinned

A reproducible run pins: host framework and version, browser build, viewport sizes,
the exact skill commit, the exact prompt/brief text hash, the model used for
generation, and the competitor version if a competitor arm is added. A competitor
arm that is not pinned by version is not a competitor; it is an anecdote.

## 7. Metrics

**Deterministic (second axis), run by `pnpm benchmark`:**

| Check | Rule |
| --- | --- |
| `a11y-wcag-aa` | no serious/critical axe violation over the whole page |
| `reflow-390` | no horizontal document scroll at 390 CSS px |
| `focus-visible` | the first tab stop paints a focus ring |
| `reduced-motion-quiet` | under `prefers-reduced-motion: reduce`, no element keeps a >0 duration |
| `labelled-controls` | every input has an accessible name |

**Human (primary axis):** the rubric dimensions (hierarchy, typography, colour,
layout, motion, copy, accessibility judgement) on the 1–5 anchors defined by the
rubric, plus a forced preference per brief.

## 8. Analysis

- Per brief: mean difference per dimension with a bootstrap 95 % CI (10 000
  resamples), and the forced-preference proportion with a Wilson interval.
- Across briefs: the difference is reported per surface mode, never pooled into a
  single headline number — pooling four different surfaces into one score is how
  benchmarks become marketing.
- Missing rater data is reported as missing, not imputed.

## 9. Data policy

- Raw rater data (individual scores, comments, timing) stays **private** absent
  explicit consent and rights clearance.
- Aggregate-only publication is permitted and is **explicitly disclosed** as
  aggregate-only, with the number of raters and briefs stated.
- No participant is identifiable in any published artefact.

## 10. What is measured today

`pnpm benchmark` measures the **baseline arm** on the four surface baselines and
records `sus-assisted: not-run` and `human: not-run`. That is the honest state:

```
baseline   measured (4 surfaces, 5 deterministic checks)
sus-assisted not-run (no assisted artefacts)
human      not-run (no participants)
claim gate  allowed: false
```

## 11. Claim language until the run completes

Permitted: "the protocol is published", "the deterministic checks are reproducible
by one command", "the baseline arm measures X on this revision".

Not permitted, in any document: `beats`, `superior`, `faster`, `better than`,
`outperforms`, or any comparison implying the human arm produced a result. The
docs claim-checker fails the build on those strings while the gate is closed.

## 12. Reproducing

```bash
pnpm benchmark      # deterministic arm + status.json + a results artefact
pnpm verify         # includes the claim-checker over docs and README
```

Rater-facing materials (rubric sheet, blind ids, randomisation seed) are generated
from the same ids so a future run cannot silently re-shuffle arms mid-study.
