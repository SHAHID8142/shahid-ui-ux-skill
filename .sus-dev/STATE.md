# Development state

Updated: 2026-11-14T07:00:00+06:00 (Asia/Dhaka). Host: ZCode; model: GLM
(account:zai-start-plan/GLM-5.3-Flash). A second agent/host now cooperates on
this repo (D33): claim tasks via TASKS.json leases; read `.sus-dev/INBOX.md`.

Branch: chore/continuation-reconciliation. Original main: 6ea7fb708f54e630e74e858eaa8aa2c469f04c33.
Stage: BUILD in progress. BUILD_PERMISSION=true (APERIO recorded as D28).
BUILD_COMPLETE_PUSHED=false. Architecture: ADR-001/002/004/005/006 adopted,
ADR-003 as amended (D29). Private dev-branch checkpoint pushes permitted (D30).

Canonical task statuses: TASKS.json (58 of 95 done). No active lease.
Concurrency: 2 workers (D33) — claim via lease before editing.

Current task: none (between tasks). T0902 in review (zcode arm PASS; freepi arm with pi). Pi holds T0704. Leases: TASKS.json + STATE per D33.

Next exact steps: `pnpm verify` (exit 0) before every push. Ready set:
T0704 annotations (zcode-glm), T0902 host smoke script, T0602/T0603 motion
playbooks + interruption suite, then T0705-T0709 chain →
T0700w → T0400/T0405 playbooks → M8/M9/M10 → T1006 final verified private push.

Blockers: standing B003 (licence/publication, later phase) and B004
(irreversible externals during build). Active files: none after checkpoint.

Latest checks: `pnpm verify` exit 0 (gates+lint+format+stylelint+typecheck+
build+test, 188 tests); remote CI green on ad74507 and later fixes. Environment:
macOS/zsh; Node v26.10.0, npm 11.19.1, pnpm 11.22.0; Git, gh, python3 available.
Format for this file: the Current-task line names ONLY live tasks; done-task
ids live in TASKS.json and SESSION_LOG, never here.
