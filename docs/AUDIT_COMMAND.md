# /sus audit: invocation contract

The audit is read-only and evidence-backed: every check reports pass, fail or
not-run, and a missing measurement is never rendered as a pass (D28, issue #13).

## Invocation

```bash
sus-eval audit --path ./fixtures/marketing --out .sus-audit/marketing --mode quick
sus-eval audit --path ./fixtures/marketing --url http://127.0.0.1:3000 --out .sus-audit/marketing --mode deep
sus-eval audit --url https://example.com --authorize example.com --out .sus-audit/example --mode deep
```

## Targets

| kind | flag | behavior |
| --- | --- | --- |
| `local-path` | `--path <dir>` | reads source and built HTML; live phases need an accompanying `--url` |
| `authorized-url` | `--url <url>` | loopback allowed by default, any other host requires `--authorize <host>` |

## Modes

- `quick` (default): SEO/structure on served or built HTML plus the anti-slop source scan.
  No browser is required, so quick works on a machine without Chromium; browser phases
  are reported as `not-run`.
- `deep`: adds the capture matrix, the reflow matrix, axe and Lighthouse. Requires
  Chromium/Playwright; if the browser cannot launch those checks are `not-run`.

## Viewports (fixed contract)

| name | size (CSS px) | measured by |
| --- | --- | --- |
| `mobile-320` | 320×568 | runHardeningMatrix (reflow); no full-page screenshot at this width |
| `mobile-390` | 390×844 | captureMatrix (device scale factor 3) plus runHardeningMatrix |
| `tablet-768` | 768×1024 | captureMatrix (device scale factor 2) |
| `desktop-1440` | 1440×900 | captureMatrix (device scale factor 1) plus runHardeningMatrix |

320 is required by G7 reflow; 390/768/1440 keep the existing capture columns. The set is
the union of both runners, so each width is measured by at least one of them and uncovered
cells are reported as `not-run` rather than omitted.

The **400% zoom equivalence** is a separate measurement, not one of these columns: 400% zoom
on a 1280×1024 window is a 320×256 CSS px viewport rasterised at device scale factor 4, which
the 320×568 phone column does not stand in for (a fixed header that fits 568 px can eat 256).
`runHardeningMatrix` records it as `zoom400` and `evaluateZoom400` scores it fail-closed; a
`reflow-matrix` run with cells but no zoom record is `not-run`, never `pass`. The user-agent
zoom setting itself and text-only zoom are still never driven.

### Keyboard traversal

`keyboard-flow` drives a real browser at 1440×900: it presses Tab up to 30 times and records the
focus order, whether each focused element paints an `outline` or `box-shadow` while focused
(WCAG 2.4.7), whether focus lands on the document body while controls are still unreached, and
whether the same element repeats in a short cycle. Reaching the end of the document is not a
defect — the browser moving to its own chrome is normal — so a body stop only counts as a detour
when focusable elements remain unreached. A cycle is reported as P2 rather than a failure because
a modal's intentional trap is legal and this check does not press Escape. Each route is loaded with
`networkidle` so focus handlers bound late still exist before the first Tab.

Themes: light and dark. Reduced motion: reduce and no-preference (capture runs reduce only).

## Checks

| id | gate | modes | effort | requirement |
| --- | --- | --- | --- | --- |
| `capture-matrix` | G8 | deep | structural | required |
| `reflow-matrix` | G7 | deep | structural | required |
| `keyboard-flow` | G9 | deep | structural | required |
| `axe-a11y` | G4 | deep | structural | required |
| `lighthouse-budgets` | G5 | deep | structural | required |
| `seo-structure` | G3 | quick, deep | quick-win | required |
| `anti-slop` | - | quick, deep | quick-win | optional |
| `transition-oracle` | G6 | deep | structural | optional |
| `evidence-bundle` | G11 | deep | structural | optional |

## Output

```text
<out>/audit.json        the machine report (validated before it is written)
<out>/audit.md          the same report as summary tables
<out>/shots/            capture screenshots (deep mode)
<out>/evidence/         axe scans and budget table (deep mode)
```

Exit codes: 0 = report produced, no P0/P1 findings and no required check is not-run; 1 = report produced with at least one P0/P1 finding or a failed check; 2 = usage, target or authorization error (no report written); 3 = report produced, but at least one required check is not-run: never reads as pass

Exit code 3 exists on purpose: a report missing a required measurement is not a pass and
must not be treated as one by CI.

## What the audit will not do

- will not edit the target, its dependencies or its lockfile: the audit is read-only
- will not apply a fix: a proposal is written to a plan file that needs explicit approval
- will not score human judgment as a machine pass: manual items stay needs-review
- will not invent transition-oracle cases, translations, screen-reader sessions or a user-agent
  zoom setting: 400% zoom is measured only as the CSS px viewport it produces (320×256 at device
  scale factor 4)
- will not press Escape, arrow keys or a screen reader: `keyboard-flow` records Tab order, focus
  indicators, detours and focus cycles, not Escape dismissal, composite-widget semantics or
  announcements
- will not treat a missing measurement as a pass: an unrun check is reported as not-run
- will not audit a host that was not authorized: loopback is allowed, anything else needs --authorize
- will not publish, release or claim release-readiness

Manual-judgment items (screen readers, real translations, the user-agent zoom setting, text-only
zoom, blind A/B ratings) are listed as needs-review and never auto-pass.

## Provenance

The report is a runtime artifact of `@sus/eval-core`, validated inside that package. It is
not a versioned SUS record type, so it adds no JSON-Schema export; the evidence bundle it
embeds uses the registered `sus.evidence-bundle` v1 contract.
