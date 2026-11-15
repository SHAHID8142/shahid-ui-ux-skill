# Direction — deriving a point of view from the brief

Generic output does not usually start generic. It starts with a brief that was
answered by the first plausible layout, and the direction question was never
asked. This file makes it asked: **three candidates, one thesis, then
anti-references** — and a record that can be checked rather than asserted.

Scope: choosing direction *before* building. Rule of thumb: a direction that
cannot say what it refuses is a mood board, not a decision.

## The sequence

1. **Extract the job, not the adjectives.** From the brief, write one sentence:
   *who* is doing *what* and what it costs them today. If the brief only offers
   adjectives ("modern, clean, trustworthy"), that is the first thing to
   interrogate — adjectives describe the artifact, never the job.
2. **Make three candidates that are actually different.** Differentiate on the
   axis the brief names (ritual vs coordination vs reassurance), not on
   intensity (clean vs cleaner vs cleanest). The schema refuses duplicated
   theses for exactly this reason.
3. **Give each candidate a mechanism.** A composition device that can be seen in
   a screenshot: a ledger grid, a closing split pane, a claim-and-example
   column. "Bold typography" is not a mechanism.
4. **Name what each candidate refuses**, using anti-slop taxonomy ids so the
   claim is checkable (`template-speak`, `fake-precision`, `generic-voice`,
   `hedge-storm`, `dark-urgency`).
5. **Choose and defend.** The record requires a reason rooted in the brief and a
   recorded reason for *each* rejection. The chosen candidate must refuse at
   least one **blocking** default — otherwise "we chose the best one" has no
   content.
6. **Set project anti-references.** What this product will never do, at project
   level, carried into the playbook. These may not simply repeat a candidate's
   list: a project-level refusal is a commitment beyond any one direction.

## The record

`evals/directions/<briefId>.json`, validated by
`packages/schemas/src/direction.ts` (`sus.direction-derivation` v1) and checked
by `node scripts/check-direction.mjs`:

```json
{
  "briefId": "fixture-marketing-01",
  "surface": "marketing",
  "candidates": [
    {
      "id": "c1",
      "thesis": "one sentence about the product, not about the page",
      "composition": "the device a screenshot could show",
      "typeMove": "the one typographic decision that carries it",
      "palette": "how colour is rationed, and where it is allowed",
      "antiReferences": ["what this direction refuses to do"],
      "defaultsRefused": ["template-speak"]
    }
  ],
  "decision": {
    "chosen": "c2",
    "why": "why the brief points here",
    "rejected": [
      { "id": "c1", "reason": "why it lost, in the brief's terms" },
      { "id": "c3", "reason": "why it lost, in the brief's terms" }
    ]
  },
  "antiReferences": ["project-level refusal, not a copy of a candidate's"],
  "imagery": {
    "strategy": "photography-led",
    "rationale": "why this strategy serves this product",
    "assets": [
      {
        "id": "asset-hero",
        "role": "hero",
        "source": "commissioned",
        "provider": "required for stock and generated assets",
        "licence": {
          "name": "the licence as it is actually called",
          "permitsCommercial": true,
          "requiresAttribution": false,
          "expiresAt": null,
          "proofRef": "where the proof lives"
        },
        "focalPoint": { "x": 0.42, "y": 0.36 },
        "budgetBytes": 180000
      }
    ],
    "totalBudgetBytes": 400000,
    "fallback": "what renders when the asset never arrives"
  }
}
```

Failure codes, each load-bearing: `unknown-default` (a refusal naming a
taxonomy id that does not exist), `chosen-refuses-nothing-blocking`,
`duplicate-thesis`, `unexplained-rejection`, `anti-references-borrowed`.

`imagery` is **required** (T0408): asset strategy, a licensing record per asset,
focal points and weight budgets — see [art-direction.md](art-direction.md) for the
rules and their codes. A direction without a checked imagery plan is incomplete,
because the three failures that actually ship (no licence, crop eats the subject,
unbudgeted weight) are all decided at this point, not later.

A worked example lives at `evals/directions/fixture-marketing-01.json`; read it
next to this file, because the example is the specification.

## Where this connects

- **Anti-slop taxonomy** (`packages/schemas/src/slop-taxonomy.ts`) supplies the
  refusal ids and their severities. A direction may refuse an advisory default,
  but the chosen one must refuse a blocking one.
- **Playbooks** carry `bannedDefaultsResisted`, so the ids chosen here reappear
  as the rules the playbook enforces while building.
- **Evaluation** judges the built page against the recorded thesis. A page that
  cannot be traced back to its thesis is judged as generic however polished it
  is — being polished and being pointed are different measures, and this
  project scores the second.

## Honest limits

- The three-candidate rule is a discipline, not a measurement: the record proves
  the alternatives were stated and defended, not that the chosen one is best.
  Taste decisions remain the owner's (D-rules on owner authority).
- Refusals are taxonomy ids today; a project-specific refusal can be stated in
  `antiReferences` prose, but it is not yet machine-checked beyond non-verbatim
  copying.
- Nothing here is a numeric baseline: the thresholds that fail a build live in
  the gates (`evals/baselines`, G-rules), not in direction records. Provenance
  claim: `sus-baseline-floor` is the floor those gates start from.
