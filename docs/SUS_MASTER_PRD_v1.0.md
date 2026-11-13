# Shahid UI UX Skill (SUS)
## Master Product Requirements Document — Build Handoff v1.0

**Document status:** Requirements baseline ready for implementation planning; not a claim that software is built or validated.  
**Date:** 2026-11-13  
**Product name:** Shahid UI UX Skill  
**Short name:** SUS  
**Language of implementation documentation:** English for portability; user interface and content must support internationalization.  
**Development approach:** Agent-agnostic, research-led, micro-task-based, auditable, checkpointed.  
**Product vision:** An extensible, publicly usable, research-driven design intelligence system with a **mandatory visual collaboration studio**, allowing AI coding agents to reason, design, inspect, implement and verify high-quality digital interfaces one approved section at a time.

> **Important:** This PRD defines the desired product. No features are currently claimed implemented. Product distribution must be public and usable by others; **GitHub is a possible channel, not a fixed requirement**. The initial coding agent may be FreePi CLI, Codex, ZCode or another capable agent. No agent vendor or model version is assumed or hardcoded.

---

## 1. What the user wants (requirements of record)

1. **Not another generic prompt.** Build a portable master skill backed by domain-specific design expertise, tools, deterministic checks, research, examples and evaluations.
2. **Anti-slop without aesthetic dogma.** Detect overused, unconsidered or contextually inappropriate patterns while avoiding simplistic bans on cards, grids, gradients or familiar interfaces.
3. **Independent, evidence-based design judgment.** Research real human-made interfaces, modern practices and niche-specific competitors. Separate empirical evidence from subjective taste. Do not use the owner's prior agreements, disagreements or personal tastes as implicit design authority.
4. **Deep component intelligence.** Explain *how, when, where and why* to design every common UI component (button, input, CTA, navigation, etc.), including visual, copy, state, motion, accessibility, responsive and brand-fit decisions.
5. **Progressive section-by-section construction.** Plan the whole page before coding, but implement one small section or coherent component at a time, review it, revise it, explicitly approve it and only then move on. Build the project's design language incrementally.
6. **Project-wide consistency.** Maintain semantic design tokens, decisions, exceptions and reusable components across all pages, sections and sessions.
7. **Content and discovery expertise.** UX copy, conversion copy, SEO, search intent, headings, competitor gap analysis and human-sounding language are core design concerns, not afterthoughts.
8. **Motion is first-class and mandatory.** Agent must specify and implement purposeful animations and transitions for component states, entrances/exits, feedback, navigation and attention, including reduced-motion alternatives and explicit tests.
9. **SUS Live Studio is mandatory, not optional.** Browser-based live visual collaboration: point, select, box, pen, arrows, region designation, prompt, scan, preview, compare and approve changes with source-code connection. Must aim to outperform Impeccable Live on measurable workflows, not merely on feature count.
10. **Broad agent compatibility and simple install/load.** User can request “install SUS” / “load SUS” in compatible agents; global or project installations where supported. Do not promise identical slash-command syntax or automatic installs on all hosts.
11. **Public usability.** Others should eventually be able to obtain, install and use SUS; publication channel and license remain decisions to be finalized before release.
12. **High-reliability development process.** A construction agent must first create a complete work breakdown/dependency tree, then implement very small, verified tasks using fresh-context reviewers or independent review passes where possible, persistent progress state, safe approvals and regression checks.

## 2. Personas and supported workflows

**Primary users:** AI-assisted web/app builders, interface designers, frontend developers, design systems maintainers, small design/product teams.  
**Primary environments:** local source-code workspaces with a web dev server and a coding agent. The skill knowledge should remain useful when a graphical browser bridge is unavailable, but the *full SUS release must ship Live Studio*.

**Primary workflows:**
- New project: discover context → page blueprint → section proposal → approval → implement → screenshot/test → finalize design decisions → next section.
- Existing project: inspect/read-only audit → explain problems → propose bounded change → approval → implement → compare → tests → report.
- Visual workflow: launch live studio → select/annotate/draw region → create structured intent → plan/source diff → explicit accept → verify/undo.
- Design system: discover or initialize tokens → classify approved rules → sync component styles → detect drift.
- Anti-slop: scan deterministic signals + contextual evaluation → explain each finding → show alternatives → verify changes.
- Handoff/resume: new agent reads the repository state and the next unlocked work item; never depends on long chat history.

## 3. Non-goals and boundaries

