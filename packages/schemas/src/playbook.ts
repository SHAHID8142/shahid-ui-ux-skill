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
import { ComponentStateMachine } from './interaction.js';

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
    /** Variant-vs-state machine (T0600) when the component has states. */
    stateMachine: ComponentStateMachine.optional(),
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
