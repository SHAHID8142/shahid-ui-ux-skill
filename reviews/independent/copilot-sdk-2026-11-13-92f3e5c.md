# SUS Independent Architecture & Product Review

## Review metadata

| Field | Value |
|---|---|
| Project | Shahid UI UX Skill (SUS) |
| Repository | `SHAHID8142/shahid-ui-ux-skill` |
| Review date | 2026-11-13 |
| Reviewed commit | `92f3e5c81522b132973312fe921008ca1de8556f` |
| Report branch base | `main` (`7ad3d8d36caa1042ccbfc6e0df0106c241ec5561`); the reviewed and base trees were verified identical |
| Reviewer identity | AI assistant using Copilot SDK in VS Code |
| Model identity | Not exposed by this runtime |
| Review type | Independent documentation, architecture, product, workflow, and release-readiness review; no product changes |

This report distinguishes **specified/planned**, **implemented**, **tested**, and **unverified**. The project at the reviewed commit is a planning repository: no SUS package, `SKILL.md`, adapter, Studio runtime, scanner, or product test suite exists. No implementation behavior is inferred from its specifications.

## Executive summary and verdict

**Verdict: strong product intent and unusually detailed planning, but not implementation-ready and nowhere near release-ready.** The product direction is coherent: a portable design-intelligence skill, contextual anti-slop review, section-by-section approvals, persistent design decisions, and a mandatory browser Live Studio. The documents also recognize important risks—source mapping, local bridge security, motion accessibility, research provenance, rollback, and host-specific support.

The plan's main weakness is not lack of feature ideas; it is that several control documents do not yet describe the same enforceable product. In particular:

1. The proposed Studio go/no-go response explicitly permits reducing Studio to variant preview, contradicting the owner's fixed “do not reduce” requirement.
2. The bridge ADR says previews write candidates to disk, while the later preview contract prohibits silent writes to real source and separates preview from apply.
3. The dependency graph is syntactically valid but does not make all required work prerequisites to regression and release. A10's dogfood sites, for example, are not in the release task's ancestry.
4. The M1.5 milestone is called blocking, but M2's first task does not depend on all M1.5 tasks.
5. Studio security is a core release concern, but the gate registry has no security gate or explicit non-waivable critical-security verdict.
6. The Studio mapping go/no-go uses a `0.8` confidence threshold even though the mapping values are described as uncalibrated evidence tiers.

These are requirements/governance defects, not evidence of an exploitable implementation vulnerability. The source code does not exist yet. The architecture is plausible as a staged research-and-engineering program, but the Live Studio is the largest feasibility risk and must not be declared solved by the specification alone.

### Overall assessment

- **Architecture and product plan:** promising, but needs a controlled requirements baseline and repaired milestone/release barriers.
- **Requirements completeness:** broad feature coverage; weak on actual target-user validation, some operational/privacy acceptance, and the boundaries between approved requirements and proposals.
- **Technical feasibility:** credible in pieces; unproven end-to-end, especially browser-to-agent-to-source mapping, preview isolation, and safe rollback.
- **Development maturity:** 87 tasks recorded; 3 done, 2 in review, 82 pending. This is planning progress, not product progress.
- **Release readiness:** **not ready**. The product is not implemented, product tests have not run, and the release task graph currently allows required work to remain outside its dependency ancestry.

## Scope, method, and limits

I inspected the tracked planning documents, PRD, amendments, ADR drafts, research model, coverage matrix, gate registry, task protocol, all 87 task records, root handoff/status files, and the archived PRD bundle. I verified the task graph against the reviewed commit, compared the archive's five Markdown members byte-for-byte with the corresponding current documents, and checked the tracked tree for product source/manifests. I did not open files under `reviews/independent/`. The prior `docs/DEEP_AUDIT_2026-11-13.md` is present as a project artifact; its conclusions were not treated as authoritative. The task-graph results below were recomputed directly from the reviewed commit.

**Checks actually run against `92f3e5c`:**

- `TASKS.json` parses: 87 unique IDs, 0 unresolved dependency references, 0 cycles.
- Task states: 3 `done`, 2 `review`, 82 `pending`.
- Dependency ancestry checks found 3 M1.5 tasks missing from T0201's prerequisites; 19 non-M10 tasks outside T1001's prerequisite ancestry; and T0906 absent from T1005's prerequisite ancestry.
- The archived ZIP's five Markdown members are byte-identical to their current `docs/` counterparts.
- No product source file, `SKILL.md`, `package.json`, or `pyproject.toml` is present in the reviewed tree.

