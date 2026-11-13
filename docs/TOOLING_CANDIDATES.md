# SUS — Tooling Candidates (open source, ADR input)

**Purpose:** what SUS can build on instead of re-inventing, with licence notes and a decision.
Nothing is installed. Licences are stated from public sources and must be **re-verified at
adoption time** (marked ✅ verified-now / ⚠️ verify-at-adoption).

## 1. Deterministic detection & testing

| Tool | Licence | Role in SUS | Decision |
|---|---|---|---|
| **Playwright** | Apache-2.0 ⚠️ | Browser automation for screenshots, keyboard walks, viewport matrix, Studio E2E | **Adopt** — core of the Evidence Spine |
| **@axe-core/playwright** | MPL-2.0 (axe-core) ⚠️ | WCAG A/AA automated checks (≈33% of 87 criteria — measured, not assumed) | **Adopt** as gate G4, never as full proof |
| **Lighthouse CI** | Apache-2.0 ⚠️ | Perf budgets, PWA/SEO advisories | **Adopt** for gate G5 |
| **stylelint** | MIT ⚠️ | Token-only styling lint (G1), raw-value detection | **Adopt** |
| **ESLint + typescript-eslint** | MIT ⚠️ | a11y lint (jsx-a11y), dead states, unused props | **Adopt** |
| **Vitest** | MIT ⚠️ | Unit/schema tests | **Adopt** |
| **Zod** | MIT ⚠️ | Runtime schema validation for every SUS contract (brief, intent, findings, evidence) | **Adopt** — schemas are the spine |
| **fast-check** | MIT ⚠️ | Property-based tests for the detector and intent compiler | **Adopt** (M3) |
| **Open Design Tokens** (`open-design-tokens`) | MIT ⚠️ | DTCG 2025.10 validator + policy linter, tiny, CI-friendly JSON output | **Adopt** as validator dependency |
| **Design Token Kit** (`@design-token-kit/cli`) | verify ⚠️ | DTCG check/convert/showcase, CSS + Tailwind v4 + SwiftUI output | **Provisional** — compare with Style Dictionary before ADR |
| **Dispersa** | verify ⚠️ | DTCG resolver/build system, plugin lint | **Watch** — resolver support may be useful for multi-theme |

## 2. Studio / source mapping

| Tool | Licence | Role | Decision |
|---|---|---|---|
| **ts-morph** | MIT ⚠️ | Typed AST edits for TS/TSX (reliable JSX writes) | **Adopt** for React-family adapters |
| **recast** | MIT ⚠️ | Formatting-preserving AST rewrite where ts-morph is too heavy | **Provisional** |
| **@babel/parser + @babel/traverse** | MIT ⚠️ | Inject `data-sus-id` during dev transform | **Adopt** for the instrumentation plugin |
| **Vite plugin API** | MIT ⚠️ | Dev-server instrumentation for Astro / Vite-based apps | **Adopt** (second spike stack, D18) |
| **Next.js SWC plugin / Turbopack loader** | MIT ⚠️ | Same instrumentation for Next.js App Router | **Adopt or fallback to Babel** depending on spike result |
| **postcss** | MIT ⚠️ | Static CSS analysis without a browser | **Adopt** |
| **Prettier** | MIT ⚠️ | Normalise after AST writes | **Adopt** |
| **Svelte compiler / @vue/compiler-sfc** | MIT ⚠️ | Later adapters | **Defer** (not first release) |

## 3. Knowledge, skills, distribution

| Tool | Licence | Role | Decision |
|---|---|---|---|
| **Anthropic `skill-creator`** (skills repo) | Apache-2.0 ⚠️ | Eval/benchmark workflow for skill quality; triggering evals | **Adopt as reference**, not as a dependency |
| **Agent Skills spec** (`agentskills.io`) | spec, public | Packaging format + frontmatter validation rules | **Adopt** as the format contract |
| **Changesets** | MIT ⚠️ | Versioning + changelog for multi-package repo | **Adopt** |
| **pnpm workspaces** | MIT ⚠️ | Monorepo manager (fast, strict, good with many packages) | **Provisional** — ADR vs npm workspaces |
| **semantic-release / release-please** | MIT ⚠️ | Release automation | **Defer** until first release |

## 4. Deliberately rejected

| Tool | Why not |
|---|---|
| Chromatic | Commercial SaaS; visual regression must work offline in CI |
| Storybook as a required dependency | Heavy for users; SUS tests the real running app, not a component sandbox |
| Any headless LLM API in the detector | Detector must be deterministic and free to run (matches measured practice) |
| Copying Impeccable rule names/phrasing | Licence risk and product differentiation; SUS rules are independently derived + cited |

## 5. Things SUS must build itself (no good open-source equivalent)

1. **Section state machine + approval gates** (G2) with evidence bundles.
2. **Visual Intent Schema + constraint compiler** (strokes → semantic constraints).
3. **Challenging/Dissent ledger** (Part 0.5) — no existing tool does evidence-tiered pushback.
4. **Prediction ledger + calibration metrics** (E8–E9).
5. **Cross-surface repetition detector** (page/section convergence).
6. **SUS rubric with deterministic/hybrid/judged tiers** and anti-inflation calibration.

## 6. MCP / asset tooling available in this environment

- `mcp__thesvg` (codemode) — SVG icon/illustration generation → useful for M4.8 art direction and
  icon-system work; output must be reviewed, not trusted blindly.
- Image generation tool — for directional mockups and imagery placeholders, never as shipped
  "real photography" without rights.

**Adoption rule:** every dependency above enters only through an ADR with licence verification,
size/maintenance check, and a stated exit path. No dependency may be added silently inside a feature
task.
