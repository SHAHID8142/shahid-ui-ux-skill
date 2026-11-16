# Research sources: the pinned reference provider

This document is the integration contract for **optional external research sources**. It
currently governs one source — `GoogleChrome/modern-web-guidance` — pinned at revision
`4dd968349e54ca45a05dd5c818fb035c9054b022` (v1.0.0, Apache-2.0). Owner triage lives in
issue #14; the machine-readable record is
[evals/research/modern-web-guidance/pin.json](../evals/research/modern-web-guidance/pin.json);
the code is [packages/scanners/src/research-provider.ts](../packages/scanners/src/research-provider.ts).

**Read [COMPATIBILITY.md](../evals/research/modern-web-guidance/COMPATIBILITY.md) before planning
any work on a pilot.** It holds the pilot choices, the mobile CMS/CRM risk analysis and the
supply-chain rules.

---

## 1. What the provider is, and what it is not

It is a **reader**. Given a two-to-five word topic, it can return up to five short excerpts from
guides that are pinned by commit and by digest, with the URL, revision and `sha256` attached to
each one.

It is **not** any of the following, and no future change to it may make it one:

| Not this | Why the boundary is drawn here |
| --- | --- |
| A second rulebook | SUS's rules live in `skill/`, its 36 playbooks and G1–G13. Nothing in `packages/scanners/src/research-provider.ts` adds, rewrites, ranks or overrides a rule. A hit is a quotation with a URL, not a rule with an id. |
| An instruction channel | Fetched guide text is third-party data. Every hit is typed `trusted: false`. Text inside a guide that says "ignore your instructions" or "run this command" is evidence *about the upstream file*, never an instruction to the agent that read it. Nothing in the module writes a hit into a prompt; putting a hit in front of a model is a visible, deliberate call by the caller. |
| A licence decision | Upstream is Apache-2.0. That governs upstream. SUS's own licence and publication channel remain **undecided and owner-owned (D06)**. Reading a source does not choose a licence, and no text here implies SUS adopts upstream's. |
| A conformance claim | Neither a clean `legacy-scan` nor a matching upstream guide means SUS meets a standard. The upstream tool covers only a subset of its own corpus, and a subset of a subset is not an audit. |
| A network client | The module imports no HTTP library and opens no socket. Online access happens only through a lookup function the embedder injects. "Does SUS reach the network?" is answerable by reading imports, not by trusting a flag. |
| A gate change | Gates are never widened, weakened or waived because a guide appeared to disagree. Where a guide and a gate conflict, the gate wins and the conflict is recorded in §6. |

### The safety properties, and where they are enforced

Each row is enforced in code and asserted in `packages/scanners/tests/research-provider.test.ts`;
none of them is a convention this document merely recommends.

| Property | Enforced by |
| --- | --- |
| Offline unless `SUS_RESEARCH_ONLINE=1` | `researchOnlineByEnv()`; the default when no `isOnline` override is passed |
| No loader → no access | `not-installed` when the flag is set but no lookup was injected |
| Unverified pin → no hits | `disabled` refusal when `pin.verified !== 'verified'` or `pin.sha256 === null` |
| Digest mismatch → hit rejected | the hit is dropped, not downgraded; `null` digest is also dropped |
| Unknown guide id → not a hit | ids are looked up in the pin; a loader cannot invent one |
| Never throws at a caller | loader throws become `{ available: false, reason: 'offline' }` |
| `trusted: false` cannot be widened | literal type on `ResearchHit.trusted` |

## 2. Caps

Caps are constants in `research-provider.ts`, exported so a caller can read them and a test can
assert them. They are enforced at the boundary of every call, including when a loader ignores the
requested limit.

| Cap | Value | Constant |
| --- | --- | --- |
| Lookups per run (per provider instance) | 3 | `RESEARCH_MAX_CALLS_PER_RUN` |
| Hits per query | 5 | `RESEARCH_MAX_HITS_PER_QUERY` |
| Excerpt length | 1200 characters | `RESEARCH_MAX_EXCERPT_CHARS` |
| Query length | 2–5 words, single topic | `RESEARCH_MIN_QUERY_WORDS` / `RESEARCH_MAX_QUERY_WORDS` |
| Licences this module will attribute | `Apache-2.0` only | `RESEARCH_SUPPORTED_LICENSE` |

**Queries are topics, not questions.** `responsive table` and `INP causes` are accepted.
"How should I fix my table on mobile?" is rejected as `invalid-query` rather than trimmed down,
because a corrected query is a query the caller did not write, and its results can no longer be
pinned to the text they were asked about. Generic phrases made only of field words ("web design",
"css layout") are rejected as über-broad: they match a large slice of the corpus and would return
an arbitrary five.