No product build, unit, integration, browser, accessibility, security, performance, installer, host-compatibility, or benchmark tests could be run because no product implementation exists. Existing test-evidence entries are project records, not tests run in this review. I did not independently browse the cited third-party research or validate candidate package licensing/current versions; those items remain unverified.

## Feature status ledger

| Capability | Status at reviewed commit | Independent assessment |
|---|---|---|
| Product vision and web-only scope | **Specified** | Clear high-level audience and surface priorities; no user-facing implementation. |
| Portable master skill, commands, JIT loading | **Planned** | Agent-agnostic intent and progressive disclosure are defined; there is no entry skill, loader, or host test. |
| Foundations, component playbooks, tokens | **Planned** | Coverage and playbook shape are extensive; no knowledge library, token schema, or linter exists. |
| Research and evidence provenance | **Planned** | Provenance, offline labeling, and a trend loop are specified; evidence quality and research process have not been tested. |
| Anti-slop detection | **Planned** | Taxonomy and negative examples are required; no detector, corpus, or measured precision/recall exists. |
| Progressive section workflow and project memory | **Planned** | Approval states, contracts, and persistence are specified; no enforcement mechanism exists. |
| Motion and interaction states | **Planned** | Detailed state, interruption, and reduced-motion requirements exist; no schema or runtime tests exist. |
| Live Studio | **Planned / highest-risk** | Draw/select/write intent, bridge, preview, approval, mapping, recovery, and rollback are described; no end-to-end prototype exists. |
| Security and privacy controls | **Planned** | Strong design controls are enumerated; no threat model, security gate implementation, or security evidence exists. |
| Multi-agent installation and compatibility | **Planned** | A support-tier model and host tests are described; no adapter or installer has been implemented or tested. |
| Benchmarks and evaluation | **Planned** | Rubric, baseline, calibration, and comparison are specified; no baseline scores, human ratings, or benchmark results exist. |
| Documentation package | **Implemented as planning artifacts** | Markdown planning documents and an archived handoff exist; this is not implementation of SUS capabilities. |

## Overall architecture evaluation

The proposed separation—portable reasoning skill, shared foundations/playbooks, deterministic evaluators, adapter layer, Studio runtime, and per-project memory—is a sound starting architecture. It correctly distinguishes the skill's reasoning instructions from code that must implement browser, scanning, or filesystem capabilities. It also recognizes that a framework-neutral knowledge layer does not imply universal runtime compatibility.

The architecture is not yet a decision baseline. ADR-001–006 are proposed, the amendments are globally labeled proposed, and some underlying owner decisions are already marked fixed. The proposed packages, source-mapping tiers, write adapters, and CDP bridge describe several systems whose feasibility and trust boundaries are still unproven. “Framework-agnostic by construction” is too strong while the Studio requires distinct Next.js/Astro instrumentation and language-specific edit paths.

The data/control architecture needs one canonical state model spanning project contract, section approvals, Studio session/events, source transactions, verification evidence, and acceptance receipts. Current documents describe these concerns across several files and propose atomic files, leases, journals, and recovery manifests, but do not yet settle the authoritative transaction and recovery model. The implementation should be designed around transaction/version identifiers and tested crash/replay behavior, rather than relying on Markdown append-only records or per-file atomic renames alone.

## Requirements and contradictions

### Product strengths to preserve

- The product is intentionally not just a prompt: it combines a skill, structured knowledge, tools, evaluations, and the required Studio.
- Anti-slop is split into objective defects, contextual mismatches, and aesthetic stereotypes rather than blanket style bans.
- The section workflow separates page-level planning from section-level implementation and asks for explicit approval/acceptance.
- The motion requirements distinguish variants from runtime states and include interruption and reduced-motion concerns.
- The Studio specification covers spatial intent, mapping ambiguity, source diffs, previews, approval, rollback, and recovery.
- Host support and comparative claims are supposed to be evidence-based; the documents do not claim that implementation already exists.

### Material contradictions and gaps

