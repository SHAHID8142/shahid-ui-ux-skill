#!/usr/bin/env node
/**
 * coverage.mjs (T1027, issue #20) — a machine-readable account of which playbooks are exercised.
 *
 * The risk this exists to avoid: 36 playbooks validate as JSON, `pnpm dogfood` passes its 15 checks,
 * and the difference between "the schema is complete" and "the behaviour was measured" quietly
 * disappears. So the record is generated from two sources and nothing else:
 *
 *   - each `skill/references/playbooks/*.json` (id, surface, component, rules, states, variants);
 *   - `DOGFOOD_CHECKS` from the built eval-core (each check names the playbook rule it makes
 *     checkable, as `<playbook>.<rule>` or a gate id).
 *
 * A playbook rule with no check is a **named gap**, and a check that names a playbook rule that no
 * playbook declares is a **dangling claim** (the failure mode a hand-written manifest has). Measuring
 * more playbooks later only changes this record if a check actually names their rules.
 *
 * Usage: node scripts/playbooks/coverage.mjs [--write|--check]
 *   --write  regenerate evals/playbook-coverage.json and docs/PLAYBOOK_COVERAGE.md
 *   --check  re-render from source and fail if either file drifted (no browser, no audit)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOGFOOD_CHECKS } from '../../packages/eval-core/dist/dogfood.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAYBOOK_DIR = join(ROOT, 'skill', 'references', 'playbooks');
const RECORD = join(ROOT, 'evals', 'playbook-coverage.json');
const DOC = join(ROOT, 'docs', 'PLAYBOOK_COVERAGE.md');

/** Suites that can produce evidence for a playbook rule, in the order they are cited. */
const EVIDENCE_SOURCES = [
  {
    kind: 'dogfood',
    path: 'packages/eval-core/src/dogfood.ts',
    suite: 'pnpm dogfood',
    what: 'three reference sites, browser-measured',
  },
  {
    kind: 'bestpractice-examples',
    path: 'evals/bestpractice/examples.json',
    suite: 'pnpm examples:check',
    what: 'five scoped examples, deep audit before/after',
  },
];

function readPlaybooks() {
  return readdirSync(PLAYBOOK_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(PLAYBOOK_DIR, file), 'utf8')));
}

/**
 * Build the record. Pure: takes the playbooks and checks it is given, so a test can feed it a
 * playbook with no checks and prove the gap is named rather than assumed.
 */
export function buildCoverage(playbooks, checks) {
  const byRule = new Map();
  for (const check of checks) {
    const list = byRule.get(check.rule) ?? [];
    list.push(check);
    byRule.set(check.rule, list);
  }
  const declaredRules = new Set();
  const rows = playbooks.map((playbook) => {
    const rules = (playbook.rules ?? []).map((rule) => {
      const key = `${playbook.id}.${rule.id}`;
      declaredRules.add(key);
      const evidence = (byRule.get(key) ?? []).map((check) => ({
        check: check.id,
        statement: check.statement,
        suite: 'dogfood',
      }));
      return { id: rule.id, measured: evidence.length > 0, evidence };
    });
    const measured = rules.filter((rule) => rule.measured).length;
    return {
      id: playbook.id,
      surface: playbook.surface ?? null,
      component: playbook.component ?? null,
      rules: rules.length,
      measuredRules: measured,
      gapRules: rules.filter((rule) => !rule.measured).map((rule) => rule.id),
      /** `partial` means some rules have a check; no playbook here is fully measured. */
      status: measured === 0 ? 'not-run' : measured === rules.length ? 'measured' : 'partial',
      ruleDetail: rules,
    };
  });

  const dangling = checks
    .filter((check) => check.rule.includes('.'))
    .filter((check) => !declaredRules.has(check.rule))
    .map((check) => ({ check: check.id, rule: check.rule }));

  const totals = rows.reduce(
    (acc, row) => ({
      playbooks: acc.playbooks + 1,
      rules: acc.rules + row.rules,
      measuredRules: acc.measuredRules + row.measuredRules,
    }),
    { playbooks: 0, rules: 0, measuredRules: 0 },
  );

  return {
    schema: 'sus.playbook-coverage/1',
    generatedFrom: {
      playbooks: 'skill/references/playbooks/*.json',
      checks: 'packages/eval-core/src/dogfood.ts (DOGFOOD_CHECKS)',
    },
    note: 'Schema-valid playbooks are not behaviour-tested playbooks. A rule counts as measured only when a check names it; everything else is a named gap, not an implied pass.',
    totals: {
      ...totals,
      gapRules: totals.rules - totals.measuredRules,
      unmeasuredPlaybooks: rows.filter((row) => row.status === 'not-run').length,
    },
    evidenceSources: EVIDENCE_SOURCES,
    danglingClaims: dangling,
    playbooks: rows,
  };
}

