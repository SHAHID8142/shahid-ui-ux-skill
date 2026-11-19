# SUS v0.1.0-preview.1 — release notes (GitHub Experimental Preview)

**Status: experimental preview candidate — prepared, not published.** The tag, the GitHub release
and any publication act belong to the owner (T1005) and did not happen when this file was written.
The licence is decided: **MIT** (`../LICENSE`, owner decision D36, copyright holder SHAHID8142).

**Revision:** the release-preparation branch `release/v0.1.0-preview.1-prep`, cut from the verified
development HEAD of `chore/continuation-reconciliation`. The exact SHA is the commit that introduces
this file: `git log -1 --format=%H -- docs/RELEASE_NOTES_v0.1.0-preview.1.md`.

## What this release is

A first, explicitly **experimental** look at SUS: a design-intelligence skill for web UI/UX work
(marketing, commerce, CMS/CRM admin, portfolio surfaces) plus the verification CLI that makes its
rules measurable. It is a preview for review, not a finished product; every claim below points at a
receipt or a generated record, and the things that have never been run are named in the same breath.

## Installation

SUS is not an installable package (no npm, no install script). You install a revision of this
repository:

```bash
git clone https://github.com/SHAHID8142/shahid-ui-ux-skill.git
cd shahid-ui-ux-skill

# Intended preview-tag path, once the owner publishes the release (the tag may not exist yet):
git switch --detach v0.1.0-preview.1

# Until then, the verified development revision this candidate was cut from:
git switch chore/continuation-reconciliation   # or: git switch --detach <candidate SHA>

pnpm install --frozen-lockfile
pnpm build          # compiles packages/*; the CLI entry points live in dist/
pnpm setup          # optional: pre-push gate + Chromium download, needed for browser phases
```

A default clone without the `git switch` lands on `main`, which is a **planning-only baseline**
that cannot run any of this. The `docs/QUICKSTART.md` page is the first-run path this release was
exercised with.

## What a user can actually do with this preview

All commands run through one entry point, `pnpm exec sus <command>` — or `node bin/sus.mjs
<command>`, which on a fresh clone is the one that works immediately after `pnpm build` (the
`pnpm exec` links are created by install, which runs before the first build; the quickstart
documents both). Either form passes arguments and exit codes to the package that owns the command:

| Ability | Command | State |
| --- | --- | --- |
| Audit a built site on disk or a local server, quick or deep mode (Chromium capture, reflow, accessibility, keyboard, Lighthouse through the authorized proxy) | `sus audit --path <dist> --out <dir> --mode quick\|deep` | **works** — exit codes contractual; refusals recorded in the report |
| Propose a best-practice change for one selected area (`selector`, `component`, `file`, `page` scopes), digest-bound for a later approval | `sus bestpractice --path <dist> --scope '<sel>' --out <dir> --mode deep` | **works** — read-only; nothing is applied |
| Start the Live Studio session bridge (localhost, HMAC token, origin allowlist, session expiry: 24 h absolute / 30 min idle / 16-session LRU cap) | `pnpm studio:bridge` | **starts** — read-only surface; see below what does not exist |
| Run the full Studio loop end to end (annotate → intent → diff → approve → apply → verify → undo) against a real Astro build | `pnpm demo:loop` | **works** — it is a test harness, not an interactive app |
| Run the release suite, the extended regression suite, the deterministic benchmark arm | `pnpm verify` / `pnpm regression` / `pnpm benchmark` | **works** — see "Verification of this candidate" |
| Host capability inventory (`route`, `load`, `precedence`, `capabilities`, `status`) | `sus capabilities` | **works** — states per capability what the CLI does and what needs a capable model or host browser |
| Install the skill files into an agent host | host-specific | **no verified install path on any host** — see below |

The skill itself (`skill/SKILL.md` + 9 references + 36 component playbooks at a 12-part standard) is
what an agent host consumes; the CLI is what makes its rules falsifiable.

## What this preview does **not** include

Stated as plainly as the features above:

- **There is no Studio page.** The Live Studio exists as a tested loop (`pnpm demo:loop`) and a
  startable, read-only session bridge (`pnpm studio:bridge`). The browser page where a human would
  draw over a running site does not exist yet — `docs/STUDIO.md` is the honest inventory.
