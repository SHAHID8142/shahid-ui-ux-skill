# SUS — Architecture Decision Records (Drafts for approval)

**Status:** all six are **proposed**. None is final until the owner approves; each lists what would
change the decision. Format follows lightweight ADR practice: context → options → decision →
consequences → reversal trigger.

---

## ADR-001 — Repository layout and monorepo tooling

**Context.** SUS is one skill bundle (markdown) plus several TypeScript packages (scanner, token
tooling, studio-web, studio-bridge, adapters, eval harness) plus fixture apps and CI. The PRD's
tentative layout (§5.3) must become a concrete, justified structure.

**Options.**
1. **pnpm workspaces** — fast, strict, workspace protocol, cheap disk.
2. npm workspaces — zero extra tooling, slower, weaker linking.
3. Turborepo/Nx — caching and task graphs; config overhead before scale.

**Decision (proposed).** pnpm workspaces. Layout:

```text
sus/
  skill/                  # the portable Agent Skill bundle (SKILL.md + references + scripts)
  packages/
    schemas/              # Zod contracts + generated JSON Schema (single source of truth)
    scanners/             # deterministic detector (DOM/CSS/AST), CLI entry
    tokens/               # token pipeline: validate, resolve, export
    studio-bridge/        # localhost server, auth, CDP attach, session state
    studio-web/           # overlay UI (vanilla TS, no framework lock-in)
    adapters/             # per-host + per-framework adapters
    eval-core/            # rubric runner, evidence bundles, calibration
  fixtures/               # 4 self-contained apps (one per surface mode), not published
  evals/                  # briefs, baselines, judge protocol
  docs/
```

Fixtures are in-repo, self-contained apps excluded from publishing; they are test targets, not products.

**Consequences.** One lockfile, fast CI, simple contributor story. Turborepo can be added later
without moving code. Rejected npm workspaces (too slow for 6+ packages) and Nx (overkill).

**Reversal trigger.** CI wall-time > 10 min on the eval suite, or workspace protocol friction with
a needed tool.

---

## ADR-002 — Skill packaging and host adaptation

**Context.** SUS must load in FreePi and other Agent-Skills-compatible hosts (D18: no lock-in),
with one canonical source of truth and honest per-host support.

**Options.**
1. **Official Agent Skills layout as canonical** (`SKILL.md` + `references/` + `scripts/` + `evals/`).
2. Per-host native formats as canonical (Claude plugin, Cursor rules…), skill generated from them.
3. CLI-first: the skill is a thin wrapper around `npx sus …`.

**Decision (proposed).** Option 1 canonical; host-specific entry files are **generated artifacts**
from templates (slash-command manifests, plugin wrappers). `sus doctor` validates frontmatter,
name/dir match, description length (spec limit 1,024 chars; kept concise as a maintainability
practice, not a format law), and token budget. Triggering lives entirely in the ≤1024-char
description; evals test triggering (should/should-not sets) in CI.

Constraints carried from amendments: SKILL.md ≤ 5k tokens, knowledge files ≤ 2k tokens, precedence
resolver implemented in code, `evals/evals.json` shipped with the skill.

