# SUS — Coverage Matrix v0 (proposed)

**Purpose:** state exactly what SUS covers, partially covers, and does not cover — so no
"it supports everything" drift can happen. Scope source: D14 (web UI/UX), amendments Part 0.
This matrix is itself a SUS artifact: it is the honest-limitations page for v1, written before v1 exists.

**Legend:** ✅ full support · 🟡 partial / advisory only · ❌ out of scope v1

## 1. Surfaces (D14 priority order)

| Surface | Mode | Build | Redesign | Audit | Unslop | Motion | Live Studio | Notes |
|---|---|---|---|---|---|---|---|---|
| Marketing / landing | Persuade | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | primary target |
| E-commerce (catalog, PDP, cart, checkout) | Persuade + Operate | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 checkout flows get extra review gates | payment-state checklist mandatory |
| CRM / dashboard / admin | Operate | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 data-dense tables need viewport care | |
| CMS admin / control panel | Operate | ✅ | ✅ | ✅ | ✅ | 🟡 admin motion kept minimal by design | 🟡 | forms/tables focus |
| Portfolio / case study | Experience | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 heavy imagery → perf budget strict | |
| Docs / blog / help | Read | ✅ | ✅ | ✅ | 🟡 slop rules differ for long-form | 🟡 | 🟡 | |
| Static HTML (no framework) | any | ✅ skill only | ✅ skill only | ✅ | ✅ | ✅ | ❌ no HMR bridge → manual workflow | documented degradation, never silent |
| Non-JS stacks (WordPress, Rails views) | any | 🟡 audit only | 🟡 audit only | ✅ | ✅ | ❌ | ❌ | |

## 2. Components / playbooks — launch set vs. later

**Launch (M4, mandatory, with state matrices + motion + a11y + responsive):**
navbar, hero, button/CTA, form + input + validation, card, pricing table, footer,
empty/loading/error states, modal/dialog, toast/notification, data table (Operate core),
product grid, PDP (product detail page), cart summary, checkout steps.

**Second wave (M8+):** search + filters, pagination, tabs, accordion, drawer, dropdown menu,
breadcrumb, avatar, badge, tooltip, progress, skeleton, file upload, date picker, command palette,
onboarding/checklist, settings pages, dashboard widgets, gallery/case-study layouts, article layout.

**Never claimed (❌):** charts/visualisation library expertise (links out instead), maps,
video players, web3, email templates, native components, print.

Rule: any component outside this list must return **"no playbook — proceeding with foundation rules
only"** rather than improvised expertise. Silence is not allowed.

## 3. Capabilities

| Capability | Status | Boundary |
|---|---|---|
| Section-by-section build with approval gates | ✅ core | enforced by G2, `.sus/` state |
| Semantic design tokens (DTCG-aligned) | ✅ core | validated by `open-design-tokens` + internal schema |
| Anti-slop detection (3 tiers) | ✅ core | deterministic subset only blocks; precision/recall published before blocking claims |
| Motion & interaction intelligence | ✅ core | state-machine schema; reduced-motion parity tested |
| UX copy + SEO | ✅ core | claims register; no invented metrics |
| Research with provenance | ✅ core | offline mode → `unverified`, never fabricated |
| Project memory (`.sus/`) | ✅ core | append-only journal; migration path at upgrades |
| Live Studio (draw → intent → diff → approve → apply → undo) | ✅ core for GA | supported stacks only after spike passes; others `experimental`/`unsupported` |
| Multi-viewport / dark mode / RTL / i18n | ✅ core | hardening matrix M5.5 |
| Accessibility | ✅ core | WCAG 2.2 AA enforced; AAA advisory only |
| Performance budgets | ✅ core | gate G5, budgets set per project ADR |
| Native mobile (iOS/Android) | ❌ | documented limitation |
| Email / print / games / WebGL-heavy | ❌ | documented limitation |
| Autonomous publishing / deployment | ❌ | always needs explicit user action |
| Working without any dev server | 🟡 | full skill, no Studio; audit via static analysis + screenshots if a server exists |

## 4. Hosts (agents)

| Host | Status at v1 |
|---|---|
| FreePi CLI | supported (primary dev host) |
| One additional host verified by smoke test | supported |
| Codex, Claude Code, Cursor, Copilot, Gemini CLI, others | experimental until each passes install + invocation + skill-loading smoke test |
| Any host without skill-file loading | unsupported — CLI fallback documented |

## 5. Honest limitation statements (ship in README)

- SUS does not guarantee ranking, conversion, originality, or bug-free output.
- The anti-slop detector does not "prove AI origin"; it flags patterns with measured precision.
- Judged rubric scores are opinions with anchors, never CI gates.
- Live Studio works only on supported local dev stacks; everything else degrades gracefully and says so.
- SUS cannot replace user research; it structures expert reasoning, not empirical truth about your users.
