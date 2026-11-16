# `/sus-bestpractice` — scoped proposals for a selected UI area (issue #15)

Status, stated before anything else: the **CLI equivalent works end to end** (T1023) —
`sus-eval bestpractice` runs the audit, resolves the scope and writes a read-only proposal. **No
slash binding is verified on any host**: `/sus-bestpractice` is a documented intent, the same honest
position `/sus audit` holds. The five measured example classes (T1024) remain `pending` in
`TASKS.json` as milestone **M11**.

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
sus-eval bestpractice --path ./fixtures/bestpractice --scope '#skip'     --out .sus-bp --mode deep
sus-eval bestpractice --url http://127.0.0.1:3000  --scope 'nav .cta'     --out .sus-bp --mode deep
sus-eval bestpractice --path ./src/components/Nav.astro --scope-kind component-path \
                      --scope Nav.astro --out .sus-bp
sus-eval bestpractice --help
```

| Option | Meaning |
| --- | --- |
| `--path <dir>` / `--url <origin>` | exactly one target, as with `/sus audit`; a non-loopback host needs `--authorize` |
| `--scope <value>` | a CSS selector (resolved against the live URL, or the built `index.html` over `file://`) or a file path |
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

### Attribution: what counts as "in scope"

A finding is proposed only when the audit's own `location` descriptor **exactly equals** the resolved
target. Descriptors are flat strings (`a#skip`, `td.cell`), so containment cannot be inferred without
a DOM, and inferring it would attribute another element's defect to this selection.

The consequence is stated rather than hidden: axe findings carry a **rule id** as their location
(`scrollable-region-focusable`), so they are counted in the report as *attributed elsewhere* and not
proposed for an element scope. Scoping axe (`axe.run(element)`) is the next real improvement, and it
is named in T1024 rather than quietly assumed here.

## 7. What this workflow does not do yet

- It does not emit a diff or a plan file: the proposal lists remedies and test plans, not patches,
  and patch generation belongs to Studio's preview path.
- It does not verify a slash alias on any host (`/sus-bestpractice` is a documented intent; the CLI
  form above is what this repository can prove).
- It does not resolve a Live Studio region to source: a region stays `advisory` until Studio's
  selection channel supplies a mapping.
- It does not consult the research provider. T1018's loader makes that possible; wiring it into this
  workflow is T1024's job, bounded and optional, with no guide text copied (D06 open).

## Reproduce

```bash
pnpm exec vitest run packages/eval-core/tests/bestpractice.scope.test.ts      # 24 tests, real browser
pnpm exec vitest run packages/eval-core/tests/bestpractice.proposal.test.ts   # 20 tests, no I/O
pnpm exec vitest run packages/eval-core/tests/bestpractice.command.test.ts    # 12 tests, one deep run

# a real scoped proposal (fixture ships with a clipped, undersized skip link on purpose)
pnpm exec sus-eval bestpractice --path ./fixtures/bestpractice --scope '#skip' --out /tmp/sus-bp --mode deep
```