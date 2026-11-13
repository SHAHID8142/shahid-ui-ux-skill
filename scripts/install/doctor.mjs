#!/usr/bin/env node
/**
 * Installed-bundle doctor (T0904).
 *
 * Validates an INSTALLED skill directory. Standalone by design: the rules of
 * the canonical validator (scripts/validate-skill.mjs) are re-implemented
 * here WITHOUT importing the repository, so an installed copy can be checked
 * anywhere the repo is not present. The check that only makes sense on an
 * installed bundle is the Agent Skills spec rule that the directory name
 * matches the SKILL.md frontmatter `name` — the canonical repo directory
 * (skill/) is exempt from it by design (ADR-001/002).
 *
 * Checks: directory name ↔ frontmatter name; frontmatter name pattern;
 * description ≤ 1024 chars (spec limit); SKILL.md ≤ 5k estimated tokens
 * (chars/4, conservative); each references/*.md ≤ 2k estimated tokens;
 * evals/evals.json exists with shouldTrigger/shouldNotTrigger arrays; and
 * the G3 placeholder ban with a negative lookbehind on "no " so rule
 * statements that ban placeholders do not self-trip.
 *
 * Usage: node scripts/install/doctor.mjs --dir <installed-skill-dir>
 * Exit codes: 0 valid; 1 invalid; 2 invalid usage.
 *
 * Difference from the canonical validator: an over-budget references file is
 * reported as a [FAIL] line (the canonical validator only counts the error
 * into its verdict while still printing [PASS]).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const NAME_PATTERN = /^[\w-]+$/;
const USAGE = 'usage: node scripts/install/doctor.mjs --dir <installed-skill-dir>';

const argv = process.argv.slice(2);
if (argv[0] !== '--dir' || !argv[1] || argv.length > 2) {
  console.error(USAGE);
  process.exit(2);
}
const dir = resolve(argv[1]);

const errors = [];
const lines = [];
function report(ok, name, detail = '') {
  lines.push(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) errors.push(name);
}
function tokens(text) {
  // chars/4 estimate; conservative margin, same rule as the canonical validator
  return Math.ceil(text.length / 4);
}
function flushAndExitInvalid() {
  for (const l of lines) console.log(l);
  console.log('='.repeat(60));
  console.log(`VERDICT: installed bundle INVALID — ${errors.length} error(s)`);
  process.exit(1);
}

report(existsSync(dir), 'installed directory exists', dir);
if (!existsSync(dir)) flushAndExitInvalid();

const skillPath = join(dir, 'SKILL.md');
report(existsSync(skillPath), 'SKILL.md present');
if (!existsSync(skillPath)) flushAndExitInvalid();

// ---------- frontmatter ----------
const raw = readFileSync(skillPath, 'utf8');
const fmMatch = /^---\n([\s\S]*?)\n---\n/.exec(raw);
report(fmMatch !== null, 'frontmatter block present');
let fm = {};
if (fmMatch) {
  for (const line of fmMatch[1].split('\n')) {
    const kv = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1].toLowerCase()] = kv[2].trim();
  }
}
report(NAME_PATTERN.test(fm.name ?? ''), 'name matches Agent Skills pattern', fm.name ?? '(missing)');
report(
  typeof fm.name === 'string' && basename(dir) === fm.name,
  'directory name matches frontmatter name (Agent Skills spec)',
  `dir: ${basename(dir)} / frontmatter: ${fm.name ?? '(missing)'}`,
);
report(typeof fm.description === 'string' && fm.description.length > 0, 'description present');
report(
  (fm.description ?? '').length <= 1024,
  'description ≤ 1024 chars (spec limit)',
  `${(fm.description ?? '').length} chars`,
);

// ---------- token budgets ----------
report(
  tokens(raw) <= 5000,
  'SKILL.md ≤ 5k tokens (chars/4 estimate)',
  `${tokens(raw)} est. tokens`,
);
const refsDir = join(dir, 'references');
const refFiles =
  existsSync(refsDir) && statSync(refsDir).isDirectory()
    ? readdirSync(refsDir).filter((f) => f.endsWith('.md'))
    : [];
for (const f of refFiles) {
  const t = tokens(readFileSync(join(refsDir, f), 'utf8'));
  report(t <= 2000, `reference ${f} ≤ 2k tokens (chars/4 estimate)`, `${t} est.`);
}

// ---------- evals.json ----------
const evalsPath = join(dir, 'evals', 'evals.json');
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
const allText = [raw, ...refFiles.map((f) => readFileSync(join(refsDir, f), 'utf8'))].join('\n');
// Rule statements that ban placeholders ("no lorem ipsum, no TODO copy")
// are excluded via a negative lookbehind on "no ".
const placeholders = /(?<!no )(lorem ipsum|TODO:|FIXME:|placeholder copy|xxx)/i;
report(!placeholders.test(allText), 'G3: no placeholder content in skill text');

for (const l of lines) console.log(l);
console.log('='.repeat(60));
if (errors.length > 0) {
  console.log(`VERDICT: installed bundle INVALID — ${errors.length} error(s)`);
  process.exit(1);
}
console.log('VERDICT: installed bundle valid.');
