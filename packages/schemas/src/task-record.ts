/**
 * Compact task-record contract (T0104, DA-40).
 *
 * Validates one record of TASKS.json: stable IDs with compact aliases
 * (T0152b/T0700w), the permitted status vocabulary, evidence references that
 * must be repo-relative paths, and the completion rules the continuation
 * checker (T0010) enforces in file form.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

/** Task ID: T + 3–4 digits + up to two lowercase alias letters (T0152b). */
export const TaskId = z
  .string()
  .regex(/^T\d{3,4}[a-z]{0,2}$/, 'task ID must match T#### with optional 2-letter alias');

export const TASK_STATUSES = ['pending', 'review', 'done', 'blocked'] as const;
export const TASK_PHASES = ['planning', 'build', 'post-build-audit', 'publication'] as const;

/** Milestone token: M + digits + optional .digit (M1, M1.5, M7.9). */
export const Milestone = z
  .string()
  .regex(/^M\d+(?:\.\d+)?$/, 'milestone must look like M1 or M1.5');

const RepoPath = z
  .string()
  .min(1)
  .refine((p) => !p.startsWith('/') && !p.includes('..'), {
    message: 'evidence refs must be repo-relative paths without traversal',
  });

export const Lease = z
  .object({
    session: z.string().min(1),
    task: TaskId,
    branch: z.string().min(1),
    baseSha: z.string().min(7),
    acquired: z.string().min(1),
    expires: z.string().min(1),
    fencingGeneration: z.number().int().nonnegative(),
  })
  .strict();

/** v1: the planning-v1.2 record shape actually present in TASKS.json today. */
export const TaskRecordV1 = z
  .object({
    id: TaskId,
    m: Milestone,
    title: z.string().min(1),
    obj: z.string().min(1),
    deps: z.array(TaskId),
    files: z.array(z.string()),
    acc: z.array(z.string()),
    tests: z.array(z.string()),
    risk: z.string().min(1),
    rollback: z.string().min(1),
    status: z.enum(TASK_STATUSES),
    approval: z.string().min(1),
    phase: z.enum(TASK_PHASES).optional(),
    owner: z.string().nullable().optional(),
    lease: Lease.nullable().optional(),
    evidence: z.array(RepoPath).optional(),
    commit: z.string().optional(),
  })
  .strict();

export const SusTaskRecordV1 = defineSusSchema('sus.task-record', 1, TaskRecordV1);

/**
 * v2 (additive): requires the completion rules explicitly.
 * - done ⇒ evidence must be present and non-empty
 * - blocked ⇒ approval must name a blocker (B-ref)
 * - every receipt evidence ref must point into .sus-dev/VERIFICATION/
 */
export const TaskRecordV2 = TaskRecordV1.superRefine((rec, ctx) => {
  if (rec.status === 'done' && (!rec.evidence || rec.evidence.length === 0)) {
    ctx.addIssue({
      code: 'custom',
      message: 'done task must reference evidence',
      path: ['evidence'],
    });
  }
  if (rec.status === 'blocked' && !/(^|\s)B\d{3}\b/.test(rec.approval)) {
    ctx.addIssue({
      code: 'custom',
      message: 'blocked task must cite a B-numbered blocker in approval',
      path: ['approval'],
    });
  }
  for (const [i, e] of (rec.evidence ?? []).entries()) {
    if (e.includes('VERIFICATION') && !e.startsWith('.sus-dev/VERIFICATION/')) {
      ctx.addIssue({
        code: 'custom',
        message: `receipt ref "${e}" must live under .sus-dev/VERIFICATION/`,
        path: ['evidence', i],
      });
    }
  }
});

export const SusTaskRecordV2 = defineSusSchema('sus.task-record', 2, TaskRecordV2);

/** v1 → v2 migration: additive only — nothing is removed or rewritten. */
export const migrateTaskRecordV1toV2 = {
  from: 1,
  to: 2,
  migrate: (input: Record<string, unknown>): Record<string, unknown> => ({ ...input }),
} as const;

export { TaskRecordV1 as TaskRecordCurrent, SusTaskRecordV1 as SusTaskRecordCurrent };

/** Schema registry used by the JSON-Schema export + sync check. */
export const SUS_SCHEMA_REGISTRY = [SusTaskRecordV1, SusTaskRecordV2] as const;

// Additional registries live next to their schemas and are merged by the
// exporter (see index.ts SUS_SCHEMA_REGISTRY_ALL).