export function renderCoverageMarkdown(record) {
  const lines = [
    '# Playbook coverage — what is measured, what is not',
    '',
    '> Generated from `skill/references/playbooks/*.json` and `DOGFOOD_CHECKS` by',
    '> `scripts/playbooks/coverage.mjs`. Do not edit by hand; `pnpm coverage:check` fails when this',
    '> page and `evals/playbook-coverage.json` drift from source.',
    '',
    `**${record.totals.playbooks}** playbooks, **${record.totals.rules}** rules,`,
    `**${record.totals.measuredRules}** rules with a check, **${record.totals.gapRules}** named gaps;`,
    `**${record.totals.unmeasuredPlaybooks}** playbooks have no check at all.`,
    '',
    'A rule is measured only when a check names it (`<playbook>.<rule>`). JSON validity, prose',
    'acceptance and "looks right in a screenshot" are not measurements and are not counted here.',
    '',
    '| Playbook | Surface | Rules | Measured | Status | Gaps |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of record.playbooks) {
    const gaps = row.gapRules.length === 0 ? '—' : row.gapRules.map((id) => `\`${id}\``).join(', ');
    lines.push(
      `| \`${row.id}\` | ${row.surface ?? '—'} | ${row.rules} | ${row.measuredRules} | ${row.status} | ${gaps} |`,
    );
  }
  if (record.danglingClaims.length > 0) {
    lines.push('', '## Dangling claims (a check names a rule no playbook declares)', '');
    for (const claim of record.danglingClaims) {
      lines.push(`- \`${claim.check}\` → \`${claim.rule}\``);
    }
  }
  lines.push(
    '',
    '## What this record is not',
    '',
    '- Not a claim that a measured rule is satisfied in an adopting project: the checks run against',
    "  the repository fixtures, not the user's page.",
    '- Not evidence of screen-reader behaviour, real browser zoom or RTL: those stay `not-run` and',
    '  belong to the owner/auditor per T1003.',
    '- Not exhaustive: a rule with no check is listed as a gap rather than argued away.',
    '',
  );
  return lines.join('\n');
}

function stableJson(text) {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
}

function main(argv) {
  const write = argv.includes('--write');
  const check = argv.includes('--check') || !write;
  const record = buildCoverage(readPlaybooks(), DOGFOOD_CHECKS);
  const json = `${JSON.stringify(record, null, 2)}\n`;
  const markdown = renderCoverageMarkdown(record);

  if (write) {
    writeFileSync(RECORD, json);
    writeFileSync(DOC, markdown);
    console.log(`[WROTE] evals/playbook-coverage.json and docs/PLAYBOOK_COVERAGE.md`);
    console.log(
      `VERDICT: ${record.totals.playbooks} playbooks, ${record.totals.measuredRules}/${record.totals.rules} rules measured, ${record.totals.gapRules} gaps named.`,
    );
    return 0;
  }
  if (!check) return 0;

  const problems = [];
  if (!existsSync(RECORD)) problems.push(`${RECORD} is missing`);
  // Compared by value, not by bytes: prettier owns the file's formatting, the generator owns its
  // content, and a formatting difference must not read as drift.
  else if (stableJson(readFileSync(RECORD, 'utf8')) !== stableJson(json))
    problems.push('evals/playbook-coverage.json drifted from source');
  if (!existsSync(DOC)) problems.push(`${DOC} is missing`);
  else if (readFileSync(DOC, 'utf8') !== markdown)
    problems.push('docs/PLAYBOOK_COVERAGE.md drifted from source');
  if (record.danglingClaims.length > 0) {
    problems.push(
      'dangling claims: ' +
        record.danglingClaims.map((claim) => `${claim.check}→${claim.rule}`).join(', '),
    );
  }
  if (problems.length > 0) {
    for (const problem of problems) console.log(`[FAIL] ${problem}`);
    console.log('Fix: node scripts/playbooks/coverage.mjs --write (then review the diff).');
    console.log('VERDICT: playbook coverage record is inconsistent.');
    return 1;
  }
  console.log(
    `VERDICT: coverage record matches source (${record.totals.playbooks} playbooks, ${record.totals.measuredRules}/${record.totals.rules} rules measured, ${record.totals.gapRules} gaps named).`,
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('coverage.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
