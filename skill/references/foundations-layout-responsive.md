# Foundations: layout, responsive & accessibility (T0403, incl. owner issue #10)

Layout decision procedures for web surfaces, with the owner's mobile
transformation requirement (issue #10, 2026-11-14) as a first-class rule.
Deterministic enforcement: the hardening matrix (T0551) runs 320px columns;
checkSeo/G9 checks structure; negative fixtures live in the scanner corpus.

## Layout & responsive — decide in this order

1. **Content model before breakpoint styling.** Identify each record/list's
   information structure first; THEN choose per-context presentation.
2. **Content-adaptive transformation at narrow viewports (issue #10,
   non-waivable for ordinary record lists):** repeated records (invoices,
   orders, entries, tickets) become readable stacked cards, definition-list
   records, or disclosure rows on mobile — NOT a compressed multi-column
   table requiring lateral scrolling. Priority order inside a record:
   identity/number → primary amount or title → status; date/assignee/client
   secondary; actions remain accessible affordances.
3. **Document the pattern choice** (table vs cards vs disclosure) and why, in
   the section's decision log. Full-page horizontal overflow on mobile fails
   the hardening matrix; `overflow-x: hidden` to conceal broken content is
   banned.
4. **Two-dimensional data grids are the legitimate exception** (WCAG 2.2
   Reflow, F17): genuinely comparative grids MAY scroll — constrained to the
   grid region, with accessible cues and focus handling. Justify in the log;
   ordinary record lists never qualify for the exception.
5. **One data source, coherent across contexts:** desktop/tablet/mobile are
   distinct interaction layouts with consistent action semantics, filter/sort
   continuity, keyboard and screen-reader support; no data loss, no duplicated
   inaccessible action copies (issue #10).
6. **Navigation adapts or collapses**: the fixed 14rem sidebar that ignores
   mobile (measured in the admin baseline: horizontal overflow true,
   responsive-edge 1/5) is the negative pattern; require a collapse/off-canvas
   decision at narrow widths.
7. **States are designed, not discovered:** empty/loading/error/long-content
   states are part of the section brief's content requirements (G3 keeps them
   real).

## Accessibility — decide in this order

1. **Keyboard first:** every interactive element reachable and operable;
   focus-visible styled through tokens; no click-only controls (G9).
2. **Reading order matches visual order** across layout changes (issue #10);
   transformed mobile records keep the same DOM semantics — CSS reorders, the
   DOM does not fork.
3. **Touch targets ≥ 24×24 CSS px with standard exceptions** (G8); stricter
   project minimums are recorded policy, not the standard (F16).
4. **Automated severity is triage** (axe, G4) — NOT an AA conformance claim;
   the manual/AT criteria→evidence map stays a separate deliverable (F18).
5. **Contrast through the colour foundations** (T0402); dark mode parity via
   the capture matrix.

## Negative fixtures (what this module must catch)

- The admin no-skill baseline: forced five-column table overflowing at mobile
  widths (evals/baselines/admin/bundle.json — horizontalOverflow true,
  responsive-edge 1/5) — kept as the labeled negative reference, never
  repaired (issue #10 test-integrity rule).
- A desktop table forced onto mobile fails the responsive gate; the corrected
  stacked-record pattern passes (SUS-guided reference arrives with T0407).