1. **Fixed scope versus no-go rollback.** D23 explicitly retains the full mandatory drawing/selecting/writing Studio, but T0700 says a failed mapping spike may re-scope Studio to variant-preview-only. This is a direct conflict in the implementation plan.
2. **Preview versus source mutation.** ADR-003 describes HMR preview by writing a candidate to disk. T0706 says no write without explicit approval; the later verification contract requires an isolated preview or an exact, temporary transaction and distinguishes preview permission from apply permission. These need one consistent authorization and cleanup contract.
3. **Milestone blocking versus dependencies.** M1.5 is described as blocking before M2, but T0201 depends on T0155 and T0104 only; T0156, T0158, and T0159 are not in its transitive prerequisites.
4. **Release completeness versus graph reachability.** A10 says the three public dogfood sites provide evidence for claims and that no product-quality claim should be made without them. T0906 is not an ancestor of T1001 or T1005. T1001 also has 19 non-M10 task IDs outside its ancestry.
5. **Security requirements versus gate policy.** Studio security is covered by T0806 and T1003, but G1–G12 contain no security gate and the gate registry's non-waivable list does not name critical security findings. This is weaker than the PRD's release requirement for zero known critical security/data-loss defects.
6. **Mapping confidence versus evidence tiers.** The source-mapping section calls 1.0/0.6/0.3 evidence tiers, not calibrated confidence values; the spike still uses confidence ≥0.8 as a go/no-go metric. The denominator and sampling method for “90% of picked nodes” are not defined.
7. **Approval authority is not resolved field-by-field.** D14–D18 are recorded as owner decisions, while PRD Amendments v1.1 is globally “proposed, awaiting owner approval.” Part 13 marks some findings accepted/applied, other workflows accepted only as proposals, and D23's wording is still to be confirmed. A builder cannot reliably tell which clauses may be implemented without further approval.
8. **No explicit target-user validation plan.** There are agent behavior tests, a blind human A/B benchmark, and design/evidence gates, but no task requires representative users to exercise high-risk journeys or captures user task success. This leaves claims about usability, comprehension, and task efficiency largely judged by agents/reviewers.

## Feature-by-feature assessment

| Area | Assessment |
|---|---|
| Master skill architecture | Good conceptual split between orchestration, foundations, playbooks, deterministic checks, adapters, runtime, and project state. The concrete Agent Skills packaging/host-generated entry contract remains unimplemented and some host-specific semantics are open. |
| Sub-skills and knowledge management | The shared-foundation/playbook model and precedence order are strong. A schema and knowledge lint are planned. The research model still mandates 2–3 alternatives and a removal list in ways that may over-ritualize narrow tasks; no-animation/no-change should be an equally valid reasoned outcome. |
| Multi-agent compatibility | Honest “supported/experimental/untested” language is a strength. Host identities and versions remain unresolved; the minimum supported host set and the precise install/load/invoke contract are not stated. Only FreePi plus one other host is a planned smoke milestone, followed by Codex/Claude/Cursor adapters. No adapters are implemented. |
| Research intelligence | Claim categories, offline honesty, provenance, source review, and trend lifecycle are planned. The present research synthesis often cites broad sources at section level rather than linking individual claims to supporting passages/methods. The future evidence schema task should be a release prerequisite for research-based recommendations, not just a URL validator. No human-user research or user outcome validation is scheduled. |
| Anti-AI-slop and design quality | The contextual taxonomy and explicit false-positive corpus are well conceived. The direction task's three-candidate requirement can become a new recipe ritual unless alternatives are generated only when they help resolve uncertainty. Detector quality thresholds are intentionally deferred, but must be set from a labeled corpus before any blocking rule ships. |
| Section workflow, tokens, consistency | The brief → proposal → approval → implementation → evidence → acceptance loop is coherent. The task graph does not enforce all of its milestone barriers, and existing-project token discovery/import/ownership should be explicit so a new `.sus/tokens.json` does not become an accidental competing source of truth. |
| Motion and component states | Motion is treated as a first-class concern, which is appropriate. T0405's “every state has motion + reduced-motion” is too literal: it may force decorative motion and is inconsistent with the amendment's accepted “none, with reason” outcome. Motion requirements should attach to meaningful transitions, with a reasoned no-motion decision accepted. |
| Live Studio | The user-facing scope is unusually well elaborated. The browser-to-agent event lifecycle, source ownership, temporary preview mutation, stale approval, replay, and transaction recovery are the hard technical problems. The dual-stack spike is appropriate but currently lacks guaranteed Next.js and Astro fixture dependencies and uses an uncalibrated confidence threshold. |
| Security, privacy, and recovery | Localhost binding, origin checks, scoped tokens, allowlists, redaction, untrusted page content, and recovery manifests are good planned controls. They are not validated, and security has no first-class gate. Public dogfood evidence/raw benchmark data also needs explicit consent, licensing, anonymization, and secret/customer-data checks. |
| Content, copy, SEO | The claims register, search intent, factual copy, and no-ranking-guarantee principles are good. No representative-user tests currently verify comprehension or task completion. |
| Responsive, accessibility, performance | The standards-oriented gate descriptions are much better than generic “responsive/a11y” claims. These remain unimplemented; screenshot metrics, axe, and lab performance cannot stand in for all manual/field evidence. Keep criteria-to-evidence mapping and accurately label field versus lab results. |
| Roadmap, micro-tasks, verification | The task graph is mechanically clean, but semantically incomplete at milestone/release boundaries. Some “micro-tasks” batch many full playbooks or broad adapters and are unlikely to fit the stated 15–60-minute review unit. Their actual scope should be decomposed before implementation. |
| Feasibility and release | A full product is feasible only as a multi-stage program with a hard Studio feasibility track, bounded supported stacks, and substantial test/review effort. No release can be claimed until code, supported-host smoke tests, security/a11y/performance evidence, and benchmarks exist. |

