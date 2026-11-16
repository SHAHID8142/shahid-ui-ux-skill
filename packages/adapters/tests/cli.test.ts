/**
 * T0204: CLI invocation fallback smoke — route/load/precedence/capabilities
 * with honest degradation output and correct exit codes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
    expect(r.out).toMatch(/\[cli\] live-studio/);
    expect(r.out).toMatch(/\[cli\] anti-slop-scanning/);
    expect(r.out).toContain('sus-scan');
    expect(r.out).toContain('Deriving a thesis for a new brief is model work');
  });

  it('capabilities names the real audit entry point and admits no slash binding', () => {
    // Issue #13 deliverable 7: the matrix must not imply `/sus audit` is a tested
    // host command. It names the entry point that exists and the gap that does not.
    const r = run(['capabilities']);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/\[cli\] evidence-audit/);
    expect(r.out).toContain('sus-eval audit');
    expect(r.out).toContain('No host slash binding is verified');
  });

  it('audit is routed to the real CLI instead of dying as an unknown command', () => {
    const r = run(['audit', '--path', 'somewhere']);
    expect(r.status).toBe(2);
    expect(r.err).toContain('sus-eval audit');
    expect(r.err).not.toContain('unknown command');
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

  it('runs when invoked through a bin symlink (a package manager shim)', () => {
    // A pnpm/npm bin shim execs the built file through a symlink, so argv[1] is the
    // symlinked path and import.meta.url is the resolved one. Comparing them without
    // realpath made the CLI exit 0 having printed nothing at all.
    const dir = mkdtempSync(join(tmpdir(), 'sus-sus-bin-'));
    try {
      const link = join(dir, 'sus');
      symlinkSync(CLI, link);
      const out = execFileSync(process.execPath, [link, 'capabilities'], { encoding: 'utf8' });
      expect(out).toContain('honest degradation');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('unknown command exits 2 with usage on stderr', () => {
    const r = run(['nonsense']);
    expect(r.status).toBe(2);
    expect(r.err).toContain('usage');
  });
});
