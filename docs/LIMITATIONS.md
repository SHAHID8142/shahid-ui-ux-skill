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

- The dogfood audit covers **five** checks against 36 playbooks' worth of rules. Two of
  three reference implementations passing says the checks are not exhaustive, not that the
  sites are exemplary.
- The admin reference implementation currently **fails** two of those checks (343 px
  horizontal overflow at 390 px, 4.46:1 contrast). Both are documented in
  `docs/DOGFOOD_FINDINGS.md` and left unfixed on purpose, because the fixture is the
  evaluation ruler and a fix needs a deliberate baseline refresh.
- The suite passes on a warm machine with Chromium pre-installed; a cold CI runner will be
  slower than the measured 129.8 s for `pnpm regression`.
- Live Studio is exercised end to end on one stack (Astro in the demo) and one editing path
  (Next in T0700wb). Other stacks are claimed only as far as their support-matrix row says,
  and no row currently reaches `supported`.

## 5. Host support, at the time of writing

| Host | Tier | Basis |
| --- | --- | --- |
| FreePi CLI | verified against the current artefact | install/load/invoke smoke test re-run green |
| ZCode | stale | previous smoke evidence predates the current artefact hash |
| Codex, Claude Code, Cursor | untested | no smoke evidence |

Generated from `docs/compatibility.json` by `pnpm support:write`; hand-editing this table
would make it drift, which is why it is generated and checked by `pnpm support`.

## 6. What this build is not

- Not published. The repository is public (D34); the **product** is not released, and
  post-build audit, licensing and publication remain owner decisions.
- Not audited independently yet. The final checkpoint (T1006) precedes that audit by
  design; `T1003`/`T1005` are owner actions.
- Not a template library. It is a skill plus a verification apparatus; the playbooks are
  contracts, and the components that satisfy them live in the adopting project.
