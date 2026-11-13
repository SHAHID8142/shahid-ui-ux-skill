/**
 * T0904: installer + installed-bundle doctor E2E on clean temp directories —
 * install/uninstall/status exit codes and honest statuses, --force overwrite
 * safety, user-file preservation on a refused uninstall, and the doctor's
 * spec checks (directory name ↔ frontmatter name, description/budget limits,
 * reference token budget).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const INSTALL = join(__dirname, '..', '..', '..', 'scripts', 'install', 'install.mjs');
const DOCTOR = join(__dirname, '..', '..', '..', 'scripts', 'install', 'doctor.mjs');

function run(script: string, args: string[]): { status: number; out: string; err: string } {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [script, ...args], { encoding: 'utf8' }),
      err: '',
    };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, out: err.stdout ?? '', err: err.stderr ?? '' };
  }
}

const SKILL_NAME = 'shahid-ui-ux-skill';
let dest: string | null = null;

function freshDest(): string {
  dest = mkdtempSync(join(tmpdir(), 'sus-installer-'));
  return dest;
}

function skillDir(destDir: string): string {
  return join(destDir, SKILL_NAME);
}

/** Hand-built bundle for doctor negative cases (wrong names, oversized files). */
function fakeBundle(dirName: string, skillMd: string, refs?: Record<string, string>): string {
  if (!dest) throw new Error('no temp destination');
  const dir = join(dest, dirName);
  mkdirSync(join(dir, 'references'), { recursive: true });
  mkdirSync(join(dir, 'evals'), { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), skillMd);
  writeFileSync(
    join(dir, 'evals', 'evals.json'),
    JSON.stringify({
      shouldTrigger: ['build a landing page'],
      shouldNotTrigger: ['fix a python bug'],
    }),
  );
  for (const [name, content] of Object.entries(refs ?? {})) {
    writeFileSync(join(dir, 'references', name), content);
  }
  return dir;
}

afterEach(() => {
  if (dest) {
    rmSync(dest, { recursive: true, force: true });
    dest = null;
  }
});

describe('sus installer (T0904)', () => {
  it('install copies the bundle into a frontmatter-named directory and the doctor passes on the installed copy', () => {
    const d = freshDest();
    const r = run(INSTALL, ['install', '--dest', d]);
    expect(r.status).toBe(0);
    expect(existsSync(skillDir(d))).toBe(true);
    expect(existsSync(join(skillDir(d), 'SKILL.md'))).toBe(true);
    expect(existsSync(join(skillDir(d), 'references', 'precedence.md'))).toBe(true);
    expect(existsSync(join(skillDir(d), 'evals', 'evals.json'))).toBe(true);
    const doc = run(DOCTOR, ['--dir', skillDir(d)]);
    expect(doc.status).toBe(0);
    expect(doc.out).toContain('[PASS] directory name matches frontmatter name');
    expect(doc.out).toContain('VERDICT: installed bundle valid');
  });

  it('install twice without --force exits 3; with --force succeeds and leaves a valid bundle', () => {
    const d = freshDest();
    expect(run(INSTALL, ['install', '--dest', d]).status).toBe(0);
    const second = run(INSTALL, ['install', '--dest', d]);
    expect(second.status).toBe(3);
    expect(second.err).toContain('--force');
    const forced = run(INSTALL, ['install', '--dest', d, '--force']);
    expect(forced.status).toBe(0);
    expect(existsSync(join(skillDir(d), 'SKILL.md'))).toBe(true);
    expect(run(DOCTOR, ['--dir', skillDir(d)]).status).toBe(0);
  });

  it('uninstall removes the installed directory and status then reports not-installed with exit 0', () => {
    const d = freshDest();
    expect(run(INSTALL, ['install', '--dest', d]).status).toBe(0);
    expect(run(INSTALL, ['uninstall', '--dest', d]).status).toBe(0);
    expect(existsSync(skillDir(d))).toBe(false);
    const s = run(INSTALL, ['status', '--dest', d]);
    expect(s.status).toBe(0);
    expect(s.out).toContain('STATUS: not-installed');
  });

  it('status of an installed bundle reports the frontmatter name and a nonzero file count', () => {
    const d = freshDest();
    expect(run(INSTALL, ['install', '--dest', d]).status).toBe(0);
    const s = run(INSTALL, ['status', '--dest', d]);
    expect(s.status).toBe(0);
    expect(s.out).toContain('STATUS: installed');
    expect(s.out).toContain(`name: ${SKILL_NAME}`);
    expect(s.out).toMatch(/^files: [1-9]\d*$/m);
  });

  it('uninstall refuses with exit 3 and preserves user files inside the skill directory', () => {
    const d = freshDest();
    expect(run(INSTALL, ['install', '--dest', d]).status).toBe(0);
    const userFile = join(skillDir(d), 'references', 'user-notes.md');
    writeFileSync(userFile, 'user content that must survive an uninstall');
    const u = run(INSTALL, ['uninstall', '--dest', d]);
    expect(u.status).toBe(3);
    expect(existsSync(skillDir(d))).toBe(true);
    expect(existsSync(userFile)).toBe(true);
    expect(u.err).toContain('user-notes.md');
  });

  it('invalid usage exits 2 for the installer and the doctor', () => {
    expect(run(INSTALL, []).status).toBe(2);
    expect(run(INSTALL, ['install']).status).toBe(2);
    expect(run(INSTALL, ['nonsense', '--dest', 'x']).status).toBe(2);
    expect(run(DOCTOR, []).status).toBe(2);
  });

  describe('doctor rejections (exit 1)', () => {
    it('rejects a bundle whose directory name does not match the frontmatter name', () => {
      freshDest();
      const dir = fakeBundle(
        'wrong-name',
        `---\nname: ${SKILL_NAME}\ndescription: mismatched install location\n---\n# t\n`,
      );
      const doc = run(DOCTOR, ['--dir', dir]);
      expect(doc.status).toBe(1);
      expect(doc.out).toMatch(/\[FAIL\] directory name matches frontmatter name/);
    });

    it('rejects a description over 1024 chars', () => {
      freshDest();
      const dir = fakeBundle(
        SKILL_NAME,
        `---\nname: ${SKILL_NAME}\ndescription: ${'a'.repeat(1025)}\n---\n# t\n`,
      );
      const doc = run(DOCTOR, ['--dir', dir]);
      expect(doc.status).toBe(1);
      expect(doc.out).toMatch(/\[FAIL\] description ≤ 1024 chars/);
    });

    it('rejects a references file over 2k tokens', () => {
      freshDest();
      const dir = fakeBundle(
        SKILL_NAME,
        `---\nname: ${SKILL_NAME}\ndescription: oversized reference\n---\n# t\n`,
        { 'oversized.md': 'word '.repeat(2100) },
      );
      const doc = run(DOCTOR, ['--dir', dir]);
      expect(doc.status).toBe(1);
      expect(doc.out).toMatch(/\[FAIL\] reference oversized\.md/);
    });
  });
});
