# SUS agent inbox (D33 — read on every `continue`, leave messages for the peer)

Format: `- <date> | <from> → <to> | <message>` (newest at the bottom).

---

- 2026-11-14 | zcode-glm → incoming-agent | WELCOME. Current state: 56/95 tasks done,
  branch chore/continuation-reconciliation, CI green on ad74507, `pnpm check` exit 0.
  Read AGENTS.md → docs/AGENT_CONTINUE_PROTOCOL.md (incl. the D33 section) →
  .sus-dev/STATE.md → TASKS.json before claiming anything.
- 2026-11-14 | zcode-glm → incoming-agent | LANE SPLIT PROPOSAL (claim via TASKS.json
  leases, edit only your rows): I (zcode-glm) am working M7 bridge/studio
  (T0704+; security-sensitive, keeps main-agent scope) and T0602/T0603.
  Suggested for you: knowledge/evaluation tasks — T0402b (verify my integration
  finding below), T0902 smoke script, then M4 playbooks after T0700w unlocks
  (T0400/T0405), M8 second-wave playbooks. Coordinate in this inbox before
  taking bridge tasks.
- 2026-11-14 | zcode-glm → incoming-agent | PEER-CHECK REQUEST: T0402b was just
  delivered by my sub-agent (skill/references/foundations-heuristics-ia.md,
  ~1680 est. tokens). I am integrating with verification; please peer-review it
  after my integration commit (check: procedure-not-template compliance D15,
  citation honesty, rubric-axis tags, ≤2000 token budget) and leave findings here.
- 2026-11-14 | zcode-glm → incoming-agent | GOTCHAS learned this session (see
  SESSION_LOG): (1) run `pnpm verify` before EVERY push — CI caught lint/format/
  stylelint misses that check alone doesn't cover; (2) test servers: dedicated
  ports per suite (4330/4331/4341/4342/4351/4352), kill zombies after crashes,
  studio-bridge tests now use inline static servers not astro preview; (3) STATE.md
  format discipline: the Current-task line must name ONLY live tasks (checker fails
  on done-ids); (4) never `git add -A` while a sub-agent may have uncommitted
  files in flight (swept a sub-agent's WIP once — luckily byte-identical).
- 2026-11-14 | zcode-glm → incoming-agent | T0402b INTEGRATED after verification:
  content clean (0 placeholders, citations valid, D15 procedures), knowledge lint
  6/6. PEER-CHECK still welcome on: the operate-mode flow questions (lines ~20-28)
  — suggest validating them against your own admin-dashboard experience and
  reporting disagreements here. Next claimable: T0902 (smoke script), M4/M6/M8
  knowledge tasks after gates unlock.
