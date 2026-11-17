# `/sus-bestpractice` — scoped proposals for a selected UI area (issue #15)

Status, stated before anything else: the **CLI equivalent works end to end** (T1023) —
`sus bestpractice` (also `sus-eval bestpractice`) runs the audit, resolves the scope and writes a read-only proposal. **No
slash binding is verified on any host**: `/sus-bestpractice` is a documented intent, the same honest
position `/sus audit` holds. The five measured example classes are **done** (T1024, milestone M11;
`docs/BESTPRACTICE_EXAMPLES.md` is the committed record and `pnpm examples:check` keeps it honest).
Done tasks and a finished user-facing command are not the same claim: what remains unmet in issue #15
is listed in §8, and it is unmet because the pieces are absent or unverifiable here, not because work
was skipped.

`/sus-bestpractice` is not a second scanner. Every measurement it can report comes from
`/sus audit` (`docs/AUDIT_COMMAND.md`); what this workflow adds is *scope* and *focus* — deciding
what the user actually selected and which dimensions are worth measuring for it.

## 1. Why scope is a first-class step

Three failures cost more than a missing feature:

- **A stale selection** (the element was renamed, the file moved) silently resolving to "something
  nearby" and reporting a confident improvement to code the user never selected.
- **An ambiguous selector** matching three elements, where picking the first one edits the wrong
  component.
- **A screenshot rectangle**, which identifies pixels and not source, being treated as if it named
  code.

So resolution has five named outcomes, and only `resolved` may proceed to a proposal:

| Outcome | Meaning | What the caller does |
| --- | --- | --- |
| `resolved` | exactly one target, or one file | audit it, then propose |
| `ambiguous` | several matches; the candidates are returned | show them and ask which one |
| `not-found` | nothing matches, or the path is unreadable | say the selection may be stale; no edit |
| `advisory` | a drawn region with no linked source | report observations as advisory only |
| `rejected` | not a selection at all (empty, `*`, over-long, control characters) | refuse, with the reason |

`ScopeResolution` carries `clarification` (what to ask) and `reason` (why refused) as separate
fields, so a UI never has to parse prose to decide whether to proceed.

## 2. Accepted scope references

| `kind` | `value` | Resolution |
| --- | --- | --- |
| `selector` | CSS selector, ≤ 200 characters | queried against the live page; descriptors only (`tag#id.class`), never inner text |
| `selector` | the token `page` (or `document`) | the whole document, selected without a browser: the page is the unit the audit measured (T1031) |
| `component-path` | file path | read through an injected reader; the file must exist, and the component class comes from its path segments |
| `editor-selection` | file path | same as `component-path` |
| `region` | annotation id | **advisory by construction**; a drawn region is not source |

Limits (`SCOPE_LIMITS`): at most 20 candidate targets, selectors at most 200 characters, `*` and
`html *` refused. A selector never reaches a shell — it goes to `document.querySelectorAll` inside
the browser and nowhere else — and control characters are rejected before that.

## 3. Focus selection: what is measured, and what is said to be left out

`selectFocus(kind)` returns `run` (the dimensions to measure) and `notApplicable` (every other
dimension **with a reason**). A dimension is never silently dropped: the six dimensions always
partition between those two lists, and a test asserts it for every component class.

| Component class | Measured | Deliberately not measured (reason on record) |
| --- | --- | --- |
| `navbar` | responsive, a11y, visual, copy | motion (only when the panel is in scope), performance (no scripted interaction) |
| `button` | a11y, visual, copy | responsive (a control has no layout of its own; size is checked under a11y), motion (only when selected), performance |
| `form` | a11y, copy, visual, responsive | motion (no transition required by the ruleset), performance (validation timing needs interaction tests) |
| `form-field` | a11y, copy, visual | responsive (the form owns layout), motion, performance |
| `record-table` | responsive, a11y, visual | copy (content, not a rule), motion, performance (the budget owns row rendering) |
| `dialog` | a11y, motion, visual, copy | responsive (measured at the viewport it opens in), performance (needs a trace) |
| `generic` | responsive, a11y, visual | copy (no content kind supplied), motion, performance |

