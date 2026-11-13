# Final pre-build reconciliation

Baseline inspected: main `6ea7fb708f54e630e74e858eaa8aa2c469f04c33`, verified against
remote main on 2026-11-13. This is builder reconciliation of historical evidence,
not a newly commissioned independent audit. No product implementation or product
verification exists. Report copies and complete immutable PR-head SHAs, URLs and
SHA256 hashes are in REVIEW_SOURCES.json. PR2/4 contain planning changes; only their
report Markdown was copied. PR4's base is a review branch, not main.

This ledger addresses the twelve required target groups. Dispositions below describe
current product evidence, not just whether proposed task text has been edited.
A planned fix remains partially-fixed/still-open until its specified tests run.
Detailed historical report claims remain accessible unchanged. This is not a claim
that every historical recommendation is binding or that all report findings are closed.

## Provenance keys

| PR | Report | Reviewed revision (as identified by report) |
|---|---|---|
| 1 | antigravity-opus | cda9d9d (also describes a changed working tree) |
| 2 | kilo | 92f3e5c |
| 3 | zcode-glm | cda9d9d (distinguishes HEAD from dirty working tree) |
| 4 | cline | 92f3e5c |
| 5 | copilot-sdk | 92f3e5c |
| 6 | hunyuan-hy | cda9d9d |
| 7 | codex | a878b715 |

Use report metadata when distinguishing reviewed base from report-commit SHA.
Each PR link is https://github.com/SHAHID8142/shahid-ui-ux-skill/pull/{number}.

## Finding ledger

| ID / severity | Origin / historical evidence | Current main evidence | Disposition / effective requirement | Minimum remedy and task owners | Test / acceptance |
|---|---|---|---|---|---|
| RC01 High | PR1 MED-1/MED-4; PR3 H5; PR5 proposed/approved finding; PR7 R05 | ADR header says all proposed; DECISIONS mixes fixed and proposed; no canonical continuation contract | partially-fixed; D24/D27, PRD authority | Effective manifest + canonical entry created by T0006; T0004 resolves six ADRs without inferred approval | False build permission; no ADR marked approved; fresh-session checker T0010 must reject missing authority |
| RC02 High | PR3 H4/M2; PR5 M1.5 and dual-stack findings; PR7 R08/R18 | T0700 lacks T0102b; T0153 lacks full corpus; T0301/T0401 bypass calibration | partially-fixed; evaluation-first plan and D18 | T0102 Next.js + T0102b Astro/full corpus; dependencies added to spike/baseline and production knowledge; T0700w early safe-write barrier | DAG rejects removed prerequisite; actual fixture build/smoke and calibration receipts required |
| RC03 High | PR2 H5/H6; PR4 C3; PR7 R01 | T0707 lacks T0502/0504/0508/0709/0805/0806/0807 | partially-fixed; PRD §11.3, D05 | Add safety ancestors before mutation; T0805 disposable transaction harness; T0707 integration; T0700w dual-stack proof | stale/forged receipt, duplicate replay, lost lease, crash at every step and concurrent edit must fail safely |
| RC04 High | PR4 C3; PR5 security/privacy findings; PR7 R02/R14 | ADR-003 page overlay trusted without isolation mechanics; unmarked CRM policy absent | owner-decision; D24 security, ADR-003 | STUDIO_SAFETY_CONTRACT proposal; T0701 trusted-surface experiment; T0806 hostile page suite; no capture before policy settled | page cannot obtain token/approve/command; Host/Origin/frame/rebind/injection negatives; seeded unmarked PII absent from outputs |
| RC05 High | PR1 CRIT-1/HIGH-4; PR2 H1; PR3 M1; PR4 C2; PR5 mapping finding; PR6 F-13/F-14; PR7 R03 | T0700 confidence >=0.8 on one stack contradicts uncalibrated evidence tiers | partially-fixed; D18, PRD §11 | Replace acceptance with labelled two-stack target/owner metrics; T0700 read-only and T0700w safe-write; separate languages/owners | preregister criteria, report coverage/abstention/uncertainty; wrong-owner write fails; each supported language round-trips and undoes |
| RC06 High | PR1 separate-product recommendations; PR5 critical fallback; PR7 R17 | T0700 rollback preview-only contradicts ADR ladder/full Studio | superseded as a scope policy; feasibility still-open; D02/D24 | Remove preview-only completion; fallback retains mandatory operations; no automatic A12 scope cuts | failed spike blocks Studio, not a passing preview-only substitute |
| RC07 High | PR5 preview/apply finding; PR7 R06/R07 | ADR preview writes unspecified disk; registry has fifth verdict non-conformant-accepted | partially-fixed; PRD §11.3 | isolated preview proposal; durable preimage before mutation; separate check/acceptance fields; T0706/0707/0805/0159 | staged/unstaged/untracked bytes, modes, index preserved through reject/crash; expired exception cannot change fail to pass |
| RC08 High | PR3 H4; PR5 release/security findings; PR6 F-10; PR7 R04/R10 | T1001 already reaches all non-M10 tasks, but G9 ownership differs; no G13; section file counts ambiguous | partially-fixed; D05/D24/D25 | T0402 supporting only; T0406/T0807 G9; G13 T0806; impact graph T0505; T1006 before T1003 | exact owner sets and negative registry fixtures; shared-file/token change invalidates affected approvals; all mandatory build ancestors before push |
| RC09 Medium | PR2 C7/M2; PR5 motion finding; PR7 design recommendations | T0405 still every-state motion; schema-generated tests alone insufficient | partially-fixed; PRD §9 | motion:none valid; transitions distinct from variants/states; T0600–0603 independently test button/input/toast/modal/menu/drawer/nav/skeleton/onboarding | keyboard/touch/no-hover, rapid toggles, cancel/stale async and reduced-motion operation parity |
| RC10 High | PR1 HIGH-5/6/7, MED-3/5/6; PR2 H7/M3–6; PR4 H1–H4; PR5 user-outcomes/publication; PR7 R09/R12/R13/R15/R16 | user-flow task exists but Read route/browser acquisition/artifact support binding incomplete; all benchmark/runtime evidence absent | still-open; full PRD and D06 | strengthened T0102b/0301/0402b/0506/0904/0905/0906/1002; budgets T0156; all promised playbooks retained, decompose before execution | Read/commerce/admin journeys; real AT labelled; false-positive corpus; inspected source provenance; no-cache/offline install; artifact-hash smoke; rights/PII; pinned competitor with uncertainty, no invented raters |
| RC11 Medium | PR1 HIGH-1/LOW-2; PR3 H1/H3; PR6 F-09/F-10 | 88 tasks at main, 3 done/2 review/83 pending; prior ALL CHECKS claims corrected historically but G9 pass overbroad | partially-fixed; truthful evidence | retain history; append current command receipts; canonical status only; T0010 detects drift; no old counts copied as current | computed count/DAG/ancestry; receipts distinguish actual checks from future tests and missing approval |
| RC12 High | PR3 H2; PR6 task-record/entry findings; PR7 R05/R11 | no AGENTS or .sus-dev state; old batch/review/push instructions conflict | partially-fixed; D24–D27 | T0006 contract; T0010 gated checker + builder resume experiments; expand broad parents before execution | interrupt before/after edit, test failure, local commit, stale worktree, tool/model change and no remote sync; preserve unknown edits/live lease |