## Severity-ranked findings

### Critical: Studio no-go path violates the fixed full-scope requirement

**Impact:** A failed mapping spike can silently convert a mandatory draw/select/write Studio into a smaller variant-preview feature. That is not a technical fallback within the approved product; it changes the product itself.

**Evidence:** D23 says “do not reduce anything” and retains the mandatory Studio (`docs/OWNER_DECISIONS_LOG.md:34`). T0700's rollback says “no-go → Studio re-scoped to variant-preview-only” (`TASKS.json:1105–1125`). The amendment says the spike should re-scope Studio if the threshold fails (`docs/PRD_AMENDMENTS_v1.1.md:181–188`).

**Recommendation:** Preserve the full Studio requirement. A failed spike should stop affected implementation, explore alternate mapping/preview approaches, and return a feasibility decision to the owner without silently reducing scope. If scope change is genuinely desired, require an explicit owner decision that supersedes D23.

**Verification criteria:** Force the spike's negative result. Confirm the plan blocks dependent work, presents feasible alternatives, and does not mark a reduced Studio as satisfying the full-product requirement unless the owner explicitly revises D23.

### High: Preview and apply do not share one consistent write-authorization contract

**Impact:** HMR preview can mutate real source before approval, expose uncommitted changes to accidental overwrite, or leave temporary files behind after rejection/crash.

**Evidence:** ADR-003 says preview writes the candidate change to disk for HMR (`docs/ADR_DRAFTS.md:95–96`). T0706 says no write occurs without explicit approval and rejection leaves the tree clean (`TASKS.json:1242–1262`). The later contract separates generate, preview, and apply, requiring isolated preview or a scoped temporary transaction and no silent write to real source (`docs/PRD_AMENDMENTS_v1.1.md:347–355`).

**Recommendation:** Reconcile ADR-003 to the later authorization contract before implementation. Specify whether preview operates in a separate worktree/process or a manifest-tracked temporary transaction; define which source/index/untracked state may change, cleanup ownership, and behavior on crash or user edits.

**Verification criteria:** With staged, unstaged, and untracked user changes present, generate and preview then reject, disconnect, crash, and restart. Assert exact preservation of source bytes, index state, user changes, and annotations; assert persistent source changes occur only after a fresh, version-bound apply approval.

### High: Release readiness is not enforced by the task graph

**Impact:** Regression/release can be marked complete while required capabilities or evidence tasks have never completed. This makes the WBS look healthy without enforcing its promised completeness.

**Evidence:** T1001 depends on a selected subset of milestones (`TASKS.json:1607–1628`); T0906 requires dogfood sites and public evidence (`TASKS.json:1965–1981`), but is not in T1001/T1005 ancestry. A10 says no product-quality claim without the dogfood sites (`docs/PRD_AMENDMENTS_v1.1.md:195–198`). T1005 depends only on T1001–T1004 (`TASKS.json:1714–1723`). Recomputed from the reviewed graph, 19 non-M10 tasks are not ancestors of T1001: T0103, T0156, T0400, T0406, T0407, T0408, T0801–T0804, T0903, T0102b, T0158, T0709, T0809, T0906, T0159, T0811, and T0812.

