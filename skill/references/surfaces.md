# Surface modes — what exists, honestly

SUS covers four web surface modes. A playbook is listed here **only because the file
exists** in `references/playbooks/`; this page never names guidance that does not exist (G3).

Status as of 2026-11-16: **36 playbooks**, all validated by `pnpm playbooks` (schema) and
`pnpm parts` (the twelve-part standard). Fourteen are surface-agnostic and apply everywhere.

| Surface | Built playbooks | Notes |
|---|---|---|
| Marketing | `hero`, `pricing-table` + all 14 shared | persuasion surfaces lean on the shared set; no dedicated landing-page-assembly playbook exists |
| Commerce | `product-grid`, `pdp`, `cart-summary`, `checkout-steps` + shared | `checkout-steps` carries the payment-state and duplicate-submit checklists |
| Operate (CMS/CRM admin) | `data-table`, `record-forms`, `onboarding`, `search-filters`, `settings`, `dashboard-widgets`, `command-palette`, `date-picker`, `file-upload`, `pagination`, `tabs`, `drawer`, `dropdown`, `skeleton`, `progress` + shared | the densest set; data-dense screens need the viewport care in `foundations-layout-responsive` |
| Portfolio / docs | `gallery-case-study`, `article-layout` + shared | outcome claims in a case study are held to the same honesty rules as the product's |

Shared (any surface): `navbar`, `footer`, `card`, `button-cta`, `form-input-validation`,
`modal-dialog`, `toast-notification`, `empty-loading-error`, `accordion`, `avatar`, `badge`,
`breadcrumb`, `tooltip`.

## What is still missing

- No playbook covers a full landing-page assembly, a pricing *comparison* page beyond the
  table itself, or a multi-step wizard outside checkout.
- Non-JS stacks (WordPress, Rails views) have no Live Studio path; they are audit-only.
- Deterministic tooling is **not** in this bundle: `scripts/` ships empty by design. The
  anti-slop scanner, the playbook validators and the gate checks are repository tools
  (`packages/scanners`, `scripts/`), run from there.

## Why the twelve parts matter

Each playbook carries intent, inputs, anatomy, states, motion with a reduced alternative,
accessibility, responsive rules, failure cases and graded references. The contract that
actually breaks in production is the part a template omits — focus return and roving focus
(tabs, drawer, dropdown), state in the URL (pagination, tabs, accordion), unsaved-work guards
(drawer), destructive separation (dropdown), hierarchy over history (breadcrumb), meaning that
survives colour blindness (avatar presence, badge status), per-file upload states with
resumable retry, and a date picker that stores calendar dates and instants distinctly so
nothing shifts by a day.