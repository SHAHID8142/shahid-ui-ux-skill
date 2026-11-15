/**
 * T0404 + T0600: playbook + state-machine contract — authoritative rules
 * need sources; duplicates fail; steps ordered; motion 'none' needs a
 * reason; loading state needs stale-response rule; transitions must
 * reference listed states.
 */
import { describe, expect, it } from 'vitest';
import { ComponentStateMachine, Playbook, SusPlaybook } from '@sus/schemas';

const rule = (id: string, kind = 'authoritative', extra = {}) => ({
  id,
  kind,
  statement: `rule ${id}`,
  ...(kind === 'authoritative' ? { source: 'token-estimate-method' } : {}),
  ...extra,
});

const machine = {
  component: 'button',
  variants: ['primary', 'ghost'],
  states: ['default', 'hover', 'loading'],
  staleResponseRule: 'latest click wins; stale responses ignored (coalesced)',
  transitions: [
    {
      from: 'default',
      to: 'hover',
      trigger: 'pointerenter',
      interruption: 'complete-then-apply',
      rapidToggle: 'coalesce',
      motion: {
        motion: 'background-color 120ms',
        reducedMotion: 'color change applies instantly; information preserved',
      },
    },
    {
      from: 'hover',
      to: 'default',
      trigger: 'pointerleave',
      interruption: 'cancel-restart',
      rapidToggle: 'allow',
      motion: { motion: 'background-color 120ms', reducedMotion: 'instant' },
    },
    {
      from: 'default',
      to: 'loading',
      trigger: 'submit',
      interruption: 'ignore',
      rapidToggle: 'coalesce',
      motion: {
        motion: 'none',
        noneReason: 'spinner is semantic feedback, not decoration',
        reducedMotion: 'aria-busy announced, no spinner',
      },
    },
    {
      from: 'loading',
      to: 'default',
      trigger: 'settled',
      interruption: 'cancel-restart',
      rapidToggle: 'coalesce',
      motion: { motion: 'none', noneReason: 'state swap is content change', reducedMotion: 'same' },
    },
  ],
};

describe('state-machine contract (T0600)', () => {
  it('accepts a valid machine with motion-none-with-reason', () => {
    expect(ComponentStateMachine.safeParse(machine).success).toBe(true);
  });
  it('motion none without a reason is rejected', () => {
    const bad = JSON.parse(JSON.stringify(machine));
    delete bad.transitions[2]!.motion.noneReason;
    expect(ComponentStateMachine.safeParse(bad).success).toBe(false);
  });
  it('loading state without staleResponseRule is rejected', () => {
    const bad = JSON.parse(JSON.stringify(machine));
    delete bad.staleResponseRule;
    expect(ComponentStateMachine.safeParse(bad).success).toBe(false);
  });
  it('transition referencing an unlisted state is rejected', () => {
    const bad = JSON.parse(JSON.stringify(machine));
    bad.transitions.push({ ...bad.transitions[0], from: 'success' });
    expect(ComponentStateMachine.safeParse(bad).success).toBe(false);
  });
  it('self-transition (from === to) is rejected', () => {
    const bad = JSON.parse(JSON.stringify(machine));
    bad.transitions.push({ ...bad.transitions[0], to: 'default' });
    expect(ComponentStateMachine.safeParse(bad).success).toBe(false);
  });
});

describe('playbook contract (T0404)', () => {
  const playbook = {
    id: 'test-button',
    surface: 'any',
    component: 'button',
    steps: [
      { order: 1, decide: 'variant + semantic role', usingRules: ['variant-role'] },
      { order: 2, decide: 'state machine + motion decisions', usingRules: ['motion-explicit'] },
    ],
    rules: [
      rule('variant-role', 'authoritative', {
        statement: 'variant follows semantic action weight',
      }),
      rule('motion-explicit', 'convention', {
        statement: 'every transition declares motion; none allowed with reason',
      }),
    ],
    stateMachine: machine,
    // T0405b: the twelve-part standard is part of the contract now
    sections: {
      intent: 'let the user commit to one action with clear feedback',
      useCases: ['form submission'],
      inputs: ['intent', 'whether it writes to a server'],
      anatomy: ['button element'],
      styling: ['variant maps to intent'],
      a11y: ['real button element for actions'],
      responsive: ['minimum 44x44 touch target'],
      copy: ['label is a verb in the user terms'],
      alternatives: ['a link styled as a button for navigation'],
      references: [{ label: 'WCAG 2.2 SC 2.1.1', date: '2026-11-14', grade: 'normative-standard' }],
      acceptance: ['double activation issues one request'],
      failureCases: ['double submit creating two records'],
    },
  };

  it('accepts a valid playbook', () => {
    expect(SusPlaybook.schema.safeParse(playbook).success).toBe(true);
  });

  it('authoritative rule without source is rejected', () => {
    const bad = JSON.parse(JSON.stringify(playbook));
    delete bad.rules[0].source;
    expect(Playbook.safeParse(bad).success).toBe(false);
  });

  it('duplicate authoritative statements are rejected', () => {
    const bad = JSON.parse(JSON.stringify(playbook));
    bad.rules.push({ ...bad.rules[0], id: 'copy-cat' });
    expect(Playbook.safeParse(bad).success).toBe(false);
  });

  it('steps referencing unknown rules are rejected', () => {
    const bad = JSON.parse(JSON.stringify(playbook));
    bad.steps[0]!.usingRules.push('ghost-rule');
    expect(Playbook.safeParse(bad).success).toBe(false);
  });

  it('unordered steps are rejected', () => {
    const bad = JSON.parse(JSON.stringify(playbook));
    bad.steps[0]!.order = 2;
    expect(Playbook.safeParse(bad).success).toBe(false);
  });
});
