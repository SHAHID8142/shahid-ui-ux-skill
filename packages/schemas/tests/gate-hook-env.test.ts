/**
 * T1091 — pins the push-gate's clean-suite environment, both directions.
 *
 * The failure this prevents happened for real: git runs hooks with GIT_DIR set, the gate
 * spawned `pnpm verify` with that environment inherited, and the suite's temp-dir fixture git
 * repositories resolved to the REAL repository — five ghost commits landed on the release-prep
 * branch and the push was refused by the verified-tree check. The gate must strip GIT_* for
 * what it spawns, and this test fails if the wiring is ever removed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gitCleanEnv } from '../../../scripts/lib/hook-env.mjs';

const HOOK_ENV_KEYS = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_INDEX_FILE',
  'GIT_PREFIX',
  'GIT_COMMON_DIR',
];

describe('gitCleanEnv (T1091: hook env must not reach the suite)', () => {
  it('strips every GIT_* variable git sets for hooks', () => {
    const hookEnv = {
      ...process.env,
      PATH: process.env.PATH,
      ...Object.fromEntries(HOOK_ENV_KEYS.map((key) => [key, '/some/repo/.git'])),
    };
    const clean = gitCleanEnv(hookEnv);
    for (const key of HOOK_ENV_KEYS) {
      expect(clean[key], `${key} must be stripped`).toBeUndefined();
    }
    // Non-git variables pass through untouched.
    expect(clean.PATH).toBe(process.env.PATH ?? '');
  });

  it('keeps the two knobs a suite may legitimately need', () => {
    const clean = gitCleanEnv({ GIT_DIR: '/x', GIT_EDITOR: 'true', GIT_TERMINAL_PROMPT: '0' });
    expect(clean.GIT_EDITOR).toBe('true');
    expect(clean.GIT_TERMINAL_PROMPT).toBe('0');
    expect(clean.GIT_DIR).toBeUndefined();
  });

  it('does not mutate the environment object it was given', () => {
    const env = { GIT_DIR: '/x', HOME: '/h' };
    gitCleanEnv(env);
    expect(env.GIT_DIR).toBe('/x');
    expect(env.HOME).toBe('/h');
  });

  // Negative control in the shape of T1048's workflow-text tests: the wiring, not just the
  // helper. If the gate stops passing a clean environment to what it spawns, this fails.
  it('gate-push.mjs spawns the suite with gitCleanEnv', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', '..', 'scripts', 'gate-push.mjs'),
      'utf8',
    );
    expect(source).toContain("from './lib/hook-env.mjs'");
    expect(source).toMatch(/env:\s*gitCleanEnv\(\)/);
  });
});
