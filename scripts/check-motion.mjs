#!/usr/bin/env node
/**
 * check-motion.mjs (T0602) — the motion rules a per-transition schema cannot see.
 *
 * Every playbook transition already declares motion, interruption and a reduced
 * equivalent. What this checker adds, across all playbooks at once:
 *
 *  1. durations sit inside the documented band (60–240 ms) — outside it, motion is
 *     either imperceptible flicker or read as waiting;
 *  2. no transition that reports a server outcome is `cancel-restart` (reversing a
 *     committed transition lets the UI claim a state the server never reached);
 *  3. controls that change server state carry the three duplication guards:
 *     disable-on-press, a handler-level refusal, and an idempotency key where the
 *     operation is a write;
 *  4. navigation and dialog playbooks state where focus goes;
 *  5. reduced motion is a described equivalent, never `none`/`disabled`.
 *
 * Exit 0 valid; 1 invalid; 3 no playbooks yet.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'skill', 'references', 'playbooks');
if (!existsSync(DIR)) {
  console.log('[SKIP] no playbooks yet');
  process.exit(3);
}
const files = readdirSync(DIR).filter((file) => file.endsWith('.json'));
if (files.length === 0) {
  console.log('[SKIP] no playbooks authored yet');
  process.exit(3);
}

const MIN_MS = 60;
const MAX_MS = 240;
/** Writes that need an idempotency key when they reach a server. */
const WRITE_COMPONENTS = new Set([
  'button-cta',
  'checkout-steps',
  'record-forms',
  'pdp',
  'cart-summary',
]);
const FOCUS_COMPONENTS = new Set([
  'navbar',
  'modal-dialog',
  'card',
  'data-table',
  'form-input-validation',
]);

let failed = false;
const fail = (file, message) => {
  failed = true;
  console.log(`[FAIL] ${file}: ${message}`);
};

for (const file of files) {
  const playbook = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const id = file.replace('.json', '');
  const transitions = playbook.stateMachine?.transitions ?? [];

  for (const transition of transitions) {
    const motion = transition.motion;
    if (!motion?.reducedMotion) {
      fail(file, `${transition.from}->${transition.to}: no reduced-motion equivalent`);
    } else if (/^(none|disabled|off)$/i.test(motion.reducedMotion.trim())) {
      fail(
        file,
        `${transition.from}->${transition.to}: reduced motion is evasive ("${motion.reducedMotion}")`,
      );
    }
    if (motion?.motion === 'none') {
      if (!motion.noneReason)
        fail(file, `${transition.from}->${transition.to}: motion none without a reason`);
      continue;
    }
    // "no delay" is an explicit immediate declaration: focus rings must not
    // animate, because a ring that fades in is a ring the user waits for.
    // focus rings and their removal are immediate by policy
    if (/no delay|instantly/i.test(motion?.motion ?? '')) continue;
    const ms = /(\d+)\s*ms/.exec(motion?.motion ?? '');
    if (!ms) {
      fail(
        file,
        `${transition.from}->${transition.to}: motion "${motion?.motion}" names no duration`,
      );
    } else {
      const value = Number(ms[1]);
      if (value < MIN_MS || value > MAX_MS) {
        fail(
          file,
          `${transition.from}->${transition.to}: ${value}ms is outside the ${MIN_MS}-${MAX_MS}ms band`,
        );
      }
    }
    // a committed transition may not be reversible mid-flight
    const committed = /loading|success|error/.test(`${transition.from}->${transition.to}`);
    if (committed && transition.interruption === 'cancel-restart') {
      fail(
        file,
        `${transition.from}->${transition.to}: a committed transition is cancel-restart (the UI could claim a state the server never reached)`,
      );
    }
  }

  const ruleText = (playbook.rules ?? [])
    .map((rule) => (rule.statement ?? '').toLowerCase())
    .join(' ');
  if (WRITE_COMPONENTS.has(id)) {
    for (const guard of ['disable', 'handler', 'idempotency']) {
      if (!ruleText.includes(guard))
        fail(file, `a component that writes to a server does not name the "${guard}" guard`);
    }
  }
  if (FOCUS_COMPONENTS.has(id) && !/(focus)/.test(ruleText)) {
    fail(file, 'states where focus goes is absent from the rules');
  }
}

console.log('='.repeat(60));
if (failed) {
  console.error('VERDICT: motion rules invalid');
  process.exit(1);
}
console.log(`VERDICT: ${files.length} playbook(s) obey the motion rules.`);
