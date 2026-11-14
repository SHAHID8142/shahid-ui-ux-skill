/**
 * T0802 tests — stale mapping, user-edit conflicts, fail-closed defaults.
 *
 * The acceptance is "annotations preserved on failure; retry/export offered",
 * and the risk is "silent wrong-file edits", so these tests are built as
 * failure injection: take a real annotation, mutate the tree in one specific
 * way, and prove the session refuses with the right kind and keeps the
 * annotation intact.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MappingConflictSession, type PreservedAnnotation } from '../src/conflicts.js';
import { createHash } from 'node:crypto';

const PAGE = 'app/page.tsx';

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

const PAGE_SOURCE = `export default function Page() {
  return (
    <main id="main">
      <section id="hero">
        <h1 id="hero-title">Plan the week</h1>
      </section>
      <section id="features">
        <h2 id="features-title">Features</h2>
      </section>
    </main>
  );
}
`;

let root: string;

function write(relative: string, text: string): void {
  if (relative.includes('/'))
    mkdirSync(join(root, relative.slice(0, relative.lastIndexOf('/'))), { recursive: true });
  writeFileSync(join(root, relative), text);
}

function annotation(overrides: Partial<PreservedAnnotation> = {}): PreservedAnnotation {
  return {
    id: 'ann-1',
    intentId: 'intent-1',
    anchor: 'hero-title',
    region: { x: 10, y: 20, width: 300, height: 80 },
    fileSha256: sha256(PAGE_SOURCE),
    file: PAGE,
    createdAt: '2026-11-14T00:00:00.000Z',
    note: 'make this shorter',
    ...overrides,
  };
}

function session(annotations: PreservedAnnotation[] = [annotation()]): MappingConflictSession {
  return MappingConflictSession.open({ root, files: [PAGE] }, annotations);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sus-t0802-'));
  write(PAGE, PAGE_SOURCE);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('a clean mapping is clear, and carries the owner', () => {
  it('reports clear with the owner the write would target', () => {
    const resolution = session().check('ann-1');
    expect(resolution.state).toBe('clear');
    if (resolution.state !== 'clear') return;
    expect(resolution.owner.file).toBe(PAGE);
    expect(resolution.owner.tagName).toBe('h1');
    expect(resolution.owner.line).toBeGreaterThan(0);
    expect(session().isClear()).toBe(true);
  });
});

describe('failure injection — every mutation is a conflict, never a repair', () => {
  it('detects a user edit to the file even when the anchor still resolves', () => {
    write(PAGE, PAGE_SOURCE.replace('Plan the week', 'Plan the week, together'));
    const resolution = session().check('ann-1');
    expect(resolution.state).toBe('conflict');
    if (resolution.state !== 'conflict') return;
    expect(resolution.conflict.kind).toBe('file-changed');
    expect(resolution.conflict.options).toEqual(['retry', 'export']);
    expect(resolution.conflict.detail).toContain('re-preview');
  });

  it('detects the anchor disappearing (deleted by the user)', () => {
    // record the hash of the mutated file so this exercises the anchor path
    // rather than the (correct, but earlier) file-changed path
    const mutated = PAGE_SOURCE.replace(
      '<h1 id="hero-title">Plan the week</h1>',
      '<h1>Plan the week</h1>',
    );
    write(PAGE, mutated);
    const resolution = MappingConflictSession.open({ root, files: [PAGE] }, [
      annotation({ fileSha256: sha256(mutated) }),
    ]).check('ann-1');
    expect(resolution.state).toBe('conflict');
    if (resolution.state !== 'conflict') return;
    expect(resolution.conflict.kind).toBe('anchor-missing');
  });

  it('detects the anchor being duplicated (which makes "the" element ambiguous)', () => {
    write(
      PAGE,
      PAGE_SOURCE.replace(
        '<h2 id="features-title">Features</h2>',
        '<h2 id="features-title">Features</h2><h2 id="hero-title">Second</h2>',
      ),
    );
    // the file changed too, so make the recorded hash match the mutated file
    // to isolate the duplicate-anchor path from the file-changed path
    const mutated = PAGE_SOURCE.replace(
      '<h2 id="features-title">Features</h2>',
      '<h2 id="features-title">Features</h2><h2 id="hero-title">Second</h2>',
    );
    const resolution = MappingConflictSession.open({ root, files: [PAGE] }, [
      annotation({ fileSha256: sha256(mutated) }),
    ]).check('ann-1');
    expect(resolution.state).toBe('conflict');
    if (resolution.state !== 'conflict') return;
    expect(['anchor-duplicated', 'ambiguous-owner']).toContain(resolution.conflict.kind);
  });

  it('detects the anchor moving to another file instead of retargeting silently', () => {
    // the element is genuinely gone from page.tsx and lives in hero.tsx only
    const mutatedPage = PAGE_SOURCE.replace(
      '<h1 id="hero-title">Plan the week</h1>',
      '<h1>Plan the week</h1>',
    );
    write(PAGE, mutatedPage);
    write('app/hero.tsx', 'export const Hero = () => <h1 id="hero-title">Plan</h1>;\n');
    const resolution = MappingConflictSession.open({ root, files: [PAGE, 'app/hero.tsx'] }, [
      annotation({ fileSha256: sha256(mutatedPage) }),
    ]).check('ann-1');
    expect(resolution.state).toBe('conflict');
    if (resolution.state !== 'conflict') return;
    expect(resolution.conflict.kind).toBe('owner-changed');
    expect(resolution.conflict.candidates[0]!.file).toBe('app/hero.tsx');
    expect(resolution.conflict.detail).toContain('refusing to retarget');
  });

  it('detects the file being deleted', () => {
    rmSync(join(root, PAGE));
    const resolution = session().check('ann-1');
    expect(resolution.state).toBe('conflict');
    if (resolution.state !== 'conflict') return;
    expect(resolution.conflict.kind).toBe('file-deleted');
  });
});

describe('annotations are preserved on failure', () => {
  it('keeps the annotation verbatim — note, region and timestamp included', () => {
    write(PAGE, PAGE_SOURCE.replace('Plan the week', 'Changed'));
    const conflictSession = session();
    conflictSession.check('ann-1');
    const [kept] = conflictSession.preserved();
    expect(kept).toEqual(annotation());
  });

  it('an export carries every annotation and every conflict', () => {
    write(PAGE, PAGE_SOURCE.replace('Plan the week', 'Changed'));
    const bundle = session([
      annotation(),
      annotation({ id: 'ann-2', anchor: 'features-title' }),
    ]).exportBundle({
      exportedAt: '2026-11-14T01:00:00.000Z',
    });
    expect(bundle.schemaVersion).toBe(1);
    expect(bundle.exportedAt).toBe('2026-11-14T01:00:00.000Z');
    expect(bundle.annotations.map((entry) => entry.id)).toEqual(['ann-1', 'ann-2']);
    expect(bundle.conflicts.map((entry) => entry.annotationId)).toEqual(['ann-1', 'ann-2']);
    expect(bundle.retryAvailable).toBe(true);
    // the export is a hand-back, not a repair
    expect(bundle.annotations[0]!.note).toBe('make this shorter');
  });

  it('is not clear when any single annotation conflicts', () => {
    const conflictSession = session([annotation(), annotation({ id: 'ann-2', anchor: 'nope' })]);
    expect(conflictSession.isClear()).toBe(false);
    const results = conflictSession.checkAll();
    expect(results.map((resolution) => resolution.state)).toEqual(['clear', 'conflict']);
  });
});

describe('retry re-resolves without bypassing', () => {
  it('succeeds after the user reverts their edit', () => {
    write(PAGE, PAGE_SOURCE.replace('Plan the week', 'Changed'));
    const conflictSession = session();
    expect(conflictSession.check('ann-1').state).toBe('conflict');
    write(PAGE, PAGE_SOURCE);
    const retried = conflictSession.retry('ann-1');
    expect(retried.state).toBe('clear');
  });

  it('still conflicts when the retry target is still gone', () => {
    rmSync(join(root, PAGE));
    const conflictSession = session();
    expect(conflictSession.check('ann-1').state).toBe('conflict');
    const retried = conflictSession.retry('ann-1');
    expect(retried.state).toBe('conflict');
    if (retried.state !== 'conflict') return;
    expect(retried.conflict.kind).toBe('file-deleted');
  });

  it('refuses an unknown annotation rather than returning "clear"', () => {
    expect(() => session().check('ann-missing')).toThrow(/unknown annotation/);
  });

  it('refuses duplicate annotation ids at open', () => {
    expect(() => session([annotation(), annotation()])).toThrow(/duplicate annotation id/);
  });
});
