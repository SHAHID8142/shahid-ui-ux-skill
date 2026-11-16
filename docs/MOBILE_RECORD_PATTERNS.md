# Mobile record patterns: when a table, a card, or a disclosure is right

Written for owner issue #10. It records the decision the fixture makes and the reasoning, so the
choice can be argued with rather than guessed at from the code.

## The question

A repeated record — an invoice, an order, a user, a CMS entry, a ticket — has a desktop table
form and some narrow form. "Make it responsive" is not an instruction; the instruction is which
narrow form, and why.

## Decision rule

Ask what the reader is doing with the records, not what the data looks like.

| The task is… | Narrow pattern | Why |
| --- | --- | --- |
| Reading one record at a time (open it, change its status, chase a payment) | **Card / stacked record** | The reader never needs two records side by side, so a column that forces comparison costs horizontal panning and buys nothing |
| Comparing a quantitative field across many records (spend per supplier, ageing buckets) | **Table with a contained scroll region**, sticky first column, visible scroll cue | The comparison *is* the task; stacking destroys it. WCAG 2.2 Reflow (1.4.10) allows this for genuinely two-dimensional data, and the scroll must stay inside the grid, never the page |
| Checking one field of many records, then acting on a few (triage lists) | **Disclosure rows**: identity + the one field visible, the rest behind an expander | Keeps density without hiding what the decision needs, and keeps the action reachable without panning |
| Scanning for exceptions (overdue, blocked, failed) | **Card list, exceptions promoted** | The list exists to surface the exception; the exception therefore leads, and the rest is secondary text |

Two rules that apply to all four:

1. **One DOM.** Reflow in CSS from the same markup, or pick one pattern for all widths. Rendering
   two copies of every record and hiding one is a duplicate-presentation problem: two of the same
   action, and a screen reader that meets the record twice.
2. **Never `overflow-x: hidden` on the page to conceal a layout that does not fit.** The overflow
   is the symptom; hiding it moves the breakage out of sight and into the reader's hands.

## What this repository does

`fixtures/admin` carries two record lists, both with the rule above applied:

| List | Records | Narrow pattern | Evidence |
| --- | --- | --- | --- |
| Content queue (`#content-queue`) | 4 CMS entries | Card, six fields, self-labelled | `packages/eval-core/tests/admin-responsive.test.ts` |
| Invoices (`#invoice-list`) | 12 invoices with amounts, statuses, dates, paging | Card, six fields, self-labelled; filters, sorting and page in the URL | `packages/eval-core/tests/admin-invoice-states.test.ts` |

Both are tables above 768px and card lists below 640px, from one set of markup. Between 640 and
768px the table is still a table: at that width six columns fit without panning, and switching
earlier would lose the desktop comparison for no gain.

Field order in the card is the column order, because a reader who moves between a desktop and a
phone should not have to re-learn the record. Labels come from `data-label` on each cell and are
painted by `td::before` in the narrow layout only, so the desktop table does not repeat its header
in every cell.

## What is measured, and what is not

Measured (`pnpm verify` runs both suites):

- document overflow at 320/390/768/1440 CSS px, and no `overflow-x: hidden` anywhere;
- the layout the browser actually chose at each width (`block` vs `table-row`);
- the five or six labels each card prints, in header order;
- a readable cell width below the threshold (≥128px), so "it reflows" cannot mean "it is squeezed";
- long unbroken identifiers (`INV-2026-11-000431-NORTHWIND-REGIONAL-DISTRIBUTION`, 47 characters)
  and 200% text size;
- the negative control: forcing the pre-fix desktop layout back on at 390px must overflow.

Not measured, and therefore not claimed:

- a real screen-reader session (structure and names are checked; a session is not);
- browser zoom as a user-agent setting — headless Chromium cannot drive it, so 200% *text* size
  stands in and is labelled as such. The 400% zoom *equivalence* (320x256 CSS px at device scale
  factor 4) is measured by the hardening matrix's `zoom400` record, a separate measurement from
  the 320x568 phone column;
- real translated strings: labels are pseudo-localised by lengthening them ~30%, which tests
  wrapping, not translation quality;
- record volume beyond twelve rows.
