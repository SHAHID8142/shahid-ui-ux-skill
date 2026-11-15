/**
 * Playbook contract (T0404) — decision procedures, NOT templates (D15:
 * no preset page skeletons, layout recipes or copy templates to paste).
 * A playbook prescribes WHAT to decide, in what order, against what
 * evidence; every authoritative rule cites provenance (T0301 claim ids) or
 * is explicitly marked convention. The authoring lint rejects duplicate
 * authoritative rules and missing sources.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';
import { ComponentStateMachine, ComponentStates } from './interaction.js';

export const RuleKind = z.enum(['authoritative', 'advisory', 'convention']);

export const PlaybookRule = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'rule id: lowercase-hyphen'),
    kind: RuleKind,
    statement: z.string().min(1),
    /** Provenance claim ids (evals/research/provenance-catalog.json) for
     * evidence-backed rules; required for authoritative kind unless the
     * rule is explicitly a project convention (kind: convention). */
    source: z.string().optional(),
    bannedDefaultsResisted: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.kind === 'authoritative' && !r.source) {
      ctx.addIssue({
        code: 'custom',
        message: 'authoritative rule requires a source (provenance claim id)',
        path: ['source'],
      });
    }
  });

export const Playbook = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'playbook id: lowercase-hyphen'),
    surface: z.enum(['marketing', 'commerce', 'operate', 'portfolio', 'any']),
    component: z.string().min(1),
    /** Decision procedure: ordered, each step names WHAT to decide. */
    steps: z
      .array(
        z
          .object({
            order: z.number().int().min(1),
            decide: z.string().min(1),
            usingRules: z.array(z.string()).min(1),
          })
          .strict(),
      )
      .min(1),
    rules: z.array(PlaybookRule).min(1),
    /**
     * T0405b: the PRD §6 twelve-part structure, made checkable. Parts 5 (variants
     * vs states) and 6 (motion + reduced alternative) are satisfied by
     * `stateMachine`; the rest are recorded here so a playbook cannot be "done"
     * while silently omitting accessibility, responsive behaviour or failure cases.
     */
    sections: z
      .object({
        /** 1. Intent and use cases, including niche differences. */
        intent: z.string().min(20),
        useCases: z.array(z.string().min(8)).min(1),
        nicheDifferences: z.array(z.string().min(8)).default([]),
        /** 2. Inputs the author must have before deciding. */
        inputs: z.array(z.string().min(4)).min(2),
        /** 3. Anatomy and semantics. */
        anatomy: z.array(z.string().min(4)).min(1),
        /** 4. Visual styling decisions (roles, not values). */
        styling: z.array(z.string().min(8)).min(1),
        /** 7. Accessibility and keyboard/touch behaviour. */
        a11y: z.array(z.string().min(8)).min(1),
        /** 8. Responsive adaptations and data edge cases. */
        responsive: z.array(z.string().min(8)).min(1),
        /** 9. Copy/content and SEO where applicable; empty array when N/A is a decision. */
        copy: z.array(z.string().min(8)),
        /** 10. Legitimate alternatives, anti-patterns and contraindications. */
        alternatives: z.array(z.string().min(8)).min(1),
        /** 11. Research references with dates and evidence grades. */
        references: z
          .array(
            z
              .object({
                label: z.string().min(4),
                date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'reference date: YYYY-MM-DD'),
                grade: z.enum([
                  'normative-standard',
                  'research',
                  'professional-article',
                  'convention',
                ]),
              })
              .strict(),
          )
          .min(1),
        /** 12. Acceptance tests and the failure cases they cover. */
        acceptance: z.array(z.string().min(8)).min(1),
        failureCases: z.array(z.string().min(8)).min(1),
      })
      .strict(),

    /** Variant-vs-state machine (T0600) when the component has states. */
    stateMachine: ComponentStateMachine.optional(),
    /**
     * T0405 variant-vs-state matrix. A component with variants has a different
     * state set per variant (a ghost button has no `success`; a disabled-only
     * placeholder has no `hover`). Without this cell-level record, "the matrix is
     * complete" is an assurance: an unlisted pair silently inherits the default
     * behaviour. Here every (variant, state) pair is declared either enabled or
     * refused *with a reason*, and the union must be exact.
     */
    variantMatrix: z
      .array(
        z
          .object({
            variant: z.string().min(1),
            enabled: z.array(z.enum(ComponentStates)),
            refused: z
              .array(
                z.object({ state: z.enum(ComponentStates), reason: z.string().min(8) }).strict(),
              )
              .default([]),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    // duplicate authoritative rules fail
    const authoritative = p.rules
      .filter((r) => r.kind === 'authoritative')
      .map((r) => r.statement.toLowerCase());
    if (new Set(authoritative).size !== authoritative.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate authoritative rules', path: ['rules'] });
    }
    // every step's usingRules references existing rule ids
    const ids = new Set(p.rules.map((r) => r.id));
    for (const step of p.steps) {
      for (const used of step.usingRules) {
        if (!ids.has(used)) {
          ctx.addIssue({
            code: 'custom',
            message: `step ${step.order} references unknown rule "${used}"`,
            path: ['steps'],
          });
        }
      }
    }
    // T0405: the variant-vs-state matrix must be exact when present.
    if (p.variantMatrix && p.stateMachine) {
      const states = new Set(p.stateMachine.states);
      const seen = new Set<string>();
      for (const row of p.variantMatrix) {
        if (!p.stateMachine.variants.includes(row.variant)) {
          ctx.addIssue({
            code: 'custom',
            message: `variantMatrix names "${row.variant}", which the state machine does not declare`,
            path: ['variantMatrix'],
          });
        }
        const enabled = new Set(row.enabled);
        const refused = row.refused.map((entry) => entry.state);
        if (new Set(refused).size !== refused.length) {
          ctx.addIssue({
            code: 'custom',
            message: `variant "${row.variant}" refuses the same state twice`,
            path: ['variantMatrix'],
          });
        }
        for (const state of enabled) {
          if (!states.has(state)) {
            ctx.addIssue({
              code: 'custom',
              message: `variant "${row.variant}" enables "${state}", which the state machine does not list`,
              path: ['variantMatrix'],
            });
          }
          if (refused.includes(state)) {
            ctx.addIssue({
              code: 'custom',
              message: `variant "${row.variant}" both enables and refuses "${state}"`,
              path: ['variantMatrix'],
            });
          }
          seen.add(`${row.variant}:${state}`);
        }
        for (const state of refused) {
          if (!states.has(state)) {
            ctx.addIssue({
              code: 'custom',
              message: `variant "${row.variant}" refuses "${state}", which the state machine does not list`,
              path: ['variantMatrix'],
            });
          }
          seen.add(`${row.variant}:${state}`);
        }
        // exactness: every machine state is accounted for in this row
        for (const state of p.stateMachine.states) {
          if (!enabled.has(state) && !refused.includes(state)) {
            ctx.addIssue({
              code: 'custom',
              message: `variant "${row.variant}" says nothing about state "${state}" — declare it enabled or refused with a reason`,
              path: ['variantMatrix'],
            });
          }
        }
      }
      for (const variant of p.stateMachine.variants) {
        const covered = p.variantMatrix.some((row) => row.variant === variant);
        if (!covered) {
          ctx.addIssue({
            code: 'custom',
            message: `variant "${variant}" has no row in the variant matrix`,
            path: ['variantMatrix'],
          });
        }
      }
    } else if (p.variantMatrix && !p.stateMachine) {
      ctx.addIssue({
        code: 'custom',
        message: 'variantMatrix requires a stateMachine',
        path: ['variantMatrix'],
      });
    }

    // steps are ordered and complete
    const orders = p.steps.map((s) => s.order);
    if (new Set(orders).size !== orders.length || orders.some((o, i) => o !== i + 1)) {
      ctx.addIssue({
        code: 'custom',
        message: 'steps must be ordered 1..n without gaps',
        path: ['steps'],
      });
    }
  });

export const SusPlaybook = defineSusSchema('sus.playbook', 1, Playbook);
export type PlaybookRuleData = z.infer<typeof PlaybookRule>;
export type PlaybookData = z.infer<typeof Playbook>;
