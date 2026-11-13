# SUS — Research: How Expert Designers Actually Work

**Purpose:** ground SUS in evidence about expert design behaviour, then convert each finding
into a mechanism the agent cannot skip. This document is input to
`PRD_AMENDMENTS_v1.1.md`. It is not marketing copy.

**Status:** research synthesis, dated 2026-11-13. Sources listed in §7. Claims marked
`[evidence]` have a cited source; `[inference]` is reasoned from them.

---

## 1. The central finding

Expertise in design is **not** a linear process and **not** a knowledge volume. Nigel Cross's
review of expert-vs-novice design studies finds experts differ from novices mainly in
**problem framing, precedent use, and rapid evaluation against constraints** — novices jump to
solution generation. `[evidence]`

Corollary for an agent (`[inference]`): giving a model more design *knowledge* moves output
from ignorant to competent-generic. It does not move output to expert, because the expert
difference lives in **sequencing, commitment and rejection** — the willingness to discard work.

That is why "be a world-class designer" prompts plateau. The missing layer is **forced
decision structure with evidence**, which is exactly what this amendment set adds.

## 2. What expert designers do, as observable behaviour

| # | Behaviour | Evidence | What it implies for SUS |
|---|---|---|---|
| 1 | Frame the problem before styling: who, what job, what must be true | Cross (problem framing); Refactoring UI ("start with a feature, not a layout") | A brief artifact must exist before any UI code; gate it |
| 2 | Gather precedent, then **reduce**: studios assemble hundreds of references and cut to ~10 consistent ones | Kuznetsov interview (1000 images → 10); moodboard practice (2–3 named directions) | Direction step with an explicit cut list, not a mood sentence |
| 3 | Commit to one visual world and name it | Moodboard practice: name the direction, write power words; Impeccable "worlds" + DESIGN.md | Store the thesis; everything downstream must trace to it |
| 4 | Work in systems, never ad-hoc values | Refactoring UI (spacing/type/color scales); DTCG tokens | Token-only enforcement at lint level |
| 5 | Rank attention deliberately; hierarchy via weight/colour before size | Refactoring UI; typography audits ("fix hierarchy → spacing → contrast → typeface last"; blur test) | Machine-measurable hierarchy checks, not adjectives |
| 6 | Compare, don't imagine — judgment is trained by side-by-side pairs | Paul Graham ("easier to see ugliness than imagine beauty"); taste-training practice | Never present one option; always ≥2–3 variants with a compare view |
| 7 | Iterate by *looking* at the rendered thing, in real sizes | Impeccable craft rule: verify at shipped sizes; typography audit at 200% zoom | Screenshot + metric evidence is a completion requirement |
| 8 | Polish shows up at the edges: empty, loading, error, long content, user uploads, default form controls | Refactoring UI: this is where amateur and professional diverge | Edge-case matrix as a hard gate, not a checklist item |
| 9 | Remove rather than add; start with too much whitespace and cut back | Refactoring UI; Impeccable `distill` | Every section brief carries a required "what I removed" list |
| 10 | Critique with severity and evidence, separate taste from defect | Heuristic-evaluation practice (0–4 severity); HFI NPCI 1–5 anchors; ui-craft split deterministic vs judged | Rubric with anchored scales + explicit "judged ≠ CI gate" |
| 11 | Hold a point of view and defend tradeoffs | Impeccable: "the brief wins"; POV as product requirement | Decision journal with rejected alternatives |
| 12 | Care — quality needs belief, recognition skill, and willingness | Saarinen via taste-training; refusal to ship generic | Make skipping expensive: gates cost more than doing it right |

## 3. The six lenses (surface model worth copying)

A published taste-training course decomposes interface quality into six lenses: **typography,
motion, craft, copywriting, product design, interaction** — and insists they ship together
because each amplifies the others. `[evidence]`

This is a better **review taxonomy** than SUS §6's module list, because it is
per-surface and each lens maps to measurable checks. SUS should keep its eleven foundation
modules for *building* and add the six lenses as the *critique* vocabulary — one review grid,
six columns, every section scored in all six.

## 4. What actually separates AI output from expert output

Observed root causes, each with the mechanism that neutralises it:

| Failure mode | Why it happens | Mechanism |
|---|---|---|
| Tasteful default (cream page, thin serif, pill buttons, Inter everywhere) | Models return the distribution's most probable aesthetic | Committed direction + banned-defaults detector + named anti-references |
| Sycophantic self-review | Same context writes and grades | Adversarial critic in a **fresh context**, receiving evidence only — never the author's rationale |
| Skipping framing | Framing has no visible artifact | Machine gate: no `.sus/SECTION_BRIEF` → UI edit blocked |
| "Looks done" optimism | Agents verify by asserting | Evidence bundle required (screenshots 3 viewports × 2 themes, DOM metrics, axe, motion trace) |
| Whole-page generation | Cheaper than sequencing | Section state machine enforced in CI, not prose |
| Vague guidance ("make it elegant") | Unanchored adjectives are unfalsifiable | Anchored 1–5 rubrics; adjective-only findings rejected by schema |
| Fabricated research | No provenance requirement | Evidence schema: URL + retrieval date + classification, or `offline: unverified` |
| Context bloat from 40 skills | Duplicated rules | Foundations vs playbooks split; resolver in code; SKILL.md ≤ 5k tokens |
| Convergence across sections and pages | Local optimisation | Page-level repetition detector (same layout/CTA/hero shapes) |
| Scoring inflation | Judges drift toward praise | Periodic human calibration: ≥80% agreement within ±1 before a judged check is trusted |