- **No slash command has a verified binding on any host.** `/sus audit` or `/sus-bestpractice`
  working in your agent's UI is not a claim this release makes; the CLI equivalents above are the
  verified entry points (`docs/SUPPORT_MATRIX.md` is the generated record).
- **No host reaches the `supported` tier.** FreePi CLI: `experimental` with a verified smoke
  (8/8 against its recorded artifact). ZCode: `experimental`, smoke receipt stale. Codex, Claude
  Code, Cursor: `experimental`, no smoke evidence. The owner-named remaining hosts (Antigravity,
  Goose, Copilot, Hermes, WorkBuddy, Autopilot): `untested`, no adapter row with evidence. No
  Live Studio session has been run on any host.
- **No npm package, no install script, no telemetry opt-out UI** — the product is unpublished and
  packages are private.

## Known limitations (the load-bearing ones)

Full list: `docs/LIMITATIONS.md`. The ones that change how much you can trust a verdict:

- **No assistive-technology session has ever run.** The accessibility measurement is automated
  (axe-scoped scans, keyboard traversal, target size, reflow, 400%-zoom equivalence). That is not
  WCAG conformance, and no conformance claim is made or permitted by the claim gate.
- **User-agent zoom setting and text-only zoom are not driven** (400 % zoom is measured as the CSS
  viewport it produces; the UA zoom setting itself needs a human).
- **No human benchmark ran.** The deterministic benchmark arm works; the comparative claim gate
  stays closed — SUS makes no comparative statement of any kind.
- **Playbook behavioural coverage is narrow by measurement:** 3 of 187 playbook rules have a check
  that names them; 184 are named gaps; 33 playbooks have no check at all
  (`docs/PLAYBOOK_COVERAGE.md`). Schema-valid is not behaviour-tested.
- **Motion and component states are measured where the DOM allows:** hover, pressed, disabled,
  checked states and two disclosure shapes are driven; loading/success/error (application states)
  are not, because simulating them would measure a guess.
- **All timings come from one machine** with Chromium pre-installed. No field data, no comparative
  claim, no CI-duration claim.
- **The audit's network boundary constrains which hosts it contacts, not which bytes an authorized
  page pulls:** subresources served by the authorized origin are measured as the page serves them;
  every host the boundary refused is disclosed in the report.

## Security posture of this candidate

The owner commissioned an independent audit (T1003, D35). Its 31 findings carry builder fixes with
receipts and tests (fix wave, M13 tasks, receipts under `.sus-dev/VERIFICATION/`), including the
session-expiry finding that was initially deferred and was then implemented (absolute TTL, idle
timeout, LRU cap) when the owner directed work on the open issues. **The audit's verdict is not
accepted yet**: finding closure is owner/auditor-gated (D35a/D35b), and `T1003` stays `pending` in
`TASKS.json` until that acceptance happens. Nothing in these notes overrules that gate.

## Verification of this candidate

Recorded against the exact candidate SHA; every row names where the evidence lives:

| Check | Outcome | Evidence |
| --- | --- | --- |
| `pnpm verify` (serial, clean checkout) | recorded in `.sus-dev/VERIFICATION/T1091.md` after the run | receipt |
| `pnpm regression` (serial, after verify) | recorded in the same receipt + `evals/reports/regression-latest.md` | report |
| GitHub Actions on the candidate SHA | recorded in the same receipt (run URLs) | CI |
| Fresh-clone install + `sus audit` + `sus bestpractice` | recorded in the same receipt | receipt |
| Fresh-clone CI job re-running the documented first-run path | recorded in the same receipt | CI |
| Assistive-technology session | **not-run** — no AT environment exists in this build | LIMITATIONS |
| UA zoom setting / text-only zoom | **not-run** — needs a human operator | T1017 receipt |
| Human benchmark arm | **not-run** — no participants recruited | benchmark status |
| Live Studio on a host | **not-run** on every host — no host journey has happened | SUPPORT_MATRIX |
| npm publication | **not-applicable** — product unpublished; packages private | this file |

## Licence

SUS is MIT (`../LICENSE`). Third-party dependencies keep their own licences, catalogued with the
obligations that attach in `docs/THIRD_PARTY_NOTICES.md`; the notice list is regenerated per
release from the live lockfile, not copied forward.
