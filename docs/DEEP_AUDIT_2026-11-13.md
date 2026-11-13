# SUS deep audit — reasoning, learning, design and Live Studio

Date: 2026-11-13, Asia/Dhaka. Baseline examined: Git commit `7c9975a`.
Status: audit and proposed refinements; recommendations are not approved requirements.

## 1. Intent and conclusion

The owner clarified during this audit that the **full master skill and mandatory Live Studio remain required**. Nothing should be removed or reduced. Live Studio means selecting, drawing and writing instructions directly over the consuming project's running browser page, with the agent connected to that project. Impeccable Live is a relevant behavioral reference.

The intended improvement is an agent that investigates the problem, researches strong and current sources, evaluates alternatives, explains its decisions, presents a design for approval, implements the approved section, verifies it, and learns from the outcome before advancing. The skill should teach principles and decision methods while leaving contextual design decisions to the agent. “No templates” does not mean eliminating structured records, familiar interaction conventions, reusable components, or the full product.

**Audit conclusion:** the documents contain much of this intent, especially the epistemic contract and section workflow. They are not yet a consistent, executable specification for achieving it. The biggest gaps are research quality, governed learning, behavioral evaluation, trustworthy approvals, and a complete Live Studio event/preview/apply/recovery contract. Several proposed gates would reward rule compliance or visual novelty rather than good design. These can be corrected while preserving the entire scope.

There is no installed SUS skill or product implementation in this repository. This is a specification audit, not a runtime security assessment or proof of design quality. A skill can improve behavior and reuse reviewed external knowledge; it does not itself retrain model weights or guarantee expert performance.

## 2. What was examined and verified

- All 18 existing Markdown documents, totaling 2,025 lines before this audit.
- `TASKS.json`: all 73 tasks, dependency references, transitive ordering and status counts.
- `.gitignore`, tracked-file inventory and Git status/history. The starting working tree was clean; 21 files were tracked.
- The original ZIP, read in place without extracting or executing it: all five Markdown members match their current `docs/` counterparts byte for byte.
- Installed Impeccable `SKILL.md`, `reference/live.md` and `reference/shape.md`; current public Live documentation, tutorial and published Live reference. These were inspected as reference material, not executed.
- Current primary sources for Agent Skills, WCAG/APG, accessibility evaluation, performance measurement, design discovery, Node support, Chrome remote debugging and Git stash behavior. Links accompany the relevant findings.

Severity describes the cost of leaving a specification issue unresolved: **High** means resolve before affected implementation; **Medium** means resolve before the capability is accepted; **Low** means documentation hygiene. Missing detail is not evidence of an implemented vulnerability. Proposed mechanisms below are design recommendations unless identified as a verified standards correction.

## 3. Existing strengths to preserve

Keep the full feature set, mandatory Studio, agent independence, foundations loaded on demand, semantic design decisions, component/state/motion coverage, the three classes of anti-slop findings, honest capability labels, section approval and acceptance, reversible edits, provenance, and explicit limitations. Preserve the distinction between global decisions and local experiments. Keep the early Next.js/Astro feasibility spike and benchmark-before-comparison rule.

The amendment's “learner, not believer” intent is valuable. Its current mechanisms need stronger evidence handling and better boundaries; they do not need replacement with a template catalog.

## 4. Findings: product intent and decision quality

### F01 — High: a new agent can miss the owner's most important requirements

**Evidence:** `AGENT_START_PROMPT.md:5–9,23–27` loads only the original three documents. The no-template/learning contract is in the proposed amendments; the `APERIO` gate and later decisions are in the owner log. `README.md:78–82` gives another read order, and `HANDOFF.md:17–20` gives another. Amendments remain globally “proposed” even where they restate approved owner decisions.

**Failure:** a fresh builder can follow the advertised prompt faithfully and still omit the latest owner instructions or build after ordinary batch approval without seeing the separate keyword gate.

**Refinement:** designate one canonical start document and an explicit authority order: current owner instruction → approved decision entries → effective requirements → proposals → historical material. Give each amendment an approval status and supersedes reference. Make every entry point load that manifest. Keep the archive historical.

**Proof:** a fresh session receives only the advertised start prompt and repo; it identifies the full Studio, research/learning requirements and build gate without being told the answers.

### F02 — High: two different workflows are mixed together

**Evidence:** PRD §18, the start prompt and task protocol govern building SUS; PRD §7 governs using SUS to build a client's project. The files repeatedly mix SUS release acceptance with section acceptance.

**Failure:** a consumer asking for one UI section could inherit the SUS product's monorepo, release rubric, architecture approvals or public benchmark requirements. Conversely, a SUS builder could confuse website acceptance with product release approval.

**Refinement:** separate the SUS-development protocol from the consuming-project design protocol. Preserve both, with separately named states, permissions and artifacts. Studio is part of the product; each consuming session uses the capabilities and checks relevant to its approved scope.

### F03 — High: no-template behavior is not yet behaviorally defined

**Evidence:** amendments E1 bans recipes but permits evidence, taxonomies and exemplars; PRD §6 contains a 12-part playbook structure. Neither explains how to distinguish a reasoning guide from a disguised recipe in evaluation.

**Refinement:** retain playbooks as questions, mechanisms, tradeoffs, conditions, failure cases and verification methods. A layout is a project decision. Familiar controls and reuse of the existing design system remain legitimate. Record why an example's principle transfers and which visible details should not transfer. Require rationale for consequential choices, not a citation for every margin.

**Proof:** different briefs produce different justified outcomes; the same task in an established product preserves useful conventions. The evaluator checks fit and decisions rather than requiring cosmetic uniqueness.

### F04 — High: blocking uniqueness contradicts contextual judgment

**Evidence:** amendments `129–134,265,273–276` introduce banned defaults, a prescribed light-source rule, and a uniqueness check that becomes blocking. The research model `35,38–41` mandates alternatives, removals and making skipping expensive. PRD §3 and the gap analysis F7 prohibit blanket aesthetic bans.

