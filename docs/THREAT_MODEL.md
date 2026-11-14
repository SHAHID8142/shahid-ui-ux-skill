# Studio threat model — v1 (T0806)

Status: **implemented, tested, non-waivable gate G13.** Owner task T0806.
Scope: the SUS Live Studio bridge, overlay, preview and capture surfaces.

This document is the artefact the G13 evidence is produced against. Each threat
below names its control and the test that proves the control denies the attempt.
A threat with no passing test is an **open finding**, and any open critical
finding makes G13 `fail` — there is no exception mechanism, and G13 can never be
reported `not-applicable` (`packages/studio-bridge/src/security.ts`,
`evaluateG13`).

## Assets

| Asset | Why it matters |
| --- | --- |
| Source write capability | A wrong write corrupts the user's consuming project |
| Bridge session token / operation capability | Whoever holds it can act as the user |
| Approval authority | The only thing standing between inspection and mutation |
| Captured page content | May contain unmarked CRM records, PII or secrets |
| Audit log | Must be trustworthy and must not itself become a leak |
| Worker fencing generation | A stale worker must not act after handover |

## Trust boundary

The inspected page is **hostile in full**: its DOM, scripts, iframes,
navigations, screenshots, annotations and any text or "lesson" the Studio reads
out of it. Nothing derived from the page is an instruction (`DA-31`). The bridge
process, the trusted approval surface and the user's own typed/drawn intent are
on the trusted side. A CDP isolated world separates JS state but **not** DOM
events, so approval can never be read from an in-page event.

## Threats and controls

Every row is covered by `packages/studio-bridge/tests/security.test.ts` (suite
name in the last column); the gate verdict is produced by running that suite.

| # | Threat | Control | Test |
| --- | --- | --- | --- |
| T1 | **Token read**: page script reads the bridge token from DOM attributes, web storage, URLs or logs and impersonates the overlay | Token lives in the privileged process/isolation closure only; overlay script carries no token; capabilities are opaque ids with no secret material | `a capability is opaque…`; server auth-denied tests |
| T2 | **Synthetic approval**: page synthesises a click/event or a message that looks like an approval | Approval is an out-of-band decision (`PreviewSession.approve`) + single-use capability minted by the trusted surface; capability issuance refuses a blank approver; **untrusted provenance is refused before the capability is even examined** | `denies untrusted provenance BEFORE consuming the capability`; `refuses to issue a capability without an identified trusted approver` |
| T3 | **UI replacement**: hostile page draws its own overlay that looks authoritative | The authoritative surface is out-of-page; a capability is bound to `approvedBy` recorded at mint time and cannot be minted from page content | `refuses to issue for an unknown action kind`; `a capability is opaque…` |
| T4 | **Cross-frame confusion**: a capability for the inspected tab is used from a hostile iframe | Capabilities bind `frameId` + `sessionId`; mismatch denies | `denies a capability used in a different frame`; `…under another session` |
| T5 | **Navigation / reconnect replay**: capability replayed after reload, reconnect or a new preview | Bound to the approved `proposalSha256`, `fence`, and a short TTL; consumption is recorded and replay is denied | `denies reuse after the proposal hash changed`; `denies a stale worker generation`; `denies expiry, and denies replay after a successful use` |
| T6 | **Direct command**: page content contains an instruction ("run this", "fetch that") and the agent obeys | `ActionBoundary` refuses any `write`/`command`/`network` whose provenance is not user-typed/user-drawn; unknown provenance strings deny rather than default to allow | `denies page DOM text, page scripts, OCR, screenshots and recalled lessons`; `denies direct commands…`; `rejects an unknown provenance string…` |
| T7 | **DNS rebinding**: attacker domain resolves to 127.0.0.1 and drives the bridge | Loopback-only bind + exact Host allowlist; non-allowlisted Host denied 403 and audited | `denies a rebinding-style Host header` |
| T8 | **Path escape**: a proposal or capture path leaves the project (`../`, absolute) | Paths are refused, not normalised — a normalised path can point where the user never looked | `denies path escape and absolute paths in a preview plan`; preview suite refusals |
| T9 | **Privacy leak in capture**: unmarked CRM records, emails, phones, card numbers or secrets reach previews, storage, logs or outbound payloads | `minimizeCapture` masks form values, record lines, bare person-name lines, emails, phones, cards and secret assignments; aggregated counts only (never the removed value); the store accepts **only** a `RedactionResult` payload | `redacts records, emails, phones, cards and secrets`; `leaves no residue of any seeded value`; `audit logs never carry seeded material` |
| T10 | **Indefinite retention**: captured material outlives its purpose or its consent | Per-record TTL + `purgeExpired`; `deleteSubject`; `revokeConsent` deletes immediately; capture refuses to exist without a consent id | `stores only redacted payloads and purges at expiry`; `deletes by subject and by revoked consent` |
| T11 | **Silent waiver**: a release ships with critical security work excused as "not applicable" | `evaluateG13` structurally refuses `not-applicable`, reports `not-run` without evidence, and `fail` on any undefended attempt, residue, retention failure or open critical | `refuses a not-applicable claim outright`; `reports not-run without evidence (never pass)` |

