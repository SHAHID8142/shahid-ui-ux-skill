# Copy & SEO guidance (T0406)

Evidence-backed copy rules. Every factual claim in shipped copy must cite an
entry in the claims register (sus.claims-register v1) which cites provenance
(sus.provenance-catalog v1). Unregistered numeric claims are the fake-precision
scanner category — blocking (G3/G10 corpus, precision 1.0/recall 1.0 measured).

## Copy rules

1. **No placeholder content** (G3, non-waivable): no lorem ipsum, no TODO/FIXME.
2. **Claim register**: numbers/percentages/comparatives cite provenance or do
   not ship. Stated policies ("20% deposit required") are facts about the
   product, not marketing claims — still recorded in the register.
3. **Voice**: match the brief's register; argue with evidence when a request
   conflicts with clarity (D16) — record the exchange.
4. **Reading flow**: one idea per paragraph; headings describe content, not
   tease it (helps scanning and SEO equally).

## Domain behavior contracts (DA-47)

Non-waivable (policy floor, schema-enforced):
- commerce: truthfulness (no manufactured scarcity — dark-urgency category),
  recoverable payment states (user can always retry/back out), duplicate-submit
  protection (double-click cannot double-charge).
- operate: role clarity (who may do what is visible), bulk-action clarity
  (selection state is explicit and reversible), auditability (actions log).

Owner-taste decisions (valid when recorded with decidedBy): tone choices,
density preferences, naming conventions.

## SEO structural checks (deterministic, `sus-eval audit --mode quick`)

- exactly one `<title>` ≤60 chars; meta description 50–158 chars
- exactly one h1; no skipped heading levels (G9 precursor)
- every `<img>` has alt (decorative images: alt="")
- exactly one `<main>` landmark

These are triage checks, not a ranking promise — no SEO outcome is claimed.
