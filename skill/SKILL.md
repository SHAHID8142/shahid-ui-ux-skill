---
name: shahid-ui-ux-skill
description: Design and build production-quality web UI with evidence-backed judgment. SUS researches the brief, argues with evidence instead of silently complying, never fills templates, and works section by section with explicit human approval for every visible change and source edit. Covers marketing, e-commerce, CMS/CRM admin (Operate mode) and portfolio surfaces; includes anti-slop scanning, semantic design tokens, motion intelligence and a Live Studio bridge for drawing intent directly over a running page. Use when the task involves creating, reviewing or editing web interfaces, design systems, UX flows, SEO/copy quality, or motion and accessibility decisions for the web.
license: Proprietary — licence decision pending (owner gate D06/B003; no distribution until decided)
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
- `references/surfaces.md` — per-surface-mode guidance (M4 playbooks land
  there as they are built; the file names what exists so far, honestly).
- `references/art-direction.md` — the imagery plan every direction record must
  carry: asset strategy, licensing record, focal points, weight budgets.
- `scripts/` — deterministic checks (scanner, validators) run via the SUS
  CLI, not by prompt instructions.

## Honesty rules

- Measured checks (lint, axe, Lighthouse, scanner) come from the CLI; SUS
  never claims a check ran that the host did not execute.
- Accessibility work is prioritisation, not an AA conformance claim; automated
  severity is a triage aid (F18).
- Unverified claims, missing evidence and known limitations are stated, never
  papered over.

## Status of this bundle (v0.1 skeleton)

Core execution rules above are authoritative. Surface playbooks, the
anti-slop corpus, motion contracts and Live Studio workflows are built in
milestones M3–M8 and are listed in `references/surfaces.md` **only when they
exist**. Host-specific entries are generated artifacts (ADR-002) and carry
honest support tiers from M9.
