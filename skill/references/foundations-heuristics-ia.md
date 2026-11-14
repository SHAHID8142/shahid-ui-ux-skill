# Foundations: heuristics, flows & IA (T0402b)

Decision procedures for primary flows, heuristic review, navigation/IA and
onboarding. Nielsen's ten heuristics are adapted as SUS procedure — expert
guidance (E2), applied with judgement, never presented as measured
evidence. Cited catalog claims: sus-baseline-floor,
scanner-precision-corpus; where no claim exists, this module says so.

## Primary flows — decide in this order

One primary flow per surface — entry → task → success — defined by
questions before screens exist (E1); answers go in the direction thesis.

1. **Marketing** (entry: referral/landing). Questions: what must a
   first-time visitor grasp to judge fit; which single action is primary;
   which objection blocks first. Success measurable when the primary
   action sits at the stated scroll depth, one h1 names the offer (G9),
   and the page has no dead end.
2. **Commerce** (entry: category/search/product). Questions: can the buyer
   compare in one context; is total cost visible before commitment; is
   hesitation missing info or wrong order. Success measurable when price,
   availability and the next step are co-present at the decision point,
   and cart/checkout transitions are designed states, not surprises —
   judged on the content-copy rubric axis with the truthfulness behavior
   contract (T0406, commerce-truthfulness is non-waivable).
3. **Operate (CMS/CRM admin)** (entry: dashboard/list). Questions: the top
   recurring task; single vs bulk; notification arrivals; **role/permission
   state** — who may see and act is a first-class flow decision; **record
   identity under volume** — ten invoices at 375px keep number, status,
   amount and action readable without lateral scroll (the preserved admin
   baseline is the measured failure: overflow true, responsive-edge 1/5);
   **destructive actions** — audit trail + recovery path before shipping.
   Success measurable when the action confirms explicitly, the record's new
   state is visible in place, role gates are visible, mobile essentials pass
   the hardening matrix (T0551), and destructive actions are auditable (G3).
4. **Portfolio** (entry: work index/external link). Questions: is the work
   scannable without opening everything; does each case state role and
   outcome, not only images. Success measurable when every project is
   reachable from one index view and each case pairs evidence with
   context — judged on the G9 semantics checks (single h1, heading ladder,
   landmarks) plus the distinctiveness-pov rubric axis for the case
   narrative.

## Heuristic evaluation — run per ACCEPTED section

A finding states what you looked at plus concrete evidence (E2 kinds),
never "could be better". Axis tags are T0151 rubric axes — the checklist
below natively tags seven axes; the remaining five tag through these
mappings: typography and color-surface findings come from the consistency
and minimalist checks when the drift is typographic or chromatic;
responsive-edge from the flexibility check measured against the hardening
matrix (T0551); performance from the minimalist check's density budget;
distinctiveness-pov from the consistency check's differentiation review.
Findings outside these mappings stay untagged, never forced.

1. **Visibility of status** (motion-interaction): async/save/delete give
   pending/done/error feedback. Finding: a result the user must infer.
2. **Match with the real world** (content-copy): user vocabulary, not
   data-model jargon, used consistently. Finding: a label only the schema
   could explain.
3. **User control** (motion-interaction): undo/cancel/escape exist for
   committing actions. Finding: a flow whose only exit is browser back.
4. **Consistency** (consistency-system): one action = one control, wording
   and placement across sections. Finding: two patterns for one job.
5. **Error prevention** (accessibility, content-copy): destructive actions
   confirm; constraints surface before submit. Finding: an irreversible-
   in-practice action with no protection.
6. **Recognition over recall** (hierarchy): labels and icons visible where
   the decision happens. Finding: a step requiring memory of a previous
   screen.
7. **Flexibility** (motion-interaction): a keyboard path exists; repeated
   tasks have shortcuts. Finding: a mouse-only loop.
8. **Aesthetic minimalism** (composition, spacing-rhythm): every element
   has a job (colour module rule 1); whitespace earns hierarchy. Finding:
   decoration with no information role.
9. **Error recovery** (content-copy): errors say what happened, the
   smallest fix, and keep the user's input (F18 spirit). Finding: "An
   error occurred" with nothing else.
10. **Help & documentation** (content-copy): task-oriented, contextual,
    searchable; answers the flow's actual question. Finding: prose where a
    state or affordance belongs.

Context: no-skill baselines scored 25-31/55 with 2 of 4 surfaces failing
the G4 contrast gate (sus-baseline-floor) — the defect class this review
exists to catch. Scanner rules catch the deterministic subset
(scanner-precision-corpus: precision/recall 1.0 on the labelled corpus);
heuristics cover what no scanner can.

## Navigation & IA — decide in this order

1. **Model follows the task, and includes mobile:** top-nav when few (~7
   or fewer) sibling destinations are browsed on arrival; sidebar when
   many parallel sections need persistent within-section context (operate
   surfaces); hybrid when global and section-local navigation are both
   real. The model decision states its collapse/off-canvas behaviour at
   narrow widths — the fixed 14rem sidebar that ignores mobile is the
   negative pattern (issue #10: admin baseline, horizontal overflow true,
   responsive-edge 1/5).
2. **Depth vs breadth:** prefer breadth users scan over depth they must
   count; a level earns its click by naming a destination in one label; a
   level that only re-lists children is flattened. (Prior-grade
   convention — not a measured claim.)
3. **URL/heading alignment:** one section = one address + one h1 (G9);
   the heading ladder mirrors nav depth; breadcrumbs only where depth
   exceeds two levels.
4. **Search vs browse:** browse when the taxonomy is stable and users can
   classify items; search when the corpus is large, volatile or
   unclassifiable; both when lists exceed a screen and lack fixed order.
   Search is a safety net, never the fix for a broken taxonomy.

## Onboarding — first-run checklists

1. **Progress is stated, not implied:** steps done/remaining visible at
   all times; no silent stage changes.
2. **Skippable:** every guided step has an explicit skip that records
   state and can be re-entered later; skipping is not silent
   feature-hiding.
3. **States designed:** not-started / in-progress / done / skipped are
   each rendered deliberately (G3).
4. **Checklist items are tasks**, verifiable in the product — not
   marketing copy.

## Status — what this module is and is not

Heuristic evaluation is structured expert review. It complements — never
replaces — measured gates (G4 a11y floor, G9 semantics), rubric scoring
(T0151) and user testing; findings stay expert-guidance claims (E2) until
a gate or test measures them. Outcome numbers for SUS flows (conversion,
task time): no measured claim yet.

## What NOT to do (banned defaults these rules resist)

- Generic AI dashboard: KPI tiles padding a grid with no named top task
  and no information density.
- Cookie-cutter three-column footer dropped onto any site regardless of
  its IA.
- Hero-with-three-feature-cards skeletons (E1 bans them as product
  behaviour).
- Sidebar-for-everything: the fixed 14rem admin sidebar ignoring mobile
  (issue #10).
- A modal tour "step N of 9" blocking the product it explains.
- A search box standing in for a working taxonomy.
- "Success!" screens with no state change and no next action.
