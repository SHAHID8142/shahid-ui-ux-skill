# Live Studio — what exists today, and how to start the part that does

The owner requires a **mandatory Live Studio** for building UI one approved section at a time
(owner decision; `docs/DEEP_AUDIT_2026-11-13.md`). This page states exactly how much of it is a product
surface today, because the honest answer is: **the tested loop and the local session bridge exist; the
Studio page does not.**

| Part | State |
| --- | --- |
| Session bridge — localhost server, per-session HMAC token, Origin/Host allowlist, payload cap, append-only audit log, read-only | **Built and startable**: `pnpm studio:bridge` |
| Controller library — annotation, selection, spatial intent, keyboard drawing, findings overlay, variants, a11y | **Built and tested**, as a library (`@sus/studio-web`); not bundled into a page |
| The loop — annotate → intent → diff → approve → apply → verify → undo, byte-exact restore, axe over the whole page | **Built and tested**: `pnpm demo:loop` against a real Astro build |
| The Studio page a designer opens in a browser | **Not built**: no bundler entry, no dev server for the overlay |
| A verified install path on any host | **None**: see `docs/SUPPORT_MATRIX.md` |

So "open the Studio" is not a thing you can do yet, and no document here says otherwise. What you *can*
do is start the surface the loop talks to, and run the loop itself.

## Start the bridge

```bash
pnpm build                       # once: the script runs the built packages
pnpm studio:bridge               # 127.0.0.1, OS-assigned port, one session
```

It prints the endpoint, the session id, a one-time token and a `curl` you can paste:

```bash
pnpm studio:bridge --origin http://127.0.0.1:5173
```

Options: `--port <n>` (default `0`: the OS picks one and it is printed back), `--origin <url>`
(repeatable; a browser Origin must be allowlisted to send), `--json` (one machine-readable line, used
by the test). Ctrl-C closes the session and the server.

Binding posture is the bridge's own (ADR-003): **127.0.0.1 only, never `0.0.0.0`**, no outbound
network calls, no write endpoint — writing source requires the T0707 safety gates, and until they pass
the server structurally cannot mutate files.

## Run the full loop

```bash
pnpm demo:loop
```

This is the honest end-to-end proof: a real Astro fixture is built, audited, annotated, turned into an
intent, diffed, approved, applied, verified and undone, with the tree restored byte-for-byte. It is a
test, not an app — it exits, and it asserts.

## What the bridge accepts

One message envelope per request, authenticated with the session token:

```json
{ "sessionId": "<32 hex>", "kind": "ping | select | annotate | intent" }
```

Page-derived text may arrive as `domData`, which must carry `quarantined: true` and is stored and echoed
as **data**: inspected-page content is never treated as instructions. Bodies over 64 KiB are refused.

| Response | Meaning |
| --- | --- |
| `200` | validated and recorded in the audit log |
| `400` | not an envelope (unknown `kind`, extra keys, bad JSON) |
| `401` | token invalid, or session closed |
| `403` | Origin or Host not allowlisted (DNS-rebinding guard) |
| `413` | body above the payload cap |

## Why no page yet

The overlay is a set of controllers with tests and no bundler entry: adding a page is a build-tooling
task (bundler, dev server, host-browser attach path), not a documentation fix. It is listed as open work
in `docs/LIMITATIONS.md` rather than implied by a script name. `pnpm studio:bridge` is named for what it
starts — the bridge — precisely so that it does not read as "the Studio is running".