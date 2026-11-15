/**
 * T1001 (audit H6) — a `done` claim must be backed by something in the tree.
 *
 * The negative fixtures matter more than the positive one: the failure this
 * guards is a task marked done whose work exists only in TASKS.json.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM helper shared with the CLI
import {
  awaitableTasks,
  backingFor,
  checkReachability,
  extractTaskIds,
} from '../../../scripts/lib/reachability.mjs';

const exists = (paths: string[]) => (path: string) => paths.includes(path);

interface Backed {
  id: string;
  basis: string;
}

describe('task id extraction', () => {
  it('finds canonical ids and ignores lookalikes', () => {
    expect(extractTaskIds('feat: T0812 and T0700wa, plus T700 and X1234')).toEqual([
      'T0812',
      'T0700wa',
      'T700',
    ]);
  });

  it('deduplicates ids repeated across a log', () => {
    expect(extractTaskIds('T0502 T0502 T0503')).toEqual(['T0502', 'T0503']);
  });
});

describe('reachability', () => {
  const tasks = [
    { id: 'T0502', m: 'M5', status: 'done', files: [], evidence: [] },
    { id: 'T0302', m: 'M3', status: 'done', files: [], evidence: [] },
    { id: 'T0001', m: 'M0', status: 'done', files: [], evidence: ['docs/README.md'] },
    { id: 'T0102', m: 'M1', status: 'done', files: ['fixtures/marketing/app/page.tsx'] },
    { id: 'T9999', m: 'M9', status: 'done', files: [], evidence: [] },
    { id: 'T1006', m: 'M10', status: 'pending', files: [], evidence: [] },
  ];

  it('accepts a commit, a receipt, a delivered file and recorded evidence', () => {
    const result = checkReachability({
      tasks: awaitableTasks(tasks),
      logText: 'feat: T0502 progressive workflow contracts',
      exists: exists([
        '.sus-dev/VERIFICATION/T0302.md',
        'docs/README.md',
        'fixtures/marketing/app/page.tsx',
      ]),
    });
    const basis = Object.fromEntries(
      result.reachable.map((entry: Backed) => [entry.id, entry.basis]),
    );
    expect(basis).toEqual({
      T0502: 'commit',
      T0302: 'receipt',
      T0001: 'evidence',
      T0102: 'files',
    });
  });

  it('fails a done task with no commit, no receipt and no file', () => {
    const result = checkReachability({
      tasks: awaitableTasks(tasks),
      logText: 'feat: T0502',
      exists: exists([]),
    });
    // nothing on disk and nothing in the log: every done task is unbacked here
    expect(result.missing.sort()).toEqual(['T0001', 'T0102', 'T0302', 'T9999']);
  });

  it('exempts M10 wrap-up tasks and never checks pending work', () => {
    const result = checkReachability({
      tasks: awaitableTasks(tasks),
      logText: '',
      exists: exists([]),
    });
    expect(result.exempt).not.toContain('T1006');
    expect(result.missing).not.toContain('T1006');
  });

  it('reports the basis counts so a report can say how the claim is backed', () => {
    const result = checkReachability({
      tasks: [{ id: 'T0502', m: 'M5', status: 'done' }],
      logText: 'T0502',
      exists: exists([]),
    });
    expect(result.byBasis.commit).toBe(1);
    expect(result.checked).toBe(1);
  });

  it('backingFor returns null rather than guessing', () => {
    expect(backingFor({ id: 'T0001', files: [], evidence: [] }, new Set(), exists([]))).toBeNull();
  });
});
