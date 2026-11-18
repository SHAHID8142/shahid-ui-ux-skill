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

- 2026-11-15T02:15:00+06:00 | Pi (FreePi) | T0405b | 15-playbook gap closed at the standard.
  The count was already met (16 playbooks); the real gap was that parts 7-12 (a11y,
  responsive, copy, alternatives, graded references, acceptance + failure cases) were implied
  by rules rather than recorded. `sections` is now required in the playbook contract, and
  `pnpm parts` counts all twelve PRD 6 parts per playbook, naming missing part numbers. All 16
  rewritten with honest evidence grading: normative-standard only for real specs (WCAG 2.2,
  WAI-ARIA APG, HTML, CSS prefers-reduced-motion), convention for our own decisions — no
  invented research citations, and a test asserts conventions stay labelled. 21 tests,
  mutation-checked. Receipt: VERIFICATION/T0405b.md. Next: T0408.

- 2026-11-15T13:55:00+06:00 | Pi (FreePi) | T0708 | Full loop demo, end to end.
  `pnpm demo:loop` stamps, builds, serves and drives the Astro commerce fixture in Chromium,
  then runs intent -> diff -> approve -> apply -> verify -> undo and writes a bundle with a real
  video (65 KB). Three real defects surfaced and were fixed: overlay buttons were focusable but
  inert (isolated-world listeners never fire for genuine input, so activation moved to a
  main-world binder with state left isolated), the overlay live region failed axe contrast, and
  `page.video().path()` is a Promise so the earlier bundle shipped a 0-byte video. axe runs over
  the whole page, not the section under test. Receipt: VERIFICATION/T0708.md. Next: T0408.

- 2026-11-15T14:40:00+06:00 | Pi (FreePi) | T0408 | Imagery plan is part of the direction record.
  Licensing is now checkable per asset (name, proofRef, attribution text, expiry + renewal
  owner, provider for stock/generated) and `permitsCommercial` is a literal true, so a
  non-commercial asset cannot be described at all. Weight budgets check the SUM against a
  surface ceiling; zero bytes only for css-only assets; a hero focal point at exact centre fails
  as unchosen. 15 tests, mutation-checked, full verify 601 tests. Receipt:
  VERIFICATION/T0408.md. Next: T0905.

- 2026-11-15T15:20:00+06:00 | Pi (FreePi) | T0905 | Support matrix generated and hash-bound.
  compatibility.json + docs/SUPPORT_MATRIX.md are generated by scripts/generate-support.mjs and
  `pnpm support` (inside verify, after build) fails on drift, so "never hand-edited" is enforced
  rather than asserted. Rows bind artifact sha256, environment facts, derived/effective tier and
  evidence. Stale evidence (hash mismatch, or receipts predating binding) downgrades a supported
  row to experimental; real state: freepi verified, zcode stale, three hosts without evidence,
  none supported because Live Studio is unexercised. 16 tests + snapshot, full verify 617 tests.
  Receipt: VERIFICATION/T0905.md. Next: T0809.

- 2026-11-15T15:55:00+06:00 | Pi (FreePi) | T0809 | Second-wave Operate playbooks.
  search-filters (URL-held criteria that survive the 640 px table-to-card reflow, 250 ms
  debounce with cancellation, mid-truncated ids, translated-label growth, two distinct empties),
  settings (permission-gated controls disabled with reason rather than hidden, dirty/save/error
  with idempotency key, destructive section separated) and dashboard-widgets (independent
  failure, reserved height, zero vs no-data, keyboard reorder). The motion and variant gates
  caught three real content errors, fixed in content not in the checker. 26 playbook tests,
  full verify 622 tests. Issue #10 stays open pending the T0811 reference implementation.
  Receipt: VERIFICATION/T0809.md. Next: T0810.

- 2026-11-15T16:30:00+06:00 | Pi (FreePi) | T0810 | Second-wave experience playbooks.
  onboarding (skippable with a named consequence, per-step resume, failed step keeps input,
  ending lands in the product), article-layout (65-75ch measure, current-section contents without
  scroll-jacking, internally scrolling code/tables, stable heading anchors) and gallery-case-study
  (artifact-first viewport, reserved tile space, focus-restoring dialog, outcomes attributed or
  labelled illustrative). 29 playbook tests, verify 625 tests. Receipt: VERIFICATION/T0810.md.
  Next: T0811.

- 2026-11-15T17:20:00+06:00 | Pi (FreePi) | T0811 | Second-wave primitives A (8).
  pagination, tabs, accordion, drawer, dropdown, breadcrumb, avatar, badge — each a contract rather
  than an implementation: focus return and roving focus, state in the URL, unsaved-work guards,
  destructive separation, hierarchy over history, and meaning that survives colour blindness. A
  shared builder keeps the gate-critical shape (outbound transition per state, exact variant matrix)
  in one place, and the gates still rejected two real content errors. 33 playbook tests, verify 629.
  Receipt: VERIFICATION/T0811.md. Next: T0812.

- 2026-11-15T18:10:00+06:00 | Pi (FreePi) | T0812 | Second-wave primitives B (6).
  file-upload (per-file states, resumable retry of the failed file only, cancel that says what
  happened to the partial, server-enforced constraints, keyboard/paste paths) and date-picker
  (typed locale + ISO entry, full keyboard grid with focus return, refusals with reasons, dates and
  instants modelled distinctly) carry the complex matrices the task named; tooltip, progress,
  skeleton and command-palette complete the set. 38 playbook tests, verify 634.
  Receipt: VERIFICATION/T0812.md. Next: T0906.