The two honest refusals worth highlighting: `performance` is not measured for a single control or a
generic scope, because no scripted interaction is driven and a lab number there would be an artefact
dressed as evidence; and `copy` is not judged for a record table, because cell wording is content and
needs a content kind before any rule applies.

## 4. The proposal record (T1022)

`sus.bestpractice-proposal/1`, validated with Zod before it is written — the same discipline as
`audit.json`, and for the same reason: an absent value must be deliberate, not quietly zeroed.

Every item states `dimension`, `severity`, `kind`, `title`, `location`, `evidence`, `observed`,
`expected`, `why`, `remedy`, `rationale`, `uxOutcome`, `risk` and a `testPlan` with at least one
step. Two invariants are enforced by the schema, not by prose:

| Invariant | What happens if it is broken |
| --- | --- |
| a `fact` must carry `observed` **and** `evidence` | `composeProposal` refuses with `fact-without-observation` |
| a `heuristic` may not be ranked P0 or P1 | refused with `heuristic-ranked-blocking` |

A proposal is also refused when the scope is not `resolved` (`scope-not-resolved` — including the
`advisory` case, because a screenshot rectangle is not source) and when there is nothing to propose
(`no-items`). Sorting is worst-first, and measured facts come before judgments at equal severity.

The record carries its own **digest** (SHA-256 over scope, focus, items and untested, canonically
serialised) and an explicit `approval: { required: true, mode: 'per-hunk', applyPath: 'studio-apply' }`.

## 5. What an approval may apply

`authoriseApply(proposal, { digest, hunkIds })` is the guard, and it refuses in five named cases:

| Refusal | Meaning |
| --- | --- |
| `empty-approval` | approving nothing applies nothing |
| `stale-digest` | the approval was granted for different content — the digest is the binding |
| `unknown-hunk` | an approved id is not in this proposal |
| `untested-dimension` | the approved change is in a dimension no conclusion rests on, so the improvement could not be verified |
| (allowed) | matching digest, known hunks, measured dimensions |

Applying itself stays in Studio (`packages/studio-bridge/src/apply.ts`, T0707): it already refuses to
write without a live content-bound grant, rechecks the preimage hash instead of overwriting the user's
uncommitted edits, and restores preimages byte for byte on rollback. This workflow feeds it a proposal
and a digest; it does not grow a second writer, which is what issue #15 asks for when it says not to
build a competing engine.

`## Not measured` is part of the rendered report: every dimension that was not-applicable, plus any
dimension measured only in part, appears with its reason. A report that cannot say what it did not
look at is not evidence.

## 6. The CLI equivalent (T1023)

```bash
sus-eval bestpractice --path ./fixtures/bestpractice --scope page       --out .sus-bp --mode deep
sus-eval bestpractice --path ./fixtures/bestpractice --scope '#skip'     --out .sus-bp --mode deep
sus-eval bestpractice --url http://127.0.0.1:3000  --scope 'nav .cta'     --out .sus-bp --mode deep
sus-eval bestpractice --path ./src/components/Nav.astro --scope-kind component-path \
                      --scope Nav.astro --out .sus-bp
sus-eval bestpractice --help
```

| Option | Meaning |
| --- | --- |
| `--path <dir>` / `--url <origin>` | exactly one target, as with `/sus audit`; a non-loopback host needs `--authorize` |
| `--scope <value>` | a CSS selector (resolved against the live URL, or the built `index.html` over `file://`), the token `page` (the whole document, no browser needed), or a file path |
| `--scope-kind` | `selector` (default), `component-path`, `editor-selection`, `region` |
| `--source` | `source` (default) or `screenshot` — a screenshot scope is advisory and produces no proposal |
| `--focus` | comma-separated subset of the six dimensions; unknown names are refused, not ignored |
| `--mode` | `deep` by default: a proposal about layout needs the browser |
| `--dry-run` | accepted and the default; nothing is ever applied here |
| `--json` | print the validated proposal instead of the Markdown |

