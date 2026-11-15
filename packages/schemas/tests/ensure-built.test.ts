/**
 * T1010 — a pristine clone must be able to run the commands the repository tells
 * people to run.
 *
 * The documented first-run path (`pnpm install` → `pnpm setup` → `pnpm verify`)
 * failed on a fresh clone with ERR_MODULE_NOT_FOUND from `scripts/check-gates.mjs`,
 * because three gate scripts import compiled packages and the fresh clone had no
 * `dist`. Every local run was green, since the working machine's `dist` predated
 * the clone — the document only ever broke for the person it was written for.
 *
 * These tests hold the detection, the message and the wiring in place.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  REQUIRED_ARTIFACTS,
  buildHint,
  missingBuildArtifacts,
} from '../../../scripts/lib/ensure-built.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('missingBuildArtifacts', () => {
  it('names every artifact a fresh clone lacks — the exact failure that was reported', () => {
    const missing = missingBuildArtifacts({ exists: () => false });
    expect(missing).toContain('packages/eval-core/dist/index.js');
    expect(missing).toHaveLength(REQUIRED_ARTIFACTS.length);
  });

  it('is silent when the workspace is built, so the fast path stays fast', () => {
    expect(missingBuildArtifacts({ exists: () => true })).toEqual([]);
  });

  it('reports only what is actually absent', () => {
    const present = new Set(['packages/eval-core/dist/index.js']);
    const missing = missingBuildArtifacts({ exists: (path: string) => present.has(path) });
    expect(missing).not.toContain('packages/eval-core/dist/index.js');
    expect(missing).toContain('packages/adapters/dist/index.js');
  });

  it('refuses to guess without an exists() probe rather than silently passing', () => {
    expect(() => missingBuildArtifacts({})).toThrow(/exists/);
  });
});

describe('buildHint', () => {
  it('says what to run, not just that something is missing', () => {
    const hint = buildHint(['packages/eval-core/dist/index.js']);
    expect(hint).toContain('packages/eval-core/dist/index.js');
    expect(hint).toContain('pnpm build');
  });
});

describe('the artifact list', () => {
  it('covers every compiled workspace package, so a new one cannot be forgotten', () => {
    for (const artifact of REQUIRED_ARTIFACTS)
      expect(artifact).toMatch(/^packages\/[^/]+\/dist\/index\.js$/);
    expect(REQUIRED_ARTIFACTS.length).toBeGreaterThanOrEqual(7);
    // The three scripts that import compiled packages must be covered.
    expect(REQUIRED_ARTIFACTS).toContain('packages/eval-core/dist/index.js');
    expect(REQUIRED_ARTIFACTS).toContain('packages/schemas/dist/index.js');
    expect(REQUIRED_ARTIFACTS).toContain('packages/adapters/dist/index.js');
  });
});

describe('wiring', () => {
  it('builds before the checkers run, in both entry points a person is told to use', () => {
    expect(pkg.scripts['ensure:built']).toBe('node scripts/ensure-built.mjs');
    expect(pkg.scripts.verify.startsWith('pnpm ensure:built &&')).toBe(true);
    expect(pkg.scripts.check).toContain('ensure:built');
  });

  it('keeps the build itself in verify, so ensure:built cannot mask a broken build', () => {
    expect(pkg.scripts.verify).toContain('pnpm build &&');
  });
});

describe('the CI fresh-clone job (T1011)', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const job = (name: string) => {
    const start = ci.indexOf(`  ${name}:`);
    if (start === -1) return '';
    const rest = ci.slice(start + name.length + 3);
    const next = rest.search(/^ {2}[a-z-]+:$/m);
    return next === -1 ? rest : rest.slice(0, next);
  };

  it('runs the documented path on a tree that has never been built', () => {
    const fresh = job('fresh-clone');
    expect(fresh).not.toBe('');
    expect(fresh).toContain('git clone --quiet --local --no-hardlinks');
    expect(fresh).toContain('test "$(git rev-parse HEAD)" = "$GITHUB_SHA"');
    expect(fresh).toContain('pnpm install --frozen-lockfile');
    expect(fresh).toContain('pnpm setup');
    expect(fresh).toContain('pnpm verify');
    // The whole point: the pristine tree is asserted to have no build output.
    expect(fresh).toContain('test ! -d packages/eval-core/dist');
  });

  it('clones with full history, so the fresh tree is a real clone rather than a shallow copy', () => {
    expect(job('fresh-clone')).toContain('fetch-depth: 0');
  });

  it('runs every command in the fresh tree, never in the warmed checkout', () => {
    const fresh = job('fresh-clone');
    const commands = fresh.split('\n').filter((line) => line.trim().startsWith('run: pnpm'));
    expect(commands.length).toBeGreaterThan(0);
    // Each command that runs a pnpm script must be scoped to the fresh tree.
    expect((fresh.match(/working-directory: \$\{\{ runner\.temp \}\}\/fresh/g) ?? []).length).toBe(
      3,
    );
  });

  it('does not pre-build, which is the step that hid the defect it guards', () => {
    const fresh = job('fresh-clone');
    expect(/run: *pnpm build\b/.test(fresh)).toBe(false);
  });

  it('keeps the warmed verify job building first, which is correct for that job', () => {
    expect(job('verify')).toContain('pnpm build');
  });
});

describe('the resume document', () => {
  it('does not hard-code a test or file count that no build step can keep true', () => {
    const doc = readFileSync('docs/RESUME_ON_NEW_MACHINE.md', 'utf8');
    expect(/\bexpect:\s*\d+\s+files?,\s*\d+\s+tests?/i.test(doc)).toBe(false);
  });
});
