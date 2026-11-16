# Playbook coverage — what is measured, what is not

> Generated from `skill/references/playbooks/*.json` and `DOGFOOD_CHECKS` by
> `scripts/playbooks/coverage.mjs`. Do not edit by hand; `pnpm coverage:check` fails when this
> page and `evals/playbook-coverage.json` drift from source.

**36** playbooks, **187** rules,
**3** rules with a check, **184** named gaps;
**33** playbooks have no check at all.

A rule is measured only when a check names it (`<playbook>.<rule>`). JSON validity, prose
acceptance and "looks right in a screenshot" are not measurements and are not counted here.

| Playbook | Surface | Rules | Measured | Status | Gaps |
| --- | --- | --- | --- | --- | --- |
| `accordion` | any | 5 | 1 | partial | `accordion-single-vs-multi`, `accordion-heading-semantics`, `accordion-open-state`, `accordion-not-a-hider` |
| `article-layout` | any | 6 | 0 | not-run | `article-measure`, `article-toc-tracks`, `article-wide-content`, `article-links-stable`, `article-progress-quiet`, `article-print` |
| `avatar` | any | 5 | 0 | not-run | `avatar-always-has-a-name`, `avatar-fallback-initials`, `avatar-presence-text`, `avatar-size-ladder`, `avatar-stack-counts` |
| `badge` | any | 5 | 0 | not-run | `badge-three-jobs`, `badge-announce-once`, `badge-count-caps`, `badge-not-colour-only`, `badge-restraint` |
| `breadcrumb` | any | 5 | 0 | not-run | `breadcrumb-hierarchy-not-history`, `breadcrumb-collapse-middle`, `breadcrumb-current-is-text`, `breadcrumb-mobile`, `breadcrumb-or-nothing` |
| `button-cta` | any | 5 | 0 | not-run | `btn-role-first`, `btn-variant-intent`, `btn-loading-label`, `btn-double-submit`, `btn-motion-decided` |
| `card` | any | 4 | 0 | not-run | `card-one-target`, `card-scan-anchor`, `card-media-ratio`, `card-hover-not-only` |
| `cart-summary` | commerce | 4 | 0 | not-run | `cart-final-vs-estimate`, `cart-quantity-truth`, `cart-removal-undo`, `cart-checkout-consistent` |
| `checkout-steps` | commerce | 5 | 0 | not-run | `checkout-step-prerequisites`, `checkout-payment-states`, `checkout-duplicate-submit`, `checkout-failure-preserves`, `checkout-no-timer-pressure` |
| `command-palette` | operate | 6 | 0 | not-run | `palette-actions-not-a-menu`, `palette-ranking`, `palette-focus-contract`, `palette-stale-results`, `palette-destructive`, `palette-explains-itself` |
| `dashboard-widgets` | operate | 6 | 0 | not-run | `dash-widget-earns-space`, `dash-independent-failure`, `dash-no-layout-shift`, `dash-keyboard-reorder`, `dash-zero-is-a-value`, `dash-refresh-announced` |
| `data-table` | operate | 7 | 0 | not-run | `table-column-decisions`, `table-state-in-url`, `table-state-announced`, `table-empty-two-kinds`, `table-error-keeps-state`, `table-content-adaptive`, `table-row-target` |
| `date-picker` | operate | 5 | 0 | not-run | `date-picker-mode-first`, `date-picker-typed-entry`, `date-picker-grid-keys`, `date-picker-refuses-with-reason`, `date-picker-timezone` |
| `drawer` | operate | 5 | 0 | not-run | `drawer-modal-or-not`, `drawer-focus-contract`, `drawer-guard-dismiss`, `drawer-viewport`, `drawer-scope` |
| `dropdown` | operate | 5 | 0 | not-run | `dropdown-menu-vs-select`, `dropdown-keyboard-contract`, `dropdown-placement`, `dropdown-destructive`, `dropdown-async` |
| `empty-loading-error` | any | 4 | 0 | not-run | `state-reachability`, `empty-offers-action`, `loading-shape-matches`, `error-names-cause` |
| `file-upload` | operate | 6 | 0 | not-run | `upload-constraints-stated-and-enforced`, `upload-per-file-state`, `upload-retry-is-resumable`, `upload-cancel-is-explicit`, `upload-keyboard-and-paste`, `upload-name-and-size-matter` |
| `footer` | any | 3 | 0 | not-run | `footer-grouping`, `footer-legal-presence`, `footer-landmark` |
| `form-input-validation` | any | 5 | 0 | not-run | `form-minimum-fields`, `form-persistent-label`, `input-validation-timing`, `input-error-wording`, `input-error-announced` |
| `gallery-case-study` | portfolio | 6 | 0 | not-run | `gallery-artifact-first`, `gallery-grid-rhythm`, `gallery-lightbox-honest`, `gallery-claims-honest`, `gallery-weight-budget`, `gallery-alt-text-decides` |
| `hero` | marketing | 5 | 0 | not-run | `hero-one-claim`, `hero-thesis-trace`, `hero-fold-budget`, `hero-evidence-adjacent`, `hero-baseline-floor` |
| `modal-dialog` | any | 4 | 0 | not-run | `modal-necessity`, `modal-focus-contract`, `modal-dismissal`, `modal-motion-kept` |
| `navbar` | any | 5 | 0 | not-run | `nav-primary-action`, `nav-density`, `nav-overflow-keyboard`, `nav-current-not-colour`, `nav-baseline-floor` |
| `onboarding` | operate | 6 | 0 | not-run | `onboarding-outcome-first`, `onboarding-skippable`, `onboarding-resumable`, `onboarding-failure-keeps-progress`, `onboarding-ends-in-the-product`, `onboarding-progress-announced` |
| `pagination` | operate | 5 | 0 | not-run | `pagination-page-not-stream`, `pagination-states-the-range`, `pagination-scales`, `pagination-url-and-focus`, `pagination-emptied-page` |
| `pdp` | commerce | 5 | 0 | not-run | `pdp-single-decision`, `pdp-variant-truth`, `pdp-availability-wording`, `pdp-double-submit`, `pdp-feedback-inline` |
| `pricing-table` | marketing | 4 | 0 | not-run | `price-diff-decisions`, `price-default-marked`, `price-stated-exactly`, `price-mobile-order` |
| `product-grid` | commerce | 5 | 0 | not-run | `grid-comparable-attributes`, `grid-fixed-ratio`, `grid-weight-budget`, `grid-partial-data`, `grid-filter-announcement` |
| `progress` | operate | 5 | 0 | not-run | `progress-determinate-honesty`, `progress-aria`, `progress-completion-is-not-success`, `progress-cancellable`, `progress-escapes-to-background` |
| `record-forms` | operate | 7 | 0 | not-run | `record-minimum-fields`, `record-save-model`, `record-conflict-stated`, `record-destructive-recoverable`, `record-double-submit`, `record-error-preserves-input`, `record-mobile-editing` |
| `search-filters` | operate | 8 | 1 | partial | `filters-earn-their-place`, `filters-state-in-url`, `filters-debounce-cancels`, `filters-announce-count`, `filters-long-ids`, `filters-two-empties`, `filters-error-keeps-state` |
| `settings` | operate | 6 | 0 | not-run | `settings-permission-not-hiding`, `settings-dirty-is-visible`, `settings-save-idempotent`, `settings-apply-timing`, `settings-error-keeps-edits`, `settings-destructive-separated` |
| `skeleton` | operate | 5 | 0 | not-run | `skeleton-only-when-shape-is-known`, `skeleton-reserves-geometry`, `skeleton-timeout`, `skeleton-hands-over`, `skeleton-motion-honesty` |
| `tabs` | operate | 5 | 1 | partial | `tabs-not-navigation`, `tabs-deep-link`, `tabs-panel-states`, `tabs-count-limit` |
| `toast-notification` | any | 5 | 0 | not-run | `toast-only-transient`, `toast-live-region`, `toast-persist-errors`, `toast-placement`, `toast-motion-kept` |
| `tooltip` | any | 5 | 0 | not-run | `tooltip-not-for-essential-labels`, `tooltip-focus-and-touch`, `tooltip-describedby`, `tooltip-placement`, `tooltip-not-a-popover` |

## What this record is not

- Not a claim that a measured rule is satisfied in an adopting project: the checks run against
  the repository fixtures, not the user's page.
- Not evidence of screen-reader behaviour, real browser zoom or RTL: those stay `not-run` and
  belong to the owner/auditor per T1003.
- Not exhaustive: a rule with no check is listed as a gap rather than argued away.
