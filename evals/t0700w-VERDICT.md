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
| Apply with byte-minimal write (approved diff == written diff) | PASS | PASS |
| Stack build verification gates the write | PASS | PASS |
| Undo restores exact bytes, second undo refused | PASS | PASS |
| Page-derived instruction refused (`untrusted-provenance`) | PASS | PASS |
| Retry after consumption refused, exactly one edit on disk | PASS | PASS |

## Verdict

- **Next.js: GO.**
- **Astro: GO** — after T0700wc added the Astro editor. The first run of this
  experiment found the editor was JSX-only and refused `.astro` fail-closed, which
  is exactly the kind of gap a feasibility gate exists to find: the initial verdict
  was a GO for one stack and a named blocker for the other, and T0700wc closed it.
- **Both surfaces are unblocked for production knowledge work (T0400/T0405).**

## Effect on the rest of the build

T0400/T0405 production-knowledge acceptance is unblocked: both stacks complete
the chain on disposable copies, with zero harmful wrong-owner writes.

## Guarantees the experiment actually observed

- Zero harmful wrong-owner writes on either stack.
- Unknown ownership refuses by reason, never by guessing; the file is untouched.
- A page-derived instruction is data, not authorisation (DA-31) — refused before
  any capability is consumed.
- Consumption is one-way: a retry after a successful write leaves exactly one
  edit on disk.
- Verification is the stack's own build, not a syntax check; a failing build
  reverts the write exactly.
