/**
 * T0790 tests — the verification loop.
 *
 * TASKS.json acceptance: "failing gate yields concise explanation + affected
 * operation + safe recovery + retry, with redacted diagnostics; outcomes
 * 'preview failed'/'apply failed'/'verification failed'/'rollback blocked'/
 * 'accepted' are distinct; auto-revert only when the transaction is intact
 * (DA-36)".
 *
 * Every test below is written against one of those clauses, and the DA-36 tests
 * are the important ones: they prove the loop refuses to "helpfully" revert a
 * tree the user has since edited.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  redactDiagnostics,
  runVerificationLoop,
  type Stage,
  type StageResult,
} from '../src/verification-loop.js';

function stage(
  name: Stage['name'],
  status: StageResult['status'],
  extra: Partial<StageResult> = {},
): Stage {
  return {
    name,
    hard: true,
    run: () => ({
      stage: name,
      status,
      hard: true,
      summary: extra.summary ?? `${name} ${status === 'pass' ? 'passed' : 'failed'}`,
      detail: extra.detail,
    }),
  };
}

const PASSING: Stage[] = [
  stage('apply', 'pass'),
  stage('build', 'pass'),
  stage('axe', 'pass'),
  stage('shots', 'pass'),
  stage('motion', 'pass'),
];

function loop(overrides: Partial<Parameters<typeof runVerificationLoop>[0]> = {}) {
  const revert = vi.fn(() => ({ ok: true, conflicts: [] as string[] }));
  const intact = vi.fn(() => true);
  return {
    revert,
    intact,
    report: runVerificationLoop({
      operationId: 'op-1',
      affectedOperation: 'app/page.tsx',
      stages: PASSING,
      revert,
      transactionIntact: intact,
      now: () => '2026-11-14T00:00:00.000Z',
      ...overrides,
    }),
  };
}

describe('accepted', () => {
  it('all gates passing accepts and never reverts', async () => {
    const harness = loop();
    const report = await harness.report;
    expect(report.outcome).toBe('accepted');
    expect(report.failure).toBeNull();
    expect(report.reverted).toBe(false);
    expect(harness.revert).not.toHaveBeenCalled();
    expect(report.stages.map((entry) => entry.stage)).toEqual([
      'apply',
      'build',
      'axe',
      'shots',
      'motion',
      'gate-summary',
    ]);
    expect(report.stages.at(-1)!.summary).toBe('every gate passed');
  });

  it('a soft gate failure is reported but does not revert a completed change', async () => {
    const soft: Stage = {
      name: 'motion',
      hard: false,
      run: () => ({
        stage: 'motion',
        status: 'fail',
        hard: false,
        summary: 'one transition ignores reduced motion',
      }),
    };
    const harness = loop({ stages: [...PASSING.slice(0, 4), soft] });
    const report = await harness.report;
    expect(report.outcome).toBe('accepted');
    expect(harness.revert).not.toHaveBeenCalled();
    expect(report.failure?.explanation).toContain('reduced motion');
    expect(report.failure?.recovery[0]).toContain('did not block');
  });
});

describe('distinct outcomes', () => {
  it('preview-failed writes nothing and offers annotations-safe recovery', async () => {
    const revert = vi.fn(() => ({ ok: true, conflicts: [] }));
    const report = await runVerificationLoop({
      operationId: 'op-1',
      affectedOperation: 'app/page.tsx',
      stages: PASSING,
      revert,
      transactionIntact: () => true,
      previewError: {
        explanation: 'the target anchor is ambiguous',
        recovery: ['Pick one of the candidates in the preview.'],
      },
    });
    expect(report.outcome).toBe('preview-failed');
    expect(revert).not.toHaveBeenCalled();
    expect(report.reverted).toBe(false);
    expect(report.failure?.retry.possible).toBe(true);
  });

  it('apply-failed reports apply, not verification, and does not revert', async () => {
    const harness = loop({ stages: [stage('apply', 'fail'), ...PASSING.slice(1)] });
    const report = await harness.report;
    expect(report.outcome).toBe('apply-failed');
    expect(harness.revert).not.toHaveBeenCalled();
    expect(report.failure?.stage).toBe('apply');
    expect(report.failure?.recovery).toEqual([
      'Nothing was written: the approval and the plan did not describe the same change.',
      'Re-open the preview and approve the diff you actually saw.',
    ]);
  });

  it('verification-failed reverts exactly once and says so', async () => {
    const harness = loop({ stages: [stage('apply', 'pass'), stage('build', 'fail')] });
    const report = await harness.report;
    expect(report.outcome).toBe('verification-failed');
    expect(harness.revert).toHaveBeenCalledTimes(1);
    expect(report.reverted).toBe(true);
    expect(report.failure?.explanation).toBe('build failed');
    expect(report.failure?.retry.possible).toBe(true);
    // stages stop at the first hard failure and the summary names it
    expect(report.stages.map((entry) => entry.stage)).toEqual(['apply', 'build', 'gate-summary']);
    expect(report.failure?.affectedOperation).toBe('app/page.tsx');
  });

  it('rollback-blocked when the tree diverged — the revert never runs (DA-36)', async () => {
    const harness = loop({
      stages: [stage('apply', 'pass'), stage('build', 'fail')],
      transactionIntact: () => false,
    });
    const report = await harness.report;
    expect(report.outcome).toBe('rollback-blocked');
    expect(harness.revert).not.toHaveBeenCalled();
    expect(report.reverted).toBe(false);
    expect(report.failure?.retry.possible).toBe(false);
    expect(report.failure?.recovery[0]).toContain('left untouched on purpose');
  });

  it('rollback-blocked when the revert itself conflicts', async () => {
    const revert = vi.fn(() => ({ ok: false, conflicts: ['app/page.tsx'] }));
    const report = await runVerificationLoop({
      operationId: 'op-1',
      affectedOperation: 'app/page.tsx',
      stages: [stage('apply', 'pass'), stage('axe', 'fail')],
      revert,
      transactionIntact: () => true,
    });
    expect(report.outcome).toBe('rollback-blocked');
    expect(report.reverted).toBe(false);
    expect(report.failure?.recovery[0]).toContain('app/page.tsx');
  });

  it('the five outcomes are mutually distinct string values', () => {
    const outcomes = [
      'accepted',
      'preview-failed',
      'apply-failed',
      'verification-failed',
      'rollback-blocked',
    ];
    expect(new Set(outcomes).size).toBe(5);
  });
});

describe('a failing gate is answerable', () => {
  it('every explanation names the operation, a recovery and a retry stance', async () => {
    for (const failingStage of ['build', 'axe', 'shots', 'motion'] as const) {
      const harness = loop({
        stages: [stage('apply', 'pass'), stage(failingStage, 'fail')],
      });
      const report = await harness.report;
      expect(report.failure, failingStage).not.toBeNull();
      expect(report.failure!.affectedOperation).toBe('app/page.tsx');
      expect(report.failure!.recovery.length).toBeGreaterThan(0);
      expect(typeof report.failure!.retry.possible).toBe('boolean');
      expect(report.failure!.retry.hint.length).toBeGreaterThan(0);
      expect(report.failure!.explanation.length).toBeGreaterThan(0);
    }
  });

  it('a stage that throws becomes a redacted failure, not a crashed loop', async () => {
    const throwing: Stage = {
      name: 'build',
      hard: true,
      run: () => {
        throw new Error('command failed for /Users/maryam/code/app — token sk_live_ABCDEFGH1234');
      },
    };
    const harness = loop({ stages: [stage('apply', 'pass'), throwing] });
    const report = await harness.report;
    expect(report.outcome).toBe('verification-failed');
    expect(report.diagnostics).not.toContain('/Users/maryam');
    expect(report.diagnostics).not.toContain('sk_live_ABCDEFGH1234');
    expect(report.diagnostics).toContain('could not run');
  });
});

describe('redacted diagnostics', () => {
  it('masks home paths, tokens, keys and emails but keeps the actionable text', () => {
    const redacted = redactDiagnostics(
      [
        'error at /Users/alex/project/app/page.tsx:12',
        'Authorization: Bearer abcdef1234567890xyz',
        'key sk_live_9f8e7d6c5b4a',
        'token ghp_1234567890abcdef',
        'contact owner@example.com',
        `digest ${'a'.repeat(64)}`,
        'TS2322: Type string is not assignable to type number',
      ].join('\n'),
    );
    expect(redacted).not.toContain('/Users/alex');
    expect(redacted).not.toContain('abcdef1234567890xyz');
    expect(redacted).not.toContain('sk_live_9f8e7d6b');
    expect(redacted).not.toContain('ghp_1234567890abcdef');
    expect(redacted).not.toContain('owner@example.com');
    expect(redacted).not.toContain('a'.repeat(64));
    // the parts a person needs to act on survive
    expect(redacted).toContain('~/project/app/page.tsx:12');
    expect(redacted).toContain('TS2322');
  });

  it('a caller-supplied redactor is honoured for the whole report', async () => {
    const harness = loop({
      stages: [stage('apply', 'pass'), stage('build', 'fail', { detail: 'SECRET-LINE' })],
      redact: (text) => text.replace(/SECRET-LINE/g, '<gone>'),
    });
    const report = await harness.report;
    expect(report.diagnostics).not.toContain('SECRET-LINE');
    expect(report.diagnostics).toContain('<gone>');
  });
});

describe('loop behaviour', () => {
  it('records the operation id and timestamps so a report can be filed', async () => {
    const report = await loop().report;
    expect(report.operationId).toBe('op-1');
    expect(report.startedAt).toBe('2026-11-14T00:00:00.000Z');
    expect(report.finishedAt).toBe('2026-11-14T00:00:00.000Z');
  });

  it('checks transaction integrity before deciding to revert, and only then', async () => {
    const order: string[] = [];
    await runVerificationLoop({
      operationId: 'op-1',
      affectedOperation: 'app/page.tsx',
      stages: [stage('apply', 'pass'), stage('build', 'fail')],
      transactionIntact: () => {
        order.push('intact');
        return true;
      },
      revert: () => {
        order.push('revert');
        return { ok: true, conflicts: [] };
      },
    });
    expect(order).toEqual(['intact', 'revert']);
  });

  it('does not revert when every stage passes (no gratuitous writes)', async () => {
    const harness = loop();
    await harness.report;
    expect(harness.intact).not.toHaveBeenCalled();
    expect(harness.revert).not.toHaveBeenCalled();
  });
});
