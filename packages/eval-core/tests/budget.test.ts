/**
 * T0156: budget CLI — p50/p95 + advisory flagging. Budget targets are
 * PROPOSED to the owner; the CLI never adopts one silently (absent --budget
 * reports not-set) and exceeding sections are flagged, never rejected.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI = join(__dirname, '..', 'dist', 'cli.js');

function run(usage: unknown, budget?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 't0156-'));
  const file = join(dir, 'usage.json');
  writeFileSync(file, JSON.stringify(usage));
  const args = [CLI, 'budget', '--in', file];
  if (budget) args.push('--budget', budget);
  return execFileSync(process.execPath, args, { encoding: 'utf8' });
}

describe('token/cost budget CLI (T0156)', () => {
  const usage = [
    { id: 'a', tokens: 665 },
    { id: 'b', tokens: 949 },
    { id: 'c', tokens: 1009 },
    { id: 'd', tokens: 916 },
  ];

  it('records p50/p95 over baseline sections', () => {
    const out = JSON.parse(run(usage, '30000'));
    expect(out.p50).toBe(949);
    expect(out.p95).toBe(1009);
    expect(out.n).toBe(4);
    expect(out.flaggedOverBudget).toEqual([]);
    expect(out.budgetStatus).toBe('advisory');
  });

  it('flags sections over the budget target without failing', () => {
    const out = JSON.parse(run([...usage, { id: 'huge', tokens: 45000 }], '30000'));
    expect(out.flaggedOverBudget).toEqual(['huge']);
    // advisory: exit code stays 0 — flags inform, never gate silently
  });

  it('without a target, reports not-set (owner decision, never silent adoption)', () => {
    const out = JSON.parse(run(usage));
    expect(out.budgetTarget).toBeNull();
    expect(out.budgetStatus).toMatch(/proposed to the owner/);
  });
});
