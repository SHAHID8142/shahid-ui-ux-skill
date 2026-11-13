/**
 * T0201: skill bundle validator — canonical bundle passes; broken bundles
 * (bad frontmatter, oversized reference, missing evals) fail. Negative
 * fixtures are built in temp dirs; the shipped bundle is never mutated.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const VALIDATOR = join(__dirname, '..', '..', '..', 'scripts', 'validate-skill.mjs');
const REPO_ROOT = join(__dirname, '..', '..', '..');

function run(root: string): { status: number; out: string } {
  try {
    const out = execFileSync(process.execPath, [VALIDATOR, '--root', root], { encoding: 'utf8' });
    return { status: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string };
    return { status: err.status ?? 1, out: err.stdout ?? '' };
  }
}

function workspace(mutate: (skillDir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 't0201-'));
  const skillDir = join(dir, 'skill');
  mkdirSync(skillDir, { recursive: true });
  cpSync(join(REPO_ROOT, 'skill'), skillDir, { recursive: true });
  mutate(skillDir);
  return dir;
}

const BASE_SKILL = `---
name: test-skill
description: ${'x'.repeat(200)}
license: UNLICENSED
---

# Test skill body
`;

describe('skill bundle validator (T0201)', () => {
  it('canonical bundle passes', () => {
    const r = run(REPO_ROOT);
    expect(r.status, r.out).toBe(0);
    expect(r.out).toContain('VERDICT: skill bundle valid');
  });

  it('rejects a description over the 1024-char spec limit', () => {
    const dir = workspace((skill) => {
      writeFileSync(
        join(skill, 'SKILL.md'),
        `---\nname: test-skill\ndescription: ${'x'.repeat(1100)}\nlicense: UNLICENSED\n---\n\nbody\n`,
      );
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('1024');
  });

  it('rejects a reference over the 2k-token budget', () => {
    const dir = workspace((skill) => {
      writeFileSync(join(skill, 'references', 'big.md'), `# big\n${'word '.repeat(12000)}`);
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/2k tokens/);
  });

  it('rejects a missing evals.json', () => {
    const dir = workspace((skill) => {
      writeFileSync(
        join(skill, 'evals.json.bak'),
        readFileSync(join(skill, 'evals', 'evals.json'), 'utf8'),
      );
      rmSync(join(skill, 'evals'), { recursive: true, force: true });
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('evals.json');
  });

  it('rejects placeholder content (G3) in shipped skill text', () => {
    const dir = workspace((skill) => {
      writeFileSync(join(skill, 'SKILL.md'), `${BASE_SKILL}\nTODO: write the real body later\n`);
    });
    const r = run(dir);
    expect(r.status).toBe(1);
    expect(r.out).toContain('G3');
  });
});