- Cannot replace the agent model's pretrained knowledge or guarantee originality, ranking, conversion, accessibility, bug-free delivery or aesthetic superiority.
- No blind plagiarism or reimplementation of licensed/proprietary tools; use documented public behavior to define independent features.
- No blanket bans on common design motifs (gradients, cards, 12-column grids, glass effects).
- No unsupported guarantee that every AI agent supports skills, terminal access, slash commands, background processes or a browser overlay.
- No attempt to inject Live Studio into arbitrary third-party websites or production sites without authorization. **Local development / explicitly authorized staging only by default.**
- No silent editing, code deployment, publication, dependency installation, shell execution or outbound data transfer without applicable user/host permission.
- No automatic movement to the next *website section* until the user has explicitly accepted the current one. Coding micro-tasks within an approved scope may proceed under a defined checkpoint policy.

## 4. Operating principles

1. **Context before design:** business, niche, target users, product tasks, content facts, goals, brand personality and platform.
2. **Plan at page level; implement at section level:** design the overall information hierarchy first; do not code the full homepage in one shot.
3. **Progressively establish design identity:** distinguish global approved decisions, component conventions, section-specific exceptions and unapproved experiments.
4. **Research on demand:** use tools and current sources when available and relevant; never fabricate sources or claim live research when unavailable. Cache links with observation dates and licensing notes.
5. **Just-in-time skill loading:** activate minimum applicable foundation modules, playbooks, examples and scripts to avoid token bloat and contradictions.
6. **Explain and defend judgments:** include tradeoffs, user impact, evidence quality and alternatives; don't merely comply with aesthetic clichés.
7. **Approval gates:** user owns design direction and irreversible actions. Show plans and changes before applying them.
8. **Semantic tokens, not ad hoc values:** prefer role-based design tokens with controlled exceptions and documented reasons.
9. **Accessible and responsive by default:** keyboard, touch, visual, contrast and reduced-motion behavior must be specified.
10. **Observe, test, iterate:** rendered UI evidence and real tests outrank the agent claiming success.
11. **Composable architecture:** many playbooks, fewer shared foundations; no duplicated authoritative rules.
12. **Honest completion state:** mark tests passed, failed, blocked or not run; never label work “bug-free.”

## 5. System architecture

### 5.1 Portable SUS Skill Core

Use the official **Agent Skills** directory convention as the *portable skill packaging baseline*, with a required `SKILL.md` and YAML metadata. Use lightweight metadata in the entry skill and progressive disclosure via separate references, scripts and playbooks. Use `shahid-ui-ux-skill` as package/skill slug; present **SUS** as user-facing alias wherever host adapters allow.

Core layers:

1. **SUS Orchestrator:** task classification, scope control, research routing, skill selection, approval and reporting.
2. **Foundation expertise:** research, product strategy, visual composition, color, typography, spacing, tokens, accessibility, responsive, motion, content, SEO, interaction patterns, heuristics.
3. **Component/section playbooks:** CTA/button, navbar, menus, hero, forms, inputs, modals, lists, search, tables, pricing, cards, onboarding, dashboards, footers, empty/loading/error states, navigation, etc.
4. **Rules/reference/evaluation:** anti-slop registry, evidence, accessibility standards, benchmarks, visual baselines, examples, test fixtures.
5. **Commands & host adapters:** command intent API, host-specific invocation/install compatibility.
6. **Live Studio runtime:** browser overlay/editor, capture/context layer, secure local bridge, agent runtime connector, proposal/preview engine, source apply and rollback.
7. **Project-local state:** product brief, design contract, semantic tokens, decisions, section progress, source/benchmark results.

### 5.2 Runtime boundaries

The Markdown skill provides **reasoning instructions**, not direct browser or code powers. Live Studio and deterministic scanners are separate software packages. Adapter contracts isolate agent-specific protocols from the shared intelligence and local bridge. If a capability is absent, report a capability limitation and offer safe manual instructions; do not pretend it executed.

### 5.3 Tentative repository layout (architecture, not pre-implementation mandate)

```text
sus/
  SKILL.md                    # official portable entry skill
  README.md
  LICENSE                     # selected before public release
  CHANGELOG.md
  CONTRIBUTING.md
  docs/
    PRD.md
    architecture/
    installation/
    compatibility-matrix.md
    research-policy.md
  skills/
    foundations/             # scoped SKILL.md / references
    playbooks/               # component and section expertise
    commands/                # intent contracts, not universal slash syntax
  knowledge/
    anti-slop/
    references/
    examples/
  packages/
    studio-web/               # overlay and UX
    studio-bridge/            # local agent/app bridge
    scanners/                 # deterministic analysis
    design-tokens/            # parsers/validators/exporters
  adapters/
    codex/
    claude-code/
    cursor/
    antigravity/
    zcode/
    goose/
    freepi/
    copilot/
    workbuddy/
    autopilot/
    hermes/
  fixtures/
  evals/
  tests/
  scripts/
  .sus/
    PRODUCT.md
    DESIGN_CONTRACT.md
    DECISIONS.md
    SECTION_STATUS.md
    progress/                 # machine-readable resumable checkpoints
```

