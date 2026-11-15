#!/usr/bin/env node
/**
 * check-direction.mjs (T0400) — validate direction derivation records.
 *
 * Every `evals/directions/*.json` must satisfy the schema *and* the semantic
 * obligations: three real candidates, the chosen one refusing at least one
 * blocking default, no duplicated thesis, every rejection explained, and
 * project-level anti-references that are not copies of a candidate's list.
 *
 * Exit 0 valid; 1 invalid; 3 no records yet (so the gate does not pretend).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkDerivation } from '../packages/schemas/dist/direction.js';

const ROOT = process.cwd();
const dir = join(ROOT, 'evals', 'directions');
if (!existsSync(dir)) {
  console.log('[SKIP] no evals/directions/ yet');
  process.exit(3);
}

const files = readdirSync(dir).filter((file) => file.endsWith('.json'));
if (files.length === 0) {
  console.log('[SKIP] no direction derivation records yet');
  process.exit(3);
}

let failed = false;
for (const file of files) {
  const record = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const result = checkDerivation(record);
  if (result.ok) {
    console.log(
      `[PASS] ${file}: 3 candidates, chosen ${result.record.decision.chosen} defends a blocking default`,
    );
  } else {
    failed = true;
    for (const violation of result.violations) {
      console.log(`[FAIL] ${file}: ${violation.code}: ${violation.detail}`);
    }
  }
}
console.log('='.repeat(60));
if (failed) {
  console.error('VERDICT: direction records invalid');
  process.exit(1);
}
console.log(`VERDICT: ${files.length} direction record(s) valid.`);
