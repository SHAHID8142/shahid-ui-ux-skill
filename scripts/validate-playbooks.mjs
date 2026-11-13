#!/usr/bin/env node
/**
 * Playbook lint (T0404): validates skill/references/playbooks/*.json against
 * the SusPlaybook contract; rejects duplicate authoritative rules, missing
 * sources, unknown rule references, unordered steps, malformed state
 * machines, and banned content (G3). Exit 0 valid; 1 invalid; 3 no playbooks
 * yet (honest empty state until T0405 authors them).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const { SusPlaybook } = await import(
  join(process.cwd(), 'packages', 'schemas', 'dist', 'index.js')
);

const ROOT = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : process.cwd();
const DIR = join(ROOT, 'skill', 'references', 'playbooks');

if (!existsSync(DIR)) {
  console.log('[NOT-RUN] no playbooks directory yet (T0405 authors them)');
  process.exit(3);
}
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.log('[NOT-RUN] no playbooks authored yet (T0405 authors them)');
  process.exit(3);
}

let failed = false;
for (const f of files) {
  const raw = readFileSync(join(DIR, f), 'utf8');
  const parsed = SusPlaybook.schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    failed = true;
    console.log(
      `[FAIL] ${f}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
    continue;
  }
  const text = raw.toLowerCase();
  if (/lorem ipsum|todo:|fixme:/.test(text)) {
    failed = true;
    console.log(`[FAIL] ${f}: banned content (G3)`);
    continue;
  }
  console.log(`[PASS] ${f} (${parsed.data.rules.length} rules, ${parsed.data.steps.length} steps)`);
}
console.log('='.repeat(60));
if (failed) {
  console.log('VERDICT: playbook lint FAILED');
  process.exit(1);
}
console.log(`VERDICT: ${files.length} playbook(s) valid.`);
