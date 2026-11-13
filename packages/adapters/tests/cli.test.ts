/**
 * T0204: CLI invocation fallback smoke — route/load/precedence/capabilities
 * with honest degradation output and correct exit codes.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI = join(__dirname, '..', 'dist', 'cli.js');

function run(args: string[]): { status: number; out: string; err: string } {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' }),
      err: '',
    };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, out: err.stdout ?? '', err: err.stderr ?? '' };
  }
}

describe('sus CLI fallback (T0204)', () => {
  it('capabilities prints the honest degradation matrix', () => {
    const r = run(['capabilities']);
    expect(r.status).toBe(0);
    expect(r.out).toContain('honest degradation');
    expect(r.out).toMatch(/\[cli\] intent-routing/);
    expect(r.out).toMatch(/\[unbuilt\] live-studio/);
    expect(r.out).toContain('direction reasoning is a model capability');
  });

  it('route emits a schema-valid intent JSON', () => {
    const r = run(['route', 'redesign', 'the', 'checkout', 'flow']);
    expect(r.status).toBe(0);
    const intent = JSON.parse(r.out);
    expect(intent.surface).toBe('commerce');
    expect(intent.modules).toContain('progressive-workflow');
  });

  it('route with no surface signal exits 0 but reports open questions', () => {
    const r = run(['route', 'organize my tax documents']);
    expect(r.status).toBe(0);
    const intent = JSON.parse(r.out);
    expect(intent.openQuestions.length).toBeGreaterThan(0);
  });

  it('load reports measured budget and honest skips', () => {
    const r = run(['load', 'review the admin dashboard']);
    const report = JSON.parse(r.out);
    expect(report.totalTokensEstimate).toBeGreaterThan(0);
    expect(report.skipped.some((s: { reason: string }) => s.reason.includes('not built'))).toBe(
      true,
    );
    expect(report.budgetExceeded).toBe(false);
  });

  it('unknown command exits 2 with usage on stderr', () => {
    const r = run(['nonsense']);
    expect(r.status).toBe(2);
    expect(r.err).toContain('usage');
  });
});