**Note:** `.sus/` is **per target project**, not just per SUS source repository. The builder must use atomic updates and avoid overwriting existing decisions. The actual implementation layout must be justified by an ADR (architecture decision record) before being frozen.

## 6. Knowledge modules and activation model

**Foundation modules (mandatory coverage):**
- Research & Evidence Intelligence; Domain/Niche and Competitor Research; Product/Brand Strategy.
- Anti-Slop Detection and Contextual Critique.
- Color, Contrast, Light/Dark and Surface Systems.
- Typography, Multilingual Legibility, Text Density and Hierarchy.
- Grid, Layout, Composition, Breakpoints and Responsive Rules.
- Design Tokens, Component Variants, Theming and Design Drift.
- Accessibility, Semantic HTML, ARIA and Keyboard/Touch Interaction.
- Motion & Interaction Intelligence (see §9).
- UX Writing, Microcopy, Messaging and SEO (see §10).
- UX Heuristics, Usability, Onboarding, Navigation and Information Architecture.
- Visual QA, Functional QA, Performance and Design Evaluation.

**Component/section playbook requirements:** create a reusable schema and progressively cover the component catalog. Each playbook must contain:

1. Intent and use cases; niche-specific differences.
2. Inputs: brand, audience, user task, device, location within hierarchy, existing tokens.
3. Anatomy and semantics.
4. Visual styling: dimensions, color role, surfaces, typography, positioning, spacing, iconography.
5. Variants **versus states** (distinct concepts), and state transitions.
6. Motion specification plus reduced-motion alternative.
7. Accessibility and keyboard/touch behavior.
8. Responsive adaptations and overflow/data edge cases.
9. Copy/content and SEO where applicable.
10. Legitimate alternatives, anti-pattern warnings, tradeoffs and contraindications.
11. Research references with dates and evidence grades.
12. Acceptance tests, visual examples and failure cases.

A CTA playbook can pull from Button, Copywriting, Motion and Color foundations. It must **not** duplicate authoritative motion/color rules. The orchestrator should read the relevant files only, in a stable precedence order: **security/accessibility constraints → explicit current project contract → user-approved local exceptions → shared foundation rules → niche/playbook guidance → current optional trends**. Conflicts must be surfaced, not silently resolved.

## 7. Progressive section-by-section design workflow

### 7.1 Full-page blueprint (planning only)

Create a short initial page brief: audience, priority jobs-to-be-done, section list/order, narrative, SEO/search intent, content requirements, page-wide hierarchy, tokens and risks. **Do not generate or modify all sections.** Ask for any genuinely blocking inputs; otherwise use clearly labeled proposals/defaults.

### 7.2 One section at a time

For section N:

1. Read `.sus/PRODUCT.md`, approved `DESIGN_CONTRACT.md`, tokens and preceding section decisions.
2. Inspect existing code/rendered UI and section-specific user goal.
3. Run proportional research: relevant user studies/standards, niche examples, competitive gaps, content needs, actual feasibility.
4. Load specific playbooks/foundations, including motion and responsive states.
5. Produce **Section Design Brief**: hierarchy, copy, layout, tokens, interactions, states, motion, desktop/tablet/mobile behavior, accessibility, SEO relevance, alternatives, anti-slop risk.
6. Propose bounded change: files affected, mock/wireframe or visual example when available, criteria and risk. **Wait for explicit user approval to implement.**
7. Implement only approved section/component. No unrelated refactor or other section implementation.
8. Inspect running UI in supported environments; test functional, responsive, accessibility, motion and diff.
9. Show result for review; revise until accepted. **Wait for explicit acceptance before advancing to section N+1.**
10. Promote approved generalizable decisions into semantic tokens/contract; mark section-specific exceptions separately; update status.

Do not overfit the entire site to the first navbar: subsequent sections may propose intentional exceptions, subject to review. A user may explicitly request multi-section work; even then approval checkpoints remain per section unless the user explicitly changes this policy.

### 7.3 Minimum Section Design Brief template

```yaml
section_id: hero
objective: "..."
audience_intent: "..."
brand_fit: "..."
reference_evidence: []
information_hierarchy: []
copy_and_seo: {}
layout_by_viewport: {desktop: "...", tablet: "...", mobile: "..."}
component_playbooks: []
visual_tokens: []
interaction_state_matrix: []
motion_plan: {purpose: "...", transitions: [], reduced_motion: "..."}
a11y_tests: []
anti_slop_review: []
files_to_change: []
rollback_plan: "..."
implementation_approval: pending
visual_acceptance: pending
```

## 8. Anti-Slop Intelligence and evaluation

### 8.1 Three distinct finding types