## Recorded limitations (not hidden)

1. **No apply HTTP endpoint exists yet.** The apply path itself now exists
   (`packages/studio-bridge/src/apply.ts`, T0707) and consumes
   `ActionBoundary` + `CapabilityAuthority` **before the first mutation**, in
   this order: receipt replay → approval grant → action boundary → section-owner
   resolution → preimage recheck → durable transaction → verification. What does
   not exist is a network route that reaches it; the bridge server stays a
   read-only session surface. When that route lands, it must call this engine
   unchanged and the suite must additionally cover the route (auth, framing,
   rate, and body handling) rather than assuming the engine's guarantees
   survive transport.
2. **Cross-origin isolation mechanics** (which surface owns approval, extension
   vs separate trusted window) remain an implementation choice for T0707/T0700w
   under ADR-003; this threat model constrains the outcome ("page cannot mint
   approval") rather than prescribing the mechanism.
3. **Retention duration** is product policy (safety contract: resolve before
   capture implementation). The code takes a retention value as configuration;
   capture stays disabled until policy sets it.
4. **OCR/screenshot content** is covered by provenance refusal at the action
   boundary. Extraction quality, redaction of *images* (as opposed to text) and
   retention of screenshot binaries are **not** implemented — there is no
   screenshot capture path yet, and this model forbids adding one before the
   redaction path covers images.

## Apply-path ordering (T0707)

`ApplyEngine.apply()` refuses in this order, so a refusal never leaves a byte
written and an approval never silently widens:

1. **receipt replay** — same operation id returns the stored receipt (no second write);
2. **unfinished transaction** — a prepared-but-unapplied manifest blocks new work until recovery;
3. **approval grant** — content-bound hash, expiry and proposal id (`stale-base`, `expired` → refused);
4. **plan coverage** — every planned file approved, every approved file covered, no delete carrying edits;
5. **action boundary** — trusted provenance + single-use capability for this session/frame/proposal/fence;
6. **preimage recheck** — current bytes must still equal the approved preimage (a race is a conflict, not a merge);
7. **section owner** — AST resolution; ambiguous or missing anchor refuses;
8. **durable transaction** — manifest + preimages before the first write (DA-35);
9. **verification** — the project's own typecheck/build; failure reverts exactly;
10. **receipt** — durable `.sus/ops/<id>.json`.

Undo is transaction-specific: it restores that transaction's preimages and
refuses (`undo-conflict`) if the file changed after apply. There is no `git
reset`, no stash and no checkout anywhere in this path.

## How the gate is produced

```
pnpm --filter @sus/studio-bridge test -- security   # hostile attempts must be denied
node scripts/check-gates.mjs                        # G13 fail-closed negatives
```

`evaluateG13` receives the evidence list built from the attempts above. A
missing section → `not-run`. Any `denied: false`, residue, skipped consent,
failed deletion or open critical → `fail`. Otherwise `pass`. `waivable` is a
literal `false` in the verdict type.
