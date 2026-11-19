# Third-party notices

SUS itself is MIT-licensed (`../LICENSE`, owner decision D36, copyright holder SHAHID8142). The
dependencies SUS runs on keep their own licences, and this page says what they are, what obligations
attach, and which provenance questions are **not** settled by this file.

**How this list is produced.** It was extracted from `pnpm licenses list --prod` against the
release-candidate dependency tree (2026-11-19, macOS arm64). It is a *measured snapshot*, not a
constant: the lockfile changes, and a future release must regenerate it rather than copy this page.
The dev-only summary comes from `pnpm licenses list` (all environments).

## Production dependency licences (285 packages, measured 2026-11-19)

| Licence | Packages | Notes |
| --- | --- | --- |
| MIT | 244 | the bulk of the tree (Astro, Next.js, zod, vite, esbuild, remark/rehype unified stack, …) |
| ISC | 11 | e.g. `prompts`, `picocolors`, `@ungap/structured-clone` |
| Apache-2.0 | 10 | e.g. `typescript`, `playwright`/`playwright-core`, `sharp` |
| BSD-2-Clause | 8 | the htmlparser2 DOM family (`css-select`, `domhandler`, …) |
| BSD-3-Clause | 3 | `diff`, `smol-toml`, `source-map-js` |
| MPL-2.0 | 2 | **`axe-core`**, **`@axe-core/playwright`** — see below |
| BlueOak-1.0.0 | 2 | `lru-cache`, `sax` |
| LGPL-3.0-or-later | 1 | **`@img/sharp-libvips-<platform>`** prebuilt — see below |
| CC-BY-4.0 | 1 | `caniuse-lite` (Browserslist data) — attribution data, see below |
| CC0-1.0 | 1 | `mdn-data` |
| 0BSD | 1 | `tslib` |
| Python-2.0 | 1 | `argparse` (PSF licence family) |
| (MIT OR CC0-1.0) | (dual) | `type-fest` |

Permissive families (MIT/ISC/Apache/BSD/0BSD/BlueOak/CC0) require preserving copyright and licence
notices; none of them impose copyleft on SUS or its users.

## Licences that need a sentence of their own

- **MPL-2.0 — `axe-core`, `@axe-core/playwright`.** axe-core is a runtime dependency of the
  `sus-eval` CLI (the accessibility scanner); `@axe-core/playwright` is its Playwright driver.
  MPL-2.0 is file-level copyleft: SUS users get the unmodified upstream files, and SUS does not
  modify them. If a future change modifies MPL-covered files in place, those files' source must be
  made available under the MPL on their own. Compatible with the MIT licence of the rest of the
  repository; upstream notices must be preserved.
- **LGPL-3.0-or-later — `@img/sharp-libvips-<platform>`.** The libvips prebuilt binaries that
  `sharp` loads. This is **fixture build tooling only** (the reference-site images); nothing from it
  ships in SUS's own packages, and SUS links it dynamically through sharp's prebuilt mechanism. The
  package is per-platform (`@img/sharp-libvips-darwin-arm64` on this machine,
  `@img/sharp-libvips-linux-*` in CI); regenerate this page per release platform.
- **CC-BY-4.0 — `caniuse-lite`.** Data (not code) used by Browserslist for browser-targeting.
  Attribution lives in the package's own bundled notices; SUS adds none and modifies nothing.
- **Python-2.0 — `argparse`.** PSF licence family carried by a transitive dependency.

## Dev-only dependencies (not installed by consumers)

- **FSL-1.1-Apache-2.0 — `sentry`**, pulled in by `lighthouse` under devDependencies/tooling.
  Functional Source Licence: free to use, not free to compete-with-as-a-service. It is not a
  runtime dependency of SUS's shipped CLI surface and never reaches a SUS user's install.

## What a SUS user's machine downloads that this page does not cover

- **Chromium.** The browser phases download a Chromium binary via Playwright at `pnpm setup` time,
  from Playwright's own CDN under Playwright's distribution terms. SUS does not distribute it.
- **`pnpm` / Node.js themselves**, under their own licences.

## Provenance that is deliberately **not** settled here

- **No upstream guide text was copied.** The research layer cites sources by URL and stores its own
  original writing (D06/D08, owner decisions; `docs/RESEARCH_SOURCES.md`). Any future attempt to
  copy guide text into the repository or the `.sus-cache/` directory is a licence decision that
  has **not** been made — the cache directory is git-ignored on purpose and must never be committed.
- **Fixtures.** The reference sites may use copies of the owner's own projects (allowed by owner
  decision D21); they contain no third-party proprietary assets. If a future fixture ever embeds a
  third-party asset, that asset's licence must be recorded here before it is committed.
- **Fonts and images at runtime.** SUS vendors none. If a consuming project's design calls for a
  licensed font or stock image, that acquisition is the consuming project's decision, not SUS's.

## Attribution statement (for distributors of SUS itself)

SUS is Copyright (c) 2026 SHAHID8142, MIT-licensed. This product includes third-party software
listed above under its own licences. The machine-readable input for this page is
`pnpm licenses list --prod` at the released revision — rerun it when the lockfile changes.