## Previously repaired, narrowed and rejected recommendations

Main already contains T0402b for IA/user flows, all enumerated T1001 prerequisites,
T0702 keyboard/axe acceptance, T0807 WCAG exception wording, T0904 state migration,
T0404 advisory banned-defaults handling, five-viewport evidence and T0602 purposeful
motion. These are planning repairs, not product passes (PR2 H3/H4, M1–M5;
PR3 H4/M3/L1/L2; PR4 related gaps; PR6 stale task/count claims).

The current tracked tree excludes .DS_Store; PR1 LOW-1 is already-fixed at main.
The original ZIP is intentionally retained; PR1 LOW-3 is superseded by preservation
policy rather than deleted to optimize repository size. D24 confirms full scope,
so PR1 proposals to cut playbooks/dogfood or split off a reduced final product are
superseded. PR1/PR3 schedule estimates are opinions, not measured durations.
Single-writer local work and child-task decomposition address the coordination risk.
PR2 M7 and PR4's request for an early external security reviewer are superseded by
D25; automated threat/recovery tests remain mandatory before mutation.

Research URLs, host identities, third-party specs and numerical runtime/support
claims have not been reverified in this reconciliation. Their disposition is
cannot-verify until T0301/T0901 source inspection and executed smoke evidence.
No external-source factual recommendation is adopted solely because a report says so.

## Change control and outstanding owner choices

The dependency and acceptance edits are planning corrections authorized by D13/D24.
They do not approve pnpm/Zod/TypeScript, CDP privilege isolation, token format,
telemetry/retention or numerical benchmarks. Existing IDs are preserved. T0700 is
read-only; new T0700w carries write proof only after the safety barrier, avoiding a
cycle where the spike depends on the bridge it is meant to inform. T1006 now records
final private push; T1003 is post-build audit; T1005 is later public publication.

T0007 remains review until effective architecture conflicts and acceptance-policy
choices are resolved by the owner; no implementation can start from this document.
Before implementation, split each next broad parent into bounded children with
one observable result, negative cases, paths and recovery. Do not fabricate a full
micro-task breakdown without the approved architecture. No repeated generic interview.
