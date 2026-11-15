/**
 * T0906 — the dogfood evaluator must fail closed and must never publish a path.
 *
 * These tests exist because the failure mode of a "reference implementation"
 * report is flattering: a browser that never launched, or a check that silently
 * skipped, both look like zero violations if the evaluator is careless.
 */
import { describe, expect, it } from 'vitest';
import {
  DOGFOOD_CHECKS,
  evaluateSite,
  findingsFor,
  renderSummary,
  summarise,
} from '../src/index.js';

const allPass = () =>
  DOGFOOD_CHECKS.map((check) => ({ checkId: check.id, status: 'pass' as const, measured: 0 }));

describe('dogfood site evaluation (T0906)', () => {
  it('every check is tied to a rule the skill states', () => {
    expect(DOGFOOD_CHECKS.length).toBeGreaterThanOrEqual(5);
    for (const check of DOGFOOD_CHECKS) {
      expect(check.rule.length).toBeGreaterThanOrEqual(2);
      expect(check.statement.length).toBeGreaterThan(20);
    }
  });

  it('a site passes only when every check ran and passed', () => {
    const report = evaluateSite('marketing', allPass());
    expect(report.status).toBe('pass');
    expect(report.checks).toHaveLength(DOGFOOD_CHECKS.length);
  });

  it('a missing observation is not-run, never pass (fail-closed)', () => {
    const observations = allPass().filter((o) => o.checkId !== 'a11y-wcag-aa');
    const report = evaluateSite('commerce', observations);
    expect(report.status).toBe('fail');
    const missing = report.checks.find((c) => c.id === 'a11y-wcag-aa');
    expect(missing?.status).toBe('not-run');
  });

  it('a failing check carries its rule id into the finding', () => {
    const observations = allPass().map((o) =>
      o.checkId === 'reflow-390'
        ? { ...o, status: 'fail' as const, measured: 412, failures: ['horizontal scroll 412px'] }
        : o,
    );
    const report = evaluateSite('admin', observations);
    expect(report.status).toBe('fail');
    const finding = findingsFor(report).join('\n');
    expect(finding).toContain('reflow-390');
    expect(finding).toContain('412px');
    expect(finding).toContain('search-filters.filters-continuity-across-layout');
  });

  it('an empty run is a failure, not an empty success', () => {
    const summary = summarise([], '2026-11-15T00:00:00.000Z');
    expect(summary.status).toBe('fail');
  });

  it('not-run checks are listed separately so they cannot be read as coverage', () => {
    const summary = summarise(
      [evaluateSite('marketing', allPass()), evaluateSite('commerce', [])],
      '2026-11-15T00:00:00.000Z',
    );
    expect(summary.status).toBe('fail');
    expect(summary.notRun.length).toBe(DOGFOOD_CHECKS.length);
    expect(renderSummary(summary)).toContain('## Not run');
  });

  it('the publishable summary carries no absolute path and no port', () => {
    const summary = summarise([evaluateSite('marketing', allPass())], '2026-11-15T00:00:00.000Z');
    const markdown = renderSummary(summary);
    expect(markdown).not.toMatch(/\/Volumes\//);
    expect(markdown).not.toMatch(/127\.0\.0\.1/);
    expect(markdown).not.toMatch(/localhost/);
    expect(markdown).toContain('private');
  });

  it('a passing summary says so plainly instead of leaving the section empty', () => {
    const markdown = renderSummary(
      summarise([evaluateSite('marketing', allPass())], '2026-11-15T00:00:00.000Z'),
    );
    expect(markdown).toContain('every check ran and passed');
  });
});
