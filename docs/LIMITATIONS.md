# Limitations

This page is the honest-limitations artefact required by T1004: the statements from
`docs/COVERAGE_MATRIX.md` §5 ship **verbatim** here, followed by the limitations this
build discovered while implementing. A limitation that is discovered and then not
written down is a bug with better manners.

## 1. Shipped verbatim from the coverage matrix (§5)

- SUS does not guarantee ranking, conversion, originality, or bug-free output.
- The anti-slop detector does not "prove AI origin"; it flags patterns with measured precision.
- Judged rubric scores are opinions with anchors, never CI gates.
- Live Studio works only on supported local dev stacks; everything else degrades gracefully and says so.
- SUS cannot replace user research; it structures expert reasoning, not empirical truth about your users.

## 2. What is measured, and what is not

- **Measured, on this revision:** the gate suite (accessibility floor evaluator, perf-budget
  evaluator, motion oracles, evidence completeness, contract drift, critical security), the
  deterministic benchmark arm on four surface baselines, and five dogfood checks on three
  reference implementations.
- **Not measured:** the blind human A/B. No participants have been recruited, so no
  comparative claim is permitted (`evals/benchmarks/results/status.json` records
  `human: not-run` and the claim gate is closed).
- **Not measured:** real-user performance fields. Budgets are enforced on local runs; there
  is no field data and therefore no claim about real-device latency.

## 3. Knowledge-base limits

- The provenance catalog holds **three** claim ids. Most playbook rules are labelled
  `convention` — our documented decision — not `normative-standard`. Only real
  specifications (WCAG 2.2, WAI-ARIA APG, HTML Living Standard, CSS
  `prefers-reduced-motion`, ISO 8601, NIST SP 800-63B-4) carry the stronger grade.
- Playbook acceptance sentences are stated, not executed. There is no harness that runs
  "typing debounces for 250 ms" against an arbitrary implementation.
- Translations and right-to-left behaviour are reasoned about, not tested: no locale
  fixture renders a 40 % longer label yet.

## 4. Implementation limits found while building

- The dogfood audit runs **five** checks over three reference sites. All three pass all five,
  which says the checks are not exhaustive, not that the sites are exemplary. The five checks
  exercise four playbooks — `search-filters`, `tabs`, `accordion`, `form-input-validation` —
  plus gate G4. `evals/playbook-coverage.json` (rendered as `docs/PLAYBOOK_COVERAGE.md`, checked by
  `pnpm coverage:check`) is the exact account: **3 of 187** playbook rules have a check that names
  them, **184** are named gaps, and **33** playbooks have no check at all. Schema-valid is not
  behaviour-tested.