- **Objective defect:** e.g., inaccessible contrast, broken focus, missing error feedback, overflow, nonresponsive navigation.
- **Contextual mismatch:** e.g., brand-inconsistent illustration, repetitive layout ignoring information hierarchy, excessive CTA competition.
- **Aesthetic stereotype:** e.g., blue-purple gradient, generic startup hero, repeated 3-up icon cards, gratuitous glassmorphism, stock-like AI copy, bland uniform spacing, ambient loops without purpose.

Only the first category is reliably hard-blocking by default; the others require product context, evidence and alternatives. A scanner does not “prove AI origin.”

### 8.2 Taxonomy management

Maintain versioned `pattern_id`, name, observation/examples, why it may be harmful, legitimate uses, detection methods, severity/confidence, false-positive cases, recommended repair, evidence/source/date, limitations and regression fixtures. Include visual, copy, motion, layout, component, interaction, accessibility and system consistency categories. No exhaustive one-time internet claim: plan scheduled research updates and source review.

### 8.3 Dual-mode evaluation

- **Deterministic scan:** inspect DOM, computed styles, AST/CSS, token usage and rules with CI-readable machine output.
- **Contextual agent review:** explain brand/niche suitability and tradeoffs; never present aesthetic judgments as objective defects.
- **Visual overlay:** highlight source-linked findings in Studio; allow dismiss/accept and reason tracking.
- **False-positive benchmark:** test acceptable uses of familiar design patterns; calibrate thresholds and report precision/recall before publishing detector claims.

## 9. Mandatory Motion & Interaction Intelligence

Motion is **not decorative polish added last**. Every relevant component and section must specify its interaction model before implementation. The skill must distinguish **visual variants** (`primary`, `secondary`, `ghost`, `destructive`, `link`, etc.) from **runtime states** (`default`, `hover`, `focus-visible`, `pressed`, `active/selected`, `disabled`, `loading`, `success`, `error`, `expanded/collapsed`, `dragging`, `entering/exiting`, etc.). Not all state combinations are legal; document precedence and interruption handling.

### 9.1 Core motion categories

1. Feedback: click/press, validation, submit progress, success, error, toast, system status.
2. State transition: hover/focus/pressed, expanded/selected, toggle, checkbox, switch, disabled/loading.
3. Navigation and continuity: menus, tabs, drawers, accordions, route transitions, modal/dialog transitions.
4. Entrance/exit: content reveal, insertion/removal, skeleton → content, empty/loading/error transitions.
5. Spatial continuity: layout changes, repositioning, reordering, drag/drop, resizing, shared elements.
6. Attention/ambient: badges, priority CTA, hints and **restrained, justified loops** only when they improve comprehension or utility.
7. Gesture/touch behavior: press feedback, swipes, overscroll and interrupted gestures.
8. Scrollytelling/progress: only when appropriate and not disruptive.

### 9.2 Required motion specification per affected element

For every nontrivial transition record: **trigger → origin state → target state → user purpose → property → temporal behavior → easing → direction/distance → interruption/cancellation → reduced-motion behavior → performance budget → verification method.** Timings are tokens or experimentally tuned values; do not impose arbitrary universal durations. Use performant compositor-friendly properties where possible; avoid costly layout animation unless justified. Every animation must have meaningful completion/cancellation behavior.

### 9.3 Specific mandatory state coverage

| UI element | Minimum states and behaviors to test |
|---|---|
| Button / CTA | variant-by-state matrix; keyboard focus, hover, pressed, loading, disabled, success/failure; optional attention loop; no click duplication |
| Input / textarea | default, focus, hover, filled, invalid, validating, error, success, disabled, read-only; labels/help/error persist and remain announced |
| Dropdown / nav | open/close, active route, pointer and keyboard traversal, focus restoration, escape, outside click, touch and responsive collapse |
| Modal / dialog | entering/open/exiting, focus trap, background inertness, escape and focus return; interrupted closing |
| Form / upload | validation/error/success/progress/cancel, async timeout, retriable failures, no flashing as sole feedback |
| Cards / lists | hover/focus only where interactive, selection, filter/reorder, skeleton-to-loaded, empty state |
| Page / section | reveal only when useful, not hidden permanently without JS, respects reduced motion, sensible viewport behavior |
| Toast / notification | arrival, persistence, dismissal, screen reader announcement, no inaccessible timeouts |

### 9.4 Accessibility and reliability

- WCAG 2.2 AA is baseline. Aim to satisfy animation-from-interactions control (WCAG 2.3.3 AAA) when applicable; support `prefers-reduced-motion: reduce` and an appropriate alternative, not just faster animation.
- No flashing above accessibility thresholds; avoid forced parallax/auto-play motion; provide pause/stop/hide for moving or auto-updating content as required.
- Focus visibility and semantics must remain intact across animated state changes; do not use color or motion as the sole status signal.
- Use automated tests for transition presence/state convergence, no duplicate actions, reduced-motion response; use browser inspection/video where needed for timing and visual correctness.
- Respect touch devices with no hover and user preferences for contrast and motion. Test interrupted animations, fast repeated clicks, stale async results, navigation during transitions, unmount/re-render.
- Motion library selection is **an engineering decision**, not a requirement; prioritize lightweight, accessible and maintainable implementations.

