# Foundations: colour & typography (T0402)

Decision procedures for colour and typography. Evidence references cite the
provenance catalog (evals/research/provenance-catalog.json); where no measured
claim exists yet, the rule says so honestly. This module styles ONLY through
the token contract (G1) — raw hex/px in component scope is a commit-blocking
violation.

## Colour — decide in this order

1. **Semantic roles first, palette second.** Name what the colour DOES
   (surface/fg/accent/line) before choosing values. A role without a job is
   removed, not repainted.
2. **Contrast is measured, not eyeballed.** Text pairs must meet the project's
   contrast floor (WCAG AA thresholds applied via the axe gate, G4). The
   no-skill baselines failed G4 on grey-on-grey text (evals/baselines/*/
   bundle.json) — that is the failure mode this rule resists.
3. **One accent, few surfaces.** Accent carries the primary action weight;
   adding a second accent requires a recorded decision (owner-taste, decidedBy).
4. **Dark mode is a parity check, not a re-theme.** Every surface/fg role
   resolves in both themes (capture matrix captures both — T0152); roles that
   only exist in light mode fail the corpus.

## Typography — decide in this order

1. **Scale before sizes.** Derive a modular scale (ratio + base) and use it
   for every heading/body step; ad-hoc sizes between steps are drift (G12
   territory once the contract exists).
2. **Measure 45–75 CPL** for body text (project convention with conditions —
   NOT a WCAG definition, F20); wide layout columns get a max-width, not
   smaller text.
3. **rem-based sizing only.** Zoom (200%) and the 320px reflow column
   (hardening matrix, T0551) depend on it; px-fixed type is a responsive
   defect (issue #10: no shrink-to-fit).
4. **Line-height by role**: body 1.5–1.7; headings tight (1.1–1.3) — tuned per
   brief, recorded in the direction thesis.
5. **Fallback stacks are real**: every webfont names its stack collapse; the
   per-brief locale set (T0551, DA-46) decides shaping/fallback requirements
   (e.g., Bengali segmentation) — not a universal locale claim.

## What NOT to do (banned defaults these rules resist)

- Default-blue accents copied from the last generation (distinctiveness axis).
- Grey-on-grey text that fails contrast (measured G4 failure in baselines).
- Uniform card grids with no hierarchy (composition anchor 3 at best).
- Fixed-px type that breaks reflow (issue #10).
