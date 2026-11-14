# T0700w verdict — dual-stack trusted safe-write feasibility

Measured 2026-11-14 by `packages/studio-bridge/tests/feasibility.test.ts` on
disposable copies of the real fixtures. Nothing here is simulated: the fixtures
are stamped, really built with their own toolchains, served, selected with a real
browser, edited with the real editor, and verified by the stack's own build
before a write is accepted.

## Results

| Leg | Next.js (marketing) | Astro (commerce) |
| --- | --- | --- |
| `data-sus-id` stamped and survives the real renderer | PASS | PASS |
| Real build (`next build` / `astro build`) | PASS | PASS |
| Live DOM selection at confidence 1.0 (`editRefused: false`) | PASS | PASS |
| Anchor → single source owner | PASS | PASS |
| Unknown ownership refuses (`unknown-owner`) | PASS | PASS |
| Isolated preview + authentic approval | PASS | PASS |
| Apply with byte-minimal write (approved diff == written diff) | PASS | **BLOCKED** |
| Stack build verification gates the write | PASS | n/a (blocked before it) |
| Undo restores exact bytes, second undo refused | PASS | n/a |
| Page-derived instruction refused (`untrusted-provenance`) | PASS | n/a |
| Retry after consumption refused, exactly one edit on disk | PASS | n/a |

## Verdict

- **Next.js: GO.** The full chain works end-to-end on a disposable copy,
  including denials and exact undo.
- **Astro: GO up to the write, BLOCKED at the editor.** `src/editor.ts` is
  JSX-only, so it refuses `.astro` with `unparseable-source` and leaves the file
  byte-identical (verified). That is the correct fail-closed behaviour, but it
  means the Astro stack cannot be edited at all today.
- **Blocker task: T0700wc** (Astro source editing), recorded with its own
  acceptance. T0700wb stays open until T0700wc lands and the Astro half of this
  table turns PASS.

## Effect on the rest of the build

T0400/T0405 production-knowledge acceptance stays gated on this verdict as the
reconciliation recorded, and this verdict is **not** a clean GO: it is a GO for
Next.js and a named, bounded blocker for Astro. Knowledge work may proceed for
the Next.js surface; the Astro surface waits for T0700wc rather than shipping an
edit path that cannot write.

## Guarantees the experiment actually observed

- Zero harmful wrong-owner writes on either stack.
- Unknown ownership refuses by reason, never by guessing; the file is untouched.
- A page-derived instruction is data, not authorisation (DA-31) — refused before
  any capability is consumed.
- Consumption is one-way: a retry after a successful write leaves exactly one
  edit on disk.
- Verification is the stack's own build, not a syntax check; a failing build
  reverts the write exactly.
