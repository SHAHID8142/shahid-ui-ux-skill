# Concrete pre-build decision packet

**RESOLVED 2026-11-13 (D28/D29):** the owner sent APERIO and authorized adopting the
evidence-supported, reversible recommendations in this packet. ADR-001/002/004/005/006
adopted as proposed; ADR-003 adopted as amended with the conservative privacy policy.
Irreversible externals (licence B003, publication, paid services, real data) remain
separate owner decisions. See OWNER_DECISIONS_LOG.md D28–D31.

Planning corrections and historical reports are available in REVIEW_RECONCILIATION.md.
No software is built. This packet does not authorize implementation by itself.

## Build gate

The supplied continuation protocol §0.3 explicitly requires the owner to send
`APERIO`; “read it and act on it” adopts the protocol but does not supply that word.
Record the owner's eventual authorization once, then reuse it on every continuation.

## Architecture proposals for approval or amendment

| ADR | Proposed choice | Practical consequence / remaining limit |
|---|---|---|
| 001 | pnpm workspace; isolated packages, fixtures and portable skill artifact | One shared toolchain; exact package layout remains reversible |
| 002 | Agent Skills canonical bundle; generated host entries only after verified support | Distributable directory/name must match; eval layout is SUS policy, not assumed external standard |
| 003 | Dual-stack mapping experiments; isolated preview; privileged approval outside inspected-page DOM | Supersedes real-source preview and trusted injected-overlay assumptions. Compare extension-owned surface versus separate trusted control window; adopt only after hostile-page tests. No consumer source writes before safety prerequisites |
| 004 | DTCG-aligned token representation with SUS semantic layer; derived exports | Verify current format/tool compatibility during implementation; no unsupported standards claim |
| 005 | Zod contracts with exported JSON Schema and tested migrations | Interoperability must be checked; generated and independent negative tests |
| 006 | Strict TypeScript/ESM, supported Node runtime pinned at adoption | Verify current runtime support before pinning; old Node-version statements are historical |

Suggested scope for one approval: ADR-001/002/004/005/006 as proposed, and amended
ADR-003's experimental approach plus conservative privacy policy below. These are
concrete proposals, not recorded approvals. No repeated micro-task approval follows
once this architecture and APERIO are authorized.

Privacy proposal: disable capture/outbound transfer by default; selected, minimized,
redacted context only after an exact-payload consent prompt; no retained full-page
screenshots by default; explicit deletion and per-operation consent. Any persistent
retention duration must be chosen before enabling it. Logs exclude captured content.

Unapproved paid services, public deployment, licensing/publication and use of real
customer data remain separate decisions when needed. Private build completion and
final private push are already in the adopted protocol's scope.

## Work unlocked by those decisions

T0004 records architecture resolution; T0007 records final effective-contract
resolution; T0005 records the dependency plan. T0101 is the first executable parent,
to be decomposed into one bounded repository/toolchain slice before editing.
T0010 adds machine-enforced continuation checks. Both framework fixtures precede
T0700 mapping; safety/approval/recovery tests precede T0707 and T0700w safe-write proof.
No product success, benchmark score, host support or runtime security claim exists yet.
