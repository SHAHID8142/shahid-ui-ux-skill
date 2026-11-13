/**
 * T0010b (owner issue #9): the continuation checker rejects stale handoff
 * state — a fabricated workspace whose STATE.md names done/nonexistent tasks
 * as current, or next-steps referencing done tasks, FAILS with an explicit
 * reconciliation message instead of silently directing a fresh agent.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CHECKER = join(__dirname, '..', '..', '..', 'scripts', 'check-continuation.mjs');

function makeWorkspace(state: string): string {
  const dir = mkdtempSync(join(tmpdir(), 't0010b-'));
  // required files (minimal but structurally honest)
  for (const f of [
    'AGENTS.md',
    'CONTRIBUTING.md',
    'HANDOFF.md',
    'ROADMAP.md',
    'docs/AGENT_CONTINUE_PROTOCOL.md',
    'docs/OWNER_DECISIONS_LOG.md',
    'docs/EFFECTIVE_REQUIREMENTS.json',
    'docs/TASK_RECORD_CONTRACT.md',
    'docs/REVIEW_RECONCILIATION.md',
    '.sus-dev/BLOCKERS.md',
  ]) {
    mkdirSync(join(dir, f, '..'), { recursive: true });
    writeFileSync(join(dir, f), `# ${f}\nAPERIO recorded; BUILD_PERMISSION = true\n`);
  }
  writeFileSync(
    join(dir, '.sus-dev', 'STATE.md'),
    `Updated: 2026-11-14\nBranch: main\n\n${state}\n`,
  );
  writeFileSync(join(dir, '.sus-dev', 'SESSION_LOG.md'), '- 2026-11-14 | test | log entry\n');
  writeFileSync(
    join(dir, 'TASKS.json'),
    JSON.stringify({
      meta: {
        product: 'p',
        version: 'v',
        build_gate: 'APERIO received 2026-11-13 (D28): build authorized',
        protocol: 'x',
      },
      tasks: [
        {
          id: 'T0154',
          m: 'M1',
          title: 'evidence schema',
          obj: 'x',
          deps: [],
          files: [],
          acc: [],
          tests: [],
          risk: 'r',
          rollback: 'r',
          status: 'done',
          approval: 'a',
          evidence: ['.sus-dev/SESSION_LOG.md'],
        },
        {
          id: 'T0701',
          m: 'M7',
          title: 'bridge',
          obj: 'x',
          deps: ['T0154'],
          files: [],
          acc: [],
          tests: [],
          risk: 'r',
          rollback: 'r',
          status: 'pending',
          approval: 'a',
        },
      ],
    }),
  );
  // git repo so the git checks behave
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-C', dir, 'config', 'user.email', 't@t'], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'config', 'user.name', 't'], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'add', '-A'], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'commit', '-qm', 'init'], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'config', 'receive.denyCurrentBranch', 'ignore'], {
    stdio: 'ignore',
  });
  return dir;
}

function run(root: string): { status: number; out: string } {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [CHECKER, '--root', root], { encoding: 'utf8' }),
    };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { status: err.status ?? 1, out: err.stdout ?? '' };
  }
}

describe('checker stale-reference hardening (T0010b, issue #9)', () => {
  it('fresh honest state passes', () => {
    const dir = makeWorkspace(
      'Current task: T0701 (bridge server, pending). Ready: T0701.\n\nNext exact steps: start T0701 bridge server work.',
    );
    const r = run(dir);
    expect(r.status, r.out).toBe(0);
  });

  it('STATE claiming a DONE task as current fails with reconciliation message', () => {
    const dir = makeWorkspace(
      'Current task: T0154 (in progress — schema written).\n\nNext exact steps: finish the evidence validator.',
    );
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('stale current-task reference(s): T0154');
    expect(r.out).toContain('CANNOT RESUME SAFELY');
  });

  it('STATE next-steps referencing done tasks fails (stale handoff)', () => {
    const dir = makeWorkspace(
      'Current task: T0701 (pending).\n\nNext exact steps: complete T0154 evidence validator, then T0701.',
    );
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('next steps reference done task(s): T0154');
  });

  it('nonexistent task IDs in current-task line fail', () => {
    const dir = makeWorkspace('Current task: T9999 (ghost task).\n\nNext exact steps: run T9999.');
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/T9999/);
  });
});