### 9.5 Motion tokens

Provide semantic motion tokens: duration categories, easing curves, distance/intensity levels, stagger constraints, reduced-motion alternatives and transition intent. Keep actual values in the project design contract and justify exceptions. Include motion diff/QA in every section review, not merely end-of-project audit.

## 10. Content, UX Writing, SEO and competitive intelligence

- Discover actual product claims, audience needs and brand voice; do not invent metrics, testimonials, guarantees or customer quotations.
- Recommend page-level content strategy (information hierarchy and search intent), then optimize section headlines, subtext, CTA labels, forms, errors and empty states.
- Reject vague AI-style copy when it obscures meaning; prefer concrete differentiation, evidence, user outcomes, clarity and purposeful brevity. “Humanized” is not a style stereotype.
- Research competitor titles/messages where access is permitted; document differentiation hypothesis and evidence. Do not imitate copyrighted text or claim competitor gaps without observations.
- Use meaningful semantic headings, metadata, internal links and structured data when applicable. **There is no universal SEO word count or title character limit that guarantees ranking**; prioritize search intent and usefulness.
- SEO and conversion goals must never override factual accuracy, accessible content or user trust.
- Where web research tools are absent: identify assumptions, record research TODOs and limit confident competitive claims.

## 11. SUS Live Studio — mandatory product subsystem

**Required to consider full public SUS v1 GA complete.** Earlier internal milestone releases may ship portions of Studio under clearly labeled alpha/beta status; they may not be called full feature-complete SUS.

### 11.1 User-facing capabilities

- One-entry launch intent (e.g., `sus live` or `/sus live` where supported), dev-server discovery, attach/disconnect and status.
- Floating/selectable browser overlay; inspect DOM target and map to source where practical.
- Pen/freehand, rectangle/region, arrows, callouts, text annotation, multi-selection, between-section insertion markers and undo/redo of annotations.
- Spatial editing: “move this heading to this drawn box”; “put description here”; “insert block between these sections”; “align selected buttons to this guide.”
- Translate viewport strokes to **responsive semantic constraints** (relationships, ordering, alignment, sizing, breakpoints), not literal fixed pixel positions.
- Browser-side prompt panel, optional speech-to-text only if permissions/capability available, selection context preview, task plan, sources/affected files and diff review.
- Source-linked AI slop/accessibility/consistency scan; allow suppressions with reasons and re-scan.
- Preview multiple variants, compare before/after across chosen viewports, accept/discard one proposal, rollback accepted changes when feasible.
- Track design decisions; only promote approved conventions to project memory.
- Session recovery, reconnect after dev-server restart, stale mapping detection, safe fallback when source mapping is ambiguous.

### 11.2 Processing pipeline

1. Capture selected target with stable semantic selector and source-map/AST hints, DOM tree excerpt, computed styles, viewport, screenshot crop and annotation geometry. Avoid capturing sensitive content by default.
2. Normalize to a versioned **Visual Intent Schema** (anchors, relations, target region, constraints, user text, priority, source confidence).
3. Detect ambiguous targets and ask a focused clarification. Never edit a guessed file when confidence is low.
4. Create section-bounded implementation plan; show source diffs and responsive alternatives.
5. User explicitly approves; adapter delegates to allowed coding agent process.
6. Verify source diff, browser render, accessibility, interaction states, responsive behavior and motion.
7. Present results with undo/rollback and update project decisions only on user acceptance.

### 11.3 Security, privacy and recovery

- Localhost-only binding by default; explicit opt-in and scoped authentication for remote connections. Origin checks, anti-CSRF and authenticated message channels. Do not assume a localhost port is automatically secure.
- No arbitrary remote command execution from web annotations; schema validation, workspace allowlist, per-operation permissions and audit logging.
- No production injection, silent CSP weakening or filesystem edits outside workspace. Any temporary dev-server instrumentation must be clearly surfaced, scoped and reliably reverted.
- Sanitize DOM/annotation content treated as untrusted; guard prompt injection in pages, screenshots and scraped content.
- Define screenshot/DOM retention, opt-in telemetry, secret redaction and deletion controls. Offline-safe mode where feasible.
- Atomic code modifications, Git-aware diff and rollback strategy; detect conflicts with user edits, preserve uncommitted changes.
- Fail closed on ambiguous mapping or disconnected agent; preserve annotations and offer retry or export.

### 11.4 Compatibility boundaries