**Recommendation:** Define which tasks are mandatory for GA versus explicitly deferred. Encode the full required closure as dependencies or a machine-checked release manifest. Include T0906 if A10 remains required for quality claims; otherwise revise A10 and prohibit unsupported claims. Ensure the regression suite itself covers every required gate/task.

**Verification criteria:** Add a readiness test that leaves each required leaf task pending in turn; T1001/T1005 must remain blocked. Assert that every mandatory M0–M9 task is either in the release prerequisite ancestry or explicitly excluded by an owner-approved scope decision.

### High: Security is not a first-class non-waivable release gate

**Impact:** The Studio has browser debugging, a local authenticated bridge, page-derived untrusted content, and source writes. Treating security as only a task/review can allow release policy to drift or permit a critical issue to be waived by a generic exception.

**Evidence:** The gate registry enumerates G1–G12 but no security gate (`docs/GATE_REGISTRY.md:13–26`); its non-waivable section names design, evidence, and selected WCAG criteria but not critical security/data-loss findings (`docs/GATE_REGISTRY.md:28–34`). A security test suite and a final review exist as tasks (`TASKS.json` T0806 and T1003; `TASKS.json:1669–1688`), while the PRD's release policy requires zero known critical security/data-loss defects (`docs/SUS_MASTER_PRD_v1.0.md:393`).

**Recommendation:** Add an explicit release-blocking security gate with a threat-model owner, negative fixtures, CI verdict, critical finding policy, and a precise exception boundary. Make critical auth, unauthorized write/command, secret exposure, and user-data-loss findings non-waivable for GA; disclose where a user may explicitly opt into a risk without converting that into a product security pass.

**Verification criteria:** Each critical security fixture fails the gate and blocks T1005 even when other gates pass or an independent reviewer is unavailable. Test origin/DNS rebinding, CSRF, token replay, prompt injection at the action boundary, path traversal, secrets in capture/logs, interrupted writes, and rollback conflicts.

### High: M1.5 is labeled blocking but is not a complete M2 prerequisite

**Impact:** The skill core may start before its claimed evaluation spine is complete, allowing capability and preference guidance to be authored without the behavioral evaluation, token/cost budget, or gate-registry validation the milestone promises.

**Evidence:** M1.5 is called “blocking” before M2 (`docs/PRD_AMENDMENTS_v1.1.md:127–135,394–400`). T0201 depends only on T0104 and T0155 (`TASKS.json:409–416`). T0156, T0158, and T0159 are M1.5 tasks, but none is an ancestor of T0201 (`TASKS.json:387–406,1760–1779,1989–2012`). The graph check confirmed all three are missing.

**Recommendation:** Define M1.5's exit criteria explicitly. If all deliverables are blocking, add dependencies on the complete milestone completion node or its terminal tasks. If only a subset is needed before M2, rename/document the partial gate and identify what later work is permitted.

**Verification criteria:** A readiness check must reject M2 start while any required M1.5 task is pending; a test should independently leave T0156, T0158, and T0159 incomplete and verify the gate blocks.

### High: The mapping “confidence” threshold is not measurable as written

**Impact:** The highest-risk technical decision can pass on a biased or uncalibrated sample. A source ID tier is not proof that a selected runtime instance maps to the correct editable source owner.

**Evidence:** The spike requires ≥90% single-node mappings at “confidence ≥0.8” (`TASKS.json:1105–1121`; `docs/PRD_AMENDMENTS_v1.1.md:181–185`). The source mapping section explicitly says the 1.0/0.6/0.3 values are evidence tiers, not calibrated confidence until measured, and calls out repeated component-instance ambiguity (`docs/PRD_AMENDMENTS_v1.1.md:322–329`).

**Recommendation:** Define a representative, labeled set of selected nodes and source-edit ownership cases across both stacks. Report correct mapping, wrong-target, abstention, ambiguity, and edit-owner accuracy separately. Calibrate confidence only after ground-truth results; do not treat stamped IDs as correct mappings by definition. Define sampling, denominator, repetition, and minimum stack coverage.

