# Pilots — Modern Web Guidance (T1016)

Three of the four candidate pilots in [COMPATIBILITY.md](../COMPATIBILITY.md) §1 are
built and measured here. A pilot is a **pair** of standalone pages with the same
markup and the same task, where the only difference is the technique under test,
plus a negative control and a fallback case. The before page and the after page are
measured by the *same* instrument in the same run, so the comparison isolates the
technique instead of a layout artefact.

Evidence lives in [results.json](./results.json): per pilot, the page digests, the
criterion, the measured metrics for before/after, the negative case and the fallback
case. The file is checked on every `pnpm test` without a browser — digests must
still match the committed pages and the before/after verdict direction cannot be
inverted — so a stale or hand-edited result fails CI.

## The three pilots

| Pilot | Pages | The technique under test |
| --- | --- | --- |
| `responsive-table` | [before](./responsive-table/before.html) → [after](./responsive-table/after.html) | Stacked narrow-width records must keep the header row in the accessibility tree (`position:absolute` + 1px + `clip-path`) instead of `display:none`. |
| `navigation-drawer` | [before](./navigation-drawer/before.html) → [after](./navigation-drawer/after.html) | A drawer needs an expanded state, Escape dismissal, focus in and back, an inert background, and a no-JS fallback that leaves the links reachable. |
| `inp-handler` | [before](./inp-handler/before.html) → [after](./inp-handler/after.html) | The same 360 ms work budget as one synchronous handler versus 20 ms chunks with a yield between them. |

## What was measured

| Pilot | Metric | Before | After | Negative control | Fallback |
| --- | --- | --- | --- | --- | --- |
| responsive-table | `ariaSnapshot()` columnheader count at 390px | **0** | **4** | 0 (header forced `display:none`) | 4 at 320px |
| responsive-table | cell nodes in the snapshot | **0** | **16** | 16 | 16 |
| responsive-table | document overflow at 390px | none | none | none | none at 320px |
| responsive-table | axe serious/critical | 0 | 0 | 0 | 0 |
| responsive-table | `runHardeningMatrix` failures (3 viewports x 2 themes x 2 motion) | 0 of 12 | 0 of 12 | — | — |
| navigation-drawer | `aria-expanded` before / after opening | absent / absent | `false` / `true` | absent / absent | — |
| navigation-drawer | focus inside the drawer after opening | no | yes | no | — |
| navigation-drawer | Tab steps landing in the background page (6 steps) | 4 | 0 | 4 | — |
| navigation-drawer | Escape closes / focus returns to the trigger | no / no | yes / yes | no / no | — |
| navigation-drawer | visible section links with JavaScript disabled | 0 | 4 | 0 | 4 |
| inp-handler | long tasks per click (median of 3) | 1 | 0 | 1 | 0 |
| inp-handler | longest task (median) | 360 ms | 0 ms | 360 ms | 0 ms |
| inp-handler | total blocking time (median) | 310 ms | 0 ms | 310 ms | 0 ms |
| inp-handler | work actually performed (median) | 360 ms | 360 ms | 360 ms | 360 ms |

Two findings are worth stating plainly, because they are not what the brief assumed:

1. **`table, tbody { display: block }` plus `thead { display: none }` does not just hide
   the headers.** At 390px Chromium drops the table semantics entirely: the snapshot has
   **zero** column headers *and* **zero** cells. Sighted users still read a labelled card
   (the `td::before` text is painted), which is exactly why the recipe looks harmless.
   The negative control isolates the second half of the effect — with the table layout
   kept and only the header row forced `display:none`, the 16 cells survive and only the
   4 column headers disappear.
2. **Generated content is not nothing.** In the negative control the 16 cells still
   carry their label text in the accessible name (`attr(data-label)` is included), so a
   naive "does the cell name mention the column" check would pass the broken page. The
   column-header count is the instrument of record for this reason, and the executable
   guard in `packages/scanners/src/responsive-table.ts` checks the CSS technique instead
   of guessing at the accessibility tree.

## Reproduce

```bash
# measured run: serves the pages on 127.0.0.1:4360, drives Chromium, rewrites results.json
pnpm pilots

# cheap check that runs inside pnpm test: digests + verdict direction, no browser
pnpm exec vitest run packages/eval-core/tests/pilots.research.test.ts
```

## The provider arm is not-run, and that is deliberate

Issue #14 asks for each pilot to be paired with and without the research provider.
The pin is measured — `verified: "verified"` with a digest per guide, recorded 2026-11-16
by `scripts/research/verify-pin.mjs` (see
[docs/RESEARCH_SOURCES.md](../../../../docs/RESEARCH_SOURCES.md) §4, §5 and §11) — and since
T1018 a shipped loader (`packages/scanners/src/research-cache-loader.ts`) serves those bytes
from a verified cache. The arm is still **not-run**, for a different reason than before: its
*mechanics* are now measured (`../paired-run.json`: 3 of 4 topics served inside the 3-call
budget, digests equal to the pin), but a paired comparison needs a host model to produce output
twice over the same task, and no shipped harness runs one. These pilots also authored their
pages from the repo's own fixtures and the pinned guide *list*, not from fetched guide content,
so nothing here is evidence of provider benefit — only of the technique the pin names.

## What these pilots do not measure

- A real screen reader or any assistive technology session. The instrument is
  Chromium's accessibility-tree snapshot through Playwright.
- Field INP, or any real user's interaction. The INP numbers are lab long-task time.
- 400% browser zoom, 200% text scaling, translated or RTL content.
- Whether SUS output is better than any other method. That comparison needs the human
  arm of the benchmark protocol, which is still `not-run`.

Harness: [packages/eval-core/tests/pilots.research.test.ts](../../../../packages/eval-core/tests/pilots.research.test.ts).