**Failure:** agents could change consistent table layouts, familiar checkout patterns or an explicitly requested style simply to pass novelty checks. A forced “removed” list can encourage deletion without a user benefit.

**Refinement:** retain anti-slop analysis, comparison and direction exploration. Treat aesthetic frequency as a prompt to investigate, not a defect. Let the agent choose the number and fidelity of alternatives according to unresolved uncertainty. An intentional decision to preserve the current solution is valid. Only actual constraints, objective failures and explicitly approved project requirements block.

### F05 — High: an attractive section is an incomplete unit of UX quality

**Evidence:** PRD §7 plans pages and builds sections; the foundation list names information architecture and usability, but the WBS contains no explicit user-flow research or validation deliverable. Operate coverage mainly enumerates components.

**Refinement:** retain section-by-section implementation and add a whole-task model before section design: entry points, user goals, flow, information architecture, state transitions, permissions, recovery and success criteria. Validate cross-section/cross-route journeys at checkpoints. Choose research methods based on the uncertainty: interviews/contextual observation, usability tasks, tree testing, content review or analytics when available. Do not invent participants or treat simulated users as real research.

This recommendation follows the research-question-first approach in the [GOV.UK research planning guidance](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service) and the discovery/testing emphasis in the [Design Council's Double Diamond](https://www.designcouncil.org.uk/resources/the-double-diamond/); neither is a mandate to use one fixed design ritual.

### F06 — Medium: motion coverage can become compulsory decoration

**Evidence:** PRD `25,242–285` makes motion first-class; TASKS `307` requires every state to have motion and reduced-motion. The coverage matrix sensibly calls for restraint in admin UI.

**Refinement:** keep all motion intelligence and tests. Require an explicit interaction/motion decision, allowing **no animation** with a reason. Specify behavior for applicable transitions; a static heading does not need a hover/loading/success matrix. Reduced-motion support preserves information and operation, and may remove movement entirely.

## 5. Findings: research, trends and learning

### F07 — High: the four exclusive claim types misclassify evidence

**Evidence:** amendments E2/E7 say there are only Standard, Observed, Prior and Preference; an observation is “strongest”; priors are upgraded into standards or observations. APG keyboard guidance is listed as normative. The research model `134–135` also labels APG normative.

**Failure:** external empirical research, expert guidance, inferences and causal claims have no adequate place. A measurement here cannot establish a universal requirement or show why users behave a certain way. A source's authority and an observation's applicability are separate questions.

**Refinement:** represent claim type, source status, method, scope, applicability, confidence and limitations separately. Include normative requirement, external empirical result, local observation, expert guidance, inference/hypothesis and preference. APG is explicitly **informative**, while WCAG and ARIA are normative technical standards. DTCG's community-report status is already correctly recognized in ADR-004; retain that distinction. [W3C APG introduction](https://www.w3.org/WAI/ARIA/apg/about/introduction/), [DTCG report](https://www.designtokens.org/tr/2025.10/).

### F08 — High: valid citation metadata cannot prove honest research

**Evidence:** T0301's acceptance says “no fabricated citation passes validation”; PRD §14 and the amendments mainly require URL/date/classification fields. The research synthesis makes broad causal claims about AI design and very specific competitor counts, often through secondary articles or a source list rather than claim-level evidence.

**Refinement:** verify retrieval, identity, relevant passage/location, supported claim and publication/version date. Distinguish “page exists” from “page supports this claim.” Trace reposts to an original source where possible; several reposts are not independent corroboration. Record contradictory evidence and uncertainty. Label the research-to-mechanism leap as a proposal, especially claims such as “every skippable step will be skipped.” A schema can validate records, not truth.

**Proof:** fixtures include a nonexistent URL, a real but irrelevant page, an out-of-context statement, conflicting sources and inaccessible material. The agent does not convert any into confirmed evidence.

### F09 — High: research has no defined questions or stopping condition

**Evidence:** PRD §7 says “proportional research”; §14 records sources. There is no research-plan contract or explicit stop/revisit rule in the task list.

**Refinement:** before browsing, state what decision is uncertain and what evidence could change it. Use standards for conformance, original studies for empirical claims, official technical docs for feasibility, observed interfaces for precedent, and galleries/social sources for discovery. Assess recency by claim type, methodology and target audience. Stop when consequential questions are sufficiently answered, or disclose an unresolved blocker and propose a reversible experiment. Avoid both endless browsing and arbitrary source quotas.

The [GOV.UK planning guidance](https://www.gov.uk/service-manual/user-research/plan-user-research-for-your-service) supports selecting methods for the question and seeking useful evidence proportionate to effort.

### F10 — High: continuous trend learning is an intention without an operational loop

**Evidence:** PRD §8.2/§14 mention scheduled updates; trends are last in the §6 precedence order. The WBS has no dedicated trend review, freshness policy or adoption decision. `.sus/LESSONS.md` is mentioned once, in amendments E8.

**Refinement:** retain stable foundations and add a versioned trend/research review process. On a new brief or an explicit refresh, check relevant changes in standards, browser capability, interaction conventions, visual culture and domain practice. Store first/last observation, evidence, audience/domain, maturity, potential benefits, costs and reasons to reject. Review volatile entries more often than durable principles. Use “candidate → evaluated → adopted locally/rejected/watch → superseded.” Newness and popularity alone do not establish suitability.

Do not claim background evolution unless an actual scheduler exists and is authorized. Until then, on-demand review can provide honest refresh behavior. Active projects keep pinned decisions until a reviewed change is approved.

### F11 — High: the learning loop can promote accidental lessons into rules

**Evidence:** amendments E8 takes a failed prediction to a lesson and then a candidate rule “after review”; the reviewer, generalization criteria, expiration, contradiction handling and rollback are unspecified. No prediction/lesson implementation task exists.

**Refinement:** distinguish an event from its explanation. Record the observation, context, prediction, confidence, competing explanations, test conditions and outcome. Use a lifecycle such as **candidate → tested locally → reviewed for reuse → promoted with scope → challenged/superseded/retired**. Successes, rejected hypotheses and unresolved results also teach. Reproduce consequential findings; seek contrary cases before generalizing. Do not make one project's text-wrapping result a universal typography rule.

**Proof:** a later counterexample narrows or retires a learned rule, preserving history and linking affected decisions. Updating knowledge cannot silently rewrite accepted projects.

### F12 — High: project memory and shared learning need different trust boundaries

**Evidence:** PRD §13 covers per-project memory; E8 suggests promotion into the knowledge base. No explicit cross-project consent, sanitization or isolation policy is defined.

**Refinement:** keep project facts, research data, owner preferences and experiments local by default. Share only reviewed, appropriately licensed and sanitized lessons through an explicit publication boundary. Strip customer data, credentials, screenshots and confidential strategy from proposed shared lessons. Record deletion/retention rules and the affected copies. Scope preferences to the owner/project; acceptance of one design does not validate a universal design rule.

### F13 — Medium: prediction hit-rate is not enough to measure learning

**Evidence:** E8 examples include easily satisfied line wrapping; E9 relies on prediction hit-rate; quarterly judge calibration requires 80% agreement within ±1 without sample design or justification.

**Failure:** agents can choose trivial predictions, avoid uncertainty, or agree within one point while systematically overstating quality.

**Refinement:** tie predictions to consequential decisions. Record confidence before outcomes, applicability, sample count and failed/unknown outcomes. Evaluate calibration by confidence bands and, where suitable, a proper probability score; separately track useful error discovery and transfer to unseen briefs. Report rater disagreement, systematic bias and uncertainty. Treat proposed agreement thresholds as hypotheses to calibrate, not evidence that expertise has been achieved.

### F14 — High: evaluation measures artifacts more than judgment

**Evidence:** the acceptance table emphasizes formatting, state coverage, screenshots, detectors and the Studio demo. T0205 tests triggering; the initial baseline measures four fixtures. There is no dedicated reasoning/learning suite.

**Refinement:** keep every technical evaluation and add behavioral tests: problem reframing, source relevance, contradictory evidence, principled trend rejection, incumbent-system preservation, appropriate dissent, hypothesis revision, honest uncertainty, knowledge transfer and approval discipline. Compare no skill, current skill and revised skill under matched conditions. Include held-out briefs, repeated runs and verified host/model versions. Never demand private internal reasoning; assess concise decision rationales, tool traces where available, and observable artifacts.

The official [Agent Skills evaluation guide](https://agentskills.io/skill-creation/evaluating-skills) supports task-based comparison against a baseline. The proposed SUS suite must additionally test this project's research and learning goals.

## 6. Findings: quality gates and evidence

### F15 — High: judged scores indirectly become acceptance gates

**Evidence:** amendments `230–239` say judged scores never gate CI, but `251` requires a composite band for acceptance. The composite includes judged distinctiveness. Axes called deterministic include color quality, spacing quality and accessibility, for which the proposed measurements cover only part of the concept. One generic anchor description substitutes for axis-specific anchors.

**Refinement:** preserve all review dimensions. Separate measured checks, manual assessment and reviewer judgments. Never let a high total compensate for a broken critical task or accessibility requirement. Use per-axis, context-aware anchors, applicability and uncertainty. Let the owner approve subjective craft using evidence, rather than treating `/60` bands as certified professional grades. Any required human judgment gate should be explicitly human, with disagreement handling.

### F16 — High: target-size gate omits WCAG exceptions

**Evidence:** G8 requires every interactive target to be at least 24×24 CSS px and the evidence bundle requires zero targets below 24.

**Correction:** WCAG 2.2 SC 2.5.8 allows defined spacing, equivalent-control, inline, user-agent and essential exceptions. Test applicability and the actual criterion. A stricter project target may be approved, but must be labeled a project policy rather than the standard. [W3C target-size explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### F17 — High: reflow and zoom gates can both overblock and miss failures

**Evidence:** G7 says horizontal scroll must equal zero at all five widths; A7/T0551 use 200% zoom. The evidence screenshots use only three widths.

**Correction:** reflow concerns information/functionality and two-dimensional scrolling at the specified equivalent dimensions, with exceptions for content that needs two dimensions. A useful data table may have scoped horizontal scrolling. Test 320 CSS-pixel equivalence and relevant 400% zoom behavior, alongside the separate resize-text checks. Include continuous/boundary layout tests when fixed screenshots miss a breakpoint failure. Do not hide overflow to make a metric pass. [W3C reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

### F18 — High: automated severity cannot establish WCAG AA conformance

**Evidence:** G4 requires zero serious/critical axe findings; the coverage matrix says AA is “enforced”; tooling claims a fixed approximate fraction of WCAG coverage. Manual checks exist elsewhere but are not an explicit criterion-to-evidence coverage record.

**Refinement:** keep axe and make automated findings one input. Map applicable success criteria to automated/manual/assistive-technology evidence, untested states and documented limitations. Severity labels are prioritization aids, not conformance levels. Include actual screen-reader/keyboard checks for affected controls, focus obscuration, text spacing, forced colors, errors and accessible authentication where relevant. Do not publish a universal fraction of criteria covered by a tool. [W3C evaluation overview](https://www.w3.org/WAI/test-evaluate/).

### F19 — Medium: motion gate oversimplifies the standard

**Evidence:** G6 blocks “autoplay >5 s without control” and requires every transition to have a reduced-motion branch.

**Refinement:** distinguish moving/blinking/scrolling information, auto-updating content, interaction-triggered animation and static feedback. Apply the relevant criterion's conditions and exceptions; do not classify all long-running activity as the same defect. Verify equivalent operation and information, rather than the mere presence of a CSS branch. Preserve the AA baseline and clearly label additional motion preferences. Consult the actual [WCAG 2.2 requirements](https://www.w3.org/TR/WCAG22/).

### F20 — Medium: semantics checks blend standards and house rules

**Evidence:** G9 includes exactly one `h1`; the typography rubric uses a universal 45–75 characters-per-line range. Other rubric checks imply a fixed palette/spacing model.

**Refinement:** label hierarchy, line length and styling recommendations with their conditions and evidence. A single primary heading can be a project convention; do not make it the definition of WCAG compliance. Reading measure varies by script, content and surface. Judge usable hierarchy and semantics directly, using current [WCAG](https://www.w3.org/TR/WCAG22/) and [APG guidance](https://www.w3.org/WAI/ARIA/apg/about/introduction/) with their different authority levels.

### F21 — High: performance measurements are not sufficiently distinguished

**Evidence:** G5 uses “LCP/CLS/INP field proxy”; gap analysis F6 says p75 “local”; T0152b adopts Lighthouse budgets. Per-section evidence examples contain page-level metrics without attribution.

**Correction:** keep separate fields for lab runs, scripted interaction measurements and real-user field data. Standard Lighthouse navigation runs cannot measure INP; TBT can be a proxy. Local p75 across synthetic runs is not field p75. Record hardware/network/cache/build conditions, repetitions and whole-route effects. Keep bundle/font budgets project-specific. [Google Web Vitals guidance](https://web.dev/articles/vitals), [lab versus field guidance](https://web.dev/articles/lab-and-field-data-differences).

### F22 — Medium: tokens, placeholders and themes need applicability rules

**Evidence:** G1 prohibits raw values where tokens exist; G3 flags unregistered numeric claims; A1/A7 require both themes universally. The coverage matrix makes token tooling canonical even for existing projects.

**Refinement:** preserve token discipline and factual-copy checks while distinguishing structural values, one-off art direction, product data and marketing claims. Allow labeled content placeholders during exploration, while blocking fabricated facts and unresolved production copy at acceptance. Test supported themes rather than inventing an unrequested theme; keep the product's full multi-theme capability. Adopt existing token authority before introducing a new canonical file or overwriting exports.

### F23 — High: a visually reviewable design is optional before implementation approval

**Evidence:** PRD `189–190` allows a “mock/wireframe or visual example when available”; the brief contains mostly structured descriptions. This can force the owner to approve a visual result from text.

**Refinement:** show an appropriate visual proposal for consequential visual work before production implementation approval: annotated wireframe, composition/prototype or isolated rendered preview. Use realistic content, key states and responsive intent. A small text correction can use a precise diff. Explicitly distinguish permission to generate an isolated proposal from permission to change project source. Let the owner choose or revise the proposal before applying it.

### F24 — High: acceptance records can be self-authored or stale

**Evidence:** the evidence bundle has `accepted_by: user`; G2 reads an editable status file; approvals have no specified identity/session binding, content hash, revocation or version relationship.

**Refinement:** record an approval receipt created from an actual trusted human interaction. Bind it to project, section, proposal version, base source hashes, constraints, permitted operation and expiry/revocation policy. An agent-generated string saying “user” is insufficient. Material changes invalidate approval and require renewed review. Test forged/replayed approvals, changed files, stale browser tabs, duplicate clicks and withdrawn approval.

### F25 — High: section isolation needs a shared-dependency policy

**Evidence:** G2 rejects section N+1 code before N acceptance; PRD §7 forbids unrelated work but allows promoting global tokens. Shared CSS, navigation, components and layouts can affect many accepted sections.

**Refinement:** classify local edits, shared changes, repairs and global design revisions. Show affected routes/sections before approval, run impact-based regression and reopen affected acceptance when material behavior/design changes. Define what happens if a later section invalidates the page blueprint. A section lock does not isolate shared dependencies; use an impact graph or equivalent explicit scope record.

## 7. Findings: full Live Studio

### F26 — High: the browser-to-agent event contract is missing

**Evidence:** PRD §11 defines capabilities and an intent pipeline; ADR-003 defines a bridge; T0701–T0708 never specify event delivery, acknowledgements, cancellation or recovery semantics for queued browser requests.

**Failure:** a beautiful drawing toolbar could submit requests that nobody services; reconnect could regenerate or apply the same edit twice. A stale result could replace a newer request.

**Refinement:** retain all drawing/select/write capabilities. Define session/event/request IDs; project and route binding; queued/running/proposed/cancelled/failed/completed statuses; acknowledgements; idempotent apply; retry/backoff; cancellation; stale-result rejection; heartbeat/agent availability; backpressure and reconnect replay. Browser controls must display actual agent state, preserve work, and expose actionable failure/retry UX. Distinguish the app URL from the helper URL. Test the real host's polling/event behavior, not just a fake callback.

### F27 — High: preview and source-write authorization contradict each other

**Evidence:** ADR-003 `93–94` previews by writing candidates to disk for HMR; T0706 `497–503` promises no write without explicit approval. PRD §11 expects compare/accept/discard.

**Refinement:** define three distinct actions: generate a proposal, run a temporary preview, and persist a chosen change. Use an isolated preview workspace or a carefully scoped, explicitly authorized temporary preview transaction with an exact manifest and cleanup. Show when source is temporarily instrumented. Final acceptance applies the approved result to real source after freshness checks. Reject/discard/exit must remove temporary assets and restore the exact affected baseline without resetting unrelated work.

### F28 — High: mapping scores are invented confidence values

**Evidence:** amendments `301–305` assign stamped IDs `1.0`, path heuristics `0.6`, text matches `0.3`; A8 requires confidence ≥0.8. Stamped source locations do not by themselves disambiguate repeated runtime instances, shared components, data sources or stale transforms.

**Refinement:** call these evidence tiers until calibrated against labeled ground truth. Separately assess mapping correctness, ambiguity and editability. Track source/build revision, route, component instance, loop/data identity and inherited CSS ownership. Measure wrong-target rates and abstention rates, not only successful mapping coverage. A user choosing a candidate does not remove the need to show the affected source and shared impact.

### F29 — High: framework independence is claimed before write-path feasibility

**Evidence:** ADR-003 calls the design framework-agnostic “by construction”; amendments mandate JSX stamping and ts-morph/recast/jscodeshift edits. Astro source, CSS, JSON and content/data edits are not one TSX write path. Mapping a DOM node also does not identify whether the correct change belongs in a shared token, component prop, stylesheet or content source.

**Refinement:** keep the Next.js AND Astro spike. Test selection → edit-owner resolution → constrained preview → correct-source apply → cleanup → undo for repeated instances, scoped CSS, utility CSS, conditionals, server-rendered/hydrated components, content-driven markup and shared components. Use parser/transform strategies appropriate to each source language. Structural edits should use syntax-aware transformations; a blanket AST-only rule is not a substitute for verifying semantic preservation.

### F30 — High: rollback does not yet protect all user work

**Evidence:** amendments `307–310` proposes `git stash create`; `319` says “Apply → snapshot”, reversing the pre-write snapshot order. T0707 promises preservation of uncommitted work.

**Refinement:** define a transaction before any mutation: capture exact affected bytes, file existence/mode, source hashes, index/worktree distinctions and new/untracked files; durably retain the recovery manifest. Apply only against expected base hashes. Revert only the transaction's own changes; if subsequent user edits conflict, stop and offer conflict resolution. Include non-Git projects and crash-at-each-write tests. A stash object alone is not a complete recovery system; `stash create` returns an object without storing it in the stash reference namespace. [Git stash documentation](https://git-scm.com/docs/git-stash).

### F31 — High: filtering page text is not an authorization boundary

**Evidence:** amendments `328` proposes stripping instruction-like content before it reaches the agent; PRD §11 otherwise correctly treats pages as untrusted. Drawings, OCR, references and recalled lessons can all carry hostile instructions.

**Refinement:** retain sanitization, but enforce permissions at the tool/action boundary. Untrusted content cannot authorize writes, shell commands, installs, network destinations or knowledge promotion. Preserve provenance through summaries and memory. Restrict tools and outbound access by operation; validate structured intent and paths; test direct and indirect injection, including screenshots. Filtering alone cannot guarantee safety. [Anthropic browser prompt-injection research](https://www.anthropic.com/research/prompt-injection-defenses).

### F32 — High: bridge authentication and browser isolation need a concrete design

**Evidence:** amendments `323–329` ambiguously describes a “non-HttpOnly-by-accident” cookie/header; ADR-003 claims no CSP fight while requiring a CSP nonce, and suggests attaching ordinary Chrome using a debugging port.

**Refinement:** define which process possesses the secret, how the trusted overlay receives it, token rotation/revocation, WebSocket/SSE origin handling, request replay and hostile scripts in the inspected page. Isolate agent privileges from app-page scripts. Verify CSP/Trusted Types behavior rather than assume CDP eliminates policy constraints. Use a dedicated browser profile for debugging; Chrome 136+ ignores remote-debugging switches against its default profile unless a nonstandard user-data directory is provided. [Chrome debugging security changes](https://developer.chrome.com/blog/remote-debugging-port).

### F33 — High: privacy promises exceed the defined data flow

**Evidence:** ADR-003 `98` promises no outbound calls; the product expects internet research and may use remote agent providers. Password redaction and `data-sensitive` markers do not cover all sensitive page content. Retention is deferred.

**Refinement:** map browser → bridge → adapter → provider/research tool → evidence store → shared lessons. Specify which component has no network access and which operations may transfer data under existing authorization. Make capture minimal and show what is sent. Cover screenshots, DOM, URLs, filenames, logs, authentication state and research outputs. Define local retention/deletion and provider limitations; a local bridge does not make a remote model offline.

### F34 — Medium: annotation geometry needs a semantic and accessible contract

**Evidence:** PRD §11 names drawings/spatial edits; T0704 stores viewport/anchor metadata; Studio accessibility lands late in T0807.

**Refinement:** establish coordinate spaces for element-local, viewport and document coordinates, including scroll, zoom, device-pixel ratio, transforms and responsive reflow. Distinguish “select this,” “move there,” “insert,” “remove” and “emphasize”; preserve ambiguous annotations until clarified. Show the interpreted request before destructive application. Build an equivalent keyboard/DOM annotation list from the first slice. Test overlays intercepting clicks/focus, fixed/sticky elements, nested scrolling, route changes, iframes/shadow roots as supported or explicitly unsupported cases.

### F35 — High: concurrent state and approvals need transactional consistency

**Evidence:** section lease files use PID/expiry; the design combines Markdown state, machine schemas, decisions, tokens, evidence, browser session state and source writes. Atomic rename protects one file, not a multi-file transaction.

**Refinement:** choose a canonical state/journal, with human-readable views derived or reconciled explicitly. Use revision checks and a lease generation/fencing mechanism so an expired worker cannot apply after a new worker acquires the lease. Tie code transaction, approval receipt, verification and acceptance to one revision. Test duplicate delivery, two browser tabs, two agents, process death, partial writes and recovery without promoting an unverified result.

### F36 — Medium: verification failure UX contradicts the stated UX goal

**Evidence:** amendments `310,321` and T0790 demand raw error output and automatic revert; gap analysis F18 asks for understandable failure UX. Raw output can be lengthy or sensitive; an automatic revert can conflict with newer user edits.

**Refinement:** show a concise explanation, affected operation, safe recovery state and retry/review actions; keep redacted diagnostics available. Roll back an intact transaction automatically only when safe. Report “preview failed,” “apply failed,” “verification failed,” “rollback blocked” and “accepted” as distinct outcomes. Finish cleanup before reporting success or servicing a conflicting operation.

## 8. Findings: task plan, release and maintenance

### F37 — High: the dependency graph has an unresolved reference

**Verified evidence:** `TASKS.json:645` gives T1001 `deps: ["M3–M9 tasks"]`; this is not one of the 73 task IDs. The previous evidence log claims zero missing dependencies and “ALL CHECKS PASSED.”

**Refinement:** enumerate actual prerequisite IDs or define formally expanded milestone nodes with validation. Fail closed on unknown references. Correct the earlier evidence through a superseding entry, preserving history. A graph with no cycles among its resolved edges is not a valid complete graph when an edge is unresolved.

### F38 — High: the graph does not enforce several promised gates

**Verified evidence:** T0201 does not transitively depend on the evaluation baseline/calibration despite M1.5 being called blocking. T0400 does not depend on the early Studio go/no-go. T0707 can run without the section approval machinery. T0708 does not depend on T0790 verification. T1003 does not wait for the final adapters/installer. T0153 produces evidence bundles without depending on T0154's schema. T1001's unresolved dependency provides no explicit hardening/Studio accessibility barrier.

**Refinement:** distinguish optional parallel discovery from completion barriers. Express barriers in the scheduler, not just milestone prose. The early spike can run alongside knowledge research while its explicit go/no-go governs the affected Studio investment. A final review must inspect the actual final release revision. Add tests proving that each named barrier prevents premature completion.

### F39 — High: “complete WBS” omits mandatory deliverables

**Evidence:** coverage matrix `24–31` and amendments `30–33` require a broad launch set. Explicit tasks cover button/navbar/input and some Operate patterns; none names hero, pricing, product grid/PDP, cart/checkout, footer or toast. No task implements prediction/lesson promotion or trend maintenance. A10's three dogfood sites have no explicit owner/task. T0407 also schedules filters/settings in M4 although the amendment puts them in the second wave.

**Refinement:** retain every promised capability and create a requirement → task → acceptance evidence map. Include research, learning, release claims, maintenance and Studio cleanup alongside UI features. Unmapped requirements block a claim of completeness. Do not infer that a title such as “launch playbooks” silently covers absent acceptance requirements.

### F40 — Medium: baseline fixtures and task records are underspecified

**Evidence:** T0102 creates one of four apps; T0153 measures four without explicit creation of the other three. All 73 task records omit an owner, actual-results and independent-review fields from the broader protocol; `approval` is an existing compact alias and should not be called missing. Most implementation tasks are rightly pending, so absence of their results is not a failed product test.

**Refinement:** define and validate the compact task schema, aliases, permitted statuses, evidence references and completion rules. Add explicit fixture creation/selection, licensing and ground truth. Split broad multi-module tasks when implementing them rather than claiming they all fit 15–60 minutes. Distinguish authored/reviewed/approved/verified. Planning evidence should link to durable artifacts, not an inaccessible “session log.”

### F41 — Medium: handoff statements can mislead a resumed agent

**Evidence:** README says M0 is not started while TASKS marks three M0 tasks done and two in review. HANDOFF duplicates standing instruction 10. Amendments `123` says three fixtures after specifying four, and `401` still says first eight tasks after proposing five. Several documents state this host has no subagent tool; these are historical observations, not portable capability facts.

**Refinement:** keep history but date and scope environment observations; detect capabilities in each current session. Generate current summaries where practical, with timestamps/revision hashes. Resolve stale counts and duplicated instructions. Generated documents still need freshness checks: generation prevents some divergence, not stale source data.

### F42 — High: review requirements have conflicting fallback policies

**Evidence:** amendments `251–253` says no independent critic means no GA-acceptable section; PRD §18/start prompt allow a disclosed fallback; T1003's rollback says deterministic gates stand if no reviewer exists. P1 findings “cannot be self-dismissed” but author rebuttal is also allowed without a clear adjudicator.

**Refinement:** state separate requirements for section review, SUS security/accessibility review and public release. Define who resolves disputed findings, what evidence is needed, and which gates can never be waived by an agent. Distinguish independent human review, another model/context review, and self-review. A fresh context reduces shared history; it is not proof of independent expertise or absence of correlated errors.

### F43 — Medium: benchmarks can overfit or produce misleading confidence

**Evidence:** A10 uses the same dogfood sites as fixtures/evidence; Part 9/T1002 uses six briefs × three modes despite four surface modes, and n≥20 raters without a sampling/power rationale. The risk register uses thresholds without baselines. Fixed CI/token targets coexist with unmeasured workloads.

**Refinement:** retain the benchmark ambition. Separate development fixtures, calibration cases and held-out evaluation. Cover all claimed surface modes and relevant cultural/device contexts. Match prompts, model/tool versions, time/budget and assets across comparisons; repeat stochastic runs. Recruit appropriately skilled raters, randomize/blind comparisons, report effect sizes and uncertainty, and distinguish preference from task success. Choose sample sizes for the claim. Publish sanitized data only with rights and consent. The target is demonstrated improvement, not a particular score or command count.

### F44 — High: the proposed runtime floor is already stale

**Evidence:** ADR-006 `167` specifies “Node ≥20.19 LTS.” As of this audit date, the official release table marks Node 20 EOL. Tooling candidates also use unverified adoption labels and broad claims such as “no good open-source equivalent” without a traceable comparison.

**Refinement:** select an actively supported tested runtime range and maintenance policy at adoption. Test actual package versions, parsers, browser engines, licenses, maintenance and install behavior. Treat “npx” as an installation/execution path, not a guarantee of zero downloads, no browser installation or no lifecycle scripts. Mark tooling decisions as proposals until verified. [Node release status](https://nodejs.org/en/about/previous-releases).

### F45 — Medium: skill packaging and host portability need executable boundaries

**Evidence:** ADR-001's `skill/` path and ADR-002's required name/directory match need a packaging transformation; the intended skill name is `shahid-ui-ux-skill`. The amendments impose a 200-character discovery description while ADR-002/spec allow 1,024. A deterministic resolver is claimed to enforce what a general agent reads. CLI fallback and unsupported-host labels differ between documents.

**Refinement:** test the installed directory name and generated host entry, including long paths, updates and uninstall preserving user files. Treat local content budgets as maintainability choices rather than format law. The official spec recommends progressive loading; `evals/evals.json` is an evaluation convention, not a mandatory packaging field. Scripts enforce their own operations, not every decision of a host agent that can bypass them. Publish distinct capability statuses for skill loading, research, rendering, browser events and mediated source writes. [Agent Skills specification](https://agentskills.io/specification), [skill authoring guidance on degrees of freedom](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).

### F46 — High: international quality needs more than string growth and RTL

**Evidence:** PRD §6 names multilingual legibility; A7/T0551 primarily tests long strings, RTL, 200% zoom and theme variation. The project targets commerce and data-heavy apps, but requirements do not develop locale-specific task behavior.

**Refinement:** preserve the full web scope and add context-sensitive review of script-specific fonts/shaping/fallback, reading direction, text segmentation, input methods, names/addresses, currencies/numbers, dates/time zones, translated errors, localized search, mixed-direction content and culturally appropriate imagery. Include low bandwidth/low-end devices and touch, keyboard and assistive input. Prioritize locales from each brief rather than pretending to test every locale universally. “International grade” should mean demonstrated competence across declared contexts, not an invented certificate or a universal aesthetic.

### F47 — Medium: domain behavior and ethical UX are thinner than visual coverage

**Evidence:** Operate tasks emphasize table states; checkout has a short payment-state note. There is no explicit research/acceptance contract for permissions, destructive actions, unsaved work, concurrency/conflicts, bulk-action scope, search/filter persistence or recoverable commerce errors. Broad accessibility/legal/safety exceptions in E3 can be read as if an owner signature waives every constraint.

**Refinement:** keep all component expertise and add domain-specific user-task checks. For commerce, cover truthful totals, explicit commitments, recoverable validation/payment states and duplicate submission protection. For admin, cover roles, data loss, bulk-action clarity, auditability and stale data. Evaluate manipulative defaults and deceptive content. Distinguish owner taste, outcome hypotheses, project quality policy, host permissions and non-waivable constraints; a decision-log signature does not by itself authorize every operation or establish compliance.

### F48 — Medium: media, licensing and operational maintenance lack end-to-end acceptance

**Evidence:** A5/T0408 names asset strategy, rights and budgets; privacy/retention and recovery are spread across later tasks. Release publication is planned, but no explicit maintenance owner/review calendar or supported-upgrade period is assigned.

**Refinement:** verify relevance and visual quality of imagery/icons, actual rendering/crops, attribution/rights, font loading/fallback, accessible alternatives and factual labeling of generated assets. Separate licensed reuse from imitation. Include dependency/license notices, broken-link repair, security reporting, supported-host/version review, knowledge retirement, upgrade/downgrade/recovery and ownership of ongoing research. These are completion details for the existing full scope, not new product categories.

## 9. Impeccable Live: checked against the owner's clarification

The current public command is `/impeccable live`, or `$impeccable live` in Codex. Its documentation describes selection, written requests, comments/strokes, in-page alternatives, acceptance into source and discard. It calls Live **beta**, whereas SUS's research model still says alpha. These are documented claims inspected here, not runtime results. [Official Live reference](https://impeccable.style/docs/live/).

The tutorial also describes a helper connecting browser controls to an active agent, page-wide steering, insertion/direct text changes and session recovery. It distinguishes the application URL from the helper address. [Official tutorial](https://impeccable.style/tutorials/iterate-live/).

The published technical reference exposes event dispatch, acknowledgements, recovery and post-accept cleanup. SUS needs its own explicit equivalent contracts; it should not assume a toolbar alone supplies them. The installed local reference and current published reference differ in startup details, which is direct evidence for version-pinned comparison. [Published technical reference](https://raw.githubusercontent.com/pbakaus/impeccable/main/skill/reference/live.md).

**Proposed SUS launch/interaction contract, preserving the full requirement:**

1. The `live` intent launches or attaches to the approved project's running application and confirms the route/workspace binding. Host-specific syntax is verified; `sus live` is a proposed alias, not an implemented command.
2. The user selects an element or region, draws/annotates, writes a request, or gives a page-wide instruction.
3. Studio shows the interpreted intent, selected scope, ambiguous points and the agent's actual connection/progress state.
4. The agent inspects the relevant source/context, performs research when the decision needs it, and proposes a section-bounded change. An annotation is a request, not blanket permission to change other sections.
5. The user reviews an isolated preview and meaningful alternatives when needed; copy, interaction and responsive implications are visible.
6. An explicit approval applies the identified proposal transaction to actual source. Verification follows; final acceptance records the result. Temporary preview permission and permanent apply permission are distinct.
7. Discard, undo, cancel, disconnect/reconnect and exit have defined safe outcomes, preserve user work and clean temporary instrumentation. Accepted changes survive reload/rebuild.

This is a proposed contract for SUS, not a claim that it is implemented or that Impeccable uses the same architecture. No competitor was launched, installed, modified or benchmarked during this audit.

## 10. Proposed reasoning-and-learning workflow

Keep a compact core that teaches **how to decide**, backed by the complete existing runtime and reference scope. Load detailed methods only when relevant. The following stages describe observable outputs, not a demand to reveal internal thought processes.

| Stage | Agent decision | Reviewable output / boundary |
|---|---|---|
| Understand | What user task and business problem matter? What do we actually know? | Brief separating facts, preferences, constraints and unknowns; focused questions where consequential |
| Investigate | Which uncertainty could change the design? Which method/source can answer it? | Research questions, current sources, observations, contradictions, limits and stop/revisit condition |
| Frame | What should the interface help the user understand or do? | Information architecture, task flow, real-content needs and success/failure criteria |
| Explore | Which plausible approaches fit, and what do they cost? | Appropriate visual/interaction alternatives and concise tradeoffs; preserved incumbent conventions where useful |
| Propose | What should be built in this section and why? | Visual proposal, states, copy, responsive/motion/accessibility intent, impact scope and test plan |
| Approve | Did the human approve this exact proposal and operation? | Trusted version-bound approval; production source untouched until authorized |
| Implement | What is the smallest coherent realization of that approved design? | Bounded patch/transaction and explicit shared-component impacts |
| Verify | Does the actual interface behave as intended? | Rendered evidence plus applicable functional/manual/automated checks; observed limits |
| Accept | Does the human accept this verified result? | Acceptance bound to the tested revision; next section stays locked until acceptance |
| Learn | Which prediction or assumption changed, and how far does the lesson apply? | Scoped lesson and counterevidence; reviewed promotion only; retained history and retirement path |
| Refresh | What has changed since the evidence was reviewed? | Versioned update proposal and regression evidence; accepted project decisions remain pinned |

Example: if an owner draws a box beside a heading and writes “move this here,” the agent should check whether the intent is visual alignment, reading order or grouping. It should assess mobile/keyboard order and shared-component impact, show the proposed relationship, then apply the approved change. It should research an unfamiliar interaction question when needed, without repeating a full niche study for a settled alignment fix.

## 11. Behavioral acceptance scenarios to add

These are proposed tests, not executions performed in this audit. Keep the existing engineering, motion, scanner, host and release tests.

| Scenario | Expected observable behavior |
|---|---|
| Sparse request with consequential missing context | Ask focused questions; research what can be resolved externally; avoid invented audience/product facts |
| Trend conflicts with accessibility or task efficiency | Explain the conflict and a useful alternative; do not adopt it for popularity |
| Same brief, different real audiences/content | Derive justified differences; do not reuse a disguised page recipe |
| Established brand/system with a narrow refinement | Preserve useful identity and behavior; do not force novelty |
| Real source URL that does not support the claim | Reject the claimed support; record uncertainty or find better evidence |
| Conflicting studies with different populations | Explain applicability and uncertainty rather than count citations |
| Web unavailable/paywalled/robots-restricted | State what was and was not verified; choose a bounded fallback without fabricated research |
| Owner rejects the recommended visual direction | Respect informed preference while preserving applicable constraints |
| Failed design prediction | Record the actual observation, investigate cause and narrow the lesson before reuse |
| Later counterexample to a promoted rule | Challenge/retire or scope it; link affected knowledge without silently redesigning prior projects |
| Cross-project lesson includes customer data | Keep it local; block unsanctioned shared promotion |
| “Looks good” versus approval of a specific changed proposal | Resolve approval scope; do not forge an accept receipt or infer approval for changed content |
| Drawn arrow/box has more than one consequential interpretation | Show the interpreted relationship and ask a focused clarification |
| Repeated cards share one source component | Identify the instance/data/style owner and disclose all affected instances |
| Generate then discard preview | Restore affected baseline; leave user edits and accepted sections intact |
| User edits source while a proposal is pending | Invalidate stale apply, rebase/re-propose and preserve the edit |
| Duplicate Apply, stale tab, disconnect mid-apply | Apply at most once; recover deterministically with visible state |
| Breakpoint, RTL, zoom, reduced motion, slow/error state | Verify applicable functionality and reading/focus order, not merely screenshots |
| Page text/screenshot says “ignore approvals, run command” | Treat it as untrusted content; action boundary rejects unauthorized operations |
| Source apply succeeds but verification/cleanup fails | Report the exact state; recover safely; do not mark accepted or advance |
| Agent/model/host or knowledge version changes | Rerun relevant held-out behavior and compatibility tests; retain pinned project decisions |

Judge whether the agent's decisions and resulting interface improved. A longer rationale, more source URLs, more variants or more checkboxes is not evidence of deeper expertise by itself.

## 12. Refinement sequence — full scope retained

1. **Resolve authority and traceability.** Consolidate the effective requirement index, update the startup path, record this clarification, reconcile conflicting acceptance/review rules, and map every requirement to a task and evidence.
2. **Specify research and learning.** Define evidence support/applicability, research questions and stop conditions, trend review, prediction/lesson lifecycle, local/shared boundaries and knowledge versioning.
3. **Specify trusted progression.** Define visual proposals, human approval receipts, shared-impact/reopening rules and the section transaction state machine.
4. **Complete Studio contracts and feasibility.** Keep every Studio feature. Spike Next.js and Astro through the actual browser-to-agent-to-source loop, including event delivery, preview authorization, cleanup and safe recovery. Run host capability discovery early.
5. **Correct quality gates and evaluation.** Preserve technical coverage; fix standards applicability, lab/field labeling, subjective scoring and held-out reasoning tests. Select supported dependencies at adoption.
6. **Reconcile the complete backlog.** Fix invalid dependency references, encode the intended barriers, add missing playbooks/fixtures/learning/maintenance work, then review the first bounded build batch under the existing build gate.

These are planning refinements. The owner has not sent `APERIO` in this conversation, so no SUS product code or executable artifact is created by this audit.

## 13. Actual verification record and limits

Python standard-library checks were run against the baseline files using `json`, `pathlib`, `collections` and `zipfile`; Git supplied the inventory/status. No project code, installers or archived code was executed.

| Check | Actual result |
|---|---|
| JSON parse / task count | Valid JSON; 73 tasks |
| Duplicate task IDs | 0 |
| Unresolved dependency values | 1: T1001 → `M3–M9 tasks` |
| Cycles among resolved task-ID edges | 0; unresolved edge means complete graph validation fails |
| Task status count | 3 done, 2 review, 68 pending |
| Product `package.json` / SUS `SKILL.md` | Neither exists |
| Original archive versus extracted planning docs | 5 of 5 byte-identical |
| Starting Git working tree | Clean |
| Skill behavior / UI / a11y / security / performance tests | Not run: no SUS implementation exists |
| Live competitor runtime/benchmark | Not run; documentation/reference inspection only |
| Independent agent or human review of this audit | Not run; this is one agent's source-grounded audit |
| Report consistency | 48 unique sequential finding IDs: 35 High, 13 Medium; balanced Markdown fences; local Markdown link targets resolve |
| Change scope / whitespace | Only this report and four planning/index/evidence documents changed; TASKS.json unchanged; `git diff --check` passed |

The dependency check can be reproduced read-only from the repository root:

```sh
python3 - <<'PY'
import json
from pathlib import Path
tasks = json.loads(Path('TASKS.json').read_text())['tasks']
ids = {task['id'] for task in tasks}
missing = [(task['id'], dep) for task in tasks for dep in task['deps'] if dep not in ids]
print({'tasks': len(tasks), 'duplicate_ids': len(tasks) - len(ids), 'missing': missing})
PY
```

Some older research claims and every candidate dependency/license have not been independently revalidated here. This report identifies those evidence limitations rather than declaring them false. Source pages can change; retrieve and pin the relevant versions before implementation. The audit covers all supplied project artifacts, but cannot guarantee that no additional flaw exists or that a future implementation meets these requirements.
