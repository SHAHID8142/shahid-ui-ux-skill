#!/usr/bin/env node
/**
 * check-playbook-parts.mjs (T0405b) — the PRD §6 twelve-part standard, enforced.
 *
 * The gap this closes is the quiet one: a playbook can pass the schema with rules
 * and steps while saying nothing about accessibility, responsive behaviour or
 * failure cases. "Same 12-part standard" is only true if something counts the
 * parts, so this does — and names the missing ones by PRD number.
 *
 * Parts 5 (variants vs states) and 6 (motion + reduced alternative) are satisfied
 * by the state machine; everything else has its own field.
 *
 * Exit 0 valid; 1 invalid; 3 no playbooks yet.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

/**
 * PRD §6 parts → the field that satisfies each. A part is missing when its field
 * is absent, empty, or (for 5/6) when the machines carry no motion decision.
 */
const PARTS = [
  {
    part: 1,
    name: 'intent and use cases',
    test: (p) => Boolean(p.sections?.intent) && (p.sections?.useCases?.length ?? 0) > 0,
  },
  { part: 2, name: 'inputs', test: (p) => (p.sections?.inputs?.length ?? 0) >= 2 },
  { part: 3, name: 'anatomy and semantics', test: (p) => (p.sections?.anatomy?.length ?? 0) > 0 },
  { part: 4, name: 'visual styling', test: (p) => (p.sections?.styling?.length ?? 0) > 0 },
  {
    part: 5,
    name: 'variants versus states and transitions',
    test: (p) =>
      (p.stateMachine?.variants?.length ?? 0) > 0 &&
      (p.stateMachine?.transitions?.length ?? 0) > 0 &&
      (p.variantMatrix?.length ?? 0) > 0,
  },
  {
    part: 6,
    name: 'motion specification plus reduced-motion alternative',
    test: (p) => (p.stateMachine?.transitions ?? []).every((t) => Boolean(t.motion?.reducedMotion)),
  },
  {
    part: 7,
    name: 'accessibility and keyboard/touch behaviour',
    test: (p) => (p.sections?.a11y?.length ?? 0) > 0,
  },
  {
    part: 8,
    name: 'responsive adaptations and edge cases',
    test: (p) => (p.sections?.responsive?.length ?? 0) > 0,
  },
  {
    part: 9,
    name: 'copy/content and SEO where applicable',
    test: (p) => Array.isArray(p.sections?.copy),
  },
  {
    part: 10,
    name: 'alternatives, anti-patterns and contraindications',
    test: (p) => (p.sections?.alternatives?.length ?? 0) > 0,
  },
  {
    part: 11,
    name: 'research references with dates and evidence grades',
    test: (p) => (p.sections?.references ?? []).every((r) => r.label && r.date && r.grade),
  },
  {
    part: 12,
    name: 'acceptance tests and failure cases',
    test: (p) =>
      (p.sections?.acceptance?.length ?? 0) > 0 && (p.sections?.failureCases?.length ?? 0) > 0,
  },
];

let failed = false;
for (const file of files) {
  const playbook = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const missing = PARTS.filter((entry) => !entry.test(playbook)).map(
    (entry) => `part ${entry.part} (${entry.name})`,
  );
  if (missing.length > 0) {
    failed = true;
    console.log(`[FAIL] ${file}: missing ${missing.join('; ')}`);
  } else {
    const references = playbook.sections.references.length;
    console.log(
      `[PASS] ${file}: 12/12 parts (${references} graded reference(s), ${playbook.sections.failureCases.length} failure case(s))`,
    );
  }
}

console.log('='.repeat(60));
if (failed) {
  console.error('VERDICT: playbook parts incomplete');
  process.exit(1);
}
console.log(`VERDICT: ${files.length} playbook(s) carry all 12 parts.`);