The **core SUS feature requires a functioning Live Studio on supported local web development stacks**, not universal runtime compatibility on every third-party/mobile environment. Start with one well-tested stack as a vertical slice (choose after repo/feasibility study), then grow a published compatibility matrix. Do not claim Studio support for a host or framework without an end-to-end test.

### 11.5 Demonstrable superiority benchmark

Compare against public documented Impeccable Live behavior with equivalent tasks, measuring: annotation-to-target correctness, source-map resolution, responsive success, a11y regressions, approval/undo reliability, recoverability, edits per task and number of user correction loops. “Far superior” is an **aspirational benchmark**, not a factual claim before testing.

## 12. Commands and agent compatibility

**Stable intents:** `audit`, `unslop`, `refine`, `redesign`, `create`, `system`, `live`. Motion expertise may be available as `motion` or `animate` sub-intent; also auto-load wherever interaction states demand it. Natural language equivalents must work when a host can discover skills. Syntax may appear as `/sus audit`, `$sus`, tool calls or a CLI wrapper depending on host.

**Target host backlog:** OpenAI Codex Desktop/CLI; Claude Code; Cursor; Google Antigravity; ZCode; Goose; FreePi CLI; GitHub Copilot/CLI; WorkBuddy; Auto Pilot (exact product unresolved); Hermes Agent. Validate exact identity, documentation and permissions **before** writing specific adapters for ambiguous brands. Supported, experimental and not-yet-tested must be explicit statuses. No guessed support claims.

**Distribution/installation experience:** common instructions “install SUS” and “load SUS”, user/global or workspace-level where the host permits, portable entry skill, verified checksums/signed artifacts if practical, update, status, uninstall and rollback. Existing multi-agent installers may be reused if maintained and suitable; don't build a bespoke installer before assessing them. Channel/repository and open-source license are open decisions; user approval before any public publication.

## 13. Project-local memory and consistency contract

Maintain a machine-readable and human-readable contract for each consuming project:

- `PRODUCT.md`: audience, goals, niche, product claims, personality, anti-references, source dates and boundaries.
- `DESIGN_CONTRACT.md`: brand attributes, typography/color/spacing/motion tokens, accessibility targets, component variants, responsive strategy, page hierarchy.
- `DECISIONS.md`: ADR-like entries with decision, justification, alternatives, approval status, impact scope, date and source.
- `SECTION_STATUS.md`: planned → researched → proposed → approved-to-build → implemented → verified → accepted; blockers and revisions.
- Portable token data (DTCG-aligned where feasible) plus framework-specific generated CSS/JS only as derived outputs.

Project contract is never automatically promoted based solely on one section. Resolve conflict with existing user files before updating; maintain history and offer migration. Distinguish *approved global decisions* from *local experiments* and *aesthetic suggestions*.

## 14. Research provenance and knowledge maintenance

Maintain a reference inventory with source title, URL, retrieval date, content classification (normative standard / research / professional article / community anecdote / marketing), license, credibility notes, claims supported, and last review date. Use direct human-created examples only within licensing restrictions. Avoid claiming a complete internet census. Keep research updates versioned and optionally automated later, with human review before changing normative design rules. Detectors/playbooks must be traceable to sources or clearly labeled taste hypotheses.

## 15. Engineering and testing requirements

- Prefer a typed, modular, testable stack for the runtime, but select framework/monorepo/build tools via feasibility ADR; no forced TypeScript/Vite/Next requirement from this PRD.
- Tests: unit, schema, contract, integration, end-to-end with browser, visual regression, accessibility, security, installer smoke, adapter checks, offline/reconnect/recovery, reduced-motion and keyboard/touch.
- CI executes deterministic scanners and validators on test fixtures; agent reviews are supplementary, **not** sole evidence.
- No fixed “bug-free” promise: ship only when critical blockers are addressed, tests pass and known limitations are documented.
- User-facing error states, logs and reproducible issue diagnostics; avoid hiding failures behind “successful” agent messages.
- Dependency hygiene: lockfiles, license review, SCA where available, no unauthorized scripts executed from untrusted sources.
- Version interfaces and machine schemas; adapters must tolerate unsupported capabilities through explicit errors.

## 16. Proposed measurable acceptance criteria (targets, not measured claims)

