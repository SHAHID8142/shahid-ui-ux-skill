# SUS — PRD Amendments v1.1 (Proposed)

**Amends:** `SUS_MASTER_PRD_v1.0.md` · `ROADMAP_AND_TASK_PROTOCOL.md`
**Rationale:** `RESEARCH_AND_EXPERTISE_MODEL.md`
**Status:** proposed, awaiting owner approval. Nothing here is implemented.
**Change-control rule:** this file is additive. Every amendment states which PRD section it
touches, why, and what evidence would prove it worked. v1.0 remains authoritative where not amended.

---

## Part 0 — Product scope (owner decision D14)

SUS v1 targets **web interfaces only**, in this priority order:

| Priority | Surface | Mode | Examples |
|---|---|---|---|
| 1 | Marketing / landing sites | Persuade | SaaS home, campaign, agency, pricing page |
| 2 | E-commerce | Persuade + Operate | catalog, search/filter, PDP, cart, checkout |
| 3 | CRM / dashboards / admin | Operate | records, lists, tables, settings, reports |
| 4 | CMS **admin / control panel** | Operate | content lists, editors, media library, roles, settings |
| 5 | Portfolios / case studies | Experience | gallery, project detail, contact |

**Out of scope at v1** (documented, not silently ignored): native iOS/Android, desktop apps,
email templates, print, games, WebGL/3D-heavy experiences.

Consequences, recorded as requirements:
- Four surface modes (Persuade / Operate / Read / Experience) drive the critique vocabulary and
  playbook selection; **brand surfaces must not be judged by product-UI conventions, and vice versa**.
- Fixture corpus (A1) becomes **four apps, one per mode** — not three.
- Playbook build order follows `COVERAGE_MATRIX.md` §2 exactly — launch set: navbar → hero →
  CTA/button → form/input → cards → pricing → product grid/PDP → cart/checkout → data table →
  footer → empty/loading/error → modal → toast; second wave (search/filters, settings, dashboard
  widgets, onboarding, article, gallery) starts M8. No playbook may jump the queue.
- CMS means the **admin/control panel** for a site (Operate), not content-driven public pages. Public
  content pages are covered under marketing/Read as a secondary surface.
- WCAG 2.2 AA applies to every surface; e-commerce checkout additionally gets an error-recovery and
  payment-state checklist (never silently drop an order or double-submit).

## Part 0.5 — Epistemic contract (D15–D17)

This part governs how SUS *reasons*, and it overrides any convenience shortcut elsewhere.

### E1. No templates, ever

