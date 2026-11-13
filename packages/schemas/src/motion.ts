/**
 * Motion taxonomy + tokens (T0601, PRD §9.5).
 *
 * Semantic motion tokens: duration categories, easing curves,
 * distance/intensity levels, stagger constraints, transition intent —
 * with the 12-field transition spec (§9.2) enforced: every transition
 * spec carries ALL twelve fields; `motion: none` is valid with a reason
 * and a reduced-motion alternative that preserves information/operation.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const MotionTokens = z
  .object({
    /** Duration categories (category → ms). */
    durations: z.record(z.string(), z.number().int().positive()),
    /** Easing curves (name → CSS cubic-bezier or keyword). */
    easings: z.record(z.string(), z.string().min(1)),
    /** Distance/intensity levels (level → px/em magnitude). */
    distances: z.record(z.string(), z.string().min(1)),
    /** Stagger constraints (pattern → max total delay ms). */
    stagger: z.record(z.string(), z.number().int().min(0)),
  })
  .strict()
  .superRefine((t, ctx) => {
    for (const required of ['fast', 'base', 'slow']) {
      if (!(required in t.durations)) {
        ctx.addIssue({
          code: 'custom',
          message: `missing duration category "${required}"`,
          path: ['durations'],
        });
      }
    }
    if (!('standard' in t.easings)) {
      ctx.addIssue({ code: 'custom', message: 'missing easing "standard"', path: ['easings'] });
    }
  });

export const TRANSITION_SPEC_FIELDS = [
  'property',
  'fromState',
  'toState',
  'trigger',
  'durationCategory',
  'durationMs',
  'easing',
  'distance',
  'stagger',
  'intent',
  'reducedMotion',
  'interruption',
] as const;

/** The 12-field transition spec (§9.2): all fields REQUIRED. */
export const TransitionSpec = z
  .object({
    property: z.string().min(1),
    fromState: z.string().min(1),
    toState: z.string().min(1),
    trigger: z.string().min(1),
    durationCategory: z.enum(['none', 'fast', 'base', 'slow']),
    /** Required unless durationCategory === 'none' (motion: none). */
    durationMs: z.number().int().min(0).optional(),
    easing: z.string().min(1),
    distance: z.string(),
    stagger: z.string(),
    /** WHY the motion exists — decorative loops are rejected (PRD §9). */
    intent: z.string().min(1),
    reducedMotion: z.string().min(1),
    interruption: z.enum(['cancel-restart', 'complete-then-apply', 'ignore']),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.durationCategory === 'none') {
      // motion:none is valid when purposeful: intent explains it; reduced
      // motion must still preserve information and operation
      if (!/information|operation|semantic|content change|no movement/i.test(t.intent)) {
        ctx.addIssue({
          code: 'custom',
          message:
            "durationCategory 'none' requires an intent that names the preserved information/operation",
          path: ['intent'],
        });
      }
    } else if (t.durationMs === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'durationMs required unless durationCategory is none',
        path: ['durationMs'],
      });
    }
  });

export const SusMotionTokens = defineSusSchema('sus.motion-tokens', 1, MotionTokens);
export const SusTransitionSpec = defineSusSchema('sus.transition-spec', 1, TransitionSpec);

export type MotionTokensData = z.infer<typeof MotionTokens>;
export type TransitionSpecData = z.infer<typeof TransitionSpec>;
