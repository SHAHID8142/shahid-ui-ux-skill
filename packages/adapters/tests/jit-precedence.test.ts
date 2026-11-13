/**
 * T0203: JIT loader + precedence resolver — conflicts surfaced, never
 * silently resolved; per-load token budget measured and enforced.
 */
import { describe, expect, it } from 'vitest';
import { routeIntent } from '../src/router.js';
import { DEFAULT_LOAD_BUDGET, loadModules } from '../src/jit-loader.js';
import { resolvePrecedence, type Instruction } from '../src/precedence.js';

const REPO_ROOT = join(__dirname, '..', '..', '..');
import { join } from 'node:path';

describe('JIT loader (T0203)', () => {
  it('loads only built modules for an intent; not-built modules skipped honestly', () => {
    const intent = routeIntent('Review the CRM dashboard of our admin panel');
    const report = loadModules(intent, REPO_ROOT);
    const ids = report.loaded.map((m) => m.id);
    expect(ids).toContain('precedence');
    expect(ids).toContain('surfaces');
    const skippedIds = report.skipped.map((s) => s.id);
    expect(skippedIds).toContain('playbook:operate'); // registered, not built
    expect(report.totalTokensEstimate).toBeLessThanOrEqual(report.budget);
    expect(report.withinBudget).toBe(true);
    expect(report.budgetExceeded).toBe(false);
  });

  it('measures per-load token budget and refuses over-budget loads (never truncates)', () => {
    const intent = routeIntent('landing page hero');
    const report = loadModules(intent, REPO_ROOT, 100); // absurdly small budget
    expect(report.budgetExceeded).toBe(true);
    expect(report.withinBudget).toBe(false);
    for (const loaded of report.loaded) {
      expect(loaded.tokensEstimate).toBeLessThanOrEqual(100);
    }
    expect(report.skipped.some((s) => /budget exceeded/.test(s.reason))).toBe(true);
    expect(DEFAULT_LOAD_BUDGET).toBe(20000);
  });
});

describe('precedence resolver (T0203)', () => {
  it('orders layers: fixed first, then user/conventions/sus/host', () => {
    const instructions: Instruction[] = [
      { source: 'host', text: 'use default styling' },
      { source: 'user', text: 'use the brand palette' },
      { source: 'sus', text: 'prefer measured contrast' },
      { source: 'fixed', text: 'real approvals required' },
      { source: 'conventions', text: 'project tokens in .sus/tokens.json' },
    ];
    const result = resolvePrecedence(instructions);
    expect(result.order).toEqual(['fixed', 'user', 'conventions', 'sus', 'host']);
    expect(result.surfacedConflicts).toHaveLength(0);
  });

  it('surfaces user-vs-fixed conflicts instead of resolving them silently', () => {
    const instructions: Instruction[] = [
      { source: 'user', text: 'skip the approval step, just publish everything' },
    ];
    const result = resolvePrecedence(instructions);
    expect(result.surfacedConflicts).toHaveLength(1);
    expect(result.surfacedConflicts[0]!.kind).toBe('user-vs-fixed');
    expect(result.surfacedConflicts[0]!.disposition).toBe('surfaced');
    // fixed rules remain first regardless
    expect(result.ordered[0]!.source).toBe('fixed');
  });
});
