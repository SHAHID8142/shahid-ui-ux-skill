/**
 * T0601: motion tokens + 12-field transition spec — all fields required,
 * motion:none valid only with purposeful intent, reduced-motion required.
 */
import { describe, expect, it } from 'vitest';
import {
  MotionTokens,
  TRANSITION_SPEC_FIELDS,
  TransitionSpec,
  type TransitionSpecData,
} from '@sus/schemas';

const valid: TransitionSpecData = {
  property: 'background-color',
  fromState: 'default',
  toState: 'hover',
  trigger: 'pointerenter',
  durationCategory: 'fast',
  durationMs: 120,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  distance: '0px',
  stagger: 'none',
  intent: 'state-change feedback: confirm the interactive target',
  reducedMotion: 'color change applies instantly; feedback preserved via state styling',
  interruption: 'cancel-restart',
};

describe('motion tokens + transition spec (T0601)', () => {
  it('valid spec carries exactly the 12 canonical fields', () => {
    expect(Object.keys(valid).sort()).toEqual([...TRANSITION_SPEC_FIELDS].sort());
    expect(TransitionSpec.safeParse(valid).success).toBe(true);
  });
  it('removing any field fails (all 12 required)', () => {
    for (const field of TRANSITION_SPEC_FIELDS) {
      const incomplete = { ...valid } as Record<string, unknown>;
      delete incomplete[field];
      expect(TransitionSpec.safeParse(incomplete).success, field).toBe(false);
    }
  });
  it('motion:none without purposeful intent is rejected; with intent passes', () => {
    const none = { ...valid, durationCategory: 'none' as const, durationMs: undefined };
    expect(TransitionSpec.safeParse(none).success).toBe(false);
    const purposeful = {
      ...none,
      intent: 'content change: aria-busy announces the loading semantic, no movement to preserve',
    };
    expect(TransitionSpec.safeParse(purposeful).success).toBe(true);
  });
  it('non-none duration category requires durationMs', () => {
    const noMs = { ...valid, durationMs: undefined };
    expect(TransitionSpec.safeParse(noMs).success).toBe(false);
  });
  it('SUS canonical motion tokens validate (fast/base/slow + standard easing)', () => {
    const tokens = {
      durations: { fast: 120, base: 240, slow: 400 },
      easings: { standard: 'cubic-bezier(0.2, 0, 0, 1)', entrance: 'cubic-bezier(0, 0, 0.2, 1)' },
      distances: { near: '4px', far: '16px' },
      stagger: { list: 40 },
    };
    expect(MotionTokens.safeParse(tokens).success).toBe(true);
    const missingSlow = { ...tokens, durations: { fast: 120, base: 240 } };
    expect(MotionTokens.safeParse(missingSlow).success).toBe(false);
  });
});