**Consequences.** One source, portable, spec-compliant. Cost: a generator step and per-host smoke
tests before any host is claimed. Rejected option 2 (drift between hosts) and option 3 alone
(no skill intelligence when a host can't run CLIs).

**Reversal trigger.** A major host makes generated entries unmaintainable (>2 bespoke formats with
conflicting semantics).

---

## ADR-003 — Live Studio bridge architecture

**Context.** §11 requires browser overlay, selection, annotations, spatial intent, variant preview,
apply/rollback — without modifying user sites uninvited, and with a localhost trust boundary (§11.3).

**Options.**
1. Dev-server plugin instrumentation only (inject into Vite/Next/Astro builds).
2. Standalone HTTP proxy in front of the dev server.
3. Browser extension as the overlay host.
4. **CDP-attached overlay + optional dev plugin for source mapping.**

**Decision (proposed).** Option 4. The bridge is a localhost server; it attaches to a browser via
the Chrome DevTools Protocol (bundled Playwright chromium by default; attach to the user's own
Chrome via `--remote-debugging-port` as opt-in, which since Chrome 136 requires a dedicated
non-default user profile). The overlay is injected through CDP, so no app code
changes and no CSP fight at runtime. Source mapping comes from an **optional** dev-server plugin
(Next/Vite/Astro) that stamps `data-sus-id`; without it, mapping degrades to source-map + DOM-path
heuristics with lower confidence and more user confirmation.

Variant preview works by writing the candidate change to disk and letting the framework's own HMR
update the page — the same mechanism as the accepted competitor approach, without runtime patching.

**Security posture (binding):** bind `127.0.0.1` only; Host/Origin allowlist (DNS-rebinding guard);
per-session HMAC token; CSP nonce for injected script; Zod-validated messages; payload caps; DOM
text treated as data (prompt-injection quarantine); append-only audit log; no outbound network calls.

**Consequences.** Framework-agnostic by construction (D18); no fork of user builds; instrumentation
is opt-in. Cost: CDP session management, reconnect logic, and honest `experimental` labels for
non-spike stacks. Rejected option 1 alone (fragile, framework-coupled), option 2 (TLS/CSP pain),
option 3 (store review, install friction, weaker source access).

**Reversal trigger.** CDP overlay proves unable to reach ≥90% mapping confidence on either spike
stack (A2b go/no-go), or a host makes CDP attach impossible.

---

## ADR-004 — Token format and pipeline

**Context.** §13 requires semantic, DTCG-aligned tokens; G1 enforces token-only styling; G12 detects
drift. DTCG 2025.10 is a community group report, not a W3C Recommendation (F9) — the citation must
stay honest.

**Options.**
1. **DTCG 2025.10 JSON canonical + SUS semantic layer on top**, validated then exported.
2. DESIGN.md-style markdown tokens.
3. Framework-native config as source (Tailwind config, CSS vars).

**Decision (proposed).** Option 1. Canonical file: `.sus/tokens.json` (DTCG format). A SUS-specific
**semantic layer** (roles: `color.surface.raised`, `space.group`, `motion.duration.fast`, …) is
validated by the internal schema; the DTCG validator (`open-design-tokens`, MIT) checks format
conformance behind a swappable interface. Exports (CSS custom properties, Tailwind v4 `@theme`,
TS constants) are **derived outputs, never edited**. Drift gate G12 compares code usage to the
contract weekly and at release.

**Consequences.** Interoperable with Figma export paths; validator is replaceable; exports stay
regenerable. Cost: a build step users must run (or the skill runs it) and a rule that hand-edited
exports are overwritten. Rejected option 2 (not tool-parseable), option 3 (framework lock-in,
contradicts D18).

**Reversal trigger.** DTCG format cannot express a required SUS concept (e.g., motion intent) without
abuse; or validator dependency breaks and the swap costs more than owning the validator.

---

## ADR-005 — Schema and validation stack

**Context.** Every SUS contract (section brief, visual intent, findings, evidence bundle, task
records, support matrix) is machine-checked. F14 requires versioned migration across SUS releases.

**Options.** Zod (TS-native, ergonomics) · TypeBox (JSON-Schema-first, faster) · plain JSON Schema
(language-neutral, worse TS ergonomics).

**Decision (proposed).** **Zod** as the authoring source, with generated JSON Schema exported for
cross-language consumers and CI validators. Every schema carries `$id` + `version`; migrations are
versioned functions with fixtures; contract tests are generated from schemas. This keeps a future
non-TS detector (if ever) possible without re-writing contracts.

**Consequences.** One language for contracts, generated artifacts for interop. Cost: generated JSON
Schema must be committed and kept in sync (CI check). Rejected plain JSON Schema (poor TS DX),
TypeBox (smaller ecosystem, similar output).

**Reversal trigger.** Zod JSON-Schema export proves lossy for a needed construct (e.g., tagged
unions with external refs).

---

## ADR-006 — Language and runtime for packages

**Context.** Q7 default: zero-install JS first; the product must run via `npx` without native
binaries; contributors should face one language.

**Options.** TypeScript everywhere · TypeScript + Rust core (detector) · Go.

**Decision (proposed).** **TypeScript (Node ≥ 22 LTS — the active LTS line at adoption; Node 20
reached end-of-life in April 2026), strict mode, ESM**, everywhere including
the detector. Rationale: one toolchain, npx-friendly, DOM/CSS scanning performance in Node is
sufficient for per-section scans; Rust would add a build/publish matrix (per-platform binaries)
that contradicts zero-install at v1.

**Consequences.** Simplest contributor path and CI. Cost: detector performance ceiling; accepted
because per-section scope keeps scans small. Rejected Rust at v1 (distribution complexity), Go
(splits the toolchain for no measured need).

**Reversal trigger.** Measured p95 full-page scan > 2 s on the 4-fixture corpus, or a rule class
that genuinely needs native speed — then a scoped Rust/WASM module behind the same interface, via a
new ADR.

---

## Approval block

| ADR | Decision owner | Status |
|---|---|---|
| 001–006 | SHAHID (owner) | proposed — approve, amend, or reject each individually |
