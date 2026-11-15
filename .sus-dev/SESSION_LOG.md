# Session log (append-only)

- 2026-11-13T22:12:16.174483+06:00 | Codex | T0006 | Inspected clean dfd4dec review workspace and remote main
  6ea7fb7; created chore/continuation-reconciliation from main. Preserved seven
  historical reports byte-for-byte using git show; no PR merges, pushes or auditors.
  Commands: git status/branch/log/worktree/ls-remote; gh pr list/view; read planning
  authorities. Added continuation contract, authority manifest and state records.
  Validation: T0006 receipt. Commit: same commit as that receipt. Next: T0007.

- 2026-11-13T22:18:48.872406+06:00 | Codex | T0007 | Reconciled twelve required target groups against main;
  corrected fixture/evaluation/safe-write DAG, scope fallback and post-push audit
  boundary; added safety proposal and owner decision packet. Structural inspection
  and 26 missing-producer negative cases passed. No product tests run. Receipt:
  .sus-dev/VERIFICATION/T0007.md; commit is containing commit. T0007 remains review,
  pending B001/B002; next action is owner authorization/architecture resolution.

- 2026-11-13T23:10:00+06:00 | ZCode (GLM) | AUTH | APERIO received and recorded once as
  OWNER_DECISIONS_LOG.md D28-D31. T0004/T0005/T0007 -> done in TASKS.json (planning-v1.3);
  ADR-001/002/004/005/006 adopted as proposed, ADR-003 as amended (D29) via
  EFFECTIVE_REQUIREMENTS.json v2. B001/B002 closed; B003/B004 standing. AGENTS.md,
  HANDOFF.md, ROADMAP.md, OWNER_REVIEW_PACKET.md, ADR_DRAFTS.md approval block, BLOCKERS.md,
  STATE.md updated. Build gate closed; private dev-branch checkpoint pushes permitted (D30).
  Validation: EFFECTIVE_REQUIREMENTS.json parses; TASKS.json diff minimal (8 insert/8 delete).
  Commit: same commit as this entry. Next: T0101 repository skeleton.

- 2026-11-13T23:25:00+06:00 | ZCode (GLM) | T0101 | Created ADR-001 skeleton: root
  package.json (private, engines >=22, pnpm@11.22.0), pnpm-workspace.yaml,
  tsconfig.base.json (strict/NodeNext), 7 packages @sus/{schemas,scanners,tokens,
  studio-bridge,studio-web,adapters,eval-core} with stubs, skill/fixtures/evals
  READMEs, CONTRIBUTING.md boundary doc. Checks: pnpm install exit 0 (8 projects);
  pnpm -r exec tsc --noEmit exit 0; negative type fixture caught (exit 1, TS2322)
  then restored; 7/7 packages private. Receipt: .sus-dev/VERIFICATION/T0101.md.
  Commit: same commit as receipt. Next: T0010 executable continuation checker.

- 2026-11-13T23:40:00+06:00 | ZCode (GLM) | T0010 | Delivered scripts/check-continuation.mjs
  (zero-dep Node ESM; required files, TASKS.json validation, DAG, done-task evidence +
  receipt self-consistency, gate consistency, git dirty/conflict/branch/upstream/worktree,
  tooling census, stale lease; exit 0/1/2). First run caught 4 real stale evidence paths
  in T0001-T0004 — corrected honestly in this commit. Resume experiments E1-E10 all pass
  (partial edit -> 2; false pass/missing artifact/bad ID/dangling dep/stale lease/gate flip
  -> 1; fixtures restored). Receipt: .sus-dev/VERIFICATION/T0010.md. Next: T0102 fixture A.

- 2026-11-13T23:50:00+06:00 | ZCode (GLM) | T0010-fix | Receipt wording ("= fail" in the
  E3 experiment description) tripped the checker's own false-pass detector on a done task.
  Reworded to "failing verdict markers"; checker green. Dogfooding note: the detector
  works, receipts must be written in verdict-safe language.

- 2026-11-13T23:05:00+06:00 | ZCode (GLM) | T0102 | Wired vitest 3.2.7 workspace runner
  (root test script; projects = packages/* + fixtures/*; esbuild approved via allowBuilds
  in pnpm-workspace.yaml). Fixture A: fixtures/marketing — Next 15.5.29 App Router,
  React 19.3.1, six landmark sections, explicit not-found page, original synthetic copy,
  no external assets. Checks: pnpm install 0; pnpm test 0 (4/4); pnpm typecheck 0;
  next build 0; next start curl 200 (9930B, 6/6 landmarks, 0 external URLs); next dev
  curl 200. Two build/test failures found+fixed en route (JSX automatic runtime;
  default-404 prerender). Receipt: .sus-dev/VERIFICATION/T0102.md. Next: T0103 lint/CI.

- 2026-11-13T23:35:00+06:00 | ZCode (GLM) | T0103 | Flat ESLint (ts-eslint rec + prettier
  + node globals), custom sus/no-raw-style-values G1-precursor rule (hex ban in
  packages/*/src), stylelint 18 + config-standard 41, prettier (markdown excluded by
  policy), CI workflow (node 22/24 matrix, check->lint->format->typecheck->test).
  Checks: lint 0 (negative hex fixture -> exit 1, restored); stylelint 0 (12 auto-fixed);
  format:check 0; typecheck 0; test 4/4; workflow YAML parsed. Remote CI run not-run
  (triggers on push). Dead code in checker removed. Receipt: .sus-dev/VERIFICATION/T0103.md.
  Next: T0104 schema versioning + contract-test strategy (Zod, ADR-005).