| Gate | Required demonstration |
|---|---|
| A. Skill format | Portable entry validates against current Agent Skills spec; invocation produces appropriate selective module loading. |
| B. Research honesty | No fabricated citations in controlled fixtures; offline/no-web mode explicitly disclosed. |
| C. Progressive workflow | Given a 4-section page, agent builds at most the approved section; pauses before the next section; project contract persists after approval. |
| D. Components | Button, navbar and input playbooks cover semantics, variants, states, motion, responsive and accessibility; expand catalog against prioritized matrix. |
| E. Motion | Automated tests cover hover/focus/pressed/loading/error/success where applicable; `prefers-reduced-motion`, interrupted actions and state convergence. |
| F. Anti-slop | Versioned detector fixtures include true positives and false positives; precision/recall measured; cosmetic findings not treated as certain defects. |
| G. Live spatial editing | End-to-end demo: move heading into drawn region, place subtext and insert between sections; resulting code responsive and reversible. |
| H. Live safety | Unauthorized/ambiguous workspace edit is blocked; lost bridge reconnect does not corrupt code; annotations preserved; uncommitted edits not overwritten. |
| I. Visual verification | Compare baseline and changed UI in supported desktop/tablet/mobile fixtures; accessibility checks plus keyboard navigation; review surfaced before acceptance. |
| J. Compatibility | Honest support matrix, installation, invocation and smoke tests on each host claimed supported. |
| K. Public usability | Approved distribution channel, suitable license, docs, install/uninstall, versioning, release assets, no secrets or unauthorized content. |
| L. Competitive claims | Superiority statements prohibited until repeatable benchmark results exist; publish protocol and measured results. |

**Suggested release quality policy:** zero known critical security/data-loss defects and zero unresolved critical accessibility blockers within supported scope; all required CI gates green; documented noncritical issues and reproducible release smoke tests. Define specific numerical test/benchmark targets before implementing an evaluator; avoid arbitrary percentages masquerading as validated thresholds.

## 17. Development milestones and dependency-based work tree

The work breakdown must be generated **before code changes**, assigned stable IDs, dependencies, acceptance checks, evidence links and status. One micro-task at a time by default; no massive parallel rewrite. Details and example tree in `ROADMAP_AND_TASK_PROTOCOL.md`.

| Milestone | Completion evidence | Depends on |
|---|---|---|
| M0 — Discovery & ADRs | Existing repo audited; risk register, user decisions, system context | none |
| M1 — Toolchain & QA | Small skeleton, test harness, CI, fixtures, lint/typecheck | M0 |
| M2 — Portable Skill Core | Valid SKILL.md, routing, knowledge loader, basic commands | M1 |
| M3 — Research & Anti-Slop | Evidence registry, scanner baseline, evaluation fixtures | M2 |
| M4 — Design Intelligence | Foundation modules, component/section playbooks, tokens | M2, M3 |
| M5 — Progressive Workflow | Section brief, approval gates, project memory, reconciliation | M4 |
| M6 — Motion System | Taxonomy, playbooks, tokens, tests, accessible state machines | M4, M5 |
| M7 — Live Studio Vertical Slice | One supported stack; inspect, annotate, draw, bridge, preview, apply/undo | M1, M2, M5 |
| M8 — Live Studio Hardening | Source mapping, state recovery, multi-viewport, scan overlays, security | M7, M3, M6 |
| M9 — Multi-Agent Adapters | Tested hosts and installer contract, support matrix | M2, M8 |
| M10 — Benchmarks & Release | End-to-end evals, docs, licensing, distribution, GA gates | M3–M9 |

Do not infer that the numbered milestones authorize executing all work in one session. Each is decomposed into independent micro-tasks; every stage has audits and user approval checkpoints. Core/Studio prototypes may be explored independently, but full GA requires mandatory Studio gates.

## 18. Required builder-agent protocol (non-negotiable)

1. **FIRST RESPONSE:** inspect current repository safely, summarize assumptions and blockers, propose a full work tree and *only* the first 3–5 smallest executable tasks. Ask for approval of architecture and first implementation batch. Do not write the whole project immediately.
2. Create task entries (ID, goal, dependencies, impacted files, risks, acceptance, tests, status, evidence, rollback). Aim for **15–60 minute reviewable units or smaller**; size is guidance, not a deadline.
3. Maintain one active implementation task per agent/worktree unless independent tasks are clearly isolated, integration strategy approved and test resources available.
4. In a Git repository, use a dedicated feature branch or worktree **per coherent micro-feature**, not per trivial single file; do not push or publish without explicit approval. Respect uncommitted user edits.
5. For each task: **read relevant context → plan smallest patch → implement → run focused tests → inspect diff → independent review if available → fix → run regression → log evidence → mark complete**.
6. Use fresh-context subagent reviewers only when host supports them; provide concise spec, diff, tests and constraints. If unavailable or expensive, perform an isolated review pass in a new context/session, or run deterministic checks and openly note limitations.
7. Persistent state: `ROADMAP.md`, `TASKS.json` (or stable equivalent), `DECISIONS.md`, `RISKS.md`, `HANDOFF.md`, `TEST_EVIDENCE.md`. Read and update after each accepted micro-task. Do not rely on chat history or context window persistence.
8. Stop on failed tests, uncertain data loss, unverified target mapping, unexpected changes or incompatible environment. Report specific blocker and safe recovery.
9. No secrets, production changes, public repo creation, package publishing, paid API calls or disruptive commands without permission.
10. A task completes only with traceable tests, diff review, documented limitations and appropriate approval. Aggregate milestone completion requires integration/release gate review.
11. At the end of each session: report completed IDs, test commands/results, files changed, risks, decisions needed, exact next unlocked task, and a fresh-agent restart prompt.

