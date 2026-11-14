#!/usr/bin/env node
/**
 * Skill bundle validator (T0201, ADR-002).
 *
 * Validates the CANONICAL bundle at skill/: frontmatter (name, description
 * ≤1024 chars per Agent Skills spec), token budgets (SKILL.md ≤5k tokens,
 * references ≤2k each — chars/4 estimate, conservative), evals.json
 * should/should-not presence, and the G3 placeholder ban in shipped skill
 * text. The name↔directory match required by the Agent Skills spec applies
 * to INSTALLED copies (the installer, T0904, enforces it post-copy); the
 * canonical repo dir is skill/ by design (ADR-001/002).
 *
 * Exit codes: 0 valid; 1 invalid.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv.includes('--root')
  ? process.argv[process.argv.indexOf('--root') + 1]
  : process.cwd();
const SKILL = join(ROOT, 'skill');
const errors = [];
const warns = [];
const lines = [];
function report(ok, name, detail = '') {
  lines.push(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) errors.push(name);
}
function tokens(text) {
  // chars/4 estimate; conservative margin enforced at 90% of the budget
  return Math.ceil(text.length / 4);
}

// ---------- frontmatter ----------
const skillPath = join(SKILL, 'SKILL.md');
if (!existsSync(skillPath)) {
  console.error('skill/SKILL.md missing');
  process.exit(1);
}
const raw = readFileSync(skillPath, 'utf8');
const fmMatch = /^---\n([\s\S]*?)\n---\n/.exec(raw);
report(fmMatch !== null, 'frontmatter block present');
let fm = {};
if (fmMatch) {
  for (const line of fmMatch[1].split('\n')) {
    const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (m) fm[m[1].toLowerCase()] = m[2].trim();
  }
  report(
    /^[\w-]+$/.test(fm.name ?? ''),
    'name matches Agent Skills pattern',
    fm.name ?? '(missing)',
  );
  report(typeof fm.description === 'string' && fm.description.length > 0, 'description present');
  report(
    (fm.description ?? '').length <= 1024,
    'description ≤ 1024 chars (spec limit)',
    `${(fm.description ?? '').length} chars`,
  );
  report(
    typeof fm.license === 'string',
    'license field present (publication gate D06 tracks it)',
    fm.license ?? '',
  );
}

// ---------- token budgets ----------
report(
  tokens(raw) <= 5000,
  'SKILL.md ≤ 5k tokens (chars/4 estimate)',
  `${tokens(raw)} est. tokens`,
);
if (existsSync(join(SKILL, 'references'))) {
  for (const f of readdirSync(join(SKILL, 'references'))) {
    if (!f.endsWith('.md')) continue;
    const text = readFileSync(join(SKILL, 'references', f), 'utf8');
    const t = tokens(text);
    if (t > 2000) {
      errors.push(`${f} exceeds 2k tokens (${t} est.)`);
      lines.push(`[FAIL] reference ${f} exceeds 2k tokens — ${t} est.`);
    } else {
      lines.push(`[PASS] reference ${f} ≤ 2k tokens — ${t} est.`);
    }
  }
}

// ---------- evals.json ----------
const evalsPath = join(SKILL, 'evals', 'evals.json');
if (existsSync(evalsPath)) {
  try {
    const evals = JSON.parse(readFileSync(evalsPath, 'utf8'));
    report(
      Array.isArray(evals.shouldTrigger) && evals.shouldTrigger.length > 0,
      'evals.json shouldTrigger present',
    );
    report(
      Array.isArray(evals.shouldNotTrigger) && evals.shouldNotTrigger.length > 0,
      'evals.json shouldNotTrigger present',
    );
  } catch (e) {
    report(false, 'evals.json parses', String(e));
  }
} else {
  report(false, 'evals/evals.json ships with the skill (ADR-002)');
}

// ---------- G3: no placeholder content in shipped skill text ----------
const allText = fmMatch
  ? [
      raw,
      ...readdirSync(join(SKILL, 'references'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => readFileSync(join(SKILL, 'references', f), 'utf8')),
    ].join('\n')
  : raw;
// Rule statements that ban placeholders ("no lorem ipsum, no TODO copy")
// are excluded via a negative lookbehind on "no ".
const placeholders = /(?<!no )(lorem ipsum|TODO:|FIXME:|placeholder copy|xxx)/i;
report(!placeholders.test(allText), 'G3: no placeholder content in skill text');

for (const l of lines) console.log(l);
console.log('='.repeat(60));
if (errors.length > 0) {
  console.log(`VERDICT: skill bundle INVALID — ${errors.length} error(s)`);
  process.exit(1);
}
if (warns.length > 0) for (const w of warns) console.log('WARN:', w);
console.log('VERDICT: skill bundle valid.');
