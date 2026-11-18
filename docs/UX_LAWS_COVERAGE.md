# UX laws & Gestalt principles — SUS coverage matrix

Generated view of `evals/research/ux-laws/catalog.json` (the catalog is the source of truth).
Owner request: issue #31 (2026-11-19). **This matrix maps and decides; it does not claim new
measured capabilities.** Every integration decision below is `queued-*` or `not-applicable` until
a playbook rule or evaluator actually lands, and each reason says what is missing.

| law | kind | evidence | in SUS? (artifact · attribution) | decision |
| --- | --- | --- | --- | --- |
### The owner's ten named laws

| Jakob's Law | effect | popular-heuristic-with-real-basis | `playbooks/onboarding.json` partial; `playbooks/navbar.json` partial; `foundations-heuristics-ia.md` partial | queued-integration |
| Hick's / Hick–Hyman Law | empirical-law | replicated-with-boundaries | `playbooks/search-filters.json` none; `playbooks/dropdown.json` none | queued-research |
| Miller's Law / chunking | contested-claim | contested | `playbooks/data-table.json` none; `playbooks/record-forms.json` partial | queued-research |
| Gestalt Law of Similarity | perceptual-principle | strong-empirical | `playbooks/card.json` partial; `playbooks/product-grid.json` partial | queued-integration |
| Gestalt Law of Common Region | perceptual-principle | strong-empirical | `playbooks/settings.json` partial; `playbooks/dashboard-widgets.json` partial | queued-integration |
| Gestalt Law of Continuity / Good Continuation | perceptual-principle | strong-empirical | `playbooks/breadcrumb.json` none; `playbooks/stepper-style-flows` none | queued-research |
| Von Restorff / Isolation Effect | effect | replicated-with-boundaries | `playbooks/button-cta.json` partial; `playbooks/badge.json` none | queued-integration |
| Serial Position Effect | effect | replicated-with-boundaries | `playbooks/navbar.json` none; `playbooks/pricing-table.json` none | queued-research |
| Fitts's Law | empirical-law | strong-empirical | `foundations-layout-responsive.md` partial; `playbooks/data-table.json` partial | queued-integration |
| Gestalt Law of Proximity | perceptual-principle | strong-empirical | `playbooks/form-input-validation.json` partial; `foundations-layout-responsive.md` partial | queued-integration |

### Additional candidates, triaged

| Doherty Threshold | empirical-guideline | replicated-with-boundaries | `playbooks/progress.json` partial; `playbooks/skeleton.json` partial; `motion-interruption.md` partial | queued-research |
| Steering Law | empirical-law | strong-empirical | — | not-applicable |
| Goal-Gradient Effect | effect | replicated-with-boundaries | `playbooks/checkout-steps.json` partial; `playbooks/progress.json` partial | queued-integration |
| Peak–End Rule | effect | replicated-with-boundaries | `playbooks/empty-loading-error.json` none; `playbooks/toast-notification.json` none | queued-research |
| Zeigarnik Effect | effect | mixed-replication | `playbooks/onboarding.json` none | queued-research |
| Aesthetic–Usability Effect | effect | replicated-with-boundaries | `art-direction.md` partial | queued-research |
| Cognitive Load Theory | model | strong-empirical | `foundations-heuristics-ia.md` partial | queued-research |
| Chunking (as design practice) | heuristic | popular-heuristic | `playbooks/record-forms.json` partial | queued-integration |
| Mental Models | concept | popular-heuristic | `foundations-heuristics-ia.md` partial | queued-integration |
| Selective Attention / banner blindness | effect | replicated-with-boundaries | `playbooks/toast-notification.json` none | queued-research |
| Tesler's Law (conservation of complexity) | heuristic | popular-heuristic | `playbooks/settings.json` partial | queued-integration |
| Occam's Razor | principle | popular-heuristic | `precedence.md` none | not-applicable |
| Gestalt Law of Closure | perceptual-principle | strong-empirical | `playbooks/avatar.json` none | not-applicable |
| Gestalt Figure–Ground | perceptual-principle | strong-empirical | `playbooks/modal-dialog.json` partial; `playbooks/drawer.json` partial | queued-integration |
| Prägnanz (Good Form) | perceptual-principle | strong-empirical | `foundations-color-typography.md` none | not-applicable |
| Uniform Connectedness | perceptual-principle | strong-empirical | `playbooks/tabs.json` partial | queued-integration |
| Gestalt Common Fate | perceptual-principle | strong-empirical | `motion-interruption.md` none | queued-research |
| Paradox of the Active User | empirical-observation | replicated-with-boundaries | `playbooks/onboarding.json` none | queued-research |
| Postel's Law (Robustness Principle) | contested-principle | contested | — | not-applicable |
| Pareto Principle (80/20) | heuristic | popular-heuristic | `playbooks/product-grid.json` none | queued-research |
| Parkinson's Law | adage | contested | — | not-applicable |
| Flow (Csikszentmihalyi) | model | strong-empirical-as-model | `motion-interruption.md` partial | queued-research |

## What integration would mean (honest terms)

- `queued-integration` = an attribution line on guidance that already exists, or an E2 expert-review
  question — no new measurable capability is claimed.
- `queued-research` = a decision needs an instrument SUS does not have, or the evidence record is
  mixed — the research question is named in the catalog's reason.
- `not-applicable` = recorded so the rejection is visible, with the criticism stated (e.g. Postel's
  Law conflicts with the strict validation the form playbooks enforce).
- No law is claimed as `measured` anywhere: gates and scanners measure what they measure
  (`docs/GATE_REGISTRY.json` is the only verdict vocabulary this repo trusts).

## Where the gaps are (the honest summary)

- Explicitly traced as named decisions today: **none** — SUS operationalizes several laws
  implicitly (44px targets = Fitts; one primary action = Von Restorff; grouped forms = proximity /
  common region) but attributes none of them.
- The Nielsen-heuristic layer (E2 expert review) is the natural integration surface: attribution
  lines plus per-law review questions, decided one at a time under the repo's
  one-section-at-a-time approval rule.
- Playbook-level checks for Gestalt grouping are plausible from geometry the capture matrix
  already measures, but none is promised before #20's coverage work names the instrument.
