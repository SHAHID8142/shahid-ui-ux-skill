# Foundations: heuristics, flows & IA (T0402b)

Decision procedures for primary flows, heuristic review, navigation/IA and
onboarding. The checklist adapts Nielsen's ten usability heuristics — expert
guidance (E2), applied with SUS judgement, never presented as measured
evidence. Provenance-catalog claims cited here: sus-baseline-floor,
scanner-precision-corpus; where no claim exists, this module says so.

## Primary flows — decide in this order

One primary flow per surface, defined by questions before screens exist
(E1); record the answers in the direction thesis. Entry → task → success.

1. **Marketing.** Entry: referral/landing. Ask: what must a first-time
   visitor understand in one pass to judge fit; which single next action is
   primary; which objection is answered before it blocks. Success is
   measurable when the primary action sits at the stated scroll depth, one
   h1 names the offer (G9), and the page has no dead end.
2. **Commerce.** Entry: category/search/product. Ask: can the buyer compare
   within one context; is total cost visible before commitment; is
   hesitation missing info or wrong order. Success is measurable when
   price, availability and the next step are co-present at the decision
   point and cart/checkout transitions are designed states, not surprises.
3. **Operate (CMS/CRM admin).** Entry: dashboard/list. Ask: what is the top
   recurring task; single vs bulk; where do people land mid-task from
   notifications. Success is measurable when the action completes with an
   explicit confirmation and the record's new state is visible from where
   the user is; empty/error states are designed (G3).
4. **Portfolio.** Entry: work index/external link. Ask: is the work
   scannable without opening everything; does each case state role and
   outcome, not only images. Success is measurable when every project is
   reachable from one index view and each case pairs evidence with context.

## Heuristic evaluation — run per ACCEPTED section

Apply all ten checks to every section that enters ACCEPTED state; a finding
states what you looked at plus concrete evidence (E2 kinds), never "could be
better".

1. **Visibility of status** (T0151 axis: motion-interaction): every async,
   save and delete has pending/done/error feedback. Finding: an operation
   whose result the user must infer.
2. **Match with the real world** (content-copy): user vocabulary, not
   data-model jargon, used consistently. Finding: a label only the schema
   could explain.
3. **User control** (motion-interaction): undo/cancel/escape exist for
   committing actions; nothing traps the user. Finding: a flow whose only
   exit is browser back.
4. **Consistency** (consistency-system): one action = one control, wording
   and placement across sections. Finding: two patterns for one job.
5. **Error prevention** (accessibility, content-copy): destructive actions
   confirm; constraints surface before submit, not after. Finding: an
   irreversible-in-practice action with no protection.
6. **Recognition over recall** (hierarchy): labels and icons visible where
   the decision happens. Finding: a step requiring memory of a previous
   screen.
7. **Flexibility** (motion-interaction): a keyboard path exists; repeated
   tasks have shortcuts. Finding: a mouse-only loop.
8. **Aesthetic minimalism** (composition, spacing-rhythm): every element
   has a job (colour module rule 1); whitespace earns hierarchy, not
   padding. Finding: decoration with no information role.
9. **Error recovery** (content-copy): errors say what happened, the
   smallest fix, and keep the user's input (F18 spirit). Finding: "An error
   occurred" with nothing else.
10. **Help & documentation** (content-copy): task-oriented, contextual,
    searchable; help answers the flow's actual question. Finding: prose
    where a state or affordance belongs.

Context: the no-skill baselines scored 25-31/55 with 2 of 4 surfaces
failing the G4 contrast gate (sus-baseline-floor) — the defect class this
review and the gates exist to catch. Blocking scanner rules already catch
the deterministic subset (scanner-precision-corpus: precision 1.0, recall
1.0 on the labelled corpus); heuristics cover what no scanner can.

## Navigation & IA — decide in this order

1. **Model follows the task, and includes mobile:** top-nav when few
   (~7 or fewer) sibling destinations are browsed on arrival; sidebar when
   many parallel sections need persistent within-section context (operate
   surfaces); hybrid when global and section-local navigation are both
   real. The model decision states its collapse/off-canvas behaviour at
   narrow widths — the fixed 14rem sidebar that ignores mobile is the
   negative pattern (issue #10: admin baseline, horizontal overflow true,
   responsive-edge 1/5).
2. **Depth vs breadth:** prefer breadth users scan over depth they must
   count; a level earns its click by naming a destination in one label; a
   level that only re-lists children gets flattened. (Prior-grade
   convention — not a measured claim.)
3. **URL/heading alignment:** one section = one address + one h1 (G9); the
   heading ladder mirrors nav depth; breadcrumbs only where depth exceeds
   two levels.
4. **Search vs browse:** browse when the taxonomy is stable and users can
   classify items; search when the corpus is large, volatile or
   unclassifiable; both when lists exceed a screen and lack fixed order.
   Search is a safety net, never the fix for a broken taxonomy.

## Onboarding — first-run checklists

1. **Progress is stated, not implied:** steps done/remaining visible at all
   times; no silent stage changes.
2. **Skippable:** every guided step has an explicit skip that records state
   and can be re-entered later; skipping is not silent feature-hiding.
3. **States designed:** not-started / in-progress / done / skipped are each
   rendered deliberately (G3).
4. **Checklist items are tasks**, verifiable in the product — not marketing
   copy.

## Status — what this module is and is not

Heuristic evaluation is structured expert review. It complements — never
replaces — measured gates (G4 a11y floor, G9 semantics), rubric scoring
(T0151) and user testing; its findings stay expert-guidance claims (E2)
until a gate or a test measures them. Outcome numbers for SUS flows
(conversion, task time): no measured claim yet.

## What NOT to do (banned defaults these rules resist)

- Generic AI dashboard: KPI tiles padding a grid with no named top task and
  no information density.
- Cookie-cutter three-column footer dropped onto any site regardless of its
  IA.
- Hero-with-three-feature-cards skeletons (E1 bans them as product
  behaviour).
- Sidebar-for-everything: the fixed 14rem admin sidebar ignoring mobile
  (issue #10).
- A modal tour "step N of 9" blocking the product it explains.
- A search box standing in for a working taxonomy.
- "Success!" screens with no state change and no next action.
