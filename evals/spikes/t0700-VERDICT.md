# T0700 spike verdict — dual-stack mapping (read-only, no writes)

Measured 2026-11-14 on fixture A (Next.js marketing) + fixture B (Astro commerce).
Harness: scripts/spike-t0700.mjs (deterministic signature/id inventory matching).
Raw run: evals/spikes/t0700-run.json.

## Results (unique-owner rates, GO bar = 90% on BOTH stacks)

| Approach | fixture A (Next) | fixture B (Astro) | Verdict |
|---|---|---|---|
| Text-signature matching, uninstrumented | 65% | 40% | **NO-GO** |
| Static literal-id matching (instrumented proxy) | 81% | 65% | **NO-GO** |

## Root cause of the gap (evidence, not conjecture)

The unmatched DOM ids are **exactly the expression-bound instance ids**:
`feature-boards/alerts/exports` (Next `id={f.id}`) and `teapot-ember`,
`mug-set-dune`, … (Astro `id={p.id}`). Static source parsing cannot evaluate
JSX/Astro expressions — the map-loop instances that matter most for editing
ownership are invisible to static approaches.

## Verdict

**NO-GO for static/uninstrumented mapping.** Per ADR-003's recorded fallback
ladder, the confirmed path is **ladder step 1: the framework plugin MUST
stamp per-instance source ids at render time** (`data-sus-id`), which
static analysis cannot simulate — runtime stamping gets its first live proof
in T0702 (CDP attach) / T0703 (anchors). Uninstrumented confidence stays
`experimental` and requires explicit user confirmation per edit.

Mandatory capability unchanged (D24/D29): draw → intent → diff → approve →
apply → undo remains required; this verdict only selects the PATH. T0400/
T0405 production-knowledge acceptance remains gated on T0700w (safe-write
proof) exactly as the reconciliation recorded — no scope downgrade.
