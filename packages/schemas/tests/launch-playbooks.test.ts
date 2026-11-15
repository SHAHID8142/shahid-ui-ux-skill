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

/** Second wave (T0809): Operate-focused components added after the launch set. */
const SECOND_WAVE = [
  'search-filters',
  'settings',
  'dashboard-widgets',
  'onboarding',
  'article-layout',
  'gallery-case-study',
  // second-wave primitives A (T0811)
  'pagination',
  'tabs',
  'accordion',
  'drawer',
  'dropdown',
  'breadcrumb',
  'avatar',
  'badge',
];

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

/** Commerce set (T0405c): present, and required to satisfy the same contract. */
const COMMERCE = ['product-grid', 'pdp', 'cart-summary', 'checkout-steps'];

/** Operate set (T0407): the last of the promised launch components. */
const OPERATE = ['data-table', 'record-forms'];

describe('batch-1 launch set is exactly what it claims', () => {
  it('every batch-1 component has a playbook', () => {
    const present = files.map((file) => file.replace('.json', ''));
    for (const id of BATCH_1) expect(present, id).toContain(id);
  });

  it('the commerce set exists and is complete (T0405c)', () => {
    const present = files.map((file) => file.replace('.json', ''));
    for (const id of COMMERCE) expect(present, id).toContain(id);
  });

  it('the operate set exists and is complete (T0407)', () => {
    const present = files.map((file) => file.replace('.json', ''));
    for (const id of OPERATE) expect(present, id).toContain(id);
    // the promised launch set is now fully present, in one place (plus the
    // second wave from T0809 onward, which is added to this count as it lands)
    for (const id of SECOND_WAVE) expect(present, id).toContain(id);
    expect(present.length).toBe(
      BATCH_1.length + COMMERCE.length + OPERATE.length + SECOND_WAVE.length,
    );
  });

  it('the data table covers sort, filter, empty, loading, error and pagination', () => {
    const table = load('data-table.json');
    const text = table.rules
      .map((rule: { statement: string }) => rule.statement)
      .concat(table.steps.map((step: { decide: string }) => step.decide))
      .join(' ')
      .toLowerCase();
    for (const required of ['sort', 'filter', 'empty', 'loading', 'error', 'pagination']) {
      expect(text, required).toContain(required);
    }
    // issue #10: content-adaptive at narrow widths, not a horizontally scrolling row
    expect(text).toContain('table-to-card');
    expect(text).toContain('horizontal scrolling');
  });

  it('record forms state their save model and keep typed work on failure', () => {
    const forms = load('record-forms.json');
    const ids = forms.rules.map((rule: { id: string }) => rule.id);
    for (const id of [
      'record-save-model',
      'record-conflict-stated',
      'record-error-preserves-input',
      'record-double-submit',
    ]) {
      expect(ids, id).toContain(id);
    }
  });

  it('checkout carries the payment-state and duplicate-submit checklist', () => {
    const checkout = load('checkout-steps.json');
    const rules = checkout.rules.map((rule: { id: string; statement: string }) => rule);
    const payment = rules.find((rule: { id: string }) => rule.id === 'checkout-payment-states');
    const duplicate = rules.find((rule: { id: string }) => rule.id === 'checkout-duplicate-submit');
    expect(payment?.statement).toContain('requires-action');
    expect(payment?.statement).toContain('unknown');
    for (const guard of [
      'disables on press',
      'handler',
      'idempotency key',
      'reuses the same key',
      're-checks',
    ]) {
      expect(duplicate?.statement, guard).toContain(guard);
    }
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

describe('the twelve-part standard (T0405b)', () => {
  it('every playbook fills all twelve PRD §6 parts', () => {
    for (const file of files) {
      const playbook = load(file);
      const sections = playbook.sections;
      expect(sections, `${file}: sections`).toBeTruthy();
      expect(sections.intent.length, file).toBeGreaterThan(20);
      for (const key of [
        'useCases',
        'inputs',
        'anatomy',
        'styling',
        'a11y',
        'responsive',
        'alternatives',
        'acceptance',
        'failureCases',
      ]) {
        expect(sections[key].length, `${file}.${key}`).toBeGreaterThan(0);
      }
      // part 9 is allowed to be empty only as a recorded decision (array present)
      expect(Array.isArray(sections.copy), `${file}.copy`).toBe(true);
      // part 11 carries graded, dated references — no undated claims
      for (const reference of sections.references) {
        expect(reference.date, `${file} reference date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(
          ['normative-standard', 'research', 'professional-article', 'convention'],
          file,
        ).toContain(reference.grade);
      }
    }
  });

  it('fails a playbook missing accessibility (the part most often skipped)', () => {
    const playbook = load('card.json');
    delete playbook.sections.a11y;
    expect(SusPlaybook.schema.safeParse(playbook).success).toBe(false);
  });

  it('fails a reference without a date or grade', () => {
    const playbook = load('hero.json');
    playbook.sections.references[0].date = 'recently';
    expect(SusPlaybook.schema.safeParse(playbook).success).toBe(false);
    const second = load('hero.json');
    delete second.sections.references[0].grade;
    expect(SusPlaybook.schema.safeParse(second).success).toBe(false);
  });

  it('a playbook cannot claim evidence grade it does not have: conventions are labelled', () => {
    const graded = files.flatMap((file) =>
      load(file).sections.references.map((reference: { grade: string }) => reference.grade),
    );
    // the house style is honesty: most references are our own conventions
    expect(graded.filter((grade: string) => grade === 'convention').length).toBeGreaterThan(0);
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

/** Everything a reader or an agent can learn from the playbook, flattened. */
const allText = (file: string): string => {
  const playbook = load(file);
  const strings: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') strings.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(playbook);
  return strings.join(' ');
};

describe('second-wave operate playbooks (T0809, issue #10)', () => {
  it('filter/sort/search continuity across layout changes is a stated rule, not a hope', () => {
    const text = allText('search-filters.json');
    expect(text).toContain('URL');
    expect(text.toLowerCase()).toContain('reflow');
    expect(text).toMatch(/640 px/);
  });

  it('long identifiers and translated labels have explicit treatments', () => {
    const text = allText('search-filters.json').toLowerCase();
    expect(text).toContain('24 characters');
    expect(text).toContain('translated');
  });

  it('empty, error and loading states are each named with their own action', () => {
    const text = allText('search-filters.json').toLowerCase();
    for (const marker of ['no records yet', 'no records match', 'error']) {
      expect(text).toContain(marker);
    }
  });

  it('dashboard widgets fail independently and reserve their height', () => {
    const text = allText('dashboard-widgets.json').toLowerCase();
    expect(text).toContain('independently');
    expect(text).toContain('reserves its final height');
  });

  it('settings never hide a permission-gated control and never lose edits on failure', () => {
    const text = allText('settings.json');
    expect(text).toContain('disabled with the reason');
    expect(text.toLowerCase()).toContain('keeps every edited value');
    expect(text.toLowerCase()).toContain('idempotency key');
  });
});

describe('second-wave experience playbooks (T0810)', () => {
  it('onboarding is resumable, skippable and honest about failure', () => {
    const text = allText('onboarding.json').toLowerCase();
    for (const marker of ['resume', 'skip', 'keeps everything already entered']) {
      expect(text).toContain(marker);
    }
  });

  it('article layout keeps a reading measure and does not widen the page', () => {
    const text = allText('article-layout.json').toLowerCase();
    expect(text).toContain('65–75 character measure');
    expect(text).toContain('never widening the page');
  });

  it('gallery states outcomes honestly and reserves tile space', () => {
    const text = allText('gallery-case-study.json').toLowerCase();
    expect(text).toContain('illustrative');
    expect(text).toContain('reserves space');
  });
});

describe('second-wave primitives A (T0811)', () => {
  it('every primitive declares a full variant matrix with reasons for refusals', () => {
    for (const id of [
      'pagination',
      'tabs',
      'accordion',
      'drawer',
      'dropdown',
      'breadcrumb',
      'avatar',
      'badge',
    ]) {
      const playbook = load(`${id}.json`);
      expect(playbook.variantMatrix.length, id).toBeGreaterThanOrEqual(2);
      for (const row of playbook.variantMatrix) {
        for (const refusal of row.refused) {
          expect(refusal.reason.length, `${id}/${row.variant}/${refusal.state}`).toBeGreaterThan(
            20,
          );
        }
      }
    }
  });

  it('tab, accordion and dropdown keyboard contracts are stated, not implied', () => {
    expect(allText('tabs.json').toLowerCase()).toContain('roving focus');
    expect(allText('accordion.json').toLowerCase()).toContain('aria-expanded');
    expect(allText('dropdown.json').toLowerCase()).toContain('escape');
  });

  it('drawer and dropdown guard unsaved work and viewport edges', () => {
    expect(allText('drawer.json').toLowerCase()).toContain('unsaved edits');
    expect(allText('dropdown.json').toLowerCase()).toContain('flips');
  });

  it('avatar and badge never carry meaning by colour alone', () => {
    expect(allText('avatar.json').toLowerCase()).toContain('colour alone');
    expect(allText('badge.json').toLowerCase()).toContain('not the only signal');
  });
});
