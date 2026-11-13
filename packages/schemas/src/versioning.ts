/**
 * Schema versioning pattern (T0104, implements ADR-005).
 *
 * Every SUS schema carries an `$id` and an integer `version`. Records
 * themselves do not embed a version field — TASKS.json carries the document
 * version in `meta`, and records are validated against the schema version
 * named by that meta (or by the caller). Migrations are versioned functions
 * registered in an ordered chain; they are **additive only** at v1–v2 (task
 * rollback note): a migration may add fields with defaults or narrow types
 * with an explicit fixture, never drop data silently. Migration fixtures live
 * in tests and pin the exact shape at each version.
 */
import type { z } from 'zod';

export interface SusSchema<T extends z.ZodType> {
  /** Canonical schema identifier, e.g. 'sus.task-record'. */
  readonly $id: string;
  /** Monotonic integer version, starting at 1. */
  readonly version: number;
  /** The Zod schema validating the record shape **at this version**. */
  readonly schema: T;
}

export function defineSusSchema<T extends z.ZodType>(
  $id: string,
  version: number,
  schema: T,
): SusSchema<T> {
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test($id)) {
    throw new Error(`invalid $id "${$id}": expected dotted lowercase like "sus.task-record"`);
  }
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`invalid version ${version}: expected integer >= 1`);
  }
  return { $id, version, schema };
}

/** A single migration step: from version N to N+1, additively. */
export interface Migration<A, B> {
  readonly from: number;
  readonly to: number;
  readonly migrate: (input: A) => B;
}

/**
 * Migration runner. `applyMigrations(record, fromVersion, steps, targetVersion)`
 * applies the chain strictly in order over a version-less record body; a gap
 * (e.g. requesting v1→v4 with only v1→v2 registered) is a hard error, not a
 * silent skip. The version travels outside the record, so strict record
 * schemas never see a synthetic `version` key.
 */
export function applyMigrations(
  record: Record<string, unknown>,
  fromVersion: number,
  steps: ReadonlyArray<Migration<Record<string, unknown>, Record<string, unknown>>>,
  targetVersion: number,
): Record<string, unknown> {
  const byFrom = new Map(steps.map((s) => [s.from, s]));
  let out: Record<string, unknown> = { ...record };
  let version: number = fromVersion;
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error(`invalid fromVersion ${fromVersion}`);
  }
  while (version !== targetVersion) {
    const step = byFrom.get(version);
    if (!step) {
      throw new Error(`no migration from version ${version} to ${targetVersion}: registry gap`);
    }
    // The step declares its destination (step.to); the runner owns the version
    // bookkeeping, so migration bodies never carry a synthetic version key.
    out = step.migrate(out);
    version = step.to;
  }
  return out;
}
