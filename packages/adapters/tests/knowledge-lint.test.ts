/**
 * T0409: knowledge lint — citations resolve, G3 enforced, honest failure.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const LINT = join(__dirname, '..', '..', '..', 'scripts', 'validate-knowledge.mjs');
const REPO = join(__dirname, '..', '..', '..');

function workspace(mutate: (dir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 't0409-'));
  cpSync(join(REPO, 'skill'), join(dir, 'skill'), { recursive: true });
  mkdirSync(join(dir, 'evals', 'research'), { recursive: true });
  cpSync(
    join(REPO, 'evals', 'research', 'provenance-catalog.json'),
    join(dir, 'evals', 'research', 'provenance-catalog.json'),
  );
  mutate(dir);
  return dir;
}

function run(root: string): { status: number; out: string } {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [LINT, '--root', root], { encoding: 'utf8' }),
    };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { status: err.status ?? 1, out: err.stdout ?? '' };
  }
}

describe('knowledge lint (T0409)', () => {
  it('canonical knowledge passes', () => {
    const r = run(REPO);
    expect(r.status, r.out).toBe(0);
  });
  it('unknown provenance citation fails', () => {
    const dir = workspace((dir) => {
      writeFileSync(
        join(dir, 'skill', 'references', 'extra.md'),
        'Rule: faster loads provenance claim: ghost-claim-id\n',
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('ghost-claim-id');
  });
  it('placeholder content fails (G3)', () => {
    const dir = workspace((dir) => {
      writeFileSync(join(dir, 'skill', 'references', 'extra.md'), 'TODO: fill this in\n');
    });
    expect(run(dir).status).toBe(1);
  });
});