## 19. Key risks and mitigations (audit results)

| Risk / loophole | Mitigation |
|---|---|
| One huge prompt causes inconsistent or unfinished product | Versioned PRD, dependency graph, tiny verified tasks, checkpoints. |
| Huge number of skills duplicates rules and bloats context | Shared foundations + playbooks + just-in-time loading + precedence rules. |
| “Avoid model training data” taken literally | Frame as external research, constraints and critical evaluation, not removal of learned knowledge. |
| First section overdetermines later design | Classify global vs local decisions; explicit exceptions and change review. |
| “Anti-slop” incorrectly punishes valid motifs | Three-tier findings, false-positive cases, contextual judgment. |
| Motion only added at end | Mandatory motion spec and state coverage for every relevant component. |
| Drawing maps to wrong DOM/source | Stable anchors, confidence, ambiguity handling, sandbox and approval. |
| Studio leaks sensitive data / opens command execution | Local-first trust boundary, auth, workspace allowlist, redaction, validated schema, opt-in sharing. |
| High-end demo but poor regression stability | Real fixture suite, failure injection, visual/snapshot and E2E tests. |
| “Works on all agents” becomes false marketing | Platform capability matrix and verified adapter tests, explicit limitations. |
| “Superior to Impeccable” asserted without proof | Competitive benchmark protocol, metric publication and evidence-based claims. |
| SEO based on arbitrary lengths/ranking promises | Useful content/search intent, documented Google guidance, no guaranteed ranking. |
| Forgotten progress or context compaction | Project-local authoritative roadmap/evidence/decisions/handoff. |
| User's public-use wish misread as mandatory GitHub push | Distribution method undecided; approval before publishing. |
| Subagents unavailable or costly | Optional isolated reviewers; deterministic test fallback, no invented review. |
| “Bug free” expectation | Strong test gates and limits disclosure, not impossible zero-bug guarantee. |
| Agent source edits conflict with user work | Diff-first, explicit approval, clean worktree checks, rollback, lock/conflict detection. |

## 20. Open decisions, defaults and change control

**Do not block initial planning**, but record these before affected implementation:

- Distribution channel and code license: **undecided**. Public availability is required; GitHub is only a possible option.
- UI/framework and runtime stack: choose after feasibility study/ADR; prioritize one supported web stack first, no universal browser integration claim.
- Specific host product names (especially “FreePi,” “Auto Pilot,” “ZCode,” “WorkBuddy”) and versions: verify when building adapters. The user's model/context-window claims are not implementation guarantees.
- Initial playbook catalog size and non-web/native scope: prioritize value and evidence; do not claim every component is covered at launch without an acceptance matrix.
- Exact local server transport, token format extensions, visual-intent schema, versioning and telemetry policy: propose ADRs with explicit approvals.
- Commands: intents are fixed but slash syntax must follow per-host realities.
- Motion style parameters: project/brand choices, not hardcoded globally.

**Change management:** the user may request revised scope. Record each change with rationale and dependency impact, revise tests, and never silently replace prior approved requirements.

## 21. Reference foundations (research inputs, not copying instructions)

- Agent Skills specification: https://agentskills.io/specification
- Impeccable Live public behavior: https://impeccable.style/docs/live/
- Impeccable changelog (features and prior alpha/beta state): https://impeccable.style/changelog/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Animation from interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- DTCG stable community report: https://www.designtokens.org/tr/2025.10/
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

Check updates and licenses before using third-party code or material. Research citations are **not** an assertion that these tools or specs solve all SUS requirements.

## 22. Definition of Done for the complete product

SUS is eligible for *full public release* only when: portable skill core and modules work on claimed supported hosts; progressive section gates and project memory persist correctly; motion and content guidance are tested; anti-slop evaluation and false-positive cases are documented; **Live Studio** works end-to-end on stated supported local web stacks with safe drawing-to-layout, preview, approval, recovery and rollback; security/accessibility/performance gates pass; honest compatibility docs and public installation channel/license are approved; benchmarks justify claims. No repo publish or full GA declaration without human release approval.

---

**Implementation directive:** Read `AGENT_START_PROMPT.md` and `ROADMAP_AND_TASK_PROTOCOL.md` with this PRD. Begin with discovery and a micro-task plan, not a one-shot code generation. User approval is required at implementation gates. This document contains no authorization to run shell commands, install dependencies, create public repositories, or publish artifacts without checking the host’s permission model.
