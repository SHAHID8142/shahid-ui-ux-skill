# Unresolved blockers

## CLOSED — B001 build authorization (2026-11-13)
APERIO received and recorded once as OWNER_DECISIONS_LOG.md D28. BUILD_PERMISSION = true.
History retained for audit trail: before authorization only planning/reconciliation and
non-executable continuation documents were permitted.

## CLOSED — B002 effective architecture (2026-11-13)
Resolved by owner instruction to adopt evidence-supported, reversible recommendations
(OWNER_DECISIONS_LOG.md D29): ADR-001/002/004/005/006 adopted as proposed; ADR-003
adopted as amended (experimental ladder, fallback ladder, conservative privacy policy).
Reversal triggers remain live engineering checks; blockage goes back to the owner.

## B003 — publication (owner; later phase) — OPEN
Licence/channel and public-data release consent remain unresolved. Private completion
push (T1006) is distinct from public publication. No credentials, paid services or
public release authorized by the continuation protocol. T1003 (post-build audit) and
T1005 (publication) follow separately.

## B004 — irreversible externals during build — OPEN (standing)
If a task hits a genuinely irreversible external choice (licence, paid dependency,
public exposure, real customer data, destructive operation), stop that task, record it
here with minimal repro/impact/workaround, and take another independently safe task.
Do not silently decide; do not bypass security/approval gates to keep moving.
