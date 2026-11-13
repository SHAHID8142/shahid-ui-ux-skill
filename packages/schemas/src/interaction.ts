/**
 * Interaction state-machine contract (T0600).
 *
 * Variants and states are DIFFERENT: a component has variants (primary,
 * secondary, ghost…) and each variant carries a state machine (default,
 * hover, focus-visible, active, disabled, loading, success, error).
 * Every transition carries an explicit motion decision — `motion: none` is
 * valid WITH a reason — and reduced-motion behavior must preserve
 * information and operation (G6). Interruption and rapid-toggle semantics
 * are required fields, not afterthoughts.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const ComponentStates = [
  'default',
  'hover',
  'focus-visible',
  'active',
  'disabled',
  'loading',
  'success',
  'error',
] as const;

export const MotionDecision = z
  .object({
    /** CSS transition/tween spec; 'none' allowed WITH a reason. */
    motion: z.string().min(1),
    durationRef: z.string().optional(),
    easingRef: z.string().optional(),
    /** Required when motion === 'none'. */
    noneReason: z.string().optional(),
    /** Reduced-motion equivalent that preserves information and operation. */
    reducedMotion: z.string().min(1),
  })
  .strict()
  .refine((m) => m.motion !== 'none' || (m.noneReason !== undefined && m.noneReason.length > 0), {
    message: "motion 'none' requires noneReason",
  });

export const Transition = z
  .object({
    from: z.enum(ComponentStates),
    to: z.enum(ComponentStates),
    trigger: z.string().min(1),
    motion: MotionDecision,
    /** Interruption semantics: what happens if retriggered mid-flight. */
    interruption: z.enum(['cancel-restart', 'complete-then-apply', 'ignore']),
    /** Rapid-toggle semantics: debounce/throttle/coalesce requirement. */
    rapidToggle: z.enum(['coalesce', 'queue', 'allow']),
  })
  .strict()
  .refine((t) => t.from !== t.to, { message: 'transition must change state' });

export const ComponentStateMachine = z
  .object({
    component: z.string().min(1),
    variants: z.array(z.string().min(1)).min(1),
    /** States this component actually exposes (subset of ComponentStates). */
    states: z.array(z.enum(ComponentStates)).min(1),
    /** Reachability source of truth: state 'disabled' has no outbound motion. */
    transitions: z.array(Transition).min(1),
    /** Async result handling: stale-response rule (required if loading exists). */
    staleResponseRule: z.string().optional(),
  })
  .strict()
  .superRefine((sm, ctx) => {
    if (sm.states.includes('loading') && !sm.staleResponseRule) {
      ctx.addIssue({
        code: 'custom',
        message: 'components with a loading state must declare a staleResponseRule',
        path: ['staleResponseRule'],
      });
    }
    const known = new Set(sm.states);
    for (const t of sm.transitions) {
      if (!known.has(t.from) || !known.has(t.to)) {
        ctx.addIssue({
          code: 'custom',
          message: `transition ${t.from}->${t.to} references an unlisted state`,
          path: ['transitions'],
        });
      }
    }
    // every non-terminal state must have at least one outbound transition
    const withOutbound = new Set(sm.transitions.map((t) => t.from));
    for (const s of sm.states) {
      if (!known.has(s)) continue;
      if (s !== 'disabled' && s !== 'success' && s !== 'error' && !withOutbound.has(s)) {
        ctx.addIssue({
          code: 'custom',
          message: `state "${s}" has no outbound transition`,
          path: ['transitions'],
        });
      }
    }
  });

export const SusStateMachine = defineSusSchema('sus.state-machine', 1, ComponentStateMachine);
export type MotionDecisionData = z.infer<typeof MotionDecision>;
export type TransitionData = z.infer<typeof Transition>;
export type ComponentStateMachineData = z.infer<typeof ComponentStateMachine>;
