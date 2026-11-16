# Compatibility: GoogleChrome/modern-web-guidance as a SUS reference source

Pin: `4dd968349e54ca45a05dd5c818fb035c9054b022` (v1.0.0, 2026-11-10), Apache-2.0.
Record: [pin.json](pin.json). Contract: [docs/RESEARCH_SOURCES.md](../../../docs/RESEARCH_SOURCES.md).

## What this document is based on

**Nothing in this file was written from upstream guide text.** The four guide paths below are the
ones named in issue #14; the descriptions of what a guide *probably* covers come from its filename
and from the triage summary in that issue.

The pin itself is now measured rather than assumed: on 2026-11-16
`scripts/research/verify-pin.mjs` fetched the licence and all four guides at the pinned revision,
twice by different transports, and recorded a digest for each. That is a statement about **which
bytes exist**. It is not a statement that anyone read them: no passage is quoted anywhere in this
repository, no claim about a guide's contents is made here, and no guide is described as "read".

Consequence for planning, in two parts:

- **The provider can now serve this pin.** With a loader that returns the pinned bytes it produces a
  hit, still typed `trusted: false`. A loader that returns anything else is rejected, exactly as it
  was before — verification belongs to the pin, not to a transport.
- **A pilot may still not cite upstream text.** A digest makes a citation checkable once someone has
  read the passage and written it; it does not produce the citation. Reading a guide is a content
  review under docs/RESEARCH_SOURCES.md §4 step 4, and it has not happened.

---

## 1. Four candidate pilots

