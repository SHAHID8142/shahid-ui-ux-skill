/**
 * Issue #12 negative fixtures — the handoff checker must fail for the reasons this
 * repository actually drifted, not merely for being run.
 *
 * Each case below is a real historical inconsistency (STATE.md behind TASKS.json,
 * "no product code exists" with 67 tasks done, "never public" in a public repo),
 * reduced to a fixture. The positive cases keep the checker from becoming a
 * permanent alarm that people learn to ignore.
 */
import { describe, expect, it } from 'vitest';
import {
  activeVisibilityClaims,
  checkHandoff,
  countTasks,
  parseStateDoneCount,
} from '../../../scripts/lib/handoff.mjs';

const doc = (tasks: Array<Record<string, unknown>>, meta: Record<string, unknown> = {}) => ({
  meta: { note: 'statuses are canonical build progress', ...meta },
  tasks,
});

const done = (id: string) => ({ id, status: 'done' });
const pending = (id: string) => ({ id, status: 'pending' });

describe('parseStateDoneCount', () => {
  it('reads the count a resuming agent depends on', () => {
    expect(
      parseStateDoneCount('Canonical task statuses: TASKS.json (79 of 100 done). more'),
    ).toEqual({
      done: 79,
      total: 100,
    });
  });

  it('returns null when STATE.md states no count, so the gap is visible', () => {
    expect(parseStateDoneCount('Canonical task statuses: TASKS.json.')).toBeNull();
  });
});

describe('countTasks', () => {
  it('counts statuses and ignores unknown ones', () => {
    expect(countTasks(doc([done('T1'), pending('T2'), { id: 'T3', status: 'weird' }]))).toEqual({
      done: 1,
      pending: 1,
      review: 0,
      blocked: 0,
      total: 3,
    });
  });
});

describe('negative fixtures — the drifts that actually happened', () => {
  it('fails when STATE.md is behind TASKS.json (63 vs 67)', () => {
    const result = checkHandoff({
      tasksDoc: doc(Array.from({ length: 67 }, (_, i) => done(`T${i}`))),
      stateText: 'TASKS.json (63 of 97 done)',
    });
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain('state-count-drift');
    expect(result.violations.map((v) => v.code)).toContain('state-total-drift');
  });

  it('fails when STATE.md carries no count at all', () => {
    const result = checkHandoff({ tasksDoc: doc([done('T1')]), stateText: 'no counts here' });
    expect(result.violations.map((v) => v.code)).toContain('state-count-missing');
  });

  it('fails on "no product code exists" once build tasks are done', () => {
    const result = checkHandoff({
      tasksDoc: doc([done('T1')], {
        note: 'statuses reflect planning progress only; no product code exists',
      }),
      stateText: 'TASKS.json (1 of 1 done)',
    });
    expect(result.violations.map((v) => v.code)).toEqual(
      expect.arrayContaining(['meta-claims-no-code', 'meta-planning-only']),
    );
  });

  it('fails on a "never public" claim while the repository is public', () => {
    const result = checkHandoff({
      tasksDoc: doc([done('T1')], {
        visibilityClaims: [{ file: 'AGENTS.md', text: 'never public' }],
      }),
      stateText: 'TASKS.json (1 of 1 done)',
      repoPublic: true,
    });
    expect(result.violations.map((v) => v.code)).toContain('stale-visibility');
    // the same claim is consistent history in a private repository
    const priv = checkHandoff({
      tasksDoc: doc([done('T1')], {
        visibilityClaims: [{ file: 'AGENTS.md', text: 'never public' }],
      }),
      stateText: 'TASKS.json (1 of 1 done)',
      repoPublic: false,
    });
    expect(priv.ok).toBe(true);
  });

  it('fails on a lease with no owner/expiry, and on a lease held by a finished task', () => {
    const result = checkHandoff({
      tasksDoc: doc([
        { id: 'T2', status: 'pending', lease: { owner: '', expiresAt: '' } },
        { id: 'T3', status: 'done', lease: { owner: 'pi', expiresAt: '2026-11-15T00:00:00Z' } },
      ]),
      stateText: 'TASKS.json (1 of 2 done)',
    });
    const codes = result.violations.map((v) => v.code);
    expect(codes).toContain('invalid-lease');
    expect(codes).toContain('lease-on-done-task');
  });
});

describe('positive fixtures — a consistent handoff passes', () => {
  it('accepts matching counts, honest meta and no leases on done tasks', () => {
    const result = checkHandoff({
      tasksDoc: doc([done('T1'), pending('T2')], {
        note: 'statuses are canonical build progress; a task is done only with a receipt',
      }),
      stateText: 'TASKS.json (1 of 2 done)',
      repoPublic: true,
    });
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe('activeVisibilityClaims', () => {
  it('fails live claims but exempts recorded history', () => {
    const claims = activeVisibilityClaims({
      patterns: [/never public/i, /Private; not published/i],
      files: [
        { file: 'AGENTS.md', text: 'supersedes D30\'s "never public" clause' },
        { file: 'HANDOFF.md', text: 'pushes are permitted; never public anywhere' },
        { file: 'package.json', text: '"description": "monorepo. Private; not published."' },
      ],
    });
    expect(claims.map((claim) => claim.file)).toEqual(['HANDOFF.md', 'package.json']);
  });
});