- 2026-11-15T19:05:00+06:00 | Pi (FreePi) | T0906 | Dogfood reference implementations.
  `pnpm dogfood` really builds, serves and audits marketing, commerce and admin with five checks
  each bound to a stated rule. Found two real defects on admin: 343px horizontal overflow at 390px
  and 4.46:1 contrast on the footer/env note. Both deliberately left unfixed because the admin
  fixture is the evaluation ruler — patching it in place would silently rewrite the baselines.
  Bundle stays in git-ignored evals/evidence/dogfood-private; only a redacted summary is committed.
  8 evaluator tests, verify 642. Receipt: VERIFICATION/T0906.md. Next: T1001.

- 2026-11-15T20:25:00+06:00 | Pi (FreePi) | T1001 | Cross-module regression suite.
  `pnpm regression` runs verify + demo:loop + dogfood in one command (129.8s, exit 0) and writes a
  report naming the revision, branch and dirty state. Aggregation fails closed: an empty run fails,
  not-run prevents pass, missing Playwright downgrades rather than drops. `pnpm reach` (audit H6) is
  now inside verify and proves all 94 finished non-M10 tasks have backing — it caught T0001, a done
  claim with nothing behind it. 14 new tests. Receipt: VERIFICATION/T1001.md. Next: T1002.

- 2026-11-15T21:10:00+06:00 | Pi (FreePi) | T1002 | Benchmark protocol.
  Published the protocol with three arms: baseline measured deterministically on all four surfaces,
  sus-assisted and human not-run (no artefacts, no participants — no invented result). Held-out
  briefs sealed by SHA-256 and asserted in verify; power computed (41/arm for a 0.5-point effect,
  63 for sd 1.0) so n=20 is described as a floor with a 1.0-point minimum claimable effect; claim
  gate returns allowed:false. The baseline arm itself fails a11y on commerce/admin and reflow on
  admin — unflattering and real. 12 tests, verify 668. Receipt: VERIFICATION/T1002.md. Next: T1004.

- 2026-11-15T22:05:00+06:00 | Pi (FreePi) | T1004 | Docs, claim checker, maintenance policy.
  `pnpm claims` blocks comparative claims while the benchmark gate is closed (read from the
  benchmark artefact) and absolute claims always, exempting code quotes and negated limitation
  statements. Shipped docs/LIMITATIONS.md (coverage-matrix statements verbatim plus what this build
  found) and docs/MAINTENANCE.md (owner, calendar, upgrade window, security route, G13 unwaiable).
  Rewrote the README's stale "no code written" block. 11 tests, verify 679.
  Receipt: VERIFICATION/T1004.md. Next: T1006.

