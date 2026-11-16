# `/sus-bestpractice` — scoped proposals for a selected UI area (issue #15)

Status, stated before anything else: **only the scope step exists today** (T1021). Scope resolution
and focus selection are implemented and tested; the proposal record (T1022), the command invocation
(T1023) and the five measured examples (T1024) are `pending` in `TASKS.json` as milestone **M11**.
This page is not a description of a shipped command, and nothing here claims a host slash binding.

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

## 4. What this step does not do yet

- It does not emit a proposal, a diff or a plan file (T1022).
- It does not expose a CLI flag, an intent or a slash alias; `sus.bestpractice` and
  `/sus-bestpractice` are designed in issue #15 but **not routed** until T1023.
- It does not resolve a Live Studio region to source. That mapping is T1023's work together with
  Studio's selection channel; until then a region stays `advisory`.
- It does not consult the research provider. T1018's loader makes that possible; wiring it into this
  workflow is T1024's job, bounded and optional, with no guide text copied (D06 open).

## Reproduce

```bash
pnpm exec vitest run packages/eval-core/tests/bestpractice.scope.test.ts   # 24 tests, real browser
```