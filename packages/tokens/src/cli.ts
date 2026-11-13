/** sus-tokens CLI: validate | exports <outDir> | gates */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateG1, evaluateG12, generateCss, generateTs, loadTokens } from './pipeline.js';

const REPO_ROOT = join(import.meta.dirname ?? '.', '..', '..', '..');
const TOKENS = join(REPO_ROOT, '.sus', 'tokens.json');
const EXPORTS_DIR = join(REPO_ROOT, 'packages', 'tokens', 'exports');
const command = process.argv[2];

if (command === 'validate') {
  const r = loadTokens(TOKENS);
  console.log(JSON.stringify({ valid: r.valid, detail: r.detail, count: r.tokens.size }, null, 2));
  process.exit(r.valid ? 0 : 2);
}
if (command === 'exports') {
  const r = loadTokens(TOKENS);
  if (!r.valid) {
    console.error(JSON.stringify(r.detail));
    process.exit(2);
  }
  mkdirSync(EXPORTS_DIR, { recursive: true });
  writeFileSync(join(EXPORTS_DIR, 'tokens.css'), generateCss(r.tokens));
  writeFileSync(join(EXPORTS_DIR, 'tokens.ts'), generateTs(r.tokens));
  console.log(`wrote ${EXPORTS_DIR}/tokens.css and tokens.ts (${r.tokens.size} tokens)`);
  process.exit(0);
}
if (command === 'gates') {
  const g1 = evaluateG1(TOKENS);
  const css = existsSync(join(EXPORTS_DIR, 'tokens.css'));
  const ts = existsSync(join(EXPORTS_DIR, 'tokens.ts'));
  const g12 = evaluateG12(
    TOKENS,
    css ? readFileSync(join(EXPORTS_DIR, 'tokens.css'), 'utf8') : null,
    ts ? readFileSync(join(EXPORTS_DIR, 'tokens.ts'), 'utf8') : null,
  );
  console.log(JSON.stringify([g1, g12], null, 2));
  const failed = [g1, g12].some((g) => g.status === 'fail');
  process.exit(failed ? 2 : 0);
}
console.error('usage: sus-tokens validate|exports|gates');
process.exit(3);