**Verification criteria:** A held-out mapping corpus reports reproducible confusion/abstention metrics; deliberately repeated components, shared styles, loops, and content-driven markup are included. A wrong-target or uncalibrated score cannot satisfy the go/no-go.

### High: Proposed and approved requirements are not resolved per clause

**Impact:** A builder may implement a proposal as if approved or omit an already-fixed owner requirement because the global amendment status is “proposed.” This also weakens the build gate's approval audit.

**Evidence:** README distinguishes approved owner scope from proposed amendments (`README.md:6–18,32–34`). The amendments globally state “proposed, awaiting owner approval” (`docs/PRD_AMENDMENTS_v1.1.md:1–7`), while the owner log marks D14–D18 fixed/approved and D23 still awaiting wording confirmation (`docs/OWNER_DECISIONS_LOG.md:25–34`). Part 13 separately calls some amendments accepted/applied and others proposals needing approval (`docs/PRD_AMENDMENTS_v1.1.md:455–483`).

**Recommendation:** Create one requirements authority table with stable IDs, source, status (`fixed`, `approved`, `proposed`, `rejected`, `superseded`), owner, supersedes link, and implementation gate. Resolve D23 wording and mark each Part 0–13 clause individually. Keep the historical PRD, but generate a single effective-spec entry point.

**Verification criteria:** A fresh agent using the documented start instructions can identify, without inference, the operative Studio scope, build authorization, approved architecture decisions, and unresolved owner decisions; automated checks reject conflicting status entries.

### High: Research and design evaluation do not validate actual user outcomes

**Impact:** A rubric or agent critic can rate visual polish highly while users misunderstand content, fail a task, or encounter poor recovery. The product promises evidence-based UX, but the planned evaluation mainly measures agents, page artifacts, standards checks, and human preference.

**Evidence:** The PRD identifies users and workflows (`docs/SUS_MASTER_PRD_v1.0.md:37–63`) and specifies research on demand (`docs/SUS_MASTER_PRD_v1.0.md:96–115`), but no task requires representative-user testing of critical journeys. T0158 evaluates agent reasoning, and T1002 is a blind human A/B comparison (`TASKS.json:1646–1665,1760–1779`); neither requires target-user task success or comprehension data.

**Recommendation:** Add a risk-based user validation protocol for high-impact flows (e.g., checkout, data modification, onboarding). State when participant testing is needed, how consent/privacy is handled, what success/error outcomes are measured, and how to label the result when real users are unavailable. Do not infer usability or conversion outcomes from agent ratings.

**Verification criteria:** For each supported surface mode, at least one representative task has a user-centered acceptance plan and documented evidence or an explicit “not tested” limitation. A fabricated/simulated user result must fail provenance validation.

### Medium: The two-stack spike does not guarantee its required fixtures

**Impact:** T0700 can be unlocked with only the marketing fixture task completed, even though its acceptance requires real Next.js and Astro applications. The other fixture task names surfaces, not framework coverage.

**Evidence:** T0700 depends only on T0102 (`TASKS.json:1105–1114`). T0102 is a single marketing fixture (`TASKS.json:170–193`); T0102b creates e-commerce, dashboard/CMS-admin, and portfolio fixtures, but does not specify Next.js/Astro allocation (`TASKS.json:1737–1758`). The amendment requires the mapping spike on Next.js App Router and Astro (`docs/PRD_AMENDMENTS_v1.1.md:148–155,181–185`).

**Recommendation:** Create explicit framework fixtures or make T0700's task record include the two stack-specific apps and their owner-approved source trees. Make the spike depend on both and test selection→edit-owner resolution→preview→apply→cleanup→undo in each.

**Verification criteria:** The dependency gate cannot unlock T0700 until a runnable Next.js App Router app and Astro app are present, licensed/authorized for testing, and pass their smoke checks.

### Medium: Motion task wording can force animation where “none” is correct

**Impact:** Playbooks may prescribe unnecessary movement or treat reduced motion as a mandatory animation variant even when a static state is clearer and safer.

**Evidence:** T0405 says “every state has motion + reduced-motion” (`TASKS.json:753–771`). The amendments explicitly accept a motion decision of “none, with reason” (`docs/PRD_AMENDMENTS_v1.1.md:462–466`), and the PRD asks for purposeful motion rather than decorative animation (`docs/SUS_MASTER_PRD_v1.0.md:25,261–295`).

