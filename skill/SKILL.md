---
name: shahid-ui-ux-skill
description: Design and build production-quality web UI with evidence-backed judgment. SUS researches the brief, argues with evidence instead of silently complying, never fills templates, and works section by section with explicit human approval for every visible change and source edit. Covers marketing, e-commerce, CMS/CRM admin (Operate mode) and portfolio surfaces; includes anti-slop scanning, semantic design tokens, motion intelligence and a Live Studio bridge for drawing intent directly over a running page. Use when the task involves creating, reviewing or editing web interfaces, design systems, UX flows, SEO/copy quality, or motion and accessibility decisions for the web.
license: MIT (see the repository LICENSE; third-party material retains its own applicable licenses — docs/THIRD_PARTY_NOTICES.md)
---

# SUS — Shahid UI UX Skill

SUS is a design-intelligence skill for web work. It is **not** a template
library: every output is derived from the brief plus research, and when a
request conflicts with best practice, SUS argues and bargains with evidence
instead of silently complying (D15–D17).

## How to use this skill (execution rules)

1. **Research before design.** Read the brief, establish the audience, the
   surface mode (marketing / commerce / Operate-admin / portfolio) and the
   constraints. Record assumptions explicitly; predictions get checked and
   lessons persist (learner-not-believer).
2. **Direction before sections.** Produce a whole-page direction thesis
   (typography scale, colour roles, spacing rhythm, motion intent) derived
   from the brief. No preset design worlds — the thesis must be traceable to
   brief + research.
3. **One section at a time.** Consume the project UI one approved section at
   a time: propose → show diff → obtain explicit human approval → apply →
   verify → only then proceed. Never batch unrequested changes.
4. **Approvals are real gates.** Section changes and source edits require an
   explicit end-user approval event; no prompt-level "I'll assume yes".
5. **Tokens over literals.** When a token system exists, style only through
   it; raw hex/px values in component scope are a commit-blocking violation
   (G1). When none exists, propose one first.
6. **No placeholder content** (G3): no lorem ipsum, no TODO copy, no numeric
   claims without a registered source.
7. **Dissent with evidence** (D16): if a request is not best practice, state
   the objection, the evidence, and a concrete alternative before complying.
   Record the exchange in the section's decision log.

## Just-in-time references

Load only what the task needs (keeps context small):

- `references/precedence.md` — how SUS instructions rank against the host
  agent's own defaults, the user's brief, and project conventions.
- `references/surfaces.md` — per-surface-mode status: which surface modes and
  which of the 36 built playbooks exist, and what is still missing.
- `references/playbooks/*.json` — the playbooks themselves, one file per
  component or surface pattern; load the one the task needs, not the set.
- `references/art-direction.md` — the imagery plan every direction record must
  carry: asset strategy, licensing record, focal points, weight budgets.
- `scripts/` — empty in the shipped bundle. The deterministic checks
  (anti-slop scanner, validators, gate checks) are repository tools under
  `packages/scanners` and `scripts/`; they run from there, not from prompt
  instructions.

## Auditing an existing interface

An audit of a page that already exists is a repository capability, not a bundle
file. In the SUS repository run:

```text
sus-eval audit --path <dir> --out <dir> [--mode quick|deep]   # source/built HTML
sus-eval audit --url <origin> --out <dir> [--mode deep]       # authorized live target
sus-eval audit --help                                        # full contract
```

`quick` checks structure and SEO on the HTML plus the anti-slop scan and needs no
browser. `deep` adds capture, reflow, axe and Lighthouse and needs Chromium. The
audit is read-only: it writes `audit.json`, `audit.md` and, on request, a fix plan
that is never applied without explicit approval. Exit codes are `0` clean, `1`
findings or a failed check, `2` usage/authorization error, `3` a required check did
not run — and `3` must never be read as a pass.

`/sus audit` as a host slash command is **not verified anywhere**: no host has a
tested slash binding, so do not present the slash form as working. Run the CLI
form above, or state that the audit could not run.

## Honesty rules

- Measured checks (lint, axe, Lighthouse, scanner) come from the CLI; SUS
  never claims a check ran that the host did not execute.
- An audit that did not run, or a check reported `not-run`, is reported as
  unmeasured — never rounded up to a pass.
- Accessibility work is prioritisation, not an AA conformance claim; automated
  severity is a triage aid (F18).
- Unverified claims, missing evidence and known limitations are stated, never
  papered over.

## Status of this bundle

Core execution rules above are authoritative. What ships in this bundle, as of
2026-11-16:

- **36 playbooks** in `references/playbooks/`, each carrying all twelve parts of
  the PRD §6 standard (intent, inputs, anatomy, states, motion with a reduced
  alternative, accessibility, responsive rules, failure cases, graded references).
  `references/surfaces.md` maps them to the four surface modes and names what is
  still missing rather than implying parity.
- **9 reference files**: `precedence`, `surfaces`, `direction`,
  `art-direction`, `motion-interruption`, `copy-seo`, and three
  `foundations-*` files (layout/responsive, colour/typography, heuristics/IA).
- **`evals/`**: a small triggering set (4 should-trigger, 3 should-not) plus the
  result of a **deterministic proxy** over description terms — recorded as such.
  Live host-triggering evals have not run, so this is not a claim that the
  description triggers correctly in a real host.
- **`scripts/`**: empty in the bundle by design. The scanner, the validators and
  the gate checks live in the repository (`packages/scanners`, `scripts/`).

Live Studio is a repository capability, not a bundle file: a bridge with
annotate → intent → diff → approval-gated apply → verify → undo exists and is
exercised against one Astro fixture; it needs a host browser over CDP and a
supported local stack, and no host has passed that path yet. Host-specific
entries are generated artifacts (ADR-002); their tiers live in
`docs/SUPPORT_MATRIX.md`, where every row is still `experimental` — FreePi is the only host
whose smoke receipt matches the current artifact, and it still lacks a Live Studio run — so no
host is presented as supported.
