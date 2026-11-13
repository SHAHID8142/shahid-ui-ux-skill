# HANDOFF — fresh-context resume file

**Last updated:** 2026-11-13 · planning phase, build gate armed.

```text
COMPLETED: T0001–T0003 (workspace audit, gap analysis F1–F20, risk register + coverage matrix);
           planning docs: research model, amendments v1.1 (A1–A10, gates G1–G12, rubric,
           epistemic contract E1–E9, studio spec), ADR drafts 001–006, tooling candidates,
           full WBS (TASKS.json, 88 tasks, validated), ROADMAP/DECISIONS/RISKS/TEST_EVIDENCE.
           GitHub: SHAHID8142/shahid-ui-ux-skill (private), prior planning work committed+pushed.
           Deep audit: docs/DEEP_AUDIT_2026-11-13.md (48 findings, current primary sources,
           owner clarification D23; full scope + mandatory browser Live Studio retained).
ACTIVE:    none (planning only)
BLOCKED:   all implementation tasks — owner has not sent "APERIO"
CHANGES:   docs/ (9 files), TASKS.json, ROADMAP.md, DECISIONS.md, RISKS.md, TEST_EVIDENCE.md, README.md
TESTS:     structural checks only (see TEST_EVIDENCE.md); no product tests exist
USER APPROVAL: pending — (a) reconciled ADR-001..006, (b) amendments v1.1, (c) bounded first batch;
               deep-audit recommendations are proposals, not approvals
NEXT ACTION: reconcile deep-audit findings and the effective requirements/task graph before build;
             T0101 remains gated on APERIO + approvals
HOW TO RESUME: read README.md → docs/SUS_MASTER_PRD_v1.0.md → docs/PRD_AMENDMENTS_v1.1.md →
               docs/OWNER_DECISIONS_LOG.md → docs/DEEP_AUDIT_2026-11-13.md → TASKS.json → git log.
               T1001 is now enumerated explicitly; the checker now fails on any unresolved ref.
               Do not repeat completed planning work.
               Do not build until "APERIO". Commit+push after every change.
```

## Owner's standing instructions (do not lose)

1. Full version, robust and heavy; slow is acceptable.
2. No templates. Agent must argue non-best-practice requests with evidence; learner, not believer.
3. Web UI/UX focus: marketing, e-commerce, CRM/admin, CMS admin, portfolio. No native at v1.
4. Framework-agnostic; prove mapping on Next.js AND Astro before committing.
5. Approval gates enforced as code.
6. Prove Studio early (spike with go/no-go).
7. Licence + channel before any publication; repo stays private until approved.
8. `APERIO` = start building (not the Aperio Next workflow).
9. Use third-party tools/skills/MCP where they help; no proprietary copying.
10. Independent cross-check of the plan before build — fresh reviewer/session with a
    hostile-reviewer brief; findings reconciled here before `APERIO`. Detect current host
    capabilities rather than treating earlier host limitations as permanent facts.
11. D23: full scope retained. Live Studio means direct drawing/selecting/writing over the target
    project's browser page. This audit does not authorize reducing it or implementing SUS.

## Deep-audit handoff

The audit inspected all 18 pre-existing Markdown files, all 88 task records, Git state and the
five archived originals. The archive matches. The audit found T1001 depending on the
unresolved string `M3–M9 tasks` plus several unmapped milestone barriers and launch deliverables;
all were fixed in the reconciliation pass (TASKS.json now 88 tasks, strict-validated). See the
report for evidence and proposed research, learning, approval, Studio,
accessibility and evaluation corrections. No SUS code or executable artifact was created.
The audit report and its documentation updates are local working-tree changes at handoff.