**Recommendation:** Require an explicit motion decision per relevant transition; accept no motion with a reason. Require a reduced-motion equivalent only when movement is otherwise present, preserving information and operation.

**Verification criteria:** A static state/playbook with a reason passes; a meaningful animated transition without a reduced-motion equivalent fails; tests distinguish states from transitions.

### Medium: Benchmark and dogfood publication lack a complete privacy/rights gate

**Impact:** Public dogfood sites and raw benchmark data can disclose customer/owner project details, screenshots, source, participant identity, secrets, or third-party assets. The release plan currently states that evidence will be public without an artifact-level consent and redaction test.

**Evidence:** A10 calls for three public dogfood sites and evidence (`docs/PRD_AMENDMENTS_v1.1.md:195–198`). T0906 requires public evidence bundles (`TASKS.json:1965–1981`); T1002 requires raw benchmark data release (`TASKS.json:1646–1659`). D21 permits copies of owner projects as fixtures (`docs/OWNER_DECISIONS_LOG.md:31–33`), while distribution/license and screenshot/DOM retention/remote-work choices remain open (`docs/SUS_MASTER_PRD_v1.0.md:330,348`; `README.md:74–82`).

**Recommendation:** Default fixtures to synthetic or explicitly licensed content. Require separate consent, rights/provenance, secret/PII/customer-data scans, and a public-data approval receipt before releasing any site, screenshot, source, or raw benchmark material. Publish aggregate results when raw data cannot safely be shared.

**Verification criteria:** Public-release tests fail when a fixture/evidence bundle lacks rights/consent metadata or contains seeded secrets/identifiers; deletion and opt-out procedures are exercised.

## Scorecard (0–5)

Scores assess **specification maturity and plan quality**, not shipped product quality. A score of 0 means the dimension is absent; 3 means credibly specified but incomplete; 5 means coherent, testable, and demonstrated. Planned-only capabilities cannot score 5.

| Dimension | Score | Rationale |
|---|---:|---|
| Product vision and differentiation | 4.0 | Specific full-scope vision; value proposition and audiences are clear. |
| Scope and requirement consistency | 2.5 | Broad coverage, but approvals and several hard requirements conflict. |
| Architecture and boundaries | 3.0 | Strong layer decomposition; runtime and approval/transaction contracts remain unproven. |
| Master skill / knowledge design | 3.0 | JIT and foundation/playbook model is sound; no packaging or runtime proof. |
| Research and anti-slop quality | 2.5 | Good planned provenance and false-positive discipline; no corpus or user evidence. |
| Design workflow / consistency | 3.0 | Section approvals and tokens are well covered; dependency and existing-system handling need closure. |
| Motion / accessibility / responsive | 3.5 | Detailed requirements; one over-prescriptive task rule and no implementation tests. |
| Live Studio feasibility | 2.0 | Rich user requirements; source mapping, preview, and recovery are unproven. |
| Multi-agent compatibility | 2.0 | Honest support-tier idea; target host scope and installation behavior remain undefined/untested. |
| Security / privacy / reliability | 2.5 | Many correct planned controls; no security gate or implementation evidence. |
| Roadmap / verification / evaluation | 2.5 | 87-task graph parses, but required work is not fully release-blocking and tasks are too broad. |
| Performance / maintainability | 2.5 | Planned budgets and modularity; no measured workload, performance baseline, or cost evidence. |
| Release readiness | 0.0 | Specification only; no product build, tests, compatibility proof, or benchmark. |
| **Overall** | **2.6** | Strong planning foundation; resolve P1 findings before implementation, then prove the highest-risk slice. |

## Recommended development priorities