- The admin fixture **did** fail two of those checks (343 px horizontal overflow at 390 px,
  4.46:1 muted contrast). Both were fixed under T1007 (issue #10) and the re-run on
  2026-11-15 measured 0 overflow at 320/390/768/1440 and `--muted: #5f6775` at 5.28:1 on the
  page and 5.70:1 on panels. The original numbers stay in `docs/DOGFOOD_FINDINGS.md`
  verbatim as the record of the first run. A later slice (T1008) gave the fixture a real
  record list — twelve invoices, two kinds of empty state, loading that keeps the rows,
  an error that keeps the rows and recovers on retry, filters/sort/page carried in the URL.
  Issue #10 is closed on that evidence. What no run has done is named in the receipts
  rather than implied: no assistive-technology session (`.sus-dev/VERIFICATION/T1007.md`,
  `T1008.md`). For zoom, the distinction is narrower and now measured: 400% zoom is
  reproduced as the CSS px viewport it produces (320×256 at device scale factor 4) and
  recorded as the G7 `zoom400` measurement — text-only zoom and the user-agent zoom setting
  itself are still not driven, so they stay needs-review. Keyboard traversal is now measured
  (`keyboard-flow`, T1019): Tab order, focus indicators, detours and focus cycles on a real
  page at 1440×900. What it cannot see: Escape dismissal, arrow-key/roving-tabindex semantics
  inside composite widgets, the *adequacy* of an indicator (a ring is a ring), and anything a
  screen reader announces.
- Every timing in this repository comes from one machine with Chromium pre-installed. The
  newest clean `pnpm regression` measured 143.7 s
  (`evals/reports/regression-4aac091d1312.json`, 2026-11-15: 115.5 s verify, 4.0 s demo loop,
  24.2 s dogfood). No cold-runner figure exists, so any claim about CI duration would be an
  inference rather than a measurement.
- Live Studio is exercised end to end on one stack (Astro in the demo) and one editing path
  (Next in T0700wb). Other stacks are claimed only as far as their support-matrix row says,
  and no row currently reaches `supported`.

## 5. Host support, at the time of writing

| Host | Tier | Basis |
| --- | --- | --- |
| FreePi CLI | experimental (`verified` smoke) | `evals/host-smoke/freepi-293168993dee.json` ran against the current artefact (`293168993dee`) and passed 8/8; the tier stays experimental only because Live Studio was not exercised there |
| ZCode | experimental (`stale` smoke) | its smoke evidence (`evals/host-smoke/zcode-b061cc4.json`) predates the current artefact hash; it is cited as stale and not as a pass |
| Codex, Claude Code, Cursor | experimental (`missing`) | no smoke evidence; `evidenceState: missing` in `docs/compatibility.json` |

No row reaches `supported`: that tier also requires Live Studio to pass, and Live Studio was
not exercised on any host.

The machine-readable record is `docs/compatibility.json`, written by `pnpm support:write`
from `evals/host-smoke/*.json` and drift-checked by `pnpm support`; the authoritative rendered
table is [`docs/SUPPORT_MATRIX.md`](SUPPORT_MATRIX.md). This summary is copied from it by hand
and can lag — when in doubt the generated page wins.

## 6. What this build is not

- The Live Studio is a tested loop plus a startable session bridge, not a page: `pnpm demo:loop` runs
  annotate → intent → diff → approve → apply → verify → undo for real, and `pnpm studio:bridge` starts
  the bridge, but `@sus/studio-web` is a controller library with no bundler entry, so there is nothing
  to open in a browser. `docs/STUDIO.md` is the honest inventory.
- Performance numbers are **lab measurements** (Lighthouse in this browser) with no field data and no
  human benchmark, so no comparative claim is permitted. Since T1035 every report and proposal prints
  that next to the number instead of relying on this page being read first.
- Not published. The repository is public (D34); the **product** is not released, and
  post-build audit, licensing and publication remain owner decisions.
- The scoped best-practice workflow (issue #15, T1021–T1024, T1030) attributes a finding to a
  selection when the audit's own location or evidence names that element, or one of its bounded
  descendants. **Page-wide** axe findings carry a rule id, so those are counted as attributed
  elsewhere and never proposed for an element scope; since T1030 a `selector` scope in `deep` mode
  also gets an axe scan confined to that element (`include`), and those findings are attributable by
  construction. A `component-path` scope still resolves but proposes nothing until DOM descriptors
  can be mapped to source files, `quick` mode has no scoped axe, and a screenshot region stays
  `advisory`. A `page` scope is the deliberate exception: it attributes **by dimension**, because the
  page is the unit the audit measured and every finding on it is about that page. These are stated limits, not fallbacks: guessing containment from selector strings
  would attribute one element's defect to another.
- The five measured best-practice examples apply their fixes to a temporary copy of the fixture and
  measure there; nothing is applied to a repository fixture.
- Motion is measured by driving **one** disclosure per route (an element declaring `aria-expanded`) in
  pointer, keyboard and `prefers-reduced-motion: reduce` contexts (T1036). A page with no such element
  reports `not-run` with that reason, and hover-only transitions, carousels, drag gestures and
  scroll-linked animation are not driven at all — so a G6 pass means "this disclosure kept its
  information under reduced motion", not "the whole page's motion is verified".
- Not audited independently yet. The final checkpoint (T1006) precedes that audit by
  design; `T1003`/`T1005` are owner actions.
- Not a template library. It is a skill plus a verification apparatus; the playbooks are
  contracts, and the components that satisfy them live in the adopting project.