Forbidden as product behaviour: preset visual worlds to paste, page skeletons ("hero with three
feature cards"), ready-made section recipes, copy templates, auto-generated palettes presented as
a brand decision, and any `create` flow that fills blanks from a catalogue.
Allowed: rules, constraints, evidence, checklists, taxonomies, exemplars **cited as evidence for a
reason** — never as assets to reuse. Every produced artifact must be traceable to the project brief
plus cited reasoning. If the agent cannot trace a decision, it has to say so.

### E2. Four kinds of claim (and only four)

| Kind | Example | Weight |
|---|---|---|
| **Standard** | WCAG 2.2 1.4.3 contrast, ARIA APG combobox keys | normative, cited |
| **Observed** | "tap targets measure 18×18 px in this build" | strongest; measured here, reproducible |
| **Prior** | "side-tab cards usually read as decoration" | hypothesis, labelled, confidence capped |
| **Preference** | "I want it darker" | legitimate, never presented as evidence |

A finding that cannot name its kind is rejected. "Looks better" alone is not a claim.

### E3. Challenge protocol (argue and bargain)

When a request conflicts with best practice, the agent must classify before responding:

1. **Taste/preference** → obey fully, no argument. The owner owns taste.
2. **Claim about outcomes** ("users want X", "popups convert") → contest: evidence grade, impact,
   the cheapest test that would settle it, and what would change the agent's mind.
3. **Accessibility / legal / safety floor** → never silently comply and never silently refuse: state
   the specific criterion, offer the closest compliant alternative that preserves intent, and if the
   owner still insists, record a **signed exception** in `DECISIONS.md` (owner owns the risk).
4. **Unknown** → say so and research, or label the assumption and proceed.

Every challenge is delivered as: **conflict → evidence (kind + source) → impact (who is harmed and
how) → cheapest alternative → what would change my mind → cost of being wrong**. No nagging: once
the owner has been informed and decides, the agent complies and logs it.

### E4. Dissent ledger

`DECISIONS.md` keeps an append-only record: `{request, objection, evidence, owner decision,
exception expiry, revisit_trigger}`. This makes "why did you let me ship that?" answerable, stops
re-arguing the same point, and gives the owner a quarterly audit of their own overrides.

### E5. No silent compliance, no silent refusal

Both are failures. The only legal outcomes are: comply with the objection recorded, comply after
persuasion, or refuse with a cited criterion plus a compliant alternative.

### E6. Contradiction surfacing

If a new instruction contradicts a recorded decision, the agent must show both verbatim and ask
which supersedes — it may not quietly overwrite. This applies to briefs, tokens, sections and
commands.

### E7. Priors are hypotheses

Training-data instincts may not be stated as fact. Each is either upgraded to *Standard* (cited) or
*Observed* (measured), or it stays a *Prior* with explicit confidence and a falsification test.

### E8. Prediction ledger (learning, not belief)

Every section states ≥1 falsifiable prediction before implementation ("headline fits 3 lines at
390 px", "checkout reaches confirmation in one submit"). After implementation the prediction is
checked and recorded. A failed prediction becomes a project lesson in `.sus/LESSONS.md` and, after
review, a candidate rule in the knowledge base with its evidence.

### E9. Calibration is a product metric

Track prediction hit-rate and rubric-vs-human agreement. A system that cannot measure its own
accuracy is a believer by definition.

## Part 1 — Sequencing amendments

### A1. New milestone **M1.5 — Evaluation Spine** (before M2)
Rationale: a "robust and heavy" product cannot be written blind. Measurement must exist before
the knowledge library, so every later module is graded, not asserted.

Deliverables: `evals/` runner; rubric schema + scoring CLI; screenshot harness (3 viewports ×
2 themes); axe-core + Lighthouse budgets; evidence store; fixture corpus v1 (**4 apps**, one per
surface mode: marketing (Persuade), e-commerce (Persuade+Operate), CRM/CMS-admin dashboard
(Operate), portfolio (Experience/Read)); blind A/B judge protocol; no-skill baseline record.
Exit evidence: baseline scores for unassisted agent on all 3 fixtures, reproducible by command.

### A2. New milestone **M4.0 — Direction Reasoning** (first task of M4)
Rationale: the largest cause of AI-typical output is an uncommitted aesthetic — but presets would
only move the default. The direction must be *derived and defended*, never selected from templates.

Deliverables: a **strategy taxonomy** (not a catalogue of looks) — each entry states a visual
strategy, the reasons it works, what it costs, contraindications, and citations; a **Banned Defaults**
list derived from research; per-project **anti-references**; a **derivation record**
(brief → constraints → 3 candidate directions → evidence for each → committed thesis); and a
**uniqueness check** (§5). Exit evidence: one brief produces three materially distinct, *reasoned*
directions; the committed one carries a thesis line and a falsifiable prediction.

### A2b. Framework-agnostic, decided by measurement (D18)
The skill core must contain **no framework assumptions**: knowledge speaks in HTML, CSS, ARIA,
layout and interaction terms. Stack-specific code lives only in adapters.
Before committing a Studio target, run the mapping spike on **two** stacks the owner actually uses
— **Next.js (App Router)** and **Astro** — and score both on: mapping confidence, instrumentation
intrusiveness, CSS model friction (Tailwind / scoped / CSS modules), HMR behaviour, and effort.
Decision rule: pick the stack with the best confidence-per-effort; publish the other as
`experimental` with its real limitations. No framework is chosen on popularity alone.

### A3. Split **M5** into 5A contract/state and 5B progressive build
5A: schemas + state machine + persistence, tested without UI. 5B: enforcement in the build loop.
Rationale: the gate must exist before the workflow that obeys it.

### A4. New **M4.7 — Content-first module**
Real content inventory before layout; `lorem` and placeholder claims blocked (G3); message
hierarchy ladder (claim → proof → action); claims register (no invented metrics or testimonials);
copy review as a design artifact, not a final polish step.

### A5. New **M4.8 — Art direction & imagery**
Image strategy per direction (photography / illustration / typographic / none), sourcing and
licensing record, focal points and crop ratios, aspect-ratio variants, alt-text contract, weight
and format budget (AVIF/WebP, responsive `srcset`). Rationale: missing or generic imagery is the
most common reason a well-composed page still reads as AI-made.

### A6. New **M6.5 — Interaction state-machine schema**
States, transitions, guards, interruption policy, announcement text — written as data, not prose.
Motion specs attach to transitions. Tests are generated from the schema.

### A7. New **M5.5 — Hardening matrix**
Per section: 0 / 1 / many items, 200-char and 40-char strings, RTL, +40% i18n growth, 200% zoom,
dark + light, reduced motion, slow network, offline, injected error. Blocking at M8 for GA,
advisory earlier.

### A8. Restructure **M7** into spike → slice → verification
- **M7.0 Mapping spike (time-boxed).** Prove DOM→source mapping on **two real apps** (Next.js and
  Astro, per A2b); record confidence distribution and failure cases. **Go/no-go metrics:** ≥90% of
  picked nodes map to a single source node with confidence ≥0.8 on at least one stack; else re-scope
  Studio before M4–M6 investment.
- **M7.1–M7.8** vertical slice as in v1.0.
- **M7.9 Verification loop** (see §7.4): apply → build → a11y → screenshots → motion → pass/fail
  → auto-rollback.

### A9. New **M9.5 — Machine-readable support matrix**
One `compatibility.json` (host, version range, capability, tier: supported/experimental/untested,
test id, last verified) that generates the docs page and the CLI `status` output. Hand-maintained
prose matrices drift; generated ones cannot.

### A10. Continuous **Reference Implementations** track (from M5)
Three public dogfood sites built with SUS under the same rules as users: marketing, dashboard,
commerce. They serve as (a) fixtures, (b) evidence for claims, (c) failure discovery. No claim
of product quality without them.

## Part 2 — New CI-enforced gates

Gates are executable. A failing gate blocks the commit and the acceptance record.

| ID | Gate | Mechanism | Blocks |
|---|---|---|---|
| G1 | Token-only styling | lint: no raw hex/rgb/px in component scope when a token exists; exceptions need `DECISIONS.md` ref | commit |
| G2 | Section order | `SECTION_STATUS.md` machine read; section N+1 code present without N `accepted` → fail | commit |
| G3 | No placeholder content | lorem ipsum, "Lorem", "TODO copy", unregistered numeric claims | commit |
| G4 | A11y floor | axe-core: zero violations at serious/critical; contrast pairs computed | acceptance |
| G5 | Perf budget | LCP/CLS/INP field proxy + CSS/JS/font byte budgets per route | acceptance |
| G6 | Motion parity | every declared transition has a reduced-motion branch; no autoplay > 5 s without control | acceptance |
| G7 | Reflow | horizontal scroll at 320/390/768/1024/1440 = 0 | acceptance |
| G8 | Target size | interactive targets ≥24×24 CSS px (WCAG 2.2 2.5.8); ≥44 advisory | acceptance |
| G9 | Semantics | heading order, landmarks, one `h1`, focus-visible present, no click-only controls | acceptance |
| G10 | Detector quality | precision ≥ target and recall ≥ target on the labelled corpus before any rule ships as blocking | release |
| G11 | Evidence completeness | evidence bundle (§6) present and valid schema | acceptance |
| G12 | Contract drift | code tokens vs `DESIGN_CONTRACT.md` divergence report | weekly + release |

Rule: a gate may only be relaxed by an entry in `DECISIONS.md` naming the approver, the reason,
and the expiry date. Silent gate removal is detected by CI and reported as a policy violation.

## Part 3 — Design Quality Rubric v1

Twelve axes, each 1–5 with written anchors (1 = blocks users / actively harmful, 3 = works but
unconsidered, 5 = best-in-class for this brief). Composite = 60.

| Axis | Tier | Primary evidence |
|---|---|---|
| Hierarchy | hybrid | blur/contrast-rank test, DOM order vs visual rank |
| Composition & layout | hybrid | grid adherence, alignment residuals, measure |
| Typography | hybrid | scale count, CPL 45–75, line-height, fallback stack, 200% zoom |
| Colour & surface | deterministic | contrast pairs, palette size, token usage, dark-mode parity |
| Spacing & rhythm | deterministic | scale conformance, group/proximity ratios |
| Motion & interaction | hybrid | state-machine coverage, interruption, reduced-motion parity |
| Content & copy | hybrid | ladder completeness, claim register, reading level, no filler |
| Accessibility | deterministic | axe, keyboard walk, focus order, announcements |
| Responsive & edge cases | deterministic | hardening matrix pass rate |
| Consistency & system | deterministic | token reuse, component reuse, drift |
| Distinctiveness / POV | judged | direction thesis traceability, banned-defaults distance |
| Performance | deterministic | budget table |

Tiers: **deterministic** gates CI. **hybrid** scores deterministically where possible and is
validated by a critic. **judged** never gates CI — it informs the acceptance conversation, exactly
as published practice recommends.

Bands: 50–60 reference-grade · 42–49 strong, minor clean-up · 33–41 acceptable with named gaps ·
<33 rework required.

**Anti-inflation:** quarterly calibration against human ratings; a judged axis is trusted only
while agreement stays ≥80% within ±1 point. Below that, anchors are rewritten before the axis is
used in acceptance again. Scores and rationales are stored so drift is visible over time.

## Part 4 — Adversarial critique protocol

1. Author produces a section and writes its rationale (kept private to the author context).
2. Critic runs in a **fresh context** with: rendered screenshots, DOM metrics, axe output, motion
   trace, the brief, the direction thesis, and the rubric. It does **not** receive the author's
   rationale, code comments, or chat history.
3. Critic returns findings: axis, severity (P0 blocking → P3 polish), evidence reference, and the
   smallest change that would resolve it. P0/P1 findings cannot be self-dismissed.
4. Author resolves each finding: fix, or documented rebuttal with evidence. Rebuttals go to
   `DECISIONS.md`.
5. Acceptance requires zero open P0, all P1 resolved or rebutted, and rubric ≥ band threshold.
6. Where a host has no subagents, the critic runs as a separate session; if neither is possible,
   the record states `independent review: not-run` and the section cannot be marked GA-acceptable.

## Part 5 — Direction Engine spec

```yaml
direction_id: dir-<slug>
name: "…"                    # must be nameable in one phrase
thesis: "…"                   # one sentence: what the page argues visually
power_words: [3–5 adjectives with observable consequences]
type: {display: …, text: …, pairing_logic: …}
palette: {roles: …, constraint: …, dark_strategy: …}
composition: {grid: …, dominant_motif: …, density: …}
material: {surfaces: …, borders: …, depth_rule: "single light source: above"}
imagery: {strategy: …, treatment: …, licensing: …}
motion_character: {…}
contraindications: [where this direction is wrong]
anti_references: [what this must not look like, and why]
evidence: [{url, retrieved, classification}]
```

**Uniqueness check** (advisory in M4, blocking at M5): distance from the banned-defaults list, and
from the project's own previous sections/pages. Measured on: typeface class, palette hue/temperature,
corner-radius policy, shadow policy, dominant layout motif, imagery presence. Repetition above
threshold requires a recorded justification.

## Part 6 — Evidence bundle (acceptance artifact)

```json
{
  "section_id": "hero",
  "commit": "<sha>",
  "direction": "dir-<slug>",
  "rubric": {"hierarchy": 4, "…": "…", "composite": 47},
  "shots": ["1440-light.png", "1440-dark.png", "768-light.png", "768-dark.png", "390-light.png", "390-dark.png"],
  "metrics": {"overflow_320": 0, "cls": 0.01, "lcp_ms": 1800, "targets_under_24": 0},
  "a11y": {"axe_serious": 0, "keyboard_walk": "pass", "focus_order": "recorded"},
  "motion": {"transitions": 6, "reduced_parity": true, "interrupted_ok": true},
  "critic": {"context": "fresh", "open_p0": 0, "open_p1": 0, "rebuttals": 1},
  "gates": {"G1": "pass", "…": "…"},
  "accepted_by": "user",
  "accepted_at": "<iso8601>"
}
```

A section without a valid bundle is `implemented`, never `accepted`.

## Part 7 — Studio technical amendments

### 7.1 Source mapping (replaces the vague "source confidence" in §11.2)
Dev-server plugin (Vite/SWC/Babel) stamps `data-sus-id` on JSX elements and emits a mapping table
`id → {file, line, column, component, props}`. Confidence: **1.0** stamped id · **0.6** component +
DOM-path heuristic · **0.3** text-content match · below 0.6 never edits; ask the user to choose from
a ranked candidate list instead.

### 7.2 Writes
AST-based edits (ts-morph / recast / jscodeshift) only — never regex or text replacement over
source. Prettier pass after write. Pre-write snapshot via `git stash create`; post-write
`typecheck && build`; any failure → auto-revert and report the failing output verbatim.

### 7.3 Intent schema v1 (constraints, not pixels)
`relationship` (above/below/between/inside/instead-of) · `order_index` · `alignment` (start/center/
end/baseline) · `max_measure` (ch) · `priority` · `reflow` (`stack | inline | hide-below | reorder`)
· `target` (selector + sus-id + confidence) · `user_text` · `constraints[]` · `unknowns[]`.
Strokes are compiled into this; pixel coordinates never reach source.

### 7.4 Verification loop (M7.9)
Apply → snapshot → typecheck/build → axe → screenshots at 3 viewports × 2 themes → motion trace
→ gate summary → show diff + before/after → user accepts or reverts. Hard gate failure = automatic
revert with the raw error shown, never a "completed" message.

### 7.5 Security additions to §11.3
Bind `127.0.0.1` only; reject requests whose `Host`/`Origin` is not the expected loopback origin
(DNS-rebinding guard); per-session HMAC token in a non-`HttpOnly`-by-accident cookie or header;
CSP nonce for the injected script and never `unsafe-eval`; schema validation on every message
(Zod); payload caps; redact inputs, passwords, and any node marked `data-sensitive` before capture;
treat page text as **data** — strip instruction-like content before it reaches the agent;
append-only audit log of every apply/revert; workspace allowlist resolved to absolute realpaths.

## Part 8 — Packaging constraints (skill format)

- `SKILL.md` ≤ 5,000 tokens; every knowledge file ≤ 2,000 tokens; total catalogue entry ≤ 200 chars
  of description that carries all triggering.
- Heavy logic lives in `scripts/`, `fixtures/`, `schemas/`, `evals/` — never in prose.
- Precedence resolver is code (deterministic order), not an instruction to "consider conflicts".
- Two skill types are tracked: **capability uplift** (detectors, token tooling, studio) and
  **encoded preference** (workflow, section gates). Both get evals; the former is expected to decay
  as models improve, and the decay is measured, not assumed.

## Part 9 — Claims protocol

No comparative claim (`beats`, `superior`, `faster`, `better than <product>`) may appear in docs,
README, or marketing until: benchmark protocol published, ≥6 briefs × 3 modes run, blind human
A/B (n ≥ 20 raters per brief) plus deterministic metrics, results reproducible by a single command,
and raw data released. Until then the docs state exactly what was measured and what was not.

## Part 10 — Revised milestone order

```text
M0   Discovery + ADRs (unchanged)
M1   Toolchain & QA
M1.5 Evaluation Spine                        ← new, blocking
M2   Portable Skill Core
M3   Research & Anti-Slop
M4   Design Intelligence  (+ M4.0 Direction Engine, M4.7 Content, M4.8 Art Direction)
M5   Progressive Workflow (5A contract/state, 5B enforcement, M5.5 Hardening matrix)
M6   Motion System (+ M6.5 State-machine schema)
M7   Studio: M7.0 mapping spike → slice → M7.9 verification loop
M8   Studio Hardening
M9   Adapters (+ M9.5 generated support matrix)
M10  Benchmark, security/a11y review, docs, license, release
```

**First batch of five unlocked micro-tasks (proposed, per protocol §18 “first 3–5”):**
T0101 repo skeleton · T0102 test runner + fixture app A · T0103 lint/typecheck/CI ·
T0104 schema versioning + contract-test strategy · T0151 rubric schema + scoring CLI.
Next five: T0152 harness · T0152b axe + budgets · T0153 baselines · T0154 evidence schema ·
T0155 calibration.

## Part 11 — PRD section map

| PRD § | Change |
|---|---|
| §4 | add principle 13: weight lives in code and fixtures, not prompt prose |
| §6 | add six-lens critique taxonomy alongside foundation modules |
| §7 | add Direction commitment to the section brief; brief must include removed-items and cut list |
| §8 | add labelled corpus + precision/recall gate (G10) |
| §9 | replace motion prose with state-machine schema; add reduced-motion parity gate |
| §11 | replace confidence language with §7.1 mapping tiers; add verification loop and AST-write rule |
| §13 | add `EVIDENCE/` and `SESSIONS/` to project memory |
| §15 | add gates G1–G12 |
| §16 | add rubric bands as acceptance criteria; judged scores excluded from CI |
| §17 | milestone order per Part 10 |
| §18 | add adversarial critic protocol as mandatory review unit |
| §20 | record: evaluation spine precedes knowledge; benchmark before claims |

## Part 12 — New risks

| Risk | Mitigation |
|---|---|
| Rubric inflation makes scores meaningless | calibration vs humans, ±1 agreement ≥80%, stored rationales |
| Gates become bureaucratic and slow the loop | every gate must justify its runtime; measured per-section overhead budget |
| Direction library converges into a new kind of default | library must stay small and be audited for internal similarity; user brief overrides |
| Deterministic detector punishes valid design | labelled negative corpus; blocking status requires measured precision |
| AST rewrite breaks unusual code | snapshot + build + auto-revert; unknown syntax → refuse and report |
| Evidence bundles grow unmanageable | retention policy, hash + diff storage, cap per section |

---

**Approval:** architecture approval (A1–A10) and implementation-batch approval (first 8 tasks) are
separate decisions. Implementation does not start until both are recorded here.