**Cost is estimated, not measured.** `tokensUsed` is characters/4 over the returned excerpts, the
same conservative estimate recorded as `token-estimate-method` in
[evals/research/provenance-catalog.json](../evals/research/provenance-catalog.json). It exists so a
report can state what a hit set cost; it is not a tokeniser reading.

## 3. Offline degradation

The provider's unavailable states are ordinary outcomes, not errors. A caller that gets one keeps
working with SUS's own guidance and says nothing about a missing source to the end user.

| Reason | Meaning | What the caller does |
| --- | --- | --- |
| `offline` | `SUS_RESEARCH_ONLINE` is not `1`, or the loader failed | continue with SUS guidance; no retry |
| `not-installed` | online, but no loader was injected | continue with SUS guidance; a missing optional transport is not a fault |
| `disabled` | unverified pin, unsupported licence, or the 3-call budget is spent | continue with SUS guidance; do not raise the cap to get past it |
| `invalid-query` | the query is not a 2–5 word topic; no lookup was spent | fix the query, or drop the lookup |
| `no-match` | every offered hit failed verification, or the source had nothing | continue with SUS guidance; an empty result is a result |

**A run never fails because a source is unreachable.** The offline path is the default path, so it
is exercised on every run of the test suite, not only in an outage.

## 4. Pin and update review

A pin is a record that specific bytes at a specific commit had specific digests. Updating one is a
reviewed change, never a side effect of a build.

1. **Fetch, online, deliberately.** Run the lookup with `SUS_RESEARCH_ONLINE=1` against the new
   revision. Do not install, execute or `npx` any upstream code to do this — see
   [COMPATIBILITY.md §4](../evals/research/modern-web-guidance/COMPATIBILITY.md).
2. **Record per guide.** For each guide in the pin: `sha256` of the content actually read,
   `verified: "verified"`, and the new `revision`. A guide that could not be fetched keeps
   `sha256: null` and `verified: "unverified"`; it does not inherit the parent pin's status.
3. **Re-check the licence.** The module refuses any licence other than Apache-2.0. A licence change
   upstream is an owner decision (D06 track), not an edit to the pin.
4. **Diff before accepting.** A revision bump is a content review: which guides changed, and does
   any change touch a row in §6 or a rule in `skill/`? A digest update without a content review is
   a silent rule change.
5. **State what was not done.** If a guide was not fetched, the pin says so. The current pin does:
   it records `sha256: null` for all four guides with a `verificationNote` explaining that this
   toolchain never fetched upstream, and that the four paths come from owner triage in issue #14.

**Nothing is vendored.** No upstream file is copied into this repository, and no upstream command
is run by any SUS script. Pinning a digest is not vendoring.

## 5. Verified versus unverified, as it actually stands

| Item | Fact from issue #14 triage | Independently fetched by this toolchain |
| --- | --- | --- |
| Repository | `GoogleChrome/modern-web-guidance` | No |
| Revision | `4dd9683…b022` (v1.0.0, 2026-11-10) | No |
| Licence | Apache-2.0 | No |
| Guide paths | 4 named paths under `skills/modern-web-guidance/guides/` | No |
| Guide contents | not quoted anywhere in this repository | No |
| `sha256` per guide | unknown | No — recorded as `null` |
| Corpus size (~250 guides) | as stated by triage | No |
| `legacy-scan` scope | covers a subset only | No |

The honest consequence: **against the shipped pin the provider cannot return a hit.** It returns
`{ available: false, reason: 'disabled' }` because the pin is unverified. That is the fail-closed
behaviour working as designed. Everything in §6 is therefore a *hypothesis for review*, not a
finding, and no pilot may cite upstream text until a fetch has been recorded.

## 6. Overlap and contradiction spike (hypotheses only)

**Upstream text was not fetched for this table.** The columns below compare *what the upstream
guide titles and the issue #14 summary indicate* with SUS's existing rules. Treat every row as a
question to answer during a pilot, not as evidence.

