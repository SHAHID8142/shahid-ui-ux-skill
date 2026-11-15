/**
 * T1002 — the claim gate and the seals are what make the protocol enforceable.
 *
 * A protocol document can say anything. These tests pin the two machine-checkable
 * promises: held-out briefs are sealed by hash, and a comparative claim is denied
 * until every arm has measured data.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
// @ts-expect-error — plain ESM helper shared with the runner
import {
  checkSeals,
  comparativeClaimAllowed,
  inverseNormal,
  sampleSizePerArm,
  sealBriefs,
} from '../../../scripts/lib/benchmark.mjs';

const ROOT = join(__dirname, '../../..');

interface Arm {
  status: string;
}

const arms = (overrides: Record<string, Arm> = {}): { arms: Record<string, Arm> } => ({
  arms: {
    baseline: { status: 'measured' },
    'sus-assisted': { status: 'measured' },
    human: { status: 'measured' },
    ...overrides,
  },
});

describe('held-out seals (T1002)', () => {
  it('the committed seals match the held-out briefs on disk', () => {
    const seals = JSON.parse(
      readFileSync(join(ROOT, 'evals/benchmarks/seals.json'), 'utf8'),
    ).briefs;
    const dir = join(ROOT, 'evals/briefs/held-out');
    const entries = readdirSync(dir)
      .filter((name) => name.endsWith('.md') && name !== 'README.md')
      .map((name) => ({ name, content: readFileSync(join(dir, name), 'utf8') }));
    const result = checkSeals(seals, entries);
    expect(result.ok).toBe(true);
    expect(Object.keys(seals).length).toBe(entries.length);
  });

  it('an edited held-out brief drifts and voids the run', () => {
    const seals = sealBriefs([{ name: 'a.md', content: 'original' }]);
    const result = checkSeals(seals, [{ name: 'a.md', content: 'edited' }]);
    expect(result.ok).toBe(false);
    expect(result.drifted).toEqual(['a.md']);
  });

  it('a deleted held-out brief is missing, not silently accepted', () => {
    const seals = sealBriefs([{ name: 'a.md', content: 'x' }]);
    expect(checkSeals(seals, []).missing).toEqual(['a.md']);
  });
});

describe('power rationale (DA-43)', () => {
  it('reproduces the numbers stated in the protocol', () => {
    expect(sampleSizePerArm({ effect: 0.5, sd: 0.8 })).toBe(41);
    expect(sampleSizePerArm({ effect: 0.5, sd: 1 })).toBe(63);
  });

  it('demands a larger sample for a smaller effect', () => {
    const small = sampleSizePerArm({ effect: 0.25, sd: 0.8 });
    const large = sampleSizePerArm({ effect: 1, sd: 0.8 });
    expect(small).toBeGreaterThan(large);
  });

  it('refuses meaningless inputs instead of returning a number', () => {
    expect(() => sampleSizePerArm({ effect: 0, sd: 1 })).toThrow();
    expect(() => sampleSizePerArm({ effect: 0.5, sd: 0 })).toThrow();
  });

  it('inverse normal matches the standard quantiles', () => {
    expect(inverseNormal(0.975)).toBeCloseTo(1.96, 2);
    expect(inverseNormal(0.8)).toBeCloseTo(0.8416, 3);
  });
});

describe('claim gate (PRD Part 9)', () => {
  it('allows a claim only when all three arms are measured', () => {
    const status = { ...arms(), heldOutInspected: false, reproducibleBy: 'pnpm benchmark' };
    expect(comparativeClaimAllowed(status).allowed).toBe(true);
  });

  it('denies the claim while the human arm has not run', () => {
    const result = comparativeClaimAllowed({
      ...arms({ human: { status: 'not-run' } }),
      heldOutInspected: false,
      reproducibleBy: 'pnpm benchmark',
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(' ')).toContain('human');
  });

  it('denies the claim when the held-out set was inspected during tuning', () => {
    const result = comparativeClaimAllowed({
      ...arms(),
      heldOutInspected: true,
      reproducibleBy: 'pnpm benchmark',
    });
    expect(result.allowed).toBe(false);
    expect(result.reasons.join(' ')).toContain('held-out');
  });

  it('denies the claim when the run is not reproducible by one command', () => {
    const result = comparativeClaimAllowed({ ...arms(), heldOutInspected: false });
    expect(result.allowed).toBe(false);
  });

  it('an absent status cannot be read as permission', () => {
    expect(comparativeClaimAllowed(undefined).allowed).toBe(false);
  });
});
