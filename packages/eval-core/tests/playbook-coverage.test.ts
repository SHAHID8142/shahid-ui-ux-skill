/**
 * T1027 (issue #20) — the coverage record must be a measurement, not a claim.
 *
 * The failure this guards against: a manifest that lists 36 playbooks and reads like coverage while
 * 33 of them have no check behind them. These tests hold the record to that distinction: a playbook
 * with no check is `not-run` with named gaps, a check naming a rule no playbook declares is a
 * dangling claim, and a record edited by hand fails against source.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script module without published types.
import { buildCoverage, renderCoverageMarkdown } from '../../../scripts/playbooks/coverage.mjs';

const RECORD = 'evals/playbook-coverage.json';
const DOC = 'docs/PLAYBOOK_COVERAGE.md';
const PLAYBOOK_DIR = 'skill/references/playbooks';

interface Coverage {
  totals: {
    playbooks: number;
    rules: number;
    measuredRules: number;
    gapRules: number;
    unmeasuredPlaybooks: number;
  };
  playbooks: {
    id: string;
    status: string;
    rules: number;
    measuredRules: number;
    gapRules: string[];
    ruleDetail: { id: string; measured: boolean }[];
  }[];
  danglingClaims: { check: string; rule: string }[];
}

const playbookFiles = readdirSync(PLAYBOOK_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(PLAYBOOK_DIR, file), 'utf8')));
const checks = execFileSync(
  process.execPath,
  [
    '-e',
    "import('./packages/eval-core/dist/dogfood.js').then(m=>console.log(JSON.stringify(m.DOGFOOD_CHECKS)))",
  ],
  { encoding: 'utf8' },
).trim();
const dogfoodChecks = JSON.parse(checks);

describe('playbook coverage record', () => {
  const record: Coverage = JSON.parse(readFileSync(RECORD, 'utf8'));

  it('lists every playbook that exists, and only those', () => {
    expect(record.playbooks.map((row) => row.id).sort()).toEqual(
      playbookFiles.map((playbook) => playbook.id).sort(),
    );
    expect(record.totals.playbooks).toBe(playbookFiles.length);
  });

  it('counts a rule as measured only when a check names it', () => {
    for (const row of record.playbooks) {
      const playbook = playbookFiles.find((candidate) => candidate.id === row.id)!;
      for (const rule of row.ruleDetail) {
        const declared = playbook.rules.some(
          (candidate: { id: string }) => candidate.id === rule.id,
        );
        expect(declared).toBe(true);
        const named = dogfoodChecks.some(
          (check: { rule: string }) => check.rule === `${row.id}.${rule.id}`,
        );
        expect(rule.measured).toBe(named);
      }
      expect(row.measuredRules).toBe(row.ruleDetail.filter((rule) => rule.measured).length);
      expect(row.gapRules).toHaveLength(row.rules - row.measuredRules);
    }
  });

  it('matches what the generator renders from source (drift fails the gate)', () => {
    const rendered = buildCoverage(playbookFiles, dogfoodChecks);
    expect(JSON.parse(readFileSync(RECORD, 'utf8'))).toEqual(JSON.parse(JSON.stringify(rendered)));
    expect(readFileSync(DOC, 'utf8')).toBe(renderCoverageMarkdown(rendered));
  });

  it('names an unmeasured playbook as not-run instead of implying coverage', () => {
    const unmeasured = record.playbooks.filter((row) => row.status === 'not-run');
    expect(unmeasured.length).toBeGreaterThan(0);
    for (const row of unmeasured) {
      expect(row.measuredRules).toBe(0);
      expect(row.gapRules).toHaveLength(row.rules);
    }
    expect(record.totals.unmeasuredPlaybooks).toBe(unmeasured.length);
  });

  it('does not claim every playbook is measured', () => {
    // The honest state of this repository: most rules have no check. If that changes, the record
    // may say so — but it must never say "all measured" while gaps exist.
    expect(record.totals.measuredRules).toBeLessThan(record.totals.rules);
    expect(record.totals.gapRules).toBe(record.totals.rules - record.totals.measuredRules);
  });

  it('flags a check that names a rule no playbook declares', () => {
    const withDangling = buildCoverage(playbookFiles, [
      ...dogfoodChecks,
      { id: 'invented', rule: 'no-such-playbook.no-such-rule', statement: 'invented' },
    ]);
    expect(withDangling.danglingClaims).toEqual([
      { check: 'invented', rule: 'no-such-playbook.no-such-rule' },
    ]);
    // And a real check is not reported as dangling.
    const real = buildCoverage(playbookFiles, dogfoodChecks);
    expect(real.danglingClaims).toEqual([]);
  });

  it('does not lend a check to a different rule of the same playbook', () => {
    const tabs = playbookFiles.find((playbook) => playbook.id === 'tabs')!;
    const onlyOtherRule = buildCoverage(
      [tabs],
      [{ id: 'x', rule: 'tabs.not-the-checked-rule', statement: 'x' }],
    );
    const measured = onlyOtherRule.playbooks[0].ruleDetail.filter(
      (rule: { measured: boolean }) => rule.measured,
    );
    expect(measured).toEqual([]);
    expect(onlyOtherRule.playbooks[0].status).toBe('not-run');
    expect(onlyOtherRule.danglingClaims).toEqual([
      { check: 'x', rule: 'tabs.not-the-checked-rule' },
    ]);
  });

  it('does not call a playbook with zero rules measured', () => {
    const empty = buildCoverage(
      [{ id: 'empty', surface: 'read', component: 'empty', rules: [] }],
      dogfoodChecks,
    );
    expect(empty.playbooks[0].status).toBe('not-run');
    expect(empty.playbooks[0].rules).toBe(0);
    expect(empty.playbooks[0].measuredRules).toBe(0);
  });
});