Exit codes mirror the audit's discipline: `0` proposal written with nothing blocking (or nothing to
propose), `1` proposal written containing P0/P1 items, `2` usage/scope error — no proposal written,
`3` proposal written but **nothing in scope was measured**, so every item is a judgment.

Everything is written under `--out` (`proposal.json`, `proposal.md`, `audit/audit.json`, shots and
evidence); the target is never written to, and a test hashes the fixture before and after a deep run.
An `--out` that points at the selected target or inside it is refused (exit 2) for the same reason:
a proposal is evidence *about* a tree, not a file in it.

### Attribution: what counts as "in scope"

A finding is proposed only when the audit's own `location` descriptor **exactly equals** the resolved
target. Descriptors are flat strings (`a#skip`, `td.cell`), so containment cannot be inferred without
a DOM, and inferring it would attribute another element's defect to this selection.

The consequence is stated rather than hidden: the **page-wide** axe findings carry a rule id as their
location (`scrollable-region-focusable`), so those are counted as *attributed elsewhere* and not
proposed for an element scope.

**Element scopes get their own axe scan (T1030).** When the scope resolved to a selected element and
the mode is `deep`, the audit also runs axe with that element passed to axe's `include`, i.e. axe is
told to analyse only that subtree. A violation found this way names the element as its location, so it
is attributable *by construction* rather than by string matching, and the proposal can list it (with
`observed: n nodes`, `expected: 0`). Two consequences are stated on purpose:

- the **page-wide** scan is unchanged and still counts everything; the scoped scan is an addition, not
  a replacement, so the G4 verdict keeps describing the whole page;
- scoped scans exist only for `selector` scopes in `deep` mode. `component-path` scopes and `quick`
  mode still produce no element scoped axe items, and a selector axe cannot include is recorded as a
  scoped-scan failure instead of being silently treated as clean.

### A file scope attributes an HTML file and refuses to guess for a component (T1037, T1041)

A `component-path` scope resolves (the file must exist). Two cases follow, and they are not the same:

- **An HTML file is the page it serves.** `--scope checkout.html` narrows the selection to the route
  that file becomes (`/checkout.html`, or `/checkout` for `checkout/index.html`), and the findings the
  audit measured on that route *are* findings about that file. Nothing about a descriptor is mapped, so
  nothing is guessed. The proposal says so beside its scope line:

  ```
  Attribution: this HTML file is the page it serves, so the audit findings measured on the
  `/checkout.html` route are findings about this file.
  ```

- **A component file is a fragment of many pages.** `.tsx`, `.vue`, `.astro`, `svelte` files cannot be
  attributed: a finding is located by an element descriptor (`input#email`) and nothing in this
  repository maps descriptors to source files. Rather than print "nothing to propose" — which reads as
  "measured and clean" — the command states the cause and exits **3**:

```
sus bestpractice --path fixtures/bestpractice --scope-kind component-path --scope motion/index.html
→ The audit measured responsive, a11y, visual and reports 51 finding(s), but none can be attributed to a
  file: a finding names an element … and this scope names a source file, so matching them would be a
  guess. Nothing was proposed and nothing was changed.
  → select the element instead: --scope '#email', or the whole document: --scope page   (exit 3)
```

Exit 0 is reserved for a scope that genuinely measured nothing to change. For an HTML file scope,
findings measured on *other* routes are reported as "on other routes (this file serves only `X`)", so
they are never confused with findings that could not be attributed at all.

### A page scope proposes the page's own findings (T1031)

