# SUS — PRD Cross-Check: Gaps, Conflicts, Unmeasurable Requirements

**Method:** line-by-line read of the four handoff documents against (a) the research model,
(b) what can actually be executed and tested, (c) internal consistency. This is a *paper* review:
no code exists, so nothing here is a bug report. Severity is about cost-if-missed.

**Verdict:** the PRD is strong on intent and unusually honest about its own limits. Its weakness is
that several requirements are **unfalsifiable as written** — no number, no artifact, no command that
could prove them. Those are listed first.

---

## 1. Unfalsifiable requirements (highest priority)

| ID | Finding | Where | Resolution |
|---|---|---|---|
| F1 | "Aim to outperform Impeccable Live on measurable workflows" names metrics but no thresholds or test rig, so it can never pass or fail | §11.5, §16 L | amendments Part 9: protocol + ≥6 briefs × 3 modes + blind n≥20 raters before any claim |
| F2 | "Professional-quality", "high-quality digital interfaces", "outstanding craft" are used as acceptance language with no rubric | §1, §5, §7 | Rubric v1 (amendments Part 3), 1–5 anchors, stored scores |
| F3 | §16 gates say "appropriate selective module loading" and "supported" without a definition or a count | §16 A, J | support tiers `supported/experimental/untested` + one smoke test per claimed host |
| F4 | Anti-slop "precision/recall measured" — no corpus, no size, no target numbers | §8.3, §16 F | labelled corpus (40 bad / 40 acceptable), target precision/recall set before rules ship (G10) |
| F5 | "Recommended" playbook count at launch undecided; catalog completeness has no acceptance matrix | §20 | publish a coverage matrix; unlisted components must return an explicit "no playbook" result, never invented guidance |
| F6 | Performance requirement exists in prose but no budgets | §9.2, §15 | budgets: LCP ≤2.5 s p75 local, CLS ≤0.1, INP ≤200 ms, CSS ≤60 KB, font ≤150 KB per route (tunable, ADR) |

## 2. Internal conflicts

| ID | Conflict | Where | Resolution |
|---|---|---|---|
| F7 | §3 forbids blanket bans on gradients/cards/grids; §8.1 lists blue-purple gradient and 3-up cards as stereotypes — a detector implementing the latter contradicts the former | §3 vs §8.1 | rule: stereotype-tier findings are **never blocking**, must carry a counterexample and a context condition; only objective tier blocks |
| F8 | §9.4 sets WCAG 2.2 AA baseline but targets 2.3.3 (AAA) for animation — two different bars in one sentence | §9.4 | AA is the contract; 2.3.3 tracked as an advisory score, never a gate |
| F9 | §13 requires DTCG-aligned tokens, but DTCG 2025.10 is a *community group report*, not a W3C Recommendation — calling it a standard is a factual overreach | §13, §21 | cite as "DTCG 2025.10 community report"; validate with a DTCG validator, keep an internal schema as the contract |
| F10 | §11 Studio is "mandatory for GA", yet §17 lists M7 as depending only on M1/M2/M5 and says it "may begin before M4/M6" — schedule and mandate disagree | §11.1 vs §17 | amendments A8: dated spike with go/no-go, then a slice that blocks GA |
| F11 | §12 targets "Auto Pilot (exact product unresolved)" — an untestable compatibility target | §12 | remove until a product is identified; compatibility matrix cannot contain unverified rows (G-tier rule) |
| F12 | §7 forbids advancing sections without acceptance, but §18.3 allows "one active task per agent" with parallel worktrees — no lock, so two agents can accept/overwrite the same section | §7 vs §18.3 | add a section lease file (`.sus/locks/<section>.lock` with pid + expiry) and G2 checks it |

## 3. Missing requirements (things an expert product needs and the PRD does not specify)

| ID | Missing | Why it matters | Proposed |
|---|---|---|---|
| F13 | **Accessibility of Studio itself** (keyboard drawing, screen-reader descriptions of annotations, focus management in the overlay) | A design tool that is inaccessible undermines the whole product claim | add to M8; axe + manual keyboard pass on the overlay; annotation list as a DOM panel |
| F14 | **Contract migration / versioning across SUS releases** (`.sus/` schema v1 → v2) | Users will hit it at the first upgrade; silent breakage loses trust | `sus doctor` migration path + fixtures with v1 projects |
| F15 | **Non-React / no-dev-server fallback** (static HTML, WordPress, Rails, plain CSS) | Studio starts on one stack; the *skill* must still help everywhere, with honest degradation | capability matrix per mode: `full studio / audit-only / static-inspect` |
| F16 | **Authoring standard for the knowledge library itself** (who reviews a playbook, what makes it accepted, staleness) | 60+ playbooks written by an agent will drift into contradictions without a lint | playbook schema + `knowledge-lint` (sources present, dates, no duplicate authoritative rule) + review checklist |
| F17 | **Cost/token budget per task** | "Robust and heavy" can become 200k-token sections that users cannot afford | measure tokens per section in evals; budget target set in M1.5 |
| F18 | **Human-facing failure UX** (what the user sees when a gate fails) | Gates that fail with raw stack traces make the product feel broken | each gate returns: what failed, why it matters, the smallest fix, and a one-line rerun command |
| F19 | **Concurrency/state safety of `.sus/`** (two agents, interrupted writes) | §13 asks for atomic updates but gives no mechanism | append-only journal + atomic rename; recovery test in M5 |
| F20 | **i18n/RTL and locale** at the design level (not just string growth) | PRD says content must support i18n but no design rule exists for mirroring, numerals, line-height by script | foundation module: logical properties, mirrored icons, script-specific type stacks (M4) |

