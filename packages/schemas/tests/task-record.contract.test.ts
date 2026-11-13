/**
 * Contract tests for the compact task-record schema (T0104, DA-40).
 * Fixtures pin the exact record shape at each version — migrations are
 * judged against these, never against prose.
 */
import { describe, expect, it } from 'vitest';
import {
  SusTaskRecordV1,
  TaskRecordV2,
  applyMigrations,
  migrateTaskRecordV1toV2,
} from '../src/index.js';

/** Real-shaped minimal record at v1 (planning-v1.2 form, no optional fields). */
const v1Fixture = {
  id: 'T0152b',
  m: 'M1.5',
  title: 'axe-core + Lighthouse budget integration',
  obj: 'Integrate a11y budgets into the harness',
  deps: ['T0152'],
  files: ['packages/eval-core/'],
  acc: ['budgets enforced on fixture A'],
  tests: ['vitest contract tests'],
  risk: 'flaky Lighthouse numbers',
  rollback: 'budgets advisory first',
  status: 'pending',
  approval: 'pending',
};

describe('task-record v1 (aliases, vocabulary)', () => {
  it('accepts a real-shaped record with a compact alias ID', () => {
    const r = SusTaskRecordV1.schema.safeParse(v1Fixture);
    expect(r.success).toBe(true);
  });

  it('rejects malformed IDs and unknown statuses', () => {
    expect(SusTaskRecordV1.schema.safeParse({ ...v1Fixture, id: 'bogus-task' }).success).toBe(
      false,
    );
    expect(SusTaskRecordV1.schema.safeParse({ ...v1Fixture, id: 'T12' }).success).toBe(false);
    expect(SusTaskRecordV1.schema.safeParse({ ...v1Fixture, status: 'completed' }).success).toBe(
      false,
    );
  });

  it('rejects malformed milestones and traversal evidence refs', () => {
    expect(SusTaskRecordV1.schema.safeParse({ ...v1Fixture, m: 'Phase2' }).success).toBe(false);
    expect(
      SusTaskRecordV1.schema.safeParse({ ...v1Fixture, evidence: ['/abs/path.md'] }).success,
    ).toBe(false);
    expect(
      SusTaskRecordV1.schema.safeParse({ ...v1Fixture, evidence: ['../outside.md'] }).success,
    ).toBe(false);
  });

  it('rejects unknown extra fields (strict contract)', () => {
    expect(SusTaskRecordV1.schema.safeParse({ ...v1Fixture, unknownField: 1 }).success).toBe(false);
  });
});

describe('migration v1 → v2 (additive-only)', () => {
  it('migrates the pinned fixture and validates at v2', () => {
    const migrated = applyMigrations({ ...v1Fixture }, 1, [migrateTaskRecordV1toV2], 2);
    // v2 completion rules: pending without evidence is still valid
    const parsed = TaskRecordV2.safeParse(migrated);
    expect(parsed.success).toBe(true);
  });

  it('does not drop or rewrite any v1 field (additive-only)', () => {
    const migrated = applyMigrations({ ...v1Fixture }, 1, [migrateTaskRecordV1toV2], 2);
    for (const [k, v] of Object.entries(v1Fixture)) {
      expect(migrated[k]).toEqual(v);
    }
  });

  it('refuses a registry gap instead of skipping versions', () => {
    expect(() => applyMigrations({ ...v1Fixture }, 1, [migrateTaskRecordV1toV2], 3)).toThrow(
      /registry gap/,
    );
  });
});

describe('task-record v2 completion rules (DA-40)', () => {
  const doneNoEvidence = {
    ...v1Fixture,
    status: 'done',
    approval: 'authorized',
  };

  it('done without evidence is rejected', () => {
    expect(TaskRecordV2.safeParse(doneNoEvidence).success).toBe(false);
  });

  it('done with evidence passes', () => {
    const parsed = TaskRecordV2.safeParse({
      ...doneNoEvidence,
      evidence: ['.sus-dev/VERIFICATION/T0101.md'],
    });
    expect(parsed.success).toBe(true);
  });

  it('blocked without a B-ref blocker citation is rejected', () => {
    const parsed = TaskRecordV2.safeParse({ ...v1Fixture, version: 2, status: 'blocked' });
    expect(parsed.success).toBe(false);
  });

  it('blocked citing a B-numbered blocker passes', () => {
    const parsed = TaskRecordV2.safeParse({
      ...v1Fixture,
      status: 'blocked',
      approval: 'awaiting decision recorded in B003',
    });
    expect(parsed.success).toBe(true);
  });

  it('receipt-shaped evidence outside .sus-dev/VERIFICATION/ is rejected', () => {
    const parsed = TaskRecordV2.safeParse({
      ...doneNoEvidence,
      evidence: ['docs/VERIFICATION/T0101.md'],
    });
    expect(parsed.success).toBe(false);
  });
});