| Upstream guide | SUS rule / gate | Relationship | Recommended action |
| --- | --- | --- | --- |
| `ui-atoms/responsive-table.md` | `table-content-adaptive`, `table-row-target` (`skill/references/playbooks/data-table.json`); G7 reflow; G8 target size; [docs/MOBILE_RECORD_PATTERNS.md](MOBILE_RECORD_PATTERNS.md) | overlap (stacked-record pattern) + **contradiction risk**: the pseudo-label pattern SUS already ships uses `content: attr(data-label)` (`fixtures/admin/app/globals.css:470`), whose accessible header association is not guaranteed across browser/AT combinations | fetch the guide, then run the AT reading-order check in [COMPATIBILITY.md §2](../evals/research/modern-web-guidance/COMPATIBILITY.md) before changing any SUS record layout. Do not treat the current pattern as proven accessible |
| `css/responsive-design.md` | `foundations-layout-responsive` (`skill/references/foundations-layout-responsive.md`); G7 reflow (320px, no overflow-hiding) | candidate-missing-capability: container queries and modern layout primitives may be absent from SUS's responsive guidance | diff upstream techniques against the foundations file; adopt only with a Baseline/target-browser check and a fallback, and only for a named rule — never as a wholesale rewrite |
| `performance/identify-inp-causes.md` | G5 perf budgets ("TBT is the INP lab proxy"); `docs/GATE_REGISTRY.json` | overlap + candidate-missing-capability: upstream diagnoses INP from field interaction data; SUS measures TBT in the lab and does not yet attribute INP to a cause | check whether upstream's attribution method is reproducible in the existing budget harness. If not, record it as a limitation rather than importing a claim that SUS measures INP |
| `ui-components/navigation-drawer.md` | `drawer-modal-or-not`, `drawer-focus-contract`, `drawer-guard-dismiss`, `drawer-viewport`, `drawer-scope` (`skill/references/playbooks/drawer.json`); G4 a11y; G6 motion parity; G9 semantics | overlap (focus contract, dismissal) + possible contradiction on viewport/scroll-lock and on `inert` support | compare the guide's dismissal and focus return against `drawer-focus-contract`; any API it recommends needs a Baseline check and a keyboard + screen-reader check before adoption |

**How to promote a row.** A row becomes a finding only when (a) the guide has been fetched and its
digest recorded, (b) the quoted passage is cited with revision, path and `sha256`, and (c) the
comparison is repeated by a second run. Rows that cannot meet this stay hypotheses, and a pilot
that produces no measurable difference is recorded as inconclusive — see §7.

## 7. Evaluation rule

Per issue #14 point 6, a pilot is **paired**: identical fixture, tools, constraints and task, run
with and without the provider, scored on independently checkable outcomes (a11y findings, reflow
measurements, browser support, complexity, runtime budget, token use, regressions).

- An **inconclusive** or **negative** result is a result and is recorded as one.
- "Better" or "faster" without a measurement in the same run is not recorded at all.
- The **intentionally negative no-skill baseline** in `evals/baselines/` is preserved as the
  negative control. A pilot must not "fix" the baseline to make a comparison look better.
- At least one **accessibility/AT risk** and one **modern-API browser-support risk** must be
  actually tested, not asserted (issue #14 acceptance).

## 8. Documentation rule

When a hit informs a SUS change:

1. Cite the upstream URL **at the pinned revision**, the guide path, and the `sha256`.
2. Say whether the guide was fetched and verified, or is being paraphrased from triage.
3. Attribute copied text under Apache-2.0 with the notice, URL, revision and path travelling with
   it. Prefer quoting a bounded excerpt over copying a guide.
4. Never translate a hit into an unconditional rule. If it changes SUS's guidance, the change goes
   through `skill/` with its own evidence, and gates are re-run — a guide is not a gate waiver.

## 9. Where this is enforced, and where it is not

- Enforced in code: every cap and every refusal in §1–§3, with tests that fail if a cap is raised or
  a rejection becomes a downgrade.
- Enforced in code: the responsive-table technique is checkable — `checkResponsiveTable()` in
  `packages/scanners/src/responsive-table.ts` rejects `thead { display: none }` while generated cell
  labels are in use, rejects concealed document overflow, and checks that every `<td>` carries its
  `data-label` in header order. Its tests read the real `fixtures/admin` stylesheet and markup.
- Enforced by measurement: three paired pilots with before/after, a negative control and a fallback
  case — see §10. `pnpm pilots` re-measures; `pnpm test` re-checks the committed evidence without a
  browser.
- Enforced by review: the pin review in §4 and the hypothesis rule in §6.
- **Still not enforced:** nothing prevents a future guide from being quoted in prose without a
  digest. That is a review obligation, and this section states it rather than implying a check that
  does not exist. The provider-present arm of the pilots is `not-run` for the same reason: the pin is
  unverified, so there is nothing fetched to cite.

## 10. Pilots

Three paired pilots, their negative controls and their fallback cases live in
[evals/research/modern-web-guidance/pilots/](../../evals/research/modern-web-guidance/pilots/README.md).
`pnpm pilots` re-measures them in headless Chromium and rewrites the evidence file;
`pnpm test` re-checks the committed digests and the before/after verdict direction without a
browser, so the evidence cannot silently go stale.

They measure the technique, not the provider: the pin is unverified (§4), so the
provider-present arm is `not-run` and no result here claims provider benefit. What they do
settle is §7's requirement that at least one accessibility/AT risk and one modern-feature
browser-support risk be **tested rather than asserted** — the header-association and focus
contract are measured, and the yielding handler is measured with and without
`scheduler.yield`.
