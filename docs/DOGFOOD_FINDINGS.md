# Dogfood findings (T0906)

The three reference implementations are the fixtures themselves: `fixtures/marketing`
(Next), `fixtures/commerce` (Astro) and `fixtures/admin` (Next, the dashboard/CMS
surface). `pnpm dogfood` builds each one, serves it, and drives it in Chromium through
the checks in `packages/eval-core/src/dogfood.ts`. Every check is bound to a rule the
skill states, so a failure means a rule did not survive contact with a real page.

Evidence policy: the bundle (screenshots, measurements) is written to
`evals/evidence/dogfood-private/`, which is **git-ignored** pending the artifact-level
consent, licensing and PII/secret checks in T0906 acceptance. Only the redacted
summary (`evals/evidence/dogfood/SUMMARY.md` + `summary.json`) is committed, and it
carries counts and rule ids rather than page content.

## First run — 2026-11-15

Overall verdict **fail**: two real findings on `admin`, none on `marketing` or
`commerce`. Written here the way a user report would be.

### F1 — Admin dashboard overflows horizontally at 390 px (343 px)

**Reported by:** dogfood check `reflow-390`, rule
`search-filters.filters-continuity-across-layout`.
**Symptom:** at a 390 CSS px viewport the document scroll width exceeds the client
width by 343 px, so the whole page pans sideways. A reader on a phone sees a partial
column and has to pan to reach the rest.
**Why it matters:** this is the exact rule the second-wave playbooks state — row data
reflows instead of driving the page wider — failing on our own reference dashboard.
**Likely cause:** a table or grid with a fixed minimum column width inside a container
that does not clip or reflow.
**Status:** open, deliberately **not** patched here. `evals/baselines/admin/page.html`
is the evaluation ruler; changing the fixture's structure silently changes every
baseline number. The fix belongs with a baseline regeneration decision (T1001 wave),
not with an evidence run.

### F2 — Admin footer and env note fail colour contrast (4.46:1)

**Reported by:** dogfood check `a11y-wcag-aa` (axe `color-contrast`, serious), rule G4.
**Symptom:** `#6a7284` on `#f5f6f9` measures 4.46:1 at 13 px normal weight — 0.04
below the 4.5:1 AA threshold. Affects `.env-note` and `#admin-footer > p`.
**Why it matters:** a near-miss is still a fail, and this one is invisible in review
because 4.46 looks fine. It is only findable by measuring.
**Status:** open, same baseline constraint as F1. The fix is a token change
(darken the muted text one step), which must land together with a deliberate baseline
refresh so the ruler and the report stay in step.

## What this run proves, and what it does not

- It proves the checks execute against real builds, produce per-rule verdicts, and fail
  closed: the runner asserts `notRun` is empty, so a silent skip cannot be reported as
  a pass.
- It does not prove the fixtures are good products. Two of them passed every check in
  this run, which says the checks are not exhaustive — they cover five rules, not the
  36 playbooks.
- The findings are intentionally left unfixed so that the next run can show the same
  two failures until the baseline decision is made. A dogfood report that always says
  "pass" is a broken instrument.