## 5. Competitive floor (what SUS must at least match)

Verified public behaviour as of research date `[evidence]`:

- Impeccable: single skill + ~23 commands, 4 surface modes (Persuade / Operate / Read /
  Experience), PRODUCT.md + DESIGN.md context, 62 deterministic detector rules (31 slop /
  31 quality, 16 advisory, exit code 2), hook on UI edits, `doctor` drift repair, live mode
  (alpha) with HMR-swapped variants + source writeback, framework-specific fragility acknowledged.
- ui-craft: Nielsen 10 + 6 design laws scorecard, deterministic score vs judged score, with an
  explicit rule that the judged score **must never gate CI**.
- HFI NPCI style rubrics: 20 checks, 1–5 anchors, three automation tiers, 80% human-agreement target.
- Agent Skills spec: name/dir match, ≤1024-char description carrying all triggering, three-stage
  progressive disclosure, `evals/evals.json`, description-triggering tests.
- Anthropic skill guidance: concise > exhaustive; iterate one hard task then generalise; read
  traces, not just outputs; benchmark against a no-skill baseline.

`[inference]` The competitive gap SUS can own is not command count. It is **auditable quality**:
every accepted section carries reproducible evidence, a rubric score, and a decision record.

## 6. Design principles this research imposes on the build

1. **Weight belongs in code and fixtures, not in prompt prose.** A skill that "feels heavy"
   because it has 30k tokens of instructions is a worse product. Heavy = schemas, detectors,
   fixtures, CI gates, stored evidence.
2. **Judgment must be falsifiable.** Any claim in a review must resolve to a measurement, a
   citation, or an explicitly labelled taste opinion.
3. **Rejection is a feature.** The system must make discarding work normal and cheap
   (variants, undo, revert), because experts discard far more than novices.
4. **Sequence is the product.** Brief → direction → blueprint → section → evidence → critique →
   acceptance. Any step skippable by the agent is a step that will be skipped.
5. **Measure the measurer.** The rubric and the detector both need precision/recall or
   agreement numbers before they gate anything.

## 7. Sources

Agent Skills and skill quality
- https://agentskills.io/specification — frontmatter rules, directory match, progressive disclosure
- https://agentskills.io/skill-creation/best-practices — write from real expertise, refine with execution
- https://agentskills.io/skill-creation/optimizing-descriptions — triggering evals
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices — concision, degrees of freedom
- https://claude.com/resources/articles/improving-skill-creator-test-measure-and-refine-agent-skills — evals, benchmarks
- https://github.com/anthropics/skills — skill-creator reference

Competitive floor
- https://impeccable.style/llms.txt · https://github.com/pbakaus/impeccable · https://impeccable.style/slop
- https://deepwiki.com/pbakaus/impeccable/4-anti-pattern-detection-engine — regex / static HTML / browser detection modes
- https://halityesil.com/en/impeccable-ai-slop-detector/ — 62 rules, 16 advisory, exit-code semantics
- https://impeccablestyle.substack.com/p/impeccable-v30-single-skill-live — v3 single-skill rationale, live mode alpha
- https://github.com/educlopez/ui-craft — heuristic scorecard, deterministic vs judged separation

Expert practice and craft
- Cross, N. *Expertise in design: an overview*, Design Studies 25 (2004)
- https://blog.prototypr.io/uisdc-interview-chief-design-officer-gleb-kuznetsovs-exclusive-design-management-ff2ed54bb377 — 1000 refs → 10, ~10 variations per screen
- https://savaslabs.com/blog/designers-toolkit-creatives-guide-mastering-moodboards/ — 2–3 named directions, power words
- https://www.allthingspm.app/book-summaries/refactoring-ui · https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886 — systems, hierarchy via weight/colour, single light source, edge cases
- https://thecrit.co/resources/typography-principles-guide — fix order: hierarchy → spacing/measure → contrast → typeface
- https://typographyhandbook.com/ — measure, fluid scales, font loading
- https://blode.co/taste-training/train-your-eye — six lenses, comparison-based training
- https://brainy.ink/paper/taste-is-the-last-moat — taste = pattern recognition + comparison + written principles
- https://ashishs.design/tools/heuristic-scoring — 20-check anchored rubric, automation tiers, 80% agreement target
- https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ — independent evaluators, severity scale
- https://www.w3.org/TR/WCAG22/ · https://www.w3.org/WAI/ARIA/apg/ · https://www.designtokens.org/tr/2025.10/

**Licensing note:** no text, rule names, or assets from the above are copied. All heuristics are
restated independently and attributed; standards (WCAG, ARIA APG, DTCG) are cited as normative.
