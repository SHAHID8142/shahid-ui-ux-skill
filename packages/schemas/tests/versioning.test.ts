/** Versioning pattern unit tests (T0104). */
import { describe, expect, it } from 'vitest';
import { applyMigrations, defineSusSchema } from '../src/index.js';
import { z } from 'zod';

describe('defineSusSchema', () => {
  it('accepts dotted lowercase $id and version >= 1', () => {
    const s = defineSusSchema('sus.example', 1, z.object({ a: z.string() }));
    expect(s.$id).toBe('sus.example');
    expect(s.version).toBe(1);
  });

  it('rejects malformed $id and version', () => {
    expect(() => defineSusSchema('Example', 1, z.object({}))).toThrow(/invalid \$id/);
    expect(() => defineSusSchema('sus.ok', 0, z.object({}))).toThrow(/invalid version/);
    expect(() => defineSusSchema('sus.ok', 1.5, z.object({}))).toThrow(/invalid version/);
  });
});

describe('applyMigrations', () => {
  const step1 = {
    from: 1,
    to: 2,
    migrate: (r: Record<string, unknown>) => ({ ...r, added: true }),
  };
  const step2 = {
    from: 2,
    to: 3,
    migrate: (r: Record<string, unknown>) => ({ ...r, addedMore: true }),
  };

  it('chains steps in order over a version-less record body', () => {
    const out = applyMigrations({ a: 1 }, 1, [step1, step2], 3);
    expect(out.added).toBe(true);
    expect(out.addedMore).toBe(true);
    // the runner owns versioning: no synthetic version key is injected
    expect(out.version).toBeUndefined();
  });

  it('refuses a registry gap instead of skipping versions', () => {
    expect(() => applyMigrations({ a: 1 }, 1, [step1], 3)).toThrow(/registry gap/);
  });

  it('refuses a non-integer starting version', () => {
    expect(() => applyMigrations({ a: 1 }, 0, [step1], 2)).toThrow(/invalid fromVersion/);
  });

  it('errors on a broken steps argument rather than silently skipping', () => {
    // steps must be an array of registered migrations; a string is a caller bug
    expect(() => applyMigrations({ a: 1 }, 1, 'not-a-list' as never, 2)).toThrow();
  });
});