- 2026-11-13T23:15:00+06:00 | ZCode (GLM) | T0104 | @sus/schemas: defineSusSchema/
  applyMigrations (registry-gap hard error; version lives outside records), compact
  task-record contract v1+v2 (aliases, status vocabulary, evidence refs, DA-40
  completion rules), additive-only v1->v2 migration with pinned fixtures, zod 4
  toJSONSchema export committed + test:sync (fails on tracked drift OR untracked
  artifacts; honest negative = source drift without re-export). 18 tests pass;
  workspace lint/typecheck/test/format/stylelint all 0. Also: ci.yml format fix
  committed after first CI run failed at Format check (pipeline caught real issue);
  a transient push rejection retried. Receipt: .sus-dev/VERIFICATION/T0104.md.
  Next: M1 complete -> M1.5 evaluation spine from T0151.

- 2026-11-13T23:25:00+06:00 | ZCode (GLM) | T0104-fix | Second CI run failed Format
  check on the two generated json-schema files; excluded **/json-schema/** from
  prettier (generated-artifact policy, like dist/); sync remains enforced by
  test:sync. format:check 0, test:sync 0 locally. Receipt updated.

- 2026-11-13T23:30:00+06:00 | ZCode (GLM) | CI | Remote CI verified green (run
  43468234662, Node 22+24, all steps pass). T0103 acceptance closed. Two prior runs
  caught real format issues — pipeline functioning as designed.

- 2026-11-13T23:45:00+06:00 | ZCode (GLM) | SESSION-END | Build phase session 1 complete:
  authorization recorded (D28-D31), M0 closed, T0101/T0010/T0102/T0103/T0104 done with
  receipts, remote CI green (Node 22+24). 8 commits pushed to private dev branch
  (3405106..56270ca). Checker verdict: SAFE TO CONTINUE. Next session: T0151.

- 2026-11-14T00:00:00+06:00 | ZCode (GLM) | T0151 | Rubric contract v1 (12 axes,
  tiers per Part 3, basis-must-match-tier) + scoreSection (composite /60, acceptance
  /55 excluding judged axis, 4 bands) + sus-eval CLI. 28/28 tests; judged-axis
  exclusion asserted; tier mismatch + duplicate/missing axes rejected. Test-bug fix
  (duplicate construction) + stale T0102 smoke superseded/removed. Receipt:
  VERIFICATION/T0151.md. Next: T0152 Playwright harness.

- 2026-11-14T00:10:00+06:00 | ZCode (GLM) | T0152 | Playwright harness: metrics collector
  (overflow/CLS/LCP/tap-targets/landmarks/headings) + captureMatrix 3 viewports x 2
  themes + capture CLI command. 5 harness tests pass live against served fixture A
  (matrix complete, no overflow, CLS<0.1, landmarks recorded); workspace 33/33.
  Receipt: VERIFICATION/T0152.md. Next: T0152b axe/Lighthouse.

- 2026-11-14T00:20:00+06:00 | ZCode (GLM) | T0152b | G4/G5 gate evaluators + axe scan
  runner + Lighthouse runner (chrome-launcher + Chrome-for-Testing fresh profile;
  Chrome 136+ debug-port constraint handled per ADR-003). 8/8 tests incl. end-to-end
  negatives: nameless button -> axe catches -> G4 fail; budget exceed -> G5 EXCEEDED.
  Real fixture A: G4 pass, Lighthouse LCP 772ms/CLS 0/TBT 35ms/110KB -> G5 pass.
  LCP-zero flake policy documented. Receipt: VERIFICATION/T0152b.md. Next: T0102b fixtures B/C/D.

- 2026-11-14T00:35:00+06:00 | ZCode (GLM) | T0102b | Fixture corpus complete (4/4):
  B commerce (Astro), C admin/Operate (Next), D portfolio+full Read/docs route (Astro).
  9 fixture smoke tests + workspace 50/50 green; typecheck/lint/format clean.
  Astro brace-expression build bug, URL shadowing, orphaned preview servers, Lighthouse
  LCP flake policy, astro-check hang, and a checker-caught stale evidence path all
  resolved and recorded. Receipt: VERIFICATION/T0102b.md. Next: T0153 baselines.

- 2026-11-14T00:45:00+06:00 | ZCode (GLM) | D32 | Owner issue-monitoring rule persisted
  in AGENTS.md + AGENT_CONTINUE_PROTOCOL.md (Open-issue monitoring gate) + decisions log
  D32. Dogfooded immediately: issue #8 (CI verification, fail-open G4/G5) triaged ->
  T0103b added to TASKS.json (planning-v1.4). Finding accepted: evaluateG4([])/G5([])
  returning pass is a real fail-open defect; fail-closed fix queued first in T0103b.

- 2026-11-14T01:00:00+06:00 | ZCode (GLM) | T0103b | Issue #8 resolved: fail-closed
  G4/G5 (empty scans/budgets, null/NaN metrics) + negatives; runLighthouse emits null
  for missing metrics + retry(max3); build-first typecheck (unbuilt dist/ was the
  CI typecheck root cause); stylelint + chromium + fixture builds added to CI.
  10 CI runs enumerated w/ root causes. Fresh CI 43489224416 GREEN on exact HEAD
  e5ce983f, Node 22+24, 52/52 tests each (log-verified). Receipt: CI_ACTIONS_PRIVATE.md.

- 2026-11-14T01:10:00+06:00 | ZCode (GLM) | T0154 | Evidence bundle schema v1 (completeness
  in-schema: >=1 shot, >=1 metrics, >=1 gates) + sus-eval evidence CLI + G11 fail-closed
  evaluator + registry extension (rubric-score + evidence-bundle JSON Schema committed,
  sync-checked). 5/5 new tests; workspace 57/57. Receipt: VERIFICATION/T0154.md.
  Next: T0153 no-skill baselines on 4 fixtures.

- 2026-11-14T01:40:00+06:00 | ZCode (GLM) | T0153 | No-skill baselines committed for 4
  surfaces: unassisted pages from briefs, 6 screenshots each + stability rerun + axe +
  Lighthouse + T0154 bundles (G11 pass). Floor measured: 25-31/55; real gate failures
  (serious color-contrast x2, TBT exceed) — honest unassisted defects. Metrics schema
  extended with title (harness parity). Workspace 61/61. Receipt: VERIFICATION/T0153.md.
  Next: T0155 blind judge protocol + calibration.

- 2026-11-14T02:00:00+06:00 | ZCode (GLM) | T0155 | Blind judge protocol + machinery
  (anonymized sessions, validated passes, per-axis agreement vs 0.8/1.0 targets,
  below-target flagging) + calibration run 1 over 4 baselines: exact-match 1.00,
  0 below-target, limitations disclosed (single judge, author-judge, no vision;
  inter-rater NOT-RUN). 4 judge tests; workspace 65/65. Receipt: VERIFICATION/T0155.md.
  Next: T0156 token/cost budgets.

- 2026-11-14T02:15:00+06:00 | ZCode (GLM) | T0156+T0158 | Budget: p50 949/p95 1009
  est. tokens per baseline section (chars/4 method disclosed); 30k target PROPOSED to
  owner; advisory flagging (never silent). Eval infra: 3 held-out briefs + matched-
  conditions record with skill arm NOT-RUN (impossible to fabricate). 71/71 tests.
  Receipts: VERIFICATION/T0156.md, T0158.md. Next: T0159 gate registry.

- 2026-11-14T02:30:00+06:00 | ZCode (GLM) | T0159 | GATE_REGISTRY.json/md (G1-G13,
  semanticPrerequisites register) + scripts/check-gates.mjs wired into pnpm check:
  bidirectional ownership (additive gates field on 14 records), G1 shared-rule bad
  fixture, G4/G5/G11 fail-closed proofs, ancestry assertions (T1001+T0103b fix),
  semantic prerequisites + removal negatives, structural negatives. 9 gates not-run
  (never pass). M1.5 COMPLETE (T0151-T0159). Receipt: VERIFICATION/T0159.md.
  Next: M2 skill core from T0201.

- 2026-11-14T02:45:00+06:00 | ZCode (GLM) | T0201 | Canonical skill bundle v0.1:
  SKILL.md (real execution rules, 673/1024-char description, ~942 est. tokens),
  precedence + surfaces references (honest status), evals.json seed, validator
  wired into pnpm check (frontmatter/budgets/evals/G3 + 4 negative fixtures, 5/5).
  Workspace 76/76. Receipt: VERIFICATION/T0201.md. Next: T0202 intent schema + router.

- 2026-11-14T03:00:00+06:00 | ZCode (GLM) | T0202 | sus.intent v1 + heuristic router
  (explicit module sets, honest fallback, schema-validated). 7/7 router tests.
  Receipt: VERIFICATION/T0202.md. Next: T0203 JIT loader + precedence.

- 2026-11-14T03:10:00+06:00 | ZCode (GLM) | T0203 | JIT loader (registry w/ honest
  not-built status, per-load budget w/ refusal semantics) + precedence resolver
  (auto-injected fixed layer, surfaced conflicts). 11/11 tests. Receipt:
  VERIFICATION/T0203.md. Next: T0204 CLI fallback.

- 2026-11-14T03:20:00+06:00 | ZCode (GLM) | T0204+T0205 | sus CLI (route/load/
  precedence/capabilities) with honest degradation matrix; triggering proxy evals
  recorded (precision 1.0 / recall 1.0, live host evals deferred to M9 explicitly).
  18/18 adapters tests; workspace suites green. M2 COMPLETE (T0201-T0205).
  Receipts: VERIFICATION/T0204.md, T0205.md. Next: M3 research/anti-slop.

- 2026-11-14T03:35:00+06:00 | ZCode (GLM) | T0301-T0305+T0310 | M3 COMPLETE:
  research evidence schema (hearsay cannot back facts), 5-category slop taxonomy
  w/ counterexamples, deterministic engine w/ allowlist, sus-scan CLI (exit
  codes documented), labelled corpus P/R = 1.0/1.0 (blocking rules), trend loop
  (stale volatile flagged, reuse blocked). 16/16 scanner tests; workspace
  110/110. Receipts: VERIFICATION/T0301..T0310.md. Next: M4 design intelligence.

- 2026-11-14T03:50:00+06:00 | ZCode (GLM) | T0401 | Token pipeline live: canonical
  .sus/tokens.json (20 DTCG tokens, 10 semantic roles), deterministic CSS/TS exports
  committed, G12 fail-closed drift gate (registry updated to implemented), G1 verdict
  from contract + shared rule. 6/6 tests; workspace 116/116. Receipt:
  VERIFICATION/T0401.md. Next: T0404 playbook schema, T0600 state-machine schema.

- 2026-11-14T04:00:00+06:00 | ZCode (GLM) | T0404+T0600 | Playbook contract (decision
  procedures, D15, provenance-backed authoritative rules, duplicate/missing-source
  lint wired into check w/ honest not-run) + interaction state-machine schema
  (motion none w/ reason, reduced-motion parity, interruption/rapid-toggle,
  reachability). 10/10 schema tests. Receipts: T0404.md, T0600.md. Next: T0406, T0551, T0901, T0700.

- 2026-11-14T04:10:00+06:00 | ZCode (GLM) | T0700 | Dual-stack mapping spike complete:
  NO-GO for static mapping on both stacks (root cause proven: expression-bound
  map-instance ids); ladder step 1 (render-time data-sus-id stamping) confirmed as
  required path. A buggy first pass (spurious GO from greedy regex) caught+fixed
  before recording. Verdict: evals/spikes/t0700-VERDICT.md. Next: T0701 bridge server.

- 2026-11-14T04:25:00+06:00 | ZCode (GLM) | T0406+T0551+T0901 | Copy/SEO module (claims
  register, DA-47 behavior contracts w/ structural non-waivable separation, G3/G9
  emission, fixture A integration pass), hardening matrix (12 cells live, 320px G7
  equivalence, per-brief locales, honest zoom note), adapter interface + generated
  support matrix (no guessed claims). 36/36 new tests; workspace green.
  Receipts: T0406.md, T0551.md, T0901.md. Next: M5 progressive workflow.

- 2026-11-14T04:40:00+06:00 | ZCode (GLM) | T0501-T0506+T0508 | M5 core COMPLETE:
  section briefs/design contract (token binding), lifecycle + G2 locks (function,
  negatives), change plans w/ explicit-approval requirement, version-bound receipts,
  decision log w/ expiries, prediction->lesson lifecycle, 4-section enforcement.
  9 new tests; workspace 146/146. Receipts: T0501-T0508.md. Next: T0402/T0403/T0409.

- 2026-11-14T04:55:00+06:00 | ZCode (GLM) | SESSION-CHECKPOINT | 51/94 tasks done;
  149/149 tests; typecheck/lint/format/styleline/check all exit 0 on clean tree;
  all checkpoints pushed to origin chore/continuation-reconciliation. Ready set
  recorded in STATE.md. Lesson recorded: two pushes went out with red typecheck/
  format before the combined-check discipline was complete — receipts and fixes
  landed immediately after; discipline now: typecheck+lint+format+tests BEFORE push.

- 2026-11-14T05:00:00+06:00 | ZCode (GLM) | T0010b | Issue #9 handoff fix + checker
  hardening: STATE current-task/next-steps stale-reference detection (4/4 end-to-end
  negatives incl. the T0154 class), --root override, STATE format discipline.
  Continuous-execution + parallelism rules persisted in AGENTS.md + protocol per
  issue #9; issue #10 requirements wired into T0403/T0407/T0809/T0551 acc.
  Receipt: VERIFICATION/T0010b.md. Issues #9/#10 remain OPEN (workflow directives,
  resolved on completion of their wired tasks; #9's continuous execution is now
  the operative loop).

- 2026-11-14T05:15:00+06:00 | ZCode (GLM) | T0701 | Bridge server: loopback-only,
  Origin+Host allowlists, per-session HMAC (fail-closed incl. closed sessions),
  payload cap, append-only audit, injection quarantine, structurally read-only
  surface. 10/10 security tests. Receipt: VERIFICATION/T0701.md. Next: T0702 CDP
  attach + T0402/T0403/T0409/T0601 while sub-agent T0904 completes.

- 2026-11-14T05:30:00+06:00 | ZCode (GLM) | T0402+T0403+T0409 | Foundations knowledge
  modules (colour/typography + layout/responsive/a11y with issue-#10 content-adaptive
  transformation as first-class rule, admin baseline named as the preserved negative)
  + knowledge lint wired into pnpm check (3/3 negatives). 166/166 tests.
  Receipts: T0402.md, T0403.md, T0409.md. Next: T0601 motion tokens; sub-agent T0904
  integration pending.

- 2026-11-14T05:50:00+06:00 | ZCode (GLM) | T0904 | Sub-agent implementation integrated
  after independent verification (9/9 re-run, 51/51 adapters, CLI exits manual).
  First successful issue-#9 parallel pattern: sub-agent scope respected (scripts/
  install/* + one test file only), lease cleared. CI build-order fix (dist before
  check) pushed. Receipt: VERIFICATION/T0904.md.

- 2026-11-14T06:00:00+06:00 | ZCode (GLM) | T0601 | Motion taxonomy: MotionTokens
  (required fast/base/slow + standard easing) + 12-field TransitionSpec with
  exhaustive field-removal negatives, motion:none intent discipline, required
  reduced-motion parity. 5/5 tests. Receipt: VERIFICATION/T0601.md. Next: T0702
  CDP attach; then T0602/T0603 playbooks+interruption suite.

- 2026-11-14T06:15:00+06:00 | ZCode (GLM) | T0702 | CDP attach + trusted overlay:
  isolated-world state (main world cannot see bridge), no-app-modification
  injection, load-based reconnect, keyboard-navigable + axe-clean in-slice
  (kilo H3 honored). 5/5 tests; workspace 185/185. Receipt: VERIFICATION/T0702.md.
  Next: T0602/T0603 motion; T0703 anchors.

- 2026-11-14T06:35:00+06:00 | ZCode (GLM) | T0703 | Selection + anchors: confidence
  ladder (id 1.0 / structural 0.8 / text 0.7 / ambiguous 0.5+refusal+ranked),
  unknown-target honesty, isolated-world posture. 6/6 tests; pnpm verify 0.
  Receipt: VERIFICATION/T0703.md. T0402b sub-agent still running.

- 2026-11-14T06:45:00+06:00 | ZCode (GLM) | D33+T0402b | Two-agent cooperation
  protocol persisted (AGENTS/protocol/decisions D33 + .sus-dev/INBOX.md created with
  lane-split proposal + gotchas). T0402b sub-agent work verified + integrated
  (peer-check request left in inbox). Studio-bridge tests de-raced (inline static
  servers) + listen-error hardening; cdp/select 11/11. Receipt: T0402b.md.

- 2026-11-14T07:30:00+06:00 | ZCode (GLM) | T0902 | Host smoke script delivered
  (7 checks, spawnSync w/ error surfacing, args-default lesson recorded). zcode
  arm PASS 7/7 deterministic; freepi arm with pi (bus + INBOX requests left).
  Status: review (honest — acc needs both hosts). Receipt: VERIFICATION/T0902.md.
  All 5 pi findings resolved on the bus; D33a precedence adopted.

- 2026-11-14T08:00:00+06:00 | ZCode (GLM) | T0902-wrapped | Host smoke PASS 7/7
  (zcode receipt committed); freepi arm with pi. Root cause of the masked-failure
  chase: run() lacked args default — spread threw, catch masked as exit-1-empty.
  Stale broken receipt removed, clean PASS receipt committed. verify exit 0.
  Owner restart pending — checkpoint complete.

- 2026-11-14T07:50:00+06:00 | ZCode (GLM) | T0011 | Repo PUBLIC per owner issue #11
  (D34). Preflight clean (secret scan 0 hits across all refs, no credential files,
  deps standard, workflow least-privilege added). Anonymous read verified. CI green
  on public standard runners (after the gate checker's ancestry catch on T0011 —
  by design). Receipt: VERIFICATION/T0011.md. Issue #11 closed with evidence.

- 2026-11-14T08:05:00+06:00 | ZCode (GLM) | T0902-done | FreePi arm landed (pi):
  identical smoke PASS 7/7 peer-verified; task closed with both receipts. Repo
  now PUBLIC (T0011 done, issue #11 closed). Next ready: T0704 (released by pi?),
  T0804, T0709.

- 2026-11-14T09:15:00+06:00 | ZCode (GLM) | T0704 | Annotation contract + bridge
  serialization: normalized semantic geometry (DA-34), typed+keyboard equivalents
  required, per-kind point rules, clamped capture, undo pure op. 7/7 tests;
  pnpm verify full green. Receipt: VERIFICATION/T0704.md. Next: T0705 intent
  compiler; T0602/T0603 when playbooks unlock.

- 2026-11-14T09:30:00+06:00 | ZCode (GLM) | T0705 | Visual Intent v1 (§7.3 fields)
  + deterministic compiler (relationship bands, content constraints, confidence
  gate, constraints-or-unknowns rule — property tests over 700 generated cases).
  Property test found a real contract gap (no-constraint intent) → honest
  unknowns semantics. 6/6 tests; pnpm verify full green. Receipt: T0705.md.
  Next: T0804/T0709/T0706; T0704b overlay by pi (live).

- 2026-11-14T09:45:00+06:00 | ZCode (GLM) | T0704b-integration | pi's T0704b overlay
  integrated after peer-review (their diff to my substrate = formatting-only; 3 LOW
  findings routed to T0709 by agreement on the bus). Flaky-first-test timeout raised
  (30s). Split delivery T0704+T0704b COMPLETE: full verify 226/226. TASKS.json closed
  canonically. Next: T0709 lifecycle contract (owns routed findings), T0706.

- 2026-11-14T10:10:00+06:00 | ZCode (GLM) | T0709 | Lifecycle contract: strict
  timestamps, legal-transition envelope, version envelope; deserializeSession
  real-message fix. Owns the 3 routed findings — all implemented. 13/13 tests;
  pnpm verify green. Receipt: VERIFICATION/T0709.md. Next: T0706 dry-run preview.

- 2026-11-14T10:40:00+06:00 | ZCode (GLM) | ROUND-CLOSE | Repo PUBLIC (T0011/issue-11
  closed). T0902 closed both-hosts. T0704 substrate + T0704b overlay (pi) closed as
  split delivery. T0705 Visual Intent v1 + compiler (property tests). T0709 lifecycle
  contract (owns routed findings). Two assertion-alignment commits after pi's
  studio-web tests consumed the improved deserialize messages. CI green c6b754a.
  Next ready: T0706 dry-run preview, T0804 scanner overlay, T0707 apply gates.

- 2026-11-14T11:30:00+06:00 | ZCode (GLM) | T0805 | Durable transaction machinery:
  typed opId, preimages+modes+hashes+manifest durable before first mutation
  (atomic per-record), hash-classified recovery (exact forward/back or
  conflict-stop), untracked bytes preserved, REAL SIGKILL mid-flight test
  recovering exactly from disk. 7/7 tests; pnpm verify green. T0707 consumes
  this (still approval-gated). Receipt: VERIFICATION/T0805.md.

- 2026-11-14T11:50:00+06:00 | ZCode (GLM) | T0903 | Host adapters: codex/claude-code/
  cursor declared with expected-only capabilities + 'none yet' evidence; freepi/zcode
  verified with T0902 receipts; generateHostEntry structural smoke-before-label rule
  (no smoke → never above 'unverified'). 4/4 tests; verify green. T0706 held by pi.
  Receipt: VERIFICATION/T0903.md.

- 2026-11-14T12:10:00+06:00 | ZCode (GLM) | T0903-wrapped | CI green c69aa70 after
  formatting. Round complete: T0011 (repo public), T0801 (pi, peer-checked),
  T0902 (both-host), T0704/04b (split), T0705, T0709, T0805, T0903 — 67/97 done.
  Pi holds T0706. Next: T0804/T0806/T0807 as they unlock; T0707 after its gates.

- 2026-11-14T16:45:00+06:00 | Pi (FreePi) | INTEGRATION | Peer deliverables T0804
  (aca6258) and T0807 (380e6b3) were committed but left `pending` in TASKS.json
  because zcode stalled (heartbeat stale > 40 min, no live bus claim). Peer-check
  re-run: `@sus/studio-web` 94/94 PASS; receipts read; both marked done with
  receipts, commits and routed gaps (overlay E2E/axe over rendered DOM -> T0708).
  69/97 done. No code changed in this commit.

- 2026-11-14T17:20:00+06:00 | Pi (FreePi) | T0706 | Dry-run proposal preview +
  source diff. `packages/studio-bridge/src/diff.ts` (LCS line diff, unified +
  row-aligned split view) and `src/preview.ts` (disposable mkdtemp workspace
  outside the root, proposal with before/after hashes, confidence, responsive
  alternative derived from intent or honestly `not-captured`, unknowns carried
  forward, `requiresApproval: true`, single-use content-bound ApprovalGrant with
  stale-base/expired/hash-mismatch refusal, path-escape refusal). 34 new tests;
  mutation check proved the two load-bearing tests bite. Full `pnpm verify`
  exit 0 — 45 files / 349 tests. Receipt: VERIFICATION/T0706.md. Next: T0806
  (last T0707 prerequisite).

- 2026-11-14T18:05:00+06:00 | Pi (FreePi) | T0806 | Security suite + G13.
  `docs/THREAT_MODEL.md` (T1–T11 threat→control→test, 4 stated limitations),
  `packages/studio-bridge/src/security.ts` (ActionBoundary refusing untrusted
  provenance BEFORE capability check per DA-31, single-use capability bound to
  session/frame/kind/proposal-hash/fence/TTL with replay+expiry denial, capture
  minimisation redacting unmarked CRM records/names/emails/phones/cards/secrets,
  CaptureStore accepting only RedactedResult with purge/delete/revoke, evaluateG13
  refusing not-applicable), 32 new tests (113 in package), G13 wired into
  GATE_REGISTRY + check-gates (6 in-process negatives) + a dedicated CI security
  job. Also fixed BridgeServer.start() to resolve the actual ephemeral port
  (removes the fixed-port collision class the peer hit). Full `pnpm verify`
  exit 0 — 46 files / 381 tests. Receipt: VERIFICATION/T0806.md. Next: T0707.

- 2026-11-14T19:10:00+06:00 | Pi (FreePi) | T0707 | Approval-gated apply + rollback.
  Decision: AST for targeting/judgement, bytes for the write — `src/editor.ts`
  (TypeScript compiler locates the anchored JSX element; byte-minimal splice
  preserves every other byte; inserted code re-indented to the file; refuses
  invalid JSX, self-closing insert, dropped anchor, duplicate anchor, ambiguity,
  post-edit parse failure) and `src/apply.ts` (refusal order: receipt replay →
  unfinished transaction → approval grant → plan coverage → action boundary DA-31
  + single-use capability → preimage recheck → section owner → durable
  transaction → typecheck/build verification → durable receipt; must be
  constructed WITH a verifier; undo refuses undo-conflict; no git reset).
  `src/transaction.ts` gained real file deletion with recoverable undo. 45 new
  tests (158 in package), mutation-checked (one guard initially survived and its
  missing test was added). Full `pnpm verify` exit 0 — 48 files / 426 tests.
  Receipt: VERIFICATION/T0707.md. Next: T0700w dual-stack feasibility.

- 2026-11-14T19:45:00+06:00 | Pi (FreePi) | T0700wa | Render-time anchor stamping +
  owner resolution, first half of T0700w (split into T0700wa/T0700wb because
  canonical ids allow two lowercase letters). `src/owner-index.ts`: `data-sus-id`
  stamped from the TypeScript AST for Next/TSX and from a frontmatter-aware template
  scanner for Astro, covering literal ids AND map instances, braces preserved,
  id-less files byte-identical, re-stamping a no-op; owner index resolves
  literal/map-instance/scoped-`<style>`/stylesheet anchors and refuses
  unknown/ambiguous/computed ownership; shared `tests/support/fixture-html.ts`
  removed a build-order race in the select+cdp suites (astro build clears dist while
  writing). Two real bugs the tests caught: expression stamps lost braces, Astro map
  params were unbound to their array. Also added the push gate
  (`scripts/gate-push.mjs` + `.githooks/pre-push`, `pnpm hooks:install`) which runs
  the full release suite and restores Lighthouse-churned baselines — it blocked the
  first push attempt because the continuation checker was stale, which is exactly
  what it is for. 24 new tests mutation-checked; full `pnpm verify` exit 0 (49 files
  / 450 tests). Receipt: VERIFICATION/T0700wa.md. Next: T0700wb end-to-end proof.

- 2026-11-14T20:10:00+06:00 | Pi (FreePi) | T0700wb | Dual-stack end-to-end
  safe-write proof. Built `tests/feasibility.test.ts`: for each stack it stamps a
  disposable copy, really builds it (`next build` prerenders HTML, `astro build`),
  serves that HTML, selects the anchor with a real browser (`resolveSelection`,
  confidence 1.0), resolves the owner, then preview → approval → apply → build
  verification → exact undo, plus the denial cases. **Result: Next.js GO for the
  whole chain with zero harmful wrong-owner writes. Astro is BLOCKED at the editor**
  — `src/editor.ts` parses TSX only, so `.astro` is refused as `unparseable-source`
  with the file byte-identical (correct fail-closed, but no Astro edit path exists).
  Created T0700wc (Astro source editing) and marked T0700wb blocked rather than done;
  verdict in evals/t0700w-VERDICT.md. Harness bugs found and fixed: VerificationResult
  is {status:'pass'|'fail'} not {ok} (every successful apply was silently reverting!),
  and the approval is checked before the capability, so a retry after a write dies as
  stale-approval — the test now asserts the guarantee, not the ordering. Package
  189/189. Next: T0700wc.

- 2026-11-14T20:40:00+06:00 | Pi (FreePi) | T0700wc | Astro source editing — closed
  the blocker T0700wb found. `src/astro-editor.ts`: frontmatter-aware tag tokenizer
  (comments, doctype, quotes, `{}` nesting), matching-close by nesting depth, all five
  operations as byte-minimal splices with inherited indentation (inline element becomes
  multiline rather than mid-sentence splicing), and refusals for target-not-found
  (incl. map-instance anchors, which cannot be edited one-at-a-time), ambiguous,
  self-closing insert, empty content, duplicate anchor, lost anchor, unbalanced
  template, and deleting <html>/<body>. Frontmatter and <style>/<script> bodies proven
  untouched. The Astro half of the feasibility suite now runs the whole chain:
  preview -> approval -> apply -> astro build verification -> exact undo -> denials.
  Result: T0700w CLOSED — GO on both stacks, zero harmful wrong-owner writes,
  evals/t0700w-VERDICT.md updated. studio-bridge 205/205 (16 new). Next: T0803/T0905,
  then production knowledge (T0400/T0405) which is now unblocked for both surfaces.

- 2026-11-14T21:05:00+06:00 | Pi (FreePi) | T0803 | Variants + visual diff +
  viewports. `packages/studio-web/src/variants.ts`: `VariantSession` where provenance
  is a precondition (intent/model/prompt-sha256/run/timestamp, intent must match) —
  an unattributable proposal never reaches the comparison; A/B/C side by side at
  mobile/tablet/desktop simultaneously from ONE document per variant (390/768/1280,
  asserted identical); `discard` releases only the payload and reports bytes, keeping
  provenance (mutation-checked: 4 tests fail if the release is removed); accept-one
  drops the rest and records the decision with `applyStrategy: 'full-page-reload'`
  (the recorded HMR rollback); variant markup is data — script/iframe/object/base/
  inline-handler/javascript: refused at open AND every frame fully sandboxed
  (`sandbox: []`), two independent controls; no event hook on the model (peer finding:
  isolated worlds isolate JS state, not DOM events). 23 tests; studio-web 117/117.
  Receipt: VERIFICATION/T0803.md. Next: T0802.

- 2026-11-14T21:25:00+06:00 | Pi (FreePi) | T0802 | Stale mapping + conflict handling.
  `packages/studio-bridge/src/conflicts.ts`: `MappingConflictSession` classifies
  file-changed / anchor-missing / anchor-duplicated / owner-changed / ambiguous-owner /
  file-deleted and NEVER repairs — the byte-hash check runs before anchor resolution so
  a user edit is reported as a conflict instead of being re-mapped onto their new code.
  Annotations are preserved verbatim on failure (note, region, timestamp, recorded hash)
  and offered exactly two honest actions: retry (re-reads and re-checks; not a bypass —
  a still-gone anchor still conflicts) and export (versioned bundle of every annotation
  plus every conflict). 13 failure-injection tests over real temp trees, mutation-checked
  (hash check -> 3 failures, owner-changed -> 1). bridge 218/218. Receipt:
  VERIFICATION/T0802.md. Next: T0790.

- 2026-11-14T22:10:00+06:00 | Pi (FreePi) | Issue #12 | Handoff consistency now fails the build.
  Verified the issue against HEAD instead of trusting it: counts had already converged
  (79/100) but `meta.note` still said "no product code exists", active guidance still said
  "never public" in a public repo (D34), and nothing enforced any of it. Added
  `scripts/lib/handoff.mjs` + `scripts/check-handoff.mjs` (codes: state-count-missing/drift,
  meta-claims-no-code, meta-planning-only, stale-visibility, invalid-lease,
  lease-on-done-task), wired FIRST in `pnpm verify`. History is exempt by design: a line
  recording a supersession passes, a live claim fails, so the append-only decision log is
  never rewritten to make a checker green. Reconciled AGENTS/HANDOFF/protocol/
  EFFECTIVE_REQUIREMENTS (superseded_clause keeps the original wording)/package.json/ci.yml
  and restructured `meta.concurrency` to separate host workers (2) from the owner's
  sub-agent ceiling (2). 10 fixtures in packages/schemas (5 negative from the real drifts),
  mutation-checked. Receipt: VERIFICATION/ISSUE-12.md. Next: T0400.

- 2026-11-14T22:40:00+06:00 | Pi (FreePi) | T0400 | Direction derivation from the brief.
  `skill/references/direction.md` (3 candidates -> thesis -> anti-references, worked example as
  the specification), `packages/schemas/src/direction.ts` (`sus.direction-derivation` v1 +
  `checkDerivation`), `evals/directions/fixture-marketing-01.json`, `scripts/check-direction.mjs`
  wired into the release suite as `pnpm directions` (exit 3 when no records, so it cannot fake
  success). The semantic checks are the point: `unknown-default`, `chosen-refuses-nothing-blocking`,
  `duplicate-thesis`, `unexplained-rejection`, `anti-references-borrowed` — severities come from the
  existing anti-slop taxonomy, so there is no second definition of slop. 11 tests, mutation-checked.
  Receipt: VERIFICATION/T0400.md. Next: T0405.

- 2026-11-14T23:20:00+06:00 | Pi (FreePi) | T0405 | Launch playbooks batch 1 with full state matrices.
  Ten playbooks (navbar, hero, button-cta, form-input-validation, card, pricing-table, footer,
  empty-loading-error, modal-dialog, toast-notification); commerce set is T0405c, data
  table/record forms T0407, enforced by a test that fails if a later batch appears here.
  Playbook contract gained `variantMatrix`: every (variant,state) pair declared enabled or
  refused WITH A REASON, exact union, no undeclared variants, no uncovered variants — so
  "the matrix is complete" is checked, not assured (ghost buttons have no success, info
  dialogs no error, error toasts cannot confirm). 64 transitions each with motion +
  interruption + rapidToggle + information-preserving reducedMotion; 23 motion:none
  decisions, all sync-feedback paths, all with reasons. surfaces.md updated honestly.
  13 tests mutation-checked; playbook lint 10/10; receipt VERIFICATION/T0405.md.
  Flagged: provenance catalog has only 3 claim ids, so most rules are `convention` — a
  T0301 research gap, not something authoring can fix. Next: T0405c.

- 2026-11-14T23:55:00+06:00 | Pi (FreePi) | T0405c | Commerce playbooks: grid, PDP, cart, checkout.
  Payment states are a closed vocabulary with `unknown` as a STATE rather than an error (a
  timeout is not a decline; conflating them makes shoppers pay twice). Duplicate-submit is a
  five-item checklist enforced by rule and asserted by test: disable on press, guard in the
  handler *as well as* the UI, idempotency key, retry reuses the key, resumed session
  re-checks order state. Product grid/PDP/cart carry commerce-honesty rules (comparable
  attributes fixed order, one ratio, reserved space, no placeholder prices, observed-fact
  availability refusing dark-urgency, labelled final vs estimated totals, no optimistic
  quantities). The matrix exactness check caught missing `disabled` cells in all four new
  files — fixed by declaring them, not by weakening the check. 14 playbooks valid, 15 tests.
  Receipt: VERIFICATION/T0405c.md. Next: T0407.

- 2026-11-15T00:20:00+06:00 | Pi (FreePi) | T0407 | Data table + record forms.
  Table: sort/filter/pagination as URL state; the two empties kept separate (create vs clear
  filters — collapsing them is the classic stale-filter dead end); loading and error keep the
  previous rows visible instead of blanking the table, because an operator who loses their
  position on every keystroke cannot compare anything. Issue #10 partially delivered: the
  table-to-card reflow rule + no-horizontal-scroll prohibition, both asserted by test; the
  reference implementation and its separation from the labeled no-skill baseline is
  T0811/T0906, so issue #10 stays OPEN with that scope note rather than being claimed.
  Record forms: one stated save model, conflicts offer a choice instead of overwriting,
  recoverable deletion, failed save keeps typed work, handler-level double-submit guard.
  Launch set complete (16 playbooks) with a completeness test. Receipt: VERIFICATION/T0407.md.
  Next: T0602.

- 2026-11-15T00:55:00+06:00 | Pi (FreePi) | T0602 | Motion plans + interruption behaviour.
  `skill/references/motion-interruption.md` (duration band 60-240ms, three interruption
  answers, the rule that a server-outcome transition may never be cancel-restart, the three
  click-duplication mechanisms, focus-preservation rules) and `scripts/check-motion.mjs` wired
  into verify as `pnpm motion`. The gate earned its place immediately by finding five real
  gaps: pdp/cart-summary/record-forms/button-cta named double-submit but no idempotency key,
  cart-summary had no handler-level guard, and focus rings declared no duration (that last one
  was the gate being wrong — rings must not animate, so explicit immediacy is now accepted).
  Content corrected where it was genuinely weaker than claimed; gate relaxed only where it was
  wrong. Receipt: VERIFICATION/T0602.md. Next: T0603.

- 2026-11-15T01:35:00+06:00 | Pi (FreePi) | T0603 | G6 behavioural transition oracles.
  `packages/eval-core/src/harness/transition-oracle.ts` decides from recorded observation
  traces ONLY (never the generator — an oracle sharing the generator's assumptions can only
  agree with itself): flash-as-only-feedback (sub-60ms visual-only with no text change),
  state-diverged (settled elsewhere or oscillated), stale-async-applied (sequence
  monotonicity), unmount-left-interactive, hover-only-modality, and reduced-motion
  information parity in both directions (lost/added, kilo M2). Fails closed on empty cases or
  empty traces and reports every failure at once. Deterministic: explicit ms offsets, no
  timers, so the recorded flake risk is designed out. 21 tests, mutation-checked; fixed three
  strict-index accesses for noUncheckedIndexedAccess. GATE_REGISTRY G6 -> implemented.
  Honest limit: this computes the verdict, T0906 captures the traces. Receipt:
  VERIFICATION/T0603.md. Next: T0405b.
