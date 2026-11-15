/**
 * T1009 — ROADMAP.md must be a view of TASKS.json, not a second authority.
 *
 * The repository shipped a public roadmap that called M1–M10 "pending" and said
 * "T0101 next" with 100 of 102 tasks done, because the table was hand-written.
 * These tests hold the checker to the two failures that actually happened (a
 * stale status cell, a wrong task span), to the direction nobody would notice
 * (a milestone TASKS.json has and the page does not), and to the positive case
 * so the check does not become a permanent alarm.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkCountClaims,
  checkRoadmap,
  milestoneIds,
  parseCountClaims,
  parseRoadmapTable,
  renderRoadmapBlock,
  renderRoadmapTable,
  statusCell,
  summariseMilestones,
  tasksCell,
  withGeneratedTable,
  TABLE_END,
  TABLE_START,
} from '../../../scripts/lib/roadmap.mjs';

const doc = (tasks: Array<Record<string, unknown>>) => ({ meta: {}, tasks });
const done = (id: string, m: string) => ({ id, m, status: 'done' });
const pending = (id: string, m: string) => ({ id, m, status: 'pending' });

const tasksDoc = doc([
  done('T0001', 'M0'),
  done('T0002', 'M0'),
  done('T0101', 'M1'),
  pending('T0102', 'M1'),
]);

/** A roadmap whose table is current for `tasksDoc`, so each case can start green. */
const roadmapFor = (doc0: unknown) =>
  `# Roadmap\n\n${renderRoadmapBlock(doc0)}\n\n## Narrative stays hand-written\n`;

describe('summariseMilestones', () => {
  it('counts done against planned per milestone and names what is still open', () => {
    const summaries = summariseMilestones(tasksDoc);
    const m0 = summaries.find((row) => row.id === 'M0');
    const m1 = summaries.find((row) => row.id === 'M1');
    expect(m0).toEqual({ id: 'M0', done: 2, total: 2, pending: [] });
    expect(m1).toEqual({ id: 'M1', done: 1, total: 2, pending: ['T0102'] });
  });

  it('lists every milestone the roadmap documents, even empty ones', () => {
    expect(summariseMilestones(tasksDoc)).toHaveLength(milestoneIds().length);
  });

  it('survives a document with no tasks array instead of throwing', () => {
    expect(summariseMilestones({}).every((row) => row.total === 0)).toBe(true);
  });
});

describe('statusCell', () => {
  it('says done only when every planned task is done', () => {
    expect(statusCell({ id: 'M0', done: 2, total: 2, pending: [] })).toBe('**done** — 2/2');
    expect(statusCell({ id: 'M1', done: 1, total: 2, pending: ['T0102'] })).toContain('T0102');
  });

  it('never prints a bare "done" for a partially finished milestone', () => {
    const cell = statusCell({ id: 'M10', done: 7, total: 9, pending: ['T1003', 'T1005'] });
    expect(cell.startsWith('**done**')).toBe(false);
    expect(cell).toContain('7/9');
  });

  it('says nothing is planned rather than pretending completion', () => {
    expect(statusCell({ id: 'M99', done: 0, total: 0, pending: [] })).toContain('no tasks planned');
  });
});

describe('task spans', () => {
  it('reports the ids that exist, not the ids the roadmap once imagined', () => {
    const cell = tasksCell(tasksDoc);
    expect(cell('M0')).toBe('T0001–T0002 (2 tasks)');
    expect(cell('M99')).toBe('—');
  });

  it('handles a single-task milestone without inventing a range', () => {
    expect(tasksCell(doc([done('T0551', 'M5.5')]))('M5.5')).toBe('T0551 (1 task)');
  });
});

describe('parseRoadmapTable', () => {
  it('reads the rows a person sees and ignores the header', () => {
    const rows = parseRoadmapTable(roadmapFor(tasksDoc));
    expect(rows.map((row) => row.id)).toEqual(milestoneIds());
    expect(rows.find((row) => row.id === 'M1')?.status).toContain('T0102');
  });
});