1. **Freeze the effective requirements.** Reconcile owner-approved D14–D23 requirements with proposed amendment clauses. Preserve full Studio scope unless the owner explicitly changes it.
2. **Repair the Studio feasibility contract.** Define the full-scope no-go response, exact mapping dataset/metrics, guaranteed Next.js/Astro fixtures, and a user-visible source/instance ownership model.
3. **Settle the preview/apply transaction.** One contract must govern generation, isolated preview, durable apply, approval freshness, rollback, conflict, and crash recovery.
4. **Make security release-blocking.** Add a security gate and explicit non-waivable critical issues, with failure fixtures tied to T0806/T1003.
5. **Make the task graph authoritative.** Gate M2 on the intended M1.5 exit; gate regression/release on every mandatory task; add a test for release closure.
6. **Add user-centered evidence.** Define when real users are required and prohibit outcome claims when testing is unavailable.
7. **Split oversized work before execution.** Break multi-playbook, multi-adapter, and end-to-end spike tasks into reviewable vertical slices with independent acceptance.
8. **Guard public evidence.** Add consent, provenance, sanitization, licensing, and deletion checks before dogfood or benchmark publication.
9. **Only then start the approved first batch.** The repository's `APERIO` gate and architecture/implementation approvals remain authoritative; this review does not authorize implementation.

## Suggested micro-tasks and testable acceptance criteria

| Priority | Suggested task | Acceptance criteria |
|---|---|---|
| P0 | Publish effective requirement/approval manifest | Every requirement has authority/status/supersedes; D23 and all Part 0–13 clauses are classified; a fresh-agent test identifies the exact build gate and mandatory Studio scope. |
| P0 | Revise Studio spike no-go decision | Negative mapping result blocks dependent work without reducing Studio scope; owner decision required for any scope change; regression test asserts the full-feature requirement remains unsatisfied by variant-preview-only. |
| P0 | Specify preview/apply transaction | Preview is isolated or manifest-tracked; reject/crash/reconnect preserve index, worktree, untracked files, and annotations; only fresh approval can persist changes. |
| P0 | Add security gate and negative fixtures | Registry contains a release-blocking security verdict; seeded auth, injection, path, secret, and rollback failures block release. |
| P0 | Encode M1.5 and GA closure barriers | T0201 blocked by required M1.5 tasks; T1001/T1005 blocked by every mandatory task; graph-closure tests deliberately leave a leaf pending and assert `not-ready`. |
| P1 | Build labeled source-mapping evaluation fixtures | Next.js and Astro fixtures are explicit dependencies; metrics include correct/wrong/ambiguous/abstain/edit-owner outcomes; threshold selection is documented and reproducible. |
| P1 | Add high-risk user-task validation protocol | Commerce/admin critical tasks have user-centered outcomes and consent/privacy handling; unavailable studies are labeled not-run, never passed by agent judgment. |
| P1 | Add public-evidence release guard | Dogfood/benchmark artifacts require rights/consent metadata and pass secret/PII scans; public raw data can be withheld with a documented safe aggregate alternative. |
| P1 | Refine motion acceptance schema | “No motion, reason” is valid; transitions with movement require parity and interruption checks; static states are not assigned arbitrary motion fields. |
| P2 | Decompose broad playbook and host tasks | Each task has a bounded playbook/adapter set, owner, expected evidence, and tests; no task marked done without actual results and review state. |

## Questions requiring product-owner decisions

1. Is full drawing/selecting/writing Studio non-negotiable even if both Next.js and Astro mapping approaches fail? If yes, what technical exploration should follow a no-go without reducing scope?
2. Which clauses in PRD Amendments v1.1 are approved requirements versus proposals? Can D23's wording be confirmed and the effective baseline recorded?
3. May temporary preview modify the real source tree at all, or must preview always use an isolated workspace? What exact consent is required for preview versus apply?
4. What is the minimum launch host set and which exact, versioned products are in scope? Does broad agent compatibility mean a required support floor or an aspirational roadmap?
5. Are owner projects permitted as public dogfood/benchmark artifacts? What consent, anonymization, licensing, and raw-data publication restrictions apply?
6. Should real target-user validation be a release requirement for high-risk workflows, or may SUS make only expert-review/design-system claims where user testing is unavailable?
7. Which security failures are categorically non-waivable at GA, and what remote-model/provider data transfer is acceptable for captured DOM, screenshots, and source context?
8. Who supplies independent human/design raters and how much time/cost is acceptable for the benchmark and three dogfood sites?

## Final verdict

SUS has a credible and differentiated **product concept**, but its current repository is a specification package, not a working skill or Studio. The planning documents are strongest on intended capabilities and weakest where a gate must force an exact, safe, independently measurable outcome. Do not describe the product as implemented or validated. Resolve the P1 conflicts, make release closure executable, and validate the browser-to-agent-to-source Studio path before committing to a production architecture.
