# Studio safety contract — pre-build proposal

Owner-required outcomes: full Studio, explicit authentic approvals, private-by-default
handling and non-waivable critical security/privacy gate (D24). The implementation
mechanisms below are proposed refinements to ADR-003, not owner-approved architecture.
T0004 must resolve consequential architecture choices before affected implementation.

## Privilege boundary

The inspected page is hostile, including its DOM, scripts, frames, screenshots and
annotations. It never holds bridge tokens or an apply capability. A page-injected
DOM overlay may display annotations but cannot be the authoritative approval UI.
Evaluate an extension-owned trusted surface or a separate trusted control window
with an isolated authenticated channel; a CDP isolated JS world alone does not prove
that visible page DOM cannot spoof approval. Record the chosen mechanism and test
hostile replacement, synthetic events, token reads, iframe confusion and navigation.
No privileged operation is enabled until this experiment passes.

Bridge binds loopback only, validates exact Host/Origin and workspace paths, and
binds operation capabilities to session, tab/frame, proposal hash, preimage hashes,
operation type, expiry and current fencing generation. Generate, preview, apply and
undo have distinct typed IDs/receipts. A page request cannot mint an approval.
Tokens remain in the privileged process/surface and are excluded from DOM, page
storage, URLs, captures and logs. Reconnect/navigation invalidates binding until
reauthenticated. Replayed operation IDs return stored results without repeating writes.

## Preview and transaction model

Proposed preview: disposable isolated workspace plus separate dev server/browser;
copy only allowed project inputs. No preview writes to consuming-project sources.
Proposal generation is read-only. Any exceptions require explicit scope authorization.

Apply: validate receipt/ownership/fence → persist and sync preimages + transaction
manifest → stage changes → recheck hashes/fence → apply file replacements while
journaling progress → verify → accept or conflict-aware transaction rollback.
Persist file identity, original/new hashes, existence, modes and operation ID for
all files. Per-file rename is not global atomicity. Recovery consults durable states
(prepared/staged/applying/verifying/accepted/rolling-back/conflicted) and never
assumes an interrupted multi-file apply completed. Unknown/corrupt journals fail closed.
User-edited bytes, index state and unrelated untracked files are never replaced by
rollback. Test every interruption point using disposable fixtures before T0707.

## Ownership and mapping

Stable section IDs map to source ranges, instances, data/content records, component
owners, style rules and shared tokens. Shared impact reopens all affected approvals.
File counts are not ownership. Existing sections can exist without being newly
approved; only authorized change sets may mutate them through managed adapters.
Direct host-tool writes outside that boundary are detected, not claimed prevented.

Both Next.js and Astro require labelled target and edit-owner cases: repeated and
shared components, CSS modules/scoped CSS/tokens, content, responsive conditions,
HMR and mixed source languages. Pre-register denominators, supported classes,
coverage/correctness/abstention criteria before evaluating held-out cases. No
invented probability from instrumentation tiers. Any observed wrong-owner write
fails safe-write acceptance; unknown cases abstain. Report uncertainty and limits.

Fallback implementation paths preserve draw → intent → preview → approve → apply →
undo. Style-only experiments cannot satisfy missing mandatory component operations.
Exhausting approaches blocks Studio for a consequential owner decision.

## Capture and privacy

Proposed conservative default: no outbound transfer or retained full-page capture;
minimize selected context, mask form values and potentially sensitive CRM records
including unmarked text, and show the exact redacted payload before per-operation
capture/outbound consent. No assumption that missing data-sensitive means public.
Retention duration/storage, explicit deletion and consent revocation are product
policy decisions to resolve before capture implementation. Until then capture is
disabled. Tests seed unmarked names, emails, customer records and secrets; assert
absence from previews, export, logs and network payloads. Demos stay private until
separate rights/consent checks and owner publication authorization.

## Verification versus acceptance

check_verdict ∈ pass/fail/not-run/not-applicable (reason required where not run or
inapplicable). acceptance_disposition, approver, criterion, expiry and prohibited
claims are separate. No critical security/privacy exception authorizes completion.
G13 negative cases must fail closed even if every design gate passes.