`--scope page` (also `document`, `whole page`) selects the document itself. No browser is opened to
resolve it, because the page is already the unit the audit measured. Attribution then works by
dimension instead of by element descriptor: **the page owns everything measured on it**, which is what
makes a page-level defect reachable at all.

This matters because some findings belong to no element. A missing meta description is reported at its
own route (`/`), so before T1031 `--scope page` exited 0 with "nothing to propose" while the audit had
failed G9 on the same page — a silent contradiction. Now:

```
sus-eval bestpractice --path …/index.html --scope page --mode deep
→ 7 item(s), 7 measured, 2 blocking
  P0 | fact | a11y | label (critical)                    (rule-level, page consequence)
  P2 | fact | copy | meta-description on / | /
```

Two consequences are stated plainly:

- the a11y items keep the audit's own location (a rule id), so a page scope shows *what* axe objected
  to rather than pretending to point at an element;
- element scopes are unchanged: they still attribute only what their own descriptor or descendants
  name, and no confined axe scan runs for a page scope (the page-wide scan already measured that exact
  unit, so running both would report the same violation twice under two labels).

Every SEO check now also reports `observed` / `expected` counts, because the proposal contract refuses
a fact without an observation — the page scope is what surfaced that gap.

## 7. The five measured example classes (T1024, done)

`docs/BESTPRACTICE_EXAMPLES.md` is generated by `node scripts/bestpractice/examples.mjs` from a deep
audit of `fixtures/bestpractice/examples` before and after the fixed version of the same fixture
(a temporary copy — the committed fixture keeps its defects, which a test pins). For a call to
action, a navigation bar, a form, a mobile record row and a motion/keyboard case it records the
scope, the consulted dimensions, the dimensions deliberately not consulted with reasons, the items
the audit produced, and the instrument values before and after.

| Example | Instrument that had to move | Before → after |
| --- | --- | --- |
| `#cta` call to action | 28×20 tap target | item gone, `capture-matrix` fail → pass |
| `#site-nav` navigation | 720 px row overflowing 320 px | 916 px document → no overflow |
| `#signup` form | 24 px input/button targets | items gone |
| `#invoices` mobile record row | 900 px table at 320/390/768 px | stacked card below 960 px, no overflow |
| `#panel-open` motion + keyboard | suppressed focus indicator | `keyboard-flow` fail → pass |

The motion dimension stays **`not-run`**: `transition-oracle` needs a scripted interaction and no
example drives one. The reduced-motion guard is part of the fix, but nothing here measures it, and
the record says so rather than counting a CSS edit as a measurement.

`pnpm examples:check` (part of `pnpm verify`) re-renders the markdown from the committed JSON, so the
report cannot drift from the record that produced it without failing the build.

## 8. What this workflow does not do yet

- It does not emit a diff or a plan file: the proposal lists remedies and test plans, not patches,
  and patch generation belongs to Studio's preview path.
- It does not verify a slash alias on any host (`/sus-bestpractice` is a documented intent; the CLI
  form above is what this repository can prove).
- It does not resolve a Live Studio region to source: a region stays `advisory` until Studio's
  selection channel supplies a mapping.
- It does not consult the research provider. T1018's loader makes that possible; wiring it into this
  workflow is follow-up work beyond T1024, bounded and optional, with no guide text copied (D06
  open).

## Reproduce

```bash
pnpm exec vitest run packages/eval-core/tests/bestpractice.scope.test.ts      # 24 tests, real browser
pnpm exec vitest run packages/eval-core/tests/bestpractice.proposal.test.ts   # 20 tests, no I/O
pnpm exec vitest run packages/eval-core/tests/bestpractice.command.test.ts    # 12 tests, one deep run

# a real scoped proposal (fixture ships with a clipped, undersized skip link on purpose)
pnpm exec sus-eval bestpractice --path ./fixtures/bestpractice --scope '#skip' --out /tmp/sus-bp --mode deep
```