describe('checkRoadmap', () => {
  it('passes a roadmap whose table matches the task document', () => {
    const result = checkRoadmap({ tasksDoc, roadmapText: roadmapFor(tasksDoc) });
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('fails a stale status cell and says which milestone — the defect this task was written for', () => {
    const text = roadmapFor(tasksDoc).replace('| **done** — 2/2 |', '| pending — T0001 next |');
    const result = checkRoadmap({ tasksDoc, roadmapText: text });
    expect(result.ok).toBe(false);
    const codes = result.violations.map((violation) => violation.code);
    expect(codes).toContain('roadmap-status-stale');
    expect(result.violations.some((violation) => violation.detail.startsWith('M0 says'))).toBe(
      true,
    );
  });

  it('fails a wrong task span, which is how the real roadmap drifted first', () => {
    const text = roadmapFor(tasksDoc).replace('T0001–T0002 (2 tasks)', 'T0001–T0005 (2 tasks)');
    const result = checkRoadmap({ tasksDoc, roadmapText: text });
    expect(result.violations.map((violation) => violation.code)).toContain('roadmap-tasks-stale');
  });

  it('fails when TASKS.json holds a milestone the page never mentions', () => {
    const rows = renderRoadmapTable(tasksDoc).filter((row) => !row.startsWith('| M1 |'));
    const text = [
      TABLE_START,
      '| Milestone | Scope | Tasks | Status |',
      '|---|---|---|---|',
      ...rows,
      TABLE_END,
    ].join('\n');
    const result = checkRoadmap({ tasksDoc, roadmapText: text });
    expect(result.violations.map((violation) => violation.code)).toContain(
      'roadmap-milestone-missing',
    );
  });

  it('fails when a task is assigned to a milestone the roadmap does not describe', () => {
    const withOrphan = doc([...tasksDoc.tasks, done('T9999', 'M42')]);
    const result = checkRoadmap({ tasksDoc: withOrphan, roadmapText: roadmapFor(withOrphan) });
    expect(result.violations.map((violation) => violation.code)).toContain(
      'roadmap-milestone-undocumented',
    );
  });

  it('fails when the markers are gone, because then nothing can be regenerated', () => {
    const text = `# Roadmap\n\n| Milestone | Scope | Tasks | Status |\n|---|---|---|---|\n| M0 | x | y | z |\n`;
    const result = checkRoadmap({ tasksDoc, roadmapText: text });
    expect(result.violations.map((violation) => violation.code)).toContain(
      'roadmap-markers-missing',
    );
  });
});

describe('count claims in public status documents', () => {
  it('reads both numbers from a sentence a person wrote', () => {
    expect(parseCountClaims('- **Tasks:** 97 of 100 done in `TASKS.json`.')).toEqual([
      { done: 97, total: 100 },
    ]);
  });

  it('accepts a claim that matches the task document', () => {
    const files = [{ file: 'README.md', text: 'all good: 3 of 4 done' }];
    expect(checkCountClaims({ tasksDoc, files })).toEqual([]);
  });

  it('fails a stale count — the README/handoff failure this class caused twice', () => {
    const files = [{ file: 'docs/BUILD_COMPLETION_HANDOFF.md', text: '**Tasks:** 97 of 100 done' }];
    const violations = checkCountClaims({ tasksDoc, files });
    expect(violations).toHaveLength(1);
    expect(violations[0].code).toBe('count-claim-stale');
    expect(violations[0].detail).toContain('3 of 4');
  });

  it('refuses a test/file count outright, because no build step can keep it true', () => {
    const files = [
      {
        file: 'docs/RESUME_ON_NEW_MACHINE.md',
        text: 'pnpm verify     # expect: 64 files, 679 tests',
      },
    ];
    const violations = checkCountClaims({ tasksDoc, files });
    expect(violations.map((violation) => violation.code)).toContain('count-claim-unverifiable');
  });

  it('passes the repository documents as they stand', () => {
    const files = [
      'README.md',
      'ROADMAP.md',
      'HANDOFF.md',
      'docs/BUILD_COMPLETION_HANDOFF.md',
      'docs/RESUME_ON_NEW_MACHINE.md',
    ].map((file) => ({ file, text: readFileSync(file, 'utf8') }));
    const tasks = JSON.parse(readFileSync('TASKS.json', 'utf8'));
    expect(checkCountClaims({ tasksDoc: tasks, files })).toEqual([]);
  });
});

describe('withGeneratedTable', () => {
  it('replaces only the marked block and keeps the surrounding narrative', () => {
    const text = roadmapFor(tasksDoc).replace('T0102', 'T0102');
    const next = withGeneratedTable(text, doc([done('T0001', 'M0')]));
    expect(next).toContain('## Narrative stays hand-written');
    expect(next).toContain('T0001 (1 task)');
    expect(next).not.toContain('T0101');
  });

  it('refuses to guess when the markers are absent', () => {
    expect(() => withGeneratedTable('# no markers', tasksDoc)).toThrow(/markers/);
  });
});

describe('the repository roadmap', () => {
  it('agrees with TASKS.json right now', () => {
    const tasks = JSON.parse(readFileSync('TASKS.json', 'utf8'));
    const roadmap = readFileSync('ROADMAP.md', 'utf8');
    const result = checkRoadmap({ tasksDoc: tasks, roadmapText: roadmap });
    expect(result.violations).toEqual([]);
  });

  it('does not describe any finished milestone as pending, the mistake a reader would act on', () => {
    const tasks = JSON.parse(readFileSync('TASKS.json', 'utf8'));
    const roadmap = readFileSync('ROADMAP.md', 'utf8');
    for (const summary of summariseMilestones(tasks)) {
      if (summary.total === 0 || summary.done !== summary.total) continue;
      const row = parseRoadmapTable(roadmap).find((candidate) => candidate.id === summary.id);
      expect(row?.status).toContain('done');
    }
  });
});
