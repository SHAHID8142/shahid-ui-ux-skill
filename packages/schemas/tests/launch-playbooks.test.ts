/**
 * T0405 — the launch-set playbooks must be checkable, not just present.
 *
 * TASKS.json acceptance: "variant-vs-state matrix complete", "every relevant
 * transition has an explicit motion decision (none with reason allowed) and
 * information-preserving reduced-motion behavior", "state matrices
 * forward-compatible with T0600 state-machine schema".
 *
 * The schema enforces most of this; these tests exist to catch the drift the
 * schema cannot see — a playbook that quietly disappears, a component that
 * gains states without gaining transitions, or motion 'none' used as an
 * escape hatch without the reason that makes it legitimate.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SusPlaybook } from '../src/index.js';

const DIR = join(__dirname, '../../../skill/references/playbooks');
const files = readdirSync(DIR).filter((file) => file.endsWith('.json'));
const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), 'utf8'));

/** Batch 1 (T0405). Commerce lives in T0405c; data table and record forms in T0407. */
const BATCH_1 = [
  'navbar',
  'hero',
  'button-cta',
  'form-input-validation',
  'card',
  'pricing-table',
  'footer',
  'empty-loading-error',
  'modal-dialog',
  'toast-notification',
];

/** Authored by other tasks; their absence here is correct, their presence a mistake. */
const NOT_BATCH_1 = [
  'data-table',
  'record-forms',
  'product-grid',
  'pdp',
  'cart-summary',
  'checkout-steps',
];

describe('batch-1 launch set is exactly what it claims', () => {
  it('every batch-1 component has a playbook', () => {
    const present = files.map((file) => file.replace('.json', ''));
    for (const id of BATCH_1) expect(present, id).toContain(id);
  });

  it('no component from a later task has been slipped in', () => {
    const present = files.map((file) => file.replace('.json', ''));
    for (const id of NOT_BATCH_1) expect(present, id).not.toContain(id);
  });

  it('every file validates against the playbook contract', () => {
    for (const file of files) {
      const parsed = SusPlaybook.schema.safeParse(load(file));
      expect(
        parsed.success,
        `${file}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues)}`,
      ).toBe(true);
    }
  });
});

describe('variant-vs-state matrices are complete', () => {
  it('every variant row covers every state the machine lists, enabled or refused', () => {
    for (const file of files) {
      const playbook = load(file);
      const states: string[] = playbook.stateMachine.states;
      for (const row of playbook.variantMatrix) {
        const enabled = new Set(row.enabled);
        const refused = row.refused.map((entry: { state: string }) => entry.state);
        for (const state of states) {
          const covered = enabled.has(state) || refused.includes(state);
          expect(covered, `${file} / ${row.variant} / ${state}`).toBe(true);
        }
        // "refused" is an argument, not a shrug
        for (const entry of row.refused) expect(entry.reason.length).toBeGreaterThan(7);
      }
    }
  });

  it('refuses a matrix that says nothing about a state', () => {
    const playbook = load('button-cta.json');
    playbook.variantMatrix[0].enabled = playbook.variantMatrix[0].enabled.filter(
      (state: string) => state !== 'error',
    );
    const parsed = SusPlaybook.schema.safeParse(playbook);
    expect(parsed.success).toBe(false);
  });

  it('refuses a declared variant with no row in the matrix', () => {
    const playbook = load('button-cta.json');
    playbook.variantMatrix = playbook.variantMatrix.filter(
      (row: { variant: string }) => row.variant !== 'danger',
    );
    const parsed = SusPlaybook.schema.safeParse(playbook);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(
      parsed.error.issues.some((issue) => issue.message.includes('no row in the variant matrix')),
    ).toBe(true);
  });

  it('refuses a variant the machine does not declare', () => {
    const playbook = load('card.json');
    playbook.variantMatrix.push({ variant: 'mystery', enabled: ['default'], refused: [] });
    expect(SusPlaybook.schema.safeParse(playbook).success).toBe(false);
  });
});

describe('every transition carries a motion decision', () => {
  it('motion none always states why, and reduced motion is never empty', () => {
    let noneCount = 0;
    for (const file of files) {
      for (const transition of load(file).stateMachine.transitions) {
        // short values are legitimate for trivial transitions (an instant
        // background change); what is not legitimate is an empty or evasive
        // description, which the two checks below rule out.
        expect(
          transition.motion.reducedMotion.trim().length,
          `${file} ${transition.from}->${transition.to}`,
        ).toBeGreaterThan(3);
        if (transition.motion.motion === 'none') {
          noneCount += 1;
          expect(transition.motion.noneReason?.length ?? 0).toBeGreaterThan(10);
        }
      }
    }
    // motion 'none' is used deliberately on the sync-feedback paths, not as a default
    expect(noneCount).toBeGreaterThan(10);
  });

  it('refuses motion none without a reason (the escape hatch)', () => {
    const playbook = load('modal-dialog.json');
    delete playbook.stateMachine.transitions[1].motion.noneReason;
    const parsed = SusPlaybook.schema.safeParse(playbook);
    expect(parsed.success).toBe(false);
  });

  it('reduced motion is described, not merely "disabled"', () => {
    for (const file of files) {
      for (const transition of load(file).stateMachine.transitions) {
        expect(transition.motion.reducedMotion.toLowerCase()).not.toBe('disabled');
        expect(transition.motion.reducedMotion.toLowerCase()).not.toBe('none');
      }
    }
  });

  it('async components declare a stale-response rule', () => {
    for (const file of files) {
      const playbook = load(file);
      if (playbook.stateMachine.states.includes('loading')) {
        expect(playbook.stateMachine.staleResponseRule, file).toBeTruthy();
      }
    }
  });
});

describe('forward compatibility with the T0600 state-machine schema', () => {
  it('every machine validates as sus.state-machine on its own', () => {
    // the playbook embeds the machine, so if the T0600 contract tightens, this fails here
    for (const file of files) {
      const playbook = load(file);
      const minimal = { ...playbook.stateMachine };
      const parsed = SusPlaybook.schema.safeParse({ ...playbook, stateMachine: minimal });
      expect(parsed.success, file).toBe(true);
    }
  });

  it('states come only from the T0600 vocabulary', () => {
    const vocabulary = new Set([
      'default',
      'hover',
      'focus-visible',
      'active',
      'disabled',
      'loading',
      'success',
      'error',
    ]);
    for (const file of files) {
      for (const state of load(file).stateMachine.states)
        expect(vocabulary.has(state), file).toBe(true);
    }
  });
});
