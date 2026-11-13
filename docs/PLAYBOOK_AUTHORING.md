# Playbook authoring standard (T0404)

A playbook is a **decision procedure**, never a template (D15). It tells the
agent what to decide, in what order, against which evidence — it never hands
over a page skeleton, layout recipe, or copy text to paste.

## Rules

1. **Authoritative rules cite provenance.** Every `authoritative` rule's
   `source` names a claim id in `evals/research/provenance-catalog.json`
   (T0301). No source, no authority.
2. **`convention` rules state a project choice** (e.g., "this brand uses
   sentence-case buttons") — valid and recorded, but never dressed up as
   evidence.
3. **`advisory` rules inform**; they never block.
4. **Duplicates fail the lint**: two authoritative rules with the same
   statement cannot coexist.
5. **Steps are a complete procedure**: ordered 1..n, no gaps, each step
   references existing rule ids.
6. **Variant-vs-state**: components with states embed a T0600 state machine
   (every transition has an explicit motion decision; `motion: none` needs a
   reason; reduced-motion preserves information and operation).
7. **Banned-defaults resistance**: rules may list the AI-typical defaults
   they resist (informs direction choice; advisory — preserving an existing
   design system or an explicitly requested style is a valid, recorded
   decision, per the reconciliation).
8. **Banned content**: no lorem ipsum, no TODO/FIXME (G3), checked by the
   knowledge lint (T0409).

## Lint

`node scripts/validate-playbooks.mjs` (wired into `pnpm check`) validates
every `skill/references/playbooks/*.json` against SusPlaybook and rejects:
duplicate authoritative rules, missing sources, unknown rule references,
unordered steps, malformed state machines.