- 2026-11-15T23:20:00+06:00 | Pi (FreePi) | T1006 | Complete build and verified final checkpoint.
  Regression at 2f344df: verify 679 tests, demo loop, dogfood — 3 stages, 132.0s, all pass.
  Install, secrets sweep and licence check clean; reachability 94/94; claim gate closed. Issues
  triaged (#12 closed, #10 scoped and left open, #9 open by design). Handoff written honestly,
  including the D34 public-repository supersession and the six gates still reported not-run.
  BUILD_COMPLETE_PUSHED=true. Receipt: VERIFICATION/T1006.md. Next: stop — T1003/T1005 are owner-only.

- 2026-11-15T17:35:00+06:00 | Pi (FreePi) | machine handoff | Owner is switching computers.
  Wrote docs/RESUME_ON_NEW_MACHINE.md (state locations, first-run commands including
  `pnpm hooks:install` and `pnpm exec playwright install chromium`, the git-ignored artefacts that
  must be regenerated rather than restored, current position 98/100 with T1003/T1005 owner-only, and
  an environment-difference table). Pointed HANDOFF.md, AGENTS.md, README.md and STATE.md at it and
  left a bus message for zcode. No open leases; nothing was held outside the repository.

- 2026-11-15T18:10:00+06:00 | Pi (FreePi) | machine handoff follow-up | Owner will type only
  "continue" on the new machine. Added `pnpm setup` (push gate + Chromium + recorded-state check,
  deliberately tolerant of a dirty tree) and a three-line bootstrap block at the top of AGENTS.md so
  a bare "continue" on a fresh clone performs the bootstrap before anything else. `pnpm verify` 679.

- 2026-11-15T20:45:00+06:00 | Pi (FreePi) | T1007 (issue #10) | Admin reference implementation reflows.
  First command on this machine: `pnpm verify` failed 10 tests — every one
  `chromium_headless_shell-1254 … doesn't exist`. The documented `pnpm setup` cannot install it
  (`pnpm exec playwright` at the root → "Command playwright not found"), so the bootstrap was
  repaired to `pnpm --filter @sus/eval-core exec playwright install chromium` and both documents
  corrected. Then the issue #10 triage: the two dogfood findings (F1 343px overflow at 390px,
  F2 4.46:1 muted text) were fixed in the fixture, not in the baselines — `evals/baselines/*`
  are independent static captures and show unmodified in git, so the ruler is untouched.
  Reflow is one DOM: table row ≥768px, self-labelled block card ≤640px, five `td::before` labels
  in header order, `<thead>` kept in the accessibility tree. 8 browser assertions including a
  negative control that re-applies the pre-fix rules and must still overflow; 5 static contract
  assertions in the fixture. `pnpm dogfood` now 15/15 (admin 343→0, axe 1→0). Issue #10 stays
  open for its unverified items (states, translated labels, zoom, volume, AT session).
  Receipt: VERIFICATION/T1007.md. Next: issue #10 states/volume slice.

- 2026-11-15T21:15:00+06:00 | Pi (FreePi) | T1008 (issue #10) | Invoice list states, volume, long values.
  Added `invoice-repository.ts` (twelve synthetic invoices, pure `selectInvoices`, an async loader
  that *rejects* so the error path is real) and `invoice-list.tsx` (URL-carried q/status/sort/page,
  live-region counts, two distinct empty states, loading with rows kept, error keeping rows plus
  retry, paging). 11 repository tests, 12 browser tests. The 200% text test found three genuine
  layout defects — `th` cells escaping the visually-hidden `thead` (76px overflow), `minmax(11rem)`
  / `minmax(13rem)` grids wider than a 320px screen, and a flat 6.5rem label column squeezing the
  action — all fixed. Five identical "Open" accessible names and meaning-free status pills were
  found by the screenshot review and fixed. `docs/MOBILE_RECORD_PATTERNS.md` documents table vs
  card vs disclosure with the rule used. verify 714 tests, dogfood 15/15. Receipt: VERIFICATION/T1008.md.
  Next: nothing eligible; T1003/T1005 are owner-commissioned.

- 2026-11-15T21:40:00+06:00 | Pi (FreePi) | T1008 CI follow-up | Run 43728500241 failed two tests that
  passed locally, and both were real: a heading whose longest word could not wrap (8px over a 320px
  viewport at 200% text on the runner's wider fonts) and a test that waited for a sentence the
  previous load already produced. Fixed at the cause — `overflow-wrap: break-word` on body, and the
  test now waits for the applied result and applies a wide font stack itself so Mac and runner
  measure the same page. Commits 03386d2 and a92328a; CI run 43729821619 success. Owner issue #10
  closed with the not-run items named (screen-reader session, browser zoom, real translations,
  volume beyond twelve rows). Issue #9 stays open by design.

- 2026-11-15T22:30:00+06:00 | Pi (FreePi) | T1009 | ROADMAP.md became a view of TASKS.json.
  The public roadmap still called M1–M10 "pending" with 100/102 done, so a reader or a resuming
  agent would have concluded the build had not started. Added scripts/lib/roadmap.mjs (pure
  aggregation/render/parse/check), scripts/check-roadmap.mjs (check or --write the marked block
  only), 19 tests and `pnpm roadmap` in verify after `pnpm claims`. The first table this task
  wrote was wrong in three cells and the new checker caught all three on its first run. Reverted-
  by-hand negative control: M1 forced back to "pending" → exit 1 with both violations named.
  Receipt: VERIFICATION/T1009.md.

- 2026-11-15T23:00:00+06:00 | Pi (FreePi) | T1009 extension | A stale progress figure anywhere in the
  public surface now fails the build: docs/BUILD_COMPLETION_HANDOFF.md still said "97 of 100 done"
  and README still denied that implementation was authorised (D28). Added `checkCountClaims` with a
  declared document list (code `count-claim-stale`); the handoff document now names no live count
  because it describes a past revision. Commits 9a952b9 and e788e90; CI runs 43735394584 and
  43736564619 success. verify 739 tests, dogfood 15/15.

- 2026-11-15T23:45:00+06:00 | Pi (FreePi) | T1010 | Rehearsed the documented first-run path on a real
  fresh clone of the public remote — and it was broken: `pnpm verify` died with ERR_MODULE_NOT_FOUND
  from scripts/check-gates.mjs (compiled dist never built), `pnpm support:status` printed a raw stack
  trace, the first script run printed a false pnpm [ERROR] and the resume document promised "64 files,
  679 tests". Fixed with scripts/ensure-built.mjs (no-op when built, one build when not) wired into
  `pnpm check` and `pnpm verify`, an explicit artifact check in generate-support.mjs,
  verifyDepsBeforeRun: false with the reason recorded, and a new `count-claim-unverifiable` rule that
  refuses test/file counts nobody can keep true. 12 new tests. Re-rehearsed on a fresh clone at the
  fix commit: install 0, setup 0 (clean output), verify 0 (70 files, 749 tests). Receipt:
  VERIFICATION/T1010.md. Lesson: local green proves nothing about the documented path — clone it.

- 2026-11-16T00:20:00+06:00 | Pi (FreePi) | T1011 | CI gained a `fresh-clone` job: it clones the same
  commit into a tree with no dist and no node_modules and runs only install -> setup -> verify the way
  docs/RESUME_ON_NEW_MACHINE.md states. The warmed verify job's pre-build step was why CI stayed green
  while pristine clones failed (T1010); three static assertions keep the new job from being quieted
  with a pnpm build. Simulated locally in /tmp/clonetest (install 0, setup 0, verify 0, 70 files / 749
  tests); the Linux run is the CI job itself. Receipt: VERIFICATION/T1011.md.

- 2026-11-16T00:45:00+06:00 | Pi (FreePi) | T1011 result | The fresh-clone CI job went red on its first
  Linux run for a reason worth keeping: its browser-libs step ran `pnpm --filter … exec playwright` in
  the warmed checkout where nothing is installed — the very failure RESUME_ON_NEW_MACHINE.md §2.1
  documents. Fixed by running it inside the fresh tree after that tree's install, and by using
  fetch-depth: 0 (the run also warned "source repository is shallow, ignoring --local"). Run
  43751035048: all four jobs green, and the fresh-clone log shows setup, the ensure-built line and 70
  files / 752 tests passing on a tree that had never been built. The documented path is now verified
  on Linux on every push.

- 2026-11-16T10:58:00+06:00 | Pi (FreePi) | T1012-T1016 | Five D32-triaged tasks closed in one sweep,
  each with its own receipt. **T1012/T1013**: `/sus audit` is a composition, not a second engine —
  `packages/eval-core/src/audit/{contract,compose,pipeline,report}.ts` reuse `evaluateG4`,
  `evaluateG5`, `captureMatrix`, `runHardeningMatrix` and `@sus/scanners`; 39 tests, among them
  eleven adversarial ones that fail if a document is returned satisfied by its own preparation, if an
  artefact lacks a hash, or if a human judgment is stamped `pass`. **T1014**: seven gates that the
  registry called `not-run` (G2, G3, G6, G7, G8, G9, G10) now execute, each with a good and a bad
  fixture; `check-gates.mjs` emits 55 `[PASS]` lines, and a mutation sweep substituted each bad
  fixture into the good slot: `caught=7 missed=0`. G7's 400 % zoom half stays `not-run` out loud.
  **T1015**: stale prose reconciled — SKILL.md no longer calls itself a skeleton, the capability
  matrix marks shipped capabilities built and keeps a degradation sentence per row. **T1016**: the
  Modern Web Guidance source is pinned by revision and stays `unverified` (`sha256: null`), so the
  provider arm is `not-run` rather than assumed; `checkResponsiveTable()` makes the one recipe that
  breaks screen-reader header association checkable in 22 tests, and writing those tests found two
  real guard defects (an anchored `attr(data-label)` regex that let the anti-pattern page skip the
  header check entirely, and an out-of-scope table reported `fail` instead of `not-applicable`);
  three pilots carry measured before/after (columnheader 0 → 4 with a negative at 0 and a 320 px
  fallback at 4; drawer contract flags false → true with 4 → 0 tab steps behind it; INP 360 ms/310 ms
  blocking → 0/0). Receipts: VERIFICATION/T1012.md, T1013.md, T1014.md, T1015.md, T1016.md.
  `pnpm verify` exit 0 — 74 files + 3 skipped, 845 tests passed / 9 skipped, 89.5 s, 13/13 gates
  implemented, registry still names G7 400 % zoom as unmeasured. Count is now **108 of 110 done**;
  only the owner-only T1003 and T1005 remain.


- 2026-11-16T17:35:00+06:00 | Pi (FreePi) | issue-evidence (no task id, D32 step 4) | Posted the
  missing evidence to the owner-facing channel; no code changed. Git inspected first: branch
  `chore/continuation-reconciliation`, HEAD `5c0d8c5`, tree clean, `gh issue list --state open` =
  #9 (standing rule by design), #13 (P1), #14 (P2). `pnpm verify` at `5c0d8c5`: **exit 0 —
  76 files + 3 skipped, 867 tests passed / 9 skipped, 13/13 gates implemented**, with the registry
  still naming "G7 400% zoom (harness does not drive browser zoom)" as unmeasured. Live audit
  exercised for evidence: `./packages/eval-core/dist/cli.js audit --path ./fixtures/portfolio/dist
  --out /tmp/sus-audit-portfolio --mode quick` → exit 0, `seo-structure:pass`, `anti-slop:pass`,
  one real finding (missing meta description), and every browser phase `not-run` with a reason.
  #13 comment (id 6916260177) states the shipped engine + routing + evidence contract, and names
  the residue that keeps it open: 400% zoom asserted `not-run` by `scripts/check-gates.mjs:177-181`,
  no real AT session, no field performance, no 320px screenshot column. #14 comment (id 6916263373)
  states the measured pin (two independent transports, byte-identical, digest-refusal), the bounded
  offline-degrading provider (53 tests), the responsive-table pilot (0/16 → 16/16 with a failing
  negative and a 320px fallback, 22 guard tests), the CI action pins (10 tests), and the residue:
  the provider arm of any paired run is `not-run` and D06 stays owner-open. Both issues were left
  OPEN deliberately — closing them would claim the measurements above that were never taken.
  Local `pnpm verify` rewrote `evals/baselines/*/bundle.json` (LCP 602→603, TBT 65→14 timing noise);
  restored with `git checkout -- evals/baselines`, as the INBOX warned. No TASKS.json change: no
  task became done or started. Remaining agent-doable work is exactly these two residues; both are
  consequential enough to need an owner decision on whether to widen them.

- 2026-11-16T18:25:00+06:00 | Pi (FreePi) | T1017 | Closed issue #13's last agent-doable residue.
  The previous position was not dishonest but it collapsed two measurements: G7 visited 320 CSS px
  at 568 px tall and raster scale 1 (a phone column) and then declared the desktop 400% zoom
  viewport unmeasurable — and `scripts/check-gates.mjs` **asserted** it stay unmeasurable, which is
  what made the gap structural instead of a missing visit. 400% zoom on a 1280×1024 window is
  320×256 CSS px at device scale factor 4. `runHardeningMatrix` now takes that visit as its own
  record (`zoom400`) with an overflow probe **and** a clipping probe (`overflow: hidden|clip`
  containers whose content still overflows them); `evaluateZoom400` fails closed on a missing
  record, a mislabelled 320×568/dsf-1 phone column, a missing probe, horizontal overflow and a
  clipping container. `evaluateG7` composes both halves, so a clean 320 px column plus an unmeasured
  zoom half is `not-run`, not `pass`; `compose.ts` follows the same rule and emits zoom findings at
  `viewport: 'zoom-400'` (P1, measured, location = culprit). The old assertion is replaced by seven,
  including "320 px clean without a zoom record is not-run".
  Measured, not asserted: `fixtures/marketing` passes at 320×256 dsf 4 (`scrollWidth 320 =
  clientWidth 320`, no clipping container); a served negative-control page with a 900 px block is
  recorded as overflow and evaluated `fail`, so the record follows the page rather than the label.
  Producer/consumer bound by a test that imports the G7 evaluator into the eval-core suite.
  Checks: `node scripts/check-gates.mjs` 0 → **61 `[PASS]`, 0 `[FAIL]`** (was 55); eval-core
  hardening+audit suites **48 tests**; `pnpm verify` 0 → **76 files + 3 skipped, 873 tests passed /
  9 skipped**; `pnpm regression` 0 → **3 stages in 148.4 s, verdict pass** (verify 120.5 s,
  demo-loop 4.7 s, dogfood 23.1 s).
  Not claimed: the user-agent zoom setting and text-only zoom are still not driven, and the gate
  verdict, every report's needs-review list and docs/LIMITATIONS.md say so; the zoom record covers
  one theme and one motion setting; the zoom cell is layout evidence, not a screenshot column.
  Task record added (`T1005.deps` extended so the release ancestry assertion still holds), ROADMAP
  regenerated from TASKS.json, STATE count moved to 109 of 111. Historical receipts (T1014, T1015,
  T0551) still read "zoom not-run" because they describe the tree at their own commits.
  Local runs rewrote `evals/baselines/*/bundle.json`, `evals/evidence/dogfood/*` and a
  `regression-<sha>.json` for the dirty tree; all restored, and the report is re-taken on the clean
  commit below rather than kept as "dirty tree" evidence.

- 2026-11-16T19:40:00+06:00 | Pi (FreePi) | T1018 | Shipped the loader the research provider was
  waiting for. The gap after T1016 was concrete: `research-provider.ts` takes an injected transport,
  and no shipped loader existed, so the provider arm of every paired run was `not-run`.
  `research-cache-loader.ts` now reads `<guideId>.md` from a cache directory, hashes on read and
  serves only digest matches; it ranks on identity tokens then cached content, shortlists within a
  factor of two of the best match, and pads a matched section to ≥300 characters (a heading with one
  line is a label, not an excerpt). Refusals are named: digest mismatch, undigested guide, oversize
  file (512 KiB cap), read failure, non-slug id (`../`, absolute, `a/b`, `Upper`, NUL → null), and
  empty cache is `not-installed` while a query nothing pinned mentions is `no-match`.
  `scripts/research/cache-guides.mjs` is the opt-in filler (SUS_RESEARCH_ONLINE=1): two transports
  must agree and each digest must equal the pin before a byte is written; the cache is `.sus-cache/`,
  git-ignored, so upstream text is not vendored (D06 open). `scripts/research/paired-run.mjs` records
  the provider arm's mechanics and writes baseline/effectiveness as `not-run` with reasons.
  Measured live at revision `4dd9683`: 4/4 guides cached (4556/1885/8912/20826 B) with digests equal
  to the pin, and the paired run served 3 of 4 topics inside its 3-call budget (table header → 321c,
  design breakpoints → 799c, drawer focus → 1200c), reporting the fourth `disabled` because the cap
  was spent — the cap working, shown as such. With no cache the paired run exits 3, not 0.
  Checks: scanners suite 110 tests (22 new), `pnpm verify` 0 → **78 files + 3 skipped, 895 tests
  passed / 9 skipped**. Not claimed: correctness of any guidance, benefit to an agent (no model was
  run), reachability of the ~250 unpinned guides, any licence position for copying.
  `TASKS.json` T1018 + `T1005.deps`; ROADMAP regenerated; STATE count 110 of 112.

- 2026-11-16T21:20:00+06:00 | Pi (FreePi) | T1019 | Issue #13 lists the pipeline's checks as
  "responsive/zoom/keyboard/semantic/a11y"; keyboard had no instrument at all (the dogfood runner
  tests only the *first* focus ring). Added `harness/keyboard.ts`: Tab up to 30 times on a real
  page at 1440×900, recording focus order, computed outline/box-shadow **while focused** (WCAG
  2.4.7), body landings and repeat patterns, in its own browser context so it cannot disturb the
  axe page. `keyboard-flow` is a required deep check: missing indicator → P1 named element, detour
  → P1, cycle → P2 (Escape is not pressed), no samples → `not-run`.
  The first live run "found" a detour and a cycle on our own fixture; both were my scanner's bug —
  30 presses over 9 controls wrap the document and Chromium parks focus on `body` at the wrap.
  Fixed the definition rather than the fixture: a body stop is a detour only while controls remain
  unreached, otherwise it is the end of the traversal and is truncated, with cycles looked for only
  in a repeated suffix of period 1–3 before that. Both directions are now pinned by tests.
  Measured: deep audit of `fixtures/portfolio/dist` → `keyboard-flow: pass`, 30 stops driven, while
  the same report still fails axe (`scrollable-region-focusable` P0), a 400% zoom overflow and
  390 px tap targets — the check discriminates. `pnpm verify` 0 → **79 files + 3 skipped, 905 tests
  / 9 skipped**, 13/13 gates. TASKS.json T1019 + `T1005.deps`; STATE 111 of 113.

- 2026-11-16T21:55:00+06:00 | Pi (FreePi) | T1020 | Closing issue #13 required one more thing its
  acceptance names explicitly: negative fixtures must catch overflow "without … false positives for
  legitimate scrollable grids". The 400% zoom record failed that clause — it ORed every wide leaf
  into `overflow`, so a data grid inside `overflow-x: auto` (the pattern SUS's own
  `MOBILE_RECORD_PATTERNS.md` recommends) would have been reported as a defect at 320×256.
  `metrics.ts` now skips a wide leaf when an ancestor declares `overflow-x: auto | scroll`;
  `hidden | clip` still counts, because the page stopping scrolling is not the content being
  reachable, and clipping must not be a way to pass an overflow check. Three real-browser tests pin
  auto / none / hidden, including the case a document-level check cannot see (clipped page looks
  clean, only the leaf list catches it). `pnpm verify` 0. STATE 112 of 114.
- 2026-11-16T21:56:00+06:00 | Pi (FreePi) | issue #14 | Closed with the acceptance table mapped
  to files, and with the two things it does not assert stated in the comment: provider
  effectiveness stays `not-run` (mechanics measured in `paired-run.json`), and no guide text has
  been read or copied (D06 owner-open). Also corrected `pilots/README.md`, which still said no
  shipped loader existed — true when written, false since T1018.

- 2026-11-16T22:15:00+06:00 | Pi (FreePi) | issue #15 | Triaged per D32 rather than started: the
  request is a feature with eight acceptance boxes, and guessing its scope would be worse than
  decomposing it. Registered T1021 (scope resolver + curated focus over the existing audit engine),
  T1022 (proposal contract: facts vs heuristics, diff, risk, test plan, approval-gated apply, undo),
  T1023 (canonical `sus.bestpractice` intent + CLI equivalent + honest host matrix), T1024 (five
  measured example classes incl. a mobile record row) — all `pending`, none claimed, each bounded by
  the same instruments `/sus audit` already uses so no second scanner appears. Added milestone M11
  to `scripts/lib/roadmap.mjs` so the roadmap stays generated rather than hand-written.

- 2026-11-16T23:05:00+06:00 | Pi (FreePi) | T1021 | Issue #15's first technical step, after triaging
  it into M11. `audit/scope.ts` resolves a selection to a stable target and a focus set, with five
  named outcomes — `resolved`, `ambiguous`, `not-found`, `advisory`, `rejected` — and separate
  `clarification` / `reason` fields so no caller has to parse prose to decide whether it may write.
  An ambiguous selector returns every candidate with `focus: null` instead of picking the first
  match; a stale selector or unreadable path returns `not-found` with a reselect instruction; a drawn
  region is `advisory` by construction because pixels are not source; empty, `*`, `html *`, over-long
  and control-character selectors are refused before reaching the browser, and a selector only ever
  reaches `document.querySelectorAll` inside the page.
  `selectFocus` partitions all six dimensions for each of seven component classes with a reason on
  every exclusion (`performance` is refused for a single control because no scripted interaction is
  driven; `copy` is refused for a record table because wording is content). Descriptors are
  `tag#id.class` and never inner text, so reports cannot leak page content.
  24 tests over a real Chromium page and a real file tree; `pnpm verify` 0. No proposal, no intent,
  no CLI flag, no provider call yet — T1022–T1024 remain `pending`.

- 2026-11-17T00:05:00+06:00 | Pi (FreePi) | T1022 | The proposal record, with two invariants the
  schema enforces instead of documenting: a `fact` must carry `observed` and `evidence`
  (`fact-without-observation` otherwise), and a `heuristic` may not be ranked P0/P1
  (`heuristic-ranked-blocking`). An unresolved scope is refused (`ambiguous`, `not-found`,
  `advisory` — a screenshot rectangle is not source — and `rejected` all quote their clarifier), as
  is an empty item list. The record carries a SHA-256 digest over canonically serialised
  `{scope, focus, items, untested}`, and `authoriseApply` refuses empty approval, a stale digest
  (content edited after approval), an unknown hunk, and a change in a dimension nothing measured —
  the last because an "improvement" nobody can verify is not an improvement. Untested dimensions are
  merged rather than dropped, so both the not-applicable reason and the partially-measured reason
  survive. Markdown escapes page-derived text; the test checks escaping, not substrings, since
  `\<img` still contains `<img`. Read-only is structural: the module imports no writer, and a test
  lists a temp directory before and after. Applying stays with Studio's T0707 path (content-bound
  grant, preimage recheck, byte-exact rollback). 20 tests, no browser; `pnpm verify` 0. T1023–T1024
  remain `pending`.

## 2026-11-17 — T1023 `sus-eval bestpractice` (M11, issue #15)

- Shipped the CLI equivalent: `runBestPractice` runs the audit, resolves the scope, converts findings
  to proposal items and writes `proposal.json`/`proposal.md` under `--out`; exit codes 0/1/2/3.
- Attribution is exact element-descriptor match, documented: axe findings (rule-id locations) are
  counted as "attributed elsewhere", never proposed for an element scope.
- Fixed two defects found here: `stableFindingId` now hashes the location (two tap targets no longer
  collapse into one finding), and measured overflow/zoom/clipping findings now carry
  observed/expected (`PageMetrics.documentScrollWidth/ClientWidth`, `ClippingElement.overflowPx`).
- Added `fixtures/bestpractice` (48 px clipped at 400% zoom on `#skip`, 18 px tap target) and 12 tests
  including a deep run that hashes the fixture before and after.
- `pnpm verify` green; no host slash binding is claimed.

## 2026-11-17 — T1024 five measured example classes (M11, issue #15)

- `fixtures/bestpractice/examples` ships five flawed areas; `scripts/bestpractice/examples.mjs` audits
  it and a fixed copy (deep, temporary dir), then writes `evals/bestpractice/examples.json` and the
  generated `docs/BESTPRACTICE_EXAMPLES.md`. `pnpm examples:check` is part of `pnpm verify`.
- Measurement found four engine defects and fixed them: dimension mapping now splits `capture-matrix`
  by finding (tap target is a11y, overflow is responsive); a scope owns bounded descendant
  descriptors so `#signup` owns its input; one defect is grouped by element+topic instead of one item
  per viewport/theme; overflow probing names the outermost overflowing element (the 720 px nav, not a
  table caption).
- Motion stays `not-run`: no example drives an interaction, so the reduced-motion guard is shipped but
  not measured, and both the record and the report say so.
- 6 tests pin the record (five classes, instrument moved, fixture still flawed, doc renders from json).

## 2026-11-17 — M12 issue triage (#16–#20)
- Owner asked to check GitHub issues and act on the new ones. Five P1 issues existed (#16–#20) plus my
  own #21 review: each was triaged into a bounded task and executed in order, one commit per task:
  T1025 (#18 redirect authorization per hop), T1026 (#17 live-document drift gate), T1027 (#20 playbook
  coverage record), T1028 (#16 untested host rows + quickstart), T1029 (#19 governance inventory).
- Two findings were uncomfortable and were kept: playbook coverage is **3/187 rules**, not "four
  playbooks"; and no host journey has ever been performed on any host, so #16's main half is `not-run`.
- The drift gate caught its author: editing the adapters staled FreePi's smoke receipt, and the gate
  flagged the two documents still citing it before commit.
- Owner-only remains: T1003 independent review, T1005 release/publication, licence D06/B003, branch
  protection policy, closing superseded review PRs, and any host install/journey.

## 2026-11-18 — issue #21 R-series (T1030–T1037)

Closed 9 of the 12 proposals from issue #21, each with a receipt, tests and a CI-verified push:

| Task | Proposal | Commit | Claim |
| --- | --- | --- | --- |
| T1030 | R2 | `34d93df` | axe runs confined to the selected element, so an a11y violation is attributable by construction |
| T1031 | R1 | `4cc55b1` | `--scope page` resolves without a browser and attributes by dimension |
| T1032 | R3 | `bcbae54` | `sus <command>` dispatches to the owning CLI; the map is checked against each CLI's own usage line |
| T1033 | R4 | `956b50f` | `pnpm studio:bridge` + `docs/STUDIO.md`; the Studio page does not exist and no doc says it does |
| T1034 | R9 | `e790366` | git's expected "not a git repository" no longer prints during the demo |
| T1035 | R11 | `e790366` | every performance number says "lab measurement, no field data, no comparative claim" |
| T1036 | R7 | `da2a7f7` | motion measured by driving one disclosure (pointer, keyboard, reduced motion) |
| T1037 | R8 | `ce4e5f8` | a file scope exits 3 and says why, instead of 0 "nothing to propose" |

Left alone on purpose: R6 (component-state probes, large), R10 (needs a zcode host), R12 (owner decision
D06). T1003 and T1005 remain owner-only and unselfcertified.

Lessons worth carrying:
- `innerText` on a hidden element falls back to `textContent`; parity checks must read visibility.
- A wrapper that lists commands must be tested against the wrapped CLIs' own help output, in both
  directions, or it drifts.
- A test timeout can measure the runner: measure the phase before changing the code.
- Verify CI with `gh run list` per commit; never infer "CI green" from a local `pnpm verify`.
- T1038 (R6) `0e349a4`: pressed/disabled driven and counted; loading/success/error named as not driven.
  R6 is closed to the extent it can be: three of five states are application states no generic probe can
  invent without measuring its own guess.
- T1039 `ba4db55`: hover + checked driven. Three defects in T1038's own probe found by doing the work:
  the press was measured against idle (so hover masked a missing `:active`), `mouse.down` on a checkbox
  clicked it and reverted the state the checked probe measured, and `:checked` does not re-resolve in the
  task that flips it. Native checkboxes are "not judged", not claimed broken.
- T1040 `ba4db55`: a native `details > summary` disclosure is driven as a second motion shape (Space, not
  Enter; state from `details.open`).
- T1041 `ba4db55`: an HTML file scope attributes its own route's findings — the only attribution that is
  true without a descriptor→file map. A component scope still exits 3. Counting bug fixed: findings on
  other routes are out of scope, not unattributed.
- Lesson: a check whose status is recomputed by a second hand-written predicate drifts from the findings it
  pushed. Derive the status from the findings.
- 2026-11-17: owner said "go ahead" to commissioning **T1003**. Wrote `docs/AUDIT_PACKET.md` (scope with
  file pointers, §0 distrust-the-author preamble, severity rubric where a vacuous gate is critical,
  reproduction commands run before being written down — three of them initially did not run as written and
  were corrected), recorded D35/D35a/D35b/D35c, and opened issue #22 as the claim point. T1003 stays
  `pending`: the receipt belongs to the auditor.
- T1042 `c3af784`: ran the audit packet's commands on a fresh `--depth 1` clone instead of only the working
  tree. Found that a scope path reached through a symlink (macOS `/tmp`) derived no route and fell back to the
  "cannot attribute" refusal — the same file attributable under one spelling and not another. Canonicalised
  both paths; a test now builds a symlink alias and asserts the two spellings agree.
- Lesson: a protocol written down is not a protocol executed. The instructions for the audit had a real
  defect in them until they were run somewhere the author's paths were not already canonical.
- Builder-side pass before the auditor arrives (not an audit verdict; T1003 stays pending):
  - T1043 `cfd3049`: CONNECT parsed by splitting on ':' so an IPv6 literal became host '[' — an authorized
    IPv6 host was unreachable and the refusal named a host `--authorize` could not accept. Parsed as a URL,
    brackets stripped before the predicate; a tunnel that cannot open now answers 502 instead of hanging.
  - T1044 `cfd3049`: apply gained path containment (realpath the parent, not the leaf; refusal
    `path-outside-root`). Traversal was unreachable before, so this is defence in depth — said so in the
    receipt. Found that `join` concatenates absolutes and refused a legitimate inside path; test caught it.
  - T1045 `cfd3049`: two verify runs failed files that pass alone. Timeouts were measuring contention; after
    widening two and capping eval-core workers at 4: 97 files + 3 skipped, 1057 tests, 402 s.
- Lesson: widening a timeout moved the failure to the next three files instead of removing the cause. The
  second occurrence is what identified the scheduler as the culprit.

## 2026-11-18 — the T1003 audit ran (verdict FAIL), and the fix wave landed (zcode-audit)

The owner commissioned the independent audit and asked for it to be run with fresh-context
subagents, two at a time (D33). Five auditors covered the packet's scope: baseline reproduction,
security (bridge/apply + network boundary), the honesty engine + gates, supply chain/claims/
licence, and a dynamic-execution pass on the security findings. The receipt lives in
`.sus-dev/VERIFICATION/T1003.md` (auditor of record; verdict FAIL per §6 — 0 critical, 4 HIGH
open at `69c8a45`, 1 HIGH fixed mid-audit, 9 medium, 17 low). Findings are recorded verbatim as
M13 tasks T1046–T1075. Two auditors' claims were refuted by execution — the `bestpractice` CLI
refuses unauthorized `--url` before contact on every flag combination (downgraded from high to a
latent medium), which is why the dynamic wave ran before the report was written.

The owner then said "start fixing and make this ready to use ASAP" / "do not stop working until
the project is ready to use". The fix wave, one atomic commit per surface, every fix with a
receipt and a test:

- T1046 `680c9ac`: the deep-mode Lighthouse Chrome rides the allowlisting proxy (audit finding
  T1003-1, reproduced three times — a hostile page reached an unauthorized LAN host from the
  unproxied chrome-launcher Chrome during exactly one phase). Proxy-start failure is fail-closed.
- T1047 `e1041d8`: a partially measured route set never reads as a clean states/motion check
  (T1003-2): errored and never-driven routes are named and keep the check at not-run; a real
  parity failure still fails. Also lands T1003-26 (never-driven ≠ parity failure).
- T1048 `b4300af`: the CI host-smoke step can actually fail the build (T1003-3: `| tee` under
  `bash -e` discarded the smoke's exit code); workflow-text test added; header claim scoped to
  push (T1075). Shell-semantics negative control executed in the receipt.
- T1049 `697815d`: the release handoff states the real dependency licence distribution (T1003-4:
  MPL-2.0 axe-core in production, LGPL libvips in fixture tooling, FSL sentry dev-only — the old
  row claimed "all permissive"). Claim gate grew from 6 to 22 files (T1003-12); packet rows and
  README wording fixed (T1059/T1062/T1072/T1073).
- T1051 `09f7abb`: recovery honors apply containment and sentinels never read as hashes (T1003-6:
  a planted prepared manifest could write/delete outside the root; the classifier compared the
  literal 'missing'). `insideRoot` moved to `paths.ts`; prepare/apply/recover/verify all hold it;
  `preimageMissing` replaces the sentinel; roll-back of a create removes the file.
- T1053 `d362099`: quick-mode proposals name their unmeasured dimensions instead of claiming a
  complete sweep (T1003-8); seo status agrees with its findings (T1003-9); keyboard boolean
  findings carry observations instead of refusing every proposal (T1003-10). Lesson: an existing
  test caught the first cut over-deriving when a report had no `mode` field — default to deep.
- T1052 `d29f9fa`: the report says what the network boundary refused (T1003-7): `networkRefusals`
  in the schema (default []) and a "Network boundary" section naming refused requests plus the
  subresource allowance; net-guard's header promise is implemented, not asserted.
- T1056 `1b98203`: the gate checker cannot silently stop asserting (T1003-11): a coverage test
  holds a floor of output lines per unconditional report() call site plus 29 pinned canary
  names. Negative control executed: deleting the G7 320px assertion turns the test red.
- T1058 `eac8967`: runBestPractice authorizes liveUrl before any browser contact and routes the
  scope browser through the guarded proxy (T1003-13): the audit's dynamic repro inverted — a
  LAN-IP listener records zero hits and the refusal lands in 5 ms.
- Lows `765be5f`: eleven findings with tests or executed probes (ephemeral baselines port;
  verify builds once; byte caps; capability/grant digest cross-check; operation-id validation;
  truncation disclosure; capture/reflow empty guards; G9 fail-closed probe fields; G12 wording;
  claim-gate line numbers; push-gate attribution). T1063 (session expiry) deferred with
  rationale; T1070 closed by T1047.
- T1061 follow-up: verify failed on 4 unhandled ECONNRESET teardown errors with all 1086 tests
  passing. Root cause: the authorized proxy's client sockets had no error handlers — a teardown
  reset crashed the process. Expected resets are now recorded, not fatal; upstream response and
  serveLocal keep-alive teardown guarded the same way. `pnpm verify` exit 0: 99 files / 1086
  tests / zero unhandled errors.

Lesson: an unhandled 'error' event on a socket is a crash waiting for the next teardown. When a
suite owns servers, every stream it creates needs an error handler, because the failure arrives
after the test that caused it and blames an unrelated file.
