# RISKS

Living register. `impact × likelihood` rated low/med/high. Review at each milestone gate.

| ID | Risk | I | L | Mitigation | Trigger to escalate |
|---|---|---|---|---|---|
| R1 | Studio DOM→source mapping unreliable on real apps | high | med | T0700 dual-stack spike with numeric go/no-go before investment | confidence <0.8 on both stacks |
| R2 | Rubric/detector sycophancy — scores inflate | high | high | fresh-context critic; human calibration ≥80% ±1; judged never gates CI | agreement drop between runs |
| R3 | Gates become bureaucratic, slow the loop | med | med | every gate must justify runtime; overhead measured per section | section loop > 2× baseline |
| R4 | Anti-slop rules punish valid design | high | med | labelled negative corpus; blocking requires measured precision (G10) | false-positive rate above target |
| R5 | Knowledge library drifts into contradictions | med | high | knowledge-lint in CI; single-source foundations; ≤2k token files | lint violations rising |
| R6 | Direction taxonomy becomes a new template source | high | med | derivation record mandatory; uniqueness check; owner brief overrides | repeated identical directions |
| R7 | Scope explosion across 73 tasks | med | high | one task at a time; milestone gates; WBS revisable | any milestone slipping 2× |
| R8 | Security hole in Studio bridge | high | med | fail-closed, localhost-only, threat model, dedicated suite (T0806), external review | any auth/origin test failure |
| R9 | AST writes corrupt user code | high | low | snapshot + build verify + auto-revert; refuse unknown syntax | any revert without clean restore |
| R10 | Owner context loss between sessions | med | med | durable files (this set) updated every session; HANDOFF.md maintained | handoff older than last change |
| R11 | No independent reviewer available | med | high | deterministic gates + labelled `not-run`; separate-session review offered | any GA-adjacent task |
| R12 | Fixture corpus licensing | low | med | licensed/synthetic pages only; provenance required | any unlicensed asset |
| R13 | Model updates shift agent behaviour (skill decay) | med | med | evals rerun per release; capability-vs-preference skill split tracked | eval delta beyond threshold |
| R14 | Public claims outrun evidence | high | med | claims protocol Part 9; claim-checker lint on docs | any comparative claim pre-benchmark |
