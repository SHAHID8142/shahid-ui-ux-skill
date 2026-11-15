/**
 * T1004 — the claim checker is a gate, so its exemptions must be narrow.
 *
 * Two failure modes are pinned here: a checker that blocks honest limitation
 * statements (which pushes authors to delete the limitation), and a checker that
 * lets a comparative claim through while the benchmark gate is closed.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM helper shared with the CLI
import {
  EXEMPT_FILES,
  findClaims,
  gateOpenFromStatus,
  isNegated,
  stripCode,
} from '../../../scripts/lib/claims.mjs';

describe('claim detection (T1004)', () => {
  it('blocks comparative language while the benchmark gate is closed', () => {
    const findings = findClaims('SUS beats the baseline on every brief.', { gateOpen: false });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('comparative');
  });

  it('allows the same sentence once the gate is open', () => {
    expect(findClaims('SUS beats the baseline on every brief.', { gateOpen: true })).toEqual([]);
  });

  it('blocks absolute claims even with the gate open', () => {
    for (const text of [
      'This guarantees WCAG conformance.',
      'The detector is 100% accessible.',
      'It is proven to be correct.',
      'The suite never fails.',
    ]) {
      expect(findClaims(text, { gateOpen: true }).length, text).toBeGreaterThan(0);
    }
  });

  it('does not block an honest limitation statement', () => {
    const findings = findClaims('SUS does not guarantee ranking or conversion.', {
      gateOpen: false,
    });
    expect(findings).toEqual([]);
  });

  it('does not treat a documented comparison policy as a claim', () => {
    const text = 'No comparative claim may appear before the run: `beats`, `superior`, `faster`.';
    expect(findClaims(text, { gateOpen: false })).toEqual([]);
  });

  it('reports a line number so the failure is actionable', () => {
    const findings = findClaims('intro\nmore\nthis outperforms the alternative', {
      gateOpen: false,
    });
    expect(findings[0].line).toBe(3);
  });

  it('reports a repeated pattern once per line', () => {
    expect(findClaims('beats beats beats', { gateOpen: false })).toHaveLength(1);
  });
});

describe('claim checker helpers', () => {
  it('strips fenced blocks and inline code before matching', () => {
    expect(stripCode('a ```better than``` b `beats` c')).not.toMatch(/better than|beats/);
  });

  it('recognises negation rather than matching a substring', () => {
    expect(isNegated('it is not superior', 'it is not '.length)).toBe(true);
    expect(isNegated('it is superior', 'it is '.length)).toBe(false);
  });

  it('reads the gate from the benchmark artefact, not from a config flag', () => {
    expect(gateOpenFromStatus({ gate: { allowed: true } })).toBe(true);
    expect(gateOpenFromStatus({ gate: { allowed: false } })).toBe(false);
    expect(gateOpenFromStatus({})).toBe(false);
    expect(gateOpenFromStatus(undefined)).toBe(false);
  });

  it('exempts only documents whose job is to discuss claims', () => {
    expect(EXEMPT_FILES.has('evals/benchmarks/PROTOCOL.md')).toBe(true);
    expect(EXEMPT_FILES.has('README.md')).toBe(false);
    expect(EXEMPT_FILES.has('docs/LIMITATIONS.md')).toBe(false);
  });
});
