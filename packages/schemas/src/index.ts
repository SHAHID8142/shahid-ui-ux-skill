/**
 * @sus/schemas — Zod contracts + generated JSON Schema (ADR-005).
 * T0104: schema versioning pattern + compact task-record contract.
 * Future schemas register here with the same $id/version/migration pattern.
 */
export { applyMigrations, defineSusSchema, type Migration, type SusSchema } from './versioning.js';
export {
  SUS_SCHEMA_REGISTRY,
  SusTaskRecordV1,
  SusTaskRecordV2,
  TASK_PHASES,
  TASK_STATUSES,
  TaskId,
  TaskRecordCurrent,
  TaskRecordV1,
  TaskRecordV2,
  Lease,
  Milestone,
  migrateTaskRecordV1toV2,
} from './task-record.js';