Chosen because each has a **measurable** outcome in infrastructure SUS already runs, and because
each has an obvious negative case (issue #14 requires negative/fallback fixtures, not only passes).

| # | Pilot | Starting fixture | Measured before/after | Negative / fallback case |
| --- | --- | --- | --- | --- |
| 1 | **CMS responsive records** — narrow-layout record cards | `fixtures/admin` content queue + invoice list, issue #10 | document overflow at 320/390/768/1440; chosen layout (`block` vs `table-row`); cell width ≥128px; axe serious/critical; the label-order assertion in `fixtures/admin/tests/responsive-contract.test.tsx` | force the desktop table at 390px and require overflow (the existing negative control); plus the AT reading-order check in §2 below |
| 2 | **Navigation drawer** — focus contract, dismissal, motion | `skill/references/playbooks/drawer.json` rules `drawer-focus-contract`, `drawer-guard-dismiss`, `drawer-viewport`, `drawer-scope` | focus trap and focus return; Escape / outside-press dismissal; reduced-motion parity (G6); target size (G8); axe | drawer with JS disabled — must stay closed and the navigation must remain reachable |
| 3 | **INP causes** — attribution of slow interactions | G5 budget harness (`docs/GATE_REGISTRY.json`: "TBT is the INP lab proxy") | TBT and long-task attribution on a scripted interaction; whether a cause can be named reproducibly in this harness | a deliberately heavy handler, so the measurement must show the regression rather than a flat line |
| 4 | **Form UX** — labels, validation timing, error announcement | `skill/references/playbooks/form-input-validation.json` (`form-persistent-label`, `input-validation-timing`, `input-error-wording`, `input-error-announced`) and `record-forms.json` | axe on the form; error text present and announced; focus moves to the first invalid field; input preserved on error | submit with JavaScript blocked, and a server-side error path |

Pilot 1 is the highest-value one and the only one with a known risk already in the codebase (§2).
Pilots 2–4 are ordered by how cheaply they can be made repeatable.

**Rules that apply to all four.** Identical fixture, tools and constraints with and without the
provider; no edits to `evals/baselines/` (the intentionally negative no-skill baseline is the
control); an inconclusive or negative result is recorded as such; no "better/faster" claim without
a same-run measurement.

## 2. Mobile CMS/CRM: the pseudo-label problem (highest risk)

SUS already ships a stacked-record pattern, and it is *close to* what a responsive-table guide is
likely to recommend. That closeness is exactly why this needs care rather than a rewrite.

**What SUS does today.** One `<table>`; each body cell repeats its column name in `data-label`
(`fixtures/admin/app/page.tsx:113-119`, `fixtures/admin/app/invoice-list.tsx:238-247`); the narrow
layout paints that label with generated content —
`content: attr(data-label)` at `fixtures/admin/app/globals.css:470-472`. The `<thead>` stays in the
accessibility tree (shrunk with `inline-size: 1px`, not `display: none`), so it is not deleted from
the a11y tree. `docs/MOBILE_RECORD_PATTERNS.md:45-46` describes the same trade-off: labels appear
in the narrow layout only, so the desktop table does not repeat its header in every cell.

**The risk, stated plainly.** CSS-generated content is **not a guaranteed accessible header
association**. It is rendered by the browser for sighted users; whether it reaches the accessibility
tree, and where it sits in reading order relative to the cell's value, varies by browser and by
assistive-technology combination, and it can be suppressed entirely (for example when generated
content is disabled). A table whose cells are unlinked from their headers and whose labels exist
only as `::before` text can therefore read as five unlabelled values in some real sessions even
while every automated check passes. `docs/MOBILE_RECORD_PATTERNS.md` already admits the honest gap:
a real screen-reader session is **not measured** — structure and names are checked, a session is
not.

**Therefore:**

1. The current pattern is **not** to be described as proven accessible, here or in any report. It
   passes the structural checks SUS runs; that is a narrower statement.
2. A pilot on this pattern must validate **real AT reading order**, not only `data-label` presence.
   Concretely: a keyboard + screen-reader pass over one record at 390px, recording what is announced
   for each value and whether the column name precedes it. This repository has no automated AT
   harness, so the result is a documented **manual session** with browser, AT, version and outcome —
   or it is recorded as not-run. It must not be reported as passing because axe was clean: axe does
   not evaluate reading order of generated content.
3. If the session shows the header association is missing, the fix is structural (real header
   association kept, or the label as text in the DOM), and it will cost DOM weight the current
   pattern avoids. That trade-off is the pilot's actual decision, and it must be recorded with the
   session evidence.
4. Any change must keep `fixtures/admin/tests/responsive-contract.test.tsx:24-39` meaningful:
   removing `data-label` or `content: attr(data-label)` without replacing the association would
   leave that test asserting a pattern nobody uses.
5. Do **not** delete or weaken the no-skill baseline to make a comparison look better — it is the
   control, and issue #10 point 3 rules out concealing overflow (`overflow-x: hidden`) as a fix.

## 3. Browser support and progressive enhancement

Some upstream guides use newer browser features; issue #14 says their suitability must be checked
against actual target browsers, not assumed. The same rule applies to any SUS change inspired by
one.

Before adopting any API a guide suggests:

1. **Name the target browsers** for the surface being changed (the fixture set is Chromium-only in
   CI — that is a test-environment fact, not a support policy, and it must not be mistaken for
   evidence of cross-browser support).
2. **Check Baseline / target support** for the specific API, and record the source and the date
   checked. "Baseline" is a status, not a guarantee for every browser version actually in use.
3. **Require a fallback.** The feature must degrade to something that still works: layout that
   reflows without container queries, motion that is absent rather than broken without a newer
   API, a control that still functions without the newer input event.
4. **Check the accessible path specifically**: keyboard operation, focus visibility (G9), screen
   reader announcement, reduced motion (G6), and target size (G8).
5. **Never replace a working accessible component** with a newer one solely because it is newer.

Where a fallback cannot be written, the honest outcome is not to adopt the feature, and to record
why — not to ship it and hope.

## 4. Supply chain and licensing

The upstream README describes an install-and-run workflow (`npx modern-web-guidance@latest`,
`search`, `retrieve`, `legacy-scan`). SUS does **not** use it:

- **No automatic install, no `npx`, no code execution.** No SUS script downloads or runs upstream
  tooling. The only access path in the provider is an injected lookup function. One script reads
  upstream bytes — `scripts/research/verify-pin.mjs` — and it fetches files over HTTPS, hashes them
  and writes the pin; it installs nothing, executes nothing, and never runs during `pnpm verify`.
  See `packages/scanners/src/research-provider.ts`.
- **No outbound source transfer.** SUS does not send repository code, fixture content or user data
  to the upstream service. A lookup is a read of public pinned content.
- **Provenance verified before any install.** If a human ever decides to install upstream tooling,
  it is a separate reviewed decision under the dependency rule in
  [docs/TOOLING_CANDIDATES.md](../../../docs/TOOLING_CANDIDATES.md) ("Adoption rule": an ADR,
  licence verification, a size/maintenance check and a documented exit path) — plus a pinned
  version, never `@latest`.
- **Hashes and revision before trust.** A hit only exists when its `sha256` matches the pin's
  recorded digest. A mismatch drops the hit; it is never "accepted with a warning". The pin's own
  digests are measured, not typed: they were recorded by a script that read bytes and ran nothing.
- **Apache-2.0 attribution for copied material.** Quoting a bounded excerpt is reference use.
  Copying guide text into SUS requires the Apache-2.0 notice, the upstream URL, the revision and the
  guide path to travel with it. Nothing has been copied: the four guides are pinned by path and by
  digest, and no guide text exists anywhere in this repository.
- **Licence independence.** Upstream's Apache-2.0 governs upstream. SUS's licence and publication
  channel are not decided by this work; owner decision **D06 stays open**. Nothing in this document
  or the provider chooses a licence for SUS.
- **Untrusted content.** Fetched guide text is reference data with `trusted: false`. An instruction
  found inside a guide is not obeyed, and a malicious or corrupted guide is exactly what the
  injected-loader + digest-match design is there to bound. Negative fixtures for a bad guide are
  required by issue #14 and belong in the pilot that first fetches one.

## 5. Status of the claims in this document

| Claim | Status |
| --- | --- |
| Upstream revision, release, licence, four guide paths | **measured** 2026-11-16 — every path fetched twice by independent transports and hashed; the licence is a digest of upstream's own `LICENSE` text, not a remembered name |
| Guide contents, recommendations, API usage | **unknown** — not read; the table in `docs/RESEARCH_SOURCES.md` §6 is labelled hypotheses for this reason |
| SUS pseudo-label implementation (`globals.css:470`), its documented limits | verified in this repository |
| `content: attr(data-label)` is not a header association | **measured** (§6): the generated label text does reach the cell's accessible name in Chromium, but the association itself is gone when the header row leaves the layout. A real screen-reader session is still `not-run` |
| SUS's CI measures Chromium only | verified in this repository |
| `legacy-scan` covers a subset of upstream guidance | from issue #14 triage |
| The three pilot before/after numbers in §6 | **measured** in this repository by `pnpm pilots` (headless Chromium); see [pilots/results.json](pilots/results.json) for the digests and metrics |
| Provider-present pilot arm | **not-run** — the pin is measured (2026-11-16), but no shipped loader supplies fetched text to a paired run, so there is nothing to compare against the no-provider arm. Precondition met, measurement not done |

## 6. Measured pilots (T1016)

Three of the four candidates in §1 now exist as measured pairs — the same markup, the
same task, the technique as the only difference — each with a negative control and a
fallback case. Pages, harness, full numbers and page digests:
[pilots/README.md](pilots/README.md) and [pilots/results.json](pilots/results.json).

| Pilot | Criterion | Before | After |
| --- | --- | --- | --- |
| responsive-table | header association at 390px (columnheader count), no document overflow | **0** columnheaders, **0** cells, no overflow | **4** columnheaders, **16** cells, no overflow |
| navigation-drawer | expanded state + Escape + focus in/back + inert background | absent, Escape ignored, focus stays in the page | `false`/`true`, Escape closes, focus returns, 0 background Tab steps |
| inp-handler | total blocking time for the same 360 ms work budget | **310 ms** (one 360 ms long task) | **0 ms** (0 long tasks, 360 ms worked) |

What this settles, and what it does not:

- The pseudo-label risk in §2 is now **measured on both sides**. Hiding the header row with
  `display:none` *and* flattening the table does not merely hide the headers — Chromium
  drops the table semantics, so the snapshot has no cells either. Sighted users still see a
  labelled card, which is why the recipe survives review. The negative control (table layout
  kept, header row forced `display:none`) isolates the header loss.
- `content: attr(data-label)` **does** put the label text into the cell's accessible name in
  Chromium, so "the cell name mentions the column" is not a sufficient check. The header
  count is the instrument of record.
- The **browser-support risk** is tested, not asserted: the yielding handler is driven twice,
  once with `scheduler.yield` available and once with `window.scheduler` removed. Both runs
  record zero long tasks, and the fallback run records `mode: "timeout"`.
- The **provider-present arm is not-run.** The pin is measured, so the provider *could* serve a
  hit — but no shipped loader hands fetched text to a paired run, and no guide text is quoted or
  vendored here. These pilots measure the technique the pinned guide list names, not the source,
  and they claim nothing about provider benefit. A servable pin is a precondition for that arm,
  never the arm itself.

### The guard that makes the bad recipe checkable

§2 said the pattern had no executable check. It has one now:
`checkResponsiveTable()` in
[packages/scanners/src/responsive-table.ts](../../../packages/scanners/src/responsive-table.ts)
reads CSS and markup and returns five checks —
`pseudo-label-pattern`, `header-stays-in-a11y-tree`, `overflow-not-concealed`,
`cell-labels-complete`, `label-order-matches-header`. Its 22 tests run it against the
real `fixtures/admin` stylesheet and markup (must pass) and against mutated copies (must
fail on the named check): `thead { display: none }`, `visibility: hidden` on the header
block, `html { overflow-x: hidden }`, `overflow: clip` on the table, a cell with no
`data-label`, reordered labels, and labels that no rule paints. It also runs on the two
pilot pages below and must agree with the browser: `before.html` fails the header check,
`after.html` passes all five. A check that cannot judge an input (CSS with no markup, a
table that uses neither half of the pattern) reports `not-applicable` — never `pass`.

That is also the **bad-guide negative case** issue #14 asks for: a recommendation that
conceals overflow or removes the header row is rejected by a named check instead of being
silently copied into SUS; and a guide whose `sha256` does not match the pin is dropped by
the provider before a hit exists.
