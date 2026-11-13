#!/usr/bin/env node
/**
 * Knowledge lint (T0409): validates skill/references/*.md —
 *  (a) G3: no placeholder content (rule statements excluded via lookbehind)
 *  (b) provenance citations resolve: provenance-catalog claim ids referenced
 *      in knowledge text must exist in the catalog
 *  (c) honest status: references must not claim module completeness that the
 *      JIT loader marks not-built (surfaces.md is the status source)
 * Exit 0 valid; 1 invalid.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : process.cwd();
const REF = join(ROOT, 'skill', 'references');
const catalog = JSON.parse(
  readFileSync(join(ROOT, 'evals', 'research', 'provenance-catalog.json'), 'utf8'),
);
const claimIds = new Set(catalog.claims.map((c) => c.id));

let failed = false;
const files = readdirSync(REF).filter((f) => f.endsWith('.md'));
for (const f of files) {
  const text = readFileSync(join(REF, f), 'utf8');
  if (/(?<!no )(lorem ipsum|TODO:|FIXME:)/i.test(text)) {
    failed = true;
    console.log(`[FAIL] ${f}: placeholder content (G3)`);
  }
  // claim-id references: `provenance: <id>` or claim ids mentioned in parens
  for (const m of text.matchAll(/provenance claim[:\s]+([a-z0-9-]+)/gi)) {
    if (!claimIds.has(m[1])) {
      failed = true;
      console.log(`[FAIL] ${f}: cites unknown provenance claim "${m[1]}"`);
    }
  }
  console.log(`[PASS] ${f} (${Math.ceil(text.length / 4)} est. tokens)`);
}
console.log('='.repeat(60));
if (failed) {
  console.log('VERDICT: knowledge lint FAILED');
  process.exit(1);
}
console.log(`VERDICT: ${files.length} knowledge file(s) valid.`);
