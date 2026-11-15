# Surface modes — what exists so far (honest status)

SUS covers four web surface modes. Playbooks land here **only when built**;
this file never names guidance that does not exist (G3).

| Surface | Status (2026-11-14) |
|---|---|
| Marketing | evaluation corpus + briefs exist; batch-1 playbooks built (navbar, hero, button-cta, form-input-validation, card, pricing-table, footer, empty-loading-error, modal-dialog, toast-notification); commerce playbooks are T0405c |
| Commerce | evaluation corpus exists; batch-1 shared playbooks plus commerce playbooks (product grid, PDP, cart summary, checkout steps with payment-state and duplicate-submit checklists) are built |
| Operate (CMS/CRM admin) | evaluation corpus exists; batch-1 shared playbooks plus data table (sort/filter/pagination, table-to-card reflow), record forms, onboarding (skippable, resumable, failure-preserving), and the second-wave operate set: search/filters (URL state, reflow continuity, long ids, translated labels), settings (dirty/save/error, permission gating), dashboard widgets (independent failure, reserved height, keyboard reorder) |
| Portfolio + docs | evaluation corpus exists; shared batch-1 playbooks apply; second-wave additions: gallery/case-study (artifact-first grid, honest outcome claims, focus-restoring dialog) and article layout (65–75 character measure, current-section contents, internally scrolling code) |

Deterministic tooling available now: rubric scoring, capture harness, axe +
Lighthouse gates, evidence-bundle validation, anti-slop scanner (from M3),
all via the SUS CLI (skill/scripts/).