## 4. Cross-check status (multi-agent)

Owner asked for the PRD to be cross-checked by multiple agents before building.

- **This host has no subagent tool.** Verified by tool search: no spawn/delegate capability.
- Available substitutes, in order of quality:
  1. Separate fresh sessions (owner opens a new session with the PRD and a review brief) — closest to
     independent review, zero extra cost.
  2. A different coding agent CLI, if installed and the owner approves (costs their credits).
  3. Multi-pass review by this agent with **different briefs** (adversarial: "find what is
     unbuildable", "find what a hostile reviewer would attack", "find what is missing for a
     designer") — useful, but not independent, and must be labelled as such.
- Recorded status until resolved: `independent cross-check: not-run`.

## 5. Open questions for the owner (each with a suggested default)

| ID | Question | Suggested default if you don't answer |
|---|---|---|
| Q1 | Which web stack must the Studio work on first? | **resolved by D18:** framework-agnostic; mapping spike on Next.js AND Astro (A2b); winner decided by measured confidence-per-effort, not popularity |
| Q2 | Does `APERIO` mean "start building" **or** "activate the Aperio Next workflow"? | **resolved by D19:** start building only |
| Q3 | What is "HAL"? A codename for the multi-agent cross-check, or a real tool? | **resolved by D22:** owner typo; verified absent from all original documents |
| Q4 | Studio scope at v1: local dev only, or also staging URLs with a token? | open — local-dev-only proposed; staging opt-in deferred to M8; confirm at ADR-003 approval |
| Q5 | Should SUS include *native mobile* (iOS/Android) guidance at launch? | **resolved by D14:** web only. Native is explicitly out of scope and documented as such |
| Q6 | Language priority for the knowledge library | English content, internationalisation-ready structure (logical CSS, no hardcoded strings in examples) |
| Q7 | Is "heavy" allowed to mean a Rust/Node CLI dependency for the detector, or must it be zero-install JS? | **proposed as ADR-006:** zero-install TS/Node at v1; native module only behind a measured trigger |
| Q8 | Who is the first real user/test subject for M1.5 fixtures — your own projects? | **resolved by D21:** owner's real projects allowed as read-only fixture sources; 4 apps, one per surface mode |
| Q9 | Do you want a public "SUS vs Impeccable" comparison page at any point? | only after the benchmark protocol runs; until then no comparative marketing |

### Resolved scope note (D14)

SUS is a **web/UI-UX product**: marketing sites, CMS-driven content sites, CRM/dashboard/admin UI,
portfolios and e-commerce, in that priority order. Native mobile, desktop apps, email and print are
out of scope at v1 and must be stated as limitations rather than half-supported. This changes:
fixture corpus = 4 apps (one per surface mode), playbook build order, and the critique vocabulary
(brand surfaces vs product surfaces must not be judged by each other's conventions).

## 6. What the PRD gets right (do not change)

- Section-by-section approval with persistent project memory — this is the real differentiator.
- Three-tier anti-slop taxonomy with false-positive concern built in.
- Honest capability matrix instead of "works everywhere".
- Motion as mandatory, with reduced-motion alternatives and interruption tests.
- Fail-closed Studio mapping, localhost trust boundary, no arbitrary command execution.
- Refusal to promise bug-free/original/ranked outcomes.

## Namespace legend and review-driven open questions (2026-11-13)

**Finding namespaces:** `GA-nn` = findings in this document (F1–F20). `DA-nn` = findings in
`DEEP_AUDIT_2026-11-13.md` (F01–F48). Task acceptance criteria now use these prefixes, so a bare
`F13` can no longer mean two different things.

Open questions raised by independent reviews and still owned by the owner:

| # | Question | Why it matters | Current default |
|---|---|---|---|
| Q10 | What effort/calendar envelope is realistic (single person part-time, full-time, or team)? | 88 micro-tasks with ~13 milestones imply months; no estimate exists anywhere (review MISS-1/MISS-2) | no calendar promise; one task at a time, commit after each |
| Q11 | Is any telemetry/monitoring of the shipped skill acceptable, and under what privacy rules? | the shipped product currently has no observability plan (review MISS-4) | no telemetry at v1; local evidence bundles only |
| Q12 | Who signs off a scope cut when pressure hits, and is the A12 cut order acceptable? | prevents silent scope reduction (review MISS-3) | A12 order, cuts recorded in `DECISIONS.md` |
| Q13 | Should Studio support static-HTML projects at GA (benchmark target does)? | changes the Studio target surface and the competitive claim (review C-4/H11) | CSS-only write path, `experimental`, documented degradation |
