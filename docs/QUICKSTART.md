# Quick start — first run, without a packaged release

SUS is **not published** as an installable package (owner decision T1005 is pending). What exists is
this repository: a skill plus a verification CLI. The two commands below are the ones exercised by
hand on 2026-11-17 (re-checked against the release candidate, 2026-11-19); anything not written here
has not been checked.

## 1. Get the code

A default clone lands on `main`, which is a **planning-only baseline** — it predates the
implementation and cannot run the commands below. Executable SUS lives on the development
branch, and the intended preview install path is the `v0.1.0-preview.1` tag once the owner
publishes it (T1005). Use whichever of these exists when you read this:

```bash
git clone https://github.com/SHAHID8142/shahid-ui-ux-skill.git
cd shahid-ui-ux-skill

# The intended preview-tag install path (owner publication pending — the tag may not exist yet):
git switch --detach v0.1.0-preview.1

# Today's verified development revision (this is what CI and the receipts point at):
git switch chore/continuation-reconciliation

pnpm install --frozen-lockfile
pnpm build            # compiles packages/*; the CLI entry points live in dist/
```

`pnpm setup` also installs the pre-push gate and downloads Chromium — only needed if you intend to
push or run the browser phases.

Licence: SUS is MIT (`LICENSE`, owner decision D36); third-party material keeps its own licences
(`docs/THIRD_PARTY_NOTICES.md`). The preview is **experimental software** — see
`docs/LIMITATIONS.md` before relying on any verdict it prints.

## 2. Audit a site

A built site on disk (no server, no network):

```bash
pnpm exec sus audit --path path/to/your-site/dist --out /tmp/sus-audit --mode quick
```

`pnpm exec sus <command>` is one entry point for all of them (`audit`, `bestpractice`, `scan`,
`route`, `load`, `capabilities`, `status`, …); it passes arguments and exit codes to the package that
owns the command, so `node packages/eval-core/dist/cli.js audit …` is the same thing spelled out.

A running server:

```bash
pnpm exec sus audit --url http://localhost:3000 --out /tmp/sus-audit --mode deep
```

`--mode quick` reads the HTML and runs the text/SEO/structure checks; `--mode deep` additionally
launches Chromium for capture, reflow, accessibility, keyboard and Lighthouse. The report is written
to `audit.md` next to `audit.json` in `--out`. The `--out` directory must be **outside** the audited
target; the audit refuses to write into the thing it is measuring.

Live URLs: loopback is allowed by default; any other host needs `--authorize <host>`. The allowlist is
enforced on every redirect hop (an off-list hop stops the audit with exit 2 and no report), and
browser phases run behind an allowlisting proxy.

## 3. Propose a fix for one selected area

```bash
pnpm exec sus bestpractice \
  --path path/to/your-site/dist \
  --scope '#signup' \
  --out /tmp/sus-proposal --mode deep
```

This runs the same audit, resolves the selector to the elements it owns, and writes
`proposal.md` + `proposal.json`. Exit codes: `0` nothing blocking, `1` blocking items, `2`
usage/scope error, `3` every item needs human judgment. It is read-only: nothing is applied. See
`docs/BESTPRACTICE_COMMAND.md` for scope kinds (`selector`, `component`, `file`), focus, and the
approval digest that Studio binds an apply to.

Ask for the whole document with `--scope page`: it needs no browser to resolve and proposes what the
audit measured on that page, including defects that belong to no element (a missing meta description).

## 4. Read the result honestly

- `not-run` means the instrument did not run (for example `--mode quick` never opens a browser). It is
  never a pass.
- `needs-review` items are human judgments the tool will not make for you.
- A finding names where it was observed. For an **element** scope, a rule-id-only finding (axe's
  page-wide scan) is reported as attributed elsewhere rather than pinned to your selection; since T1030
  an element scope also gets a scan confined to that element, so its own violations do reach it.
- A `page` scope attributes by dimension, because the page is the unit the audit measured.

## 5. Using the skill inside an agent host

The skill files are in `skill/`. Installation is host-specific and **no host has a verified install
path or a verified slash-command binding**; `docs/SUPPORT_MATRIX.md` is the generated truth, including
the hosts the owner named that have never been run here. Do not assume `/sus audit` or
`/sus-bestpractice` exist on your host: the CLI equivalents above are the verified entry points.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `path does not exist: …` | wrong working directory | pass an absolute path |
| `host "…" is not authorized` | live URL outside loopback | add `--authorize <host>` |
| `scope not-found: …` | the selector matches nothing in the audited page | check the selector against that page, or pass a component path |
| `scope ambiguous: …` | the selector matches several components | narrow it with a more specific selector |
| `nothing to propose in this scope` | `--mode quick` measured no browser dimensions | re-run with `--mode deep` |
| page-level defects never appear in a scoped proposal | they belong to no element | use `--scope page` |
| `--out` inside the target | the audit would write into what it measures | choose a directory outside the target |