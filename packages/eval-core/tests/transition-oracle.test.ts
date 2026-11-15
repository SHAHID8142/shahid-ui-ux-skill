/**
 * T0603 tests — behavioural transition oracles (G6).
 *
 * Each case below is a real failure mode from the acceptance criteria: fast
 * repeated clicks, stale async, unmount mid-animation, interruption that does not
 * converge, and reduced-motion parity. They are traces on a hand-built virtual
 * clock (no timers, no flake) and they never consult the state machine that
 * produced the transitions — that independence is the point.
 */
import { describe, expect, it } from 'vitest';
import {
  SETTLE_MS,
  evaluateTransitionOracles,
  informationTokens,
  type Observation,
  type OracleCase,
} from '../src/harness/transition-oracle.js';

const obs = (at: number, state: string, extra: Partial<Observation> = {}): Observation => ({
  at,
  state,
  text: extra.text ?? '',
  visualOnly: extra.visualOnly ?? false,
  ...extra,
});

const oracleCase = (overrides: Partial<OracleCase> = {}): OracleCase => ({
  id: 'case-1',
  scenario: 'rapid-toggle',
  modality: 'pointer-hover',
  expectedFinalState: 'default',
  trace: [
    obs(0, 'default', { text: 'Save' }),
    obs(90, 'hover', { visualOnly: true }),
    obs(180, 'default', { text: 'Save' }),
  ],
  ...overrides,
});

describe('clean traces pass', () => {
  it('a rapid toggle that converges on the expected state passes', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        trace: [
          obs(0, 'default', { text: 'Save' }),
          obs(50, 'hover', { visualOnly: true }),
          obs(140, 'default', { text: 'Save' }),
          obs(150, 'hover', { visualOnly: true }),
          obs(260, 'default', { text: 'Save' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('pass');
    expect(verdict.gate).toBe('G6');
  });

  it('an interrupted transition that lands on the queued state passes', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'interruption',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'default', { text: 'Save' }),
          obs(20, 'loading', { text: 'Saving…' }),
          obs(400, 'success', { text: 'Saved' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });

  it('a cancelled action returning to its previous state passes', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'cancel',
        trace: [obs(0, 'default', { text: 'Delete' }), obs(300, 'default', { text: 'Delete' })],
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });
});

describe('flash-as-only-feedback', () => {
  it('fails a sub-settle visual-only state with no text change', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        trace: [
          obs(0, 'default', { text: 'Submit' }),
          obs(100, 'success', { visualOnly: true, text: 'Submit' }),
          obs(100 + SETTLE_MS - 10, 'default', { text: 'Submit' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toContain('flash-as-only-feedback');
  });

  it('allows a sub-settle visual state that also changes text (the text is the feedback)', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        trace: [
          obs(0, 'default', { text: 'Submit' }),
          obs(100, 'success', { visualOnly: true, text: 'Submitted' }),
          obs(120, 'default', { text: 'Submit' }),
        ],
      }),
    ]);
    expect(verdict.detail.join(' ')).not.toContain('flash-as-only-feedback');
  });

  it('allows a slow visual-only state — it is perceivable, if not informative', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        trace: [
          obs(0, 'default', { text: 'Copy' }),
          obs(100, 'success', { visualOnly: true, text: 'Copy' }),
          obs(100 + SETTLE_MS + 40, 'default', { text: 'Copy' }),
        ],
      }),
    ]);
    expect(verdict.detail.join(' ')).not.toContain('flash-as-only-feedback');
  });
});

describe('convergence after interruption', () => {
  it('fails when the component settles somewhere else', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'interruption',
        expectedFinalState: 'default',
        trace: [
          obs(0, 'default', { text: 'x' }),
          obs(20, 'loading', { text: 'saving' }),
          obs(900, 'loading', { text: 'saving' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toContain('state-diverged');
  });

  it('fails when the state oscillates after the last input (toast timing bug)', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        expectedFinalState: 'default',
        trace: [
          obs(0, 'default', { text: 'x' }),
          obs(300, 'success', { text: 'saved' }),
          obs(600, 'default', { text: 'x' }),
          obs(900, 'success', { text: 'saved' }),
        ],
      }),
    ]);
    expect(verdict.detail.join(' ')).toContain('state-diverged');
  });
});

describe('stale async', () => {
  it('fails an older sequence applied after a newer one', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'stale-async',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'loading', { text: 'searching', seq: 1 }),
          obs(100, 'success', { text: 'results for b', seq: 2 }),
          obs(140, 'success', { text: 'results for a', seq: 1 }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toContain('stale-async-applied');
  });

  it('allows out-of-order arrival that is discarded rather than applied', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'stale-async',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'loading', { text: 'searching', seq: 1 }),
          obs(100, 'success', { text: 'results for b', seq: 2 }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });
});

describe('unmount mid-animation', () => {
  it('fails when a control stays interactive after unmount', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'unmount-mid-animation',
        expectedFinalState: 'unmounted',
        trace: [
          obs(0, 'default', { text: 'x' }),
          obs(80, 'unmounted', { mounted: false, text: '' }),
          obs(120, 'success', { text: 'Saved' }),
        ],
      }),
    ]);
    expect(verdict.detail.join(' ')).toContain('unmount-left-interactive');
  });

  it('passes when unmount ends the interaction cleanly', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'unmount-mid-animation',
        expectedFinalState: 'unmounted',
        trace: [
          obs(0, 'loading', { text: 'saving' }),
          obs(80, 'unmounted', { mounted: false, text: '' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });
});

describe('reduced-motion information parity', () => {
  const baseline = [
    obs(0, 'default', { text: 'Submit order' }),
    obs(50, 'loading', { text: 'Authorising payment' }),
    obs(400, 'success', { text: 'Payment captured; receipt 1234' }),
  ];

  it('passes when the reduced trace carries the same information without travel', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'reduced-motion',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'default', { text: 'Submit order' }),
          obs(10, 'loading', { text: 'Authorising payment' }),
          obs(60, 'success', { text: 'Payment captured; receipt 1234' }),
        ],
        baselineTrace: baseline,
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });

  it('fails when reduced motion drops information', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'reduced-motion',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'default', { text: 'Submit order' }),
          obs(60, 'success', { text: 'Payment captured; receipt 1234' }),
        ],
        baselineTrace: baseline,
      }),
    ]);
    expect(verdict.detail.join(' ')).toContain('reduced-motion-information-lost');
  });

  it('fails when only the reduced variant shows information', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'reduced-motion',
        expectedFinalState: 'success',
        trace: [
          obs(0, 'default', { text: 'Submit order' }),
          obs(10, 'loading', { text: 'Authorising payment' }),
          obs(60, 'success', { text: 'Payment captured; receipt 1234' }),
          obs(70, 'success', { text: 'Reduced motion notice' }),
        ],
        baselineTrace: baseline,
      }),
    ]);
    expect(verdict.detail.join(' ')).toContain('reduced-motion-information-added');
  });
});

describe('modality (keyboard / touch / no-hover)', () => {
  it('fails a touch trace that relies on a hover-only state', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        scenario: 'modality',
        modality: 'touch',
        trace: [
          obs(0, 'default', { text: 'Open' }),
          obs(100, 'hover', { visualOnly: true, hoverOnly: true }),
          obs(200, 'default', { text: 'Open' }),
        ],
      }),
    ]);
    expect(verdict.detail.join(' ')).toContain('hover-only-modality');
  });

  it('allows the same trace with a pointer that can hover', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        modality: 'pointer-hover',
        trace: [
          obs(0, 'default', { text: 'Open' }),
          obs(100, 'hover', { visualOnly: true, hoverOnly: true }),
          obs(200, 'default', { text: 'Open' }),
        ],
      }),
    ]);
    expect(verdict.status).toBe('pass');
  });
});

describe('fail-closed and evidence', () => {
  it('fails with no cases at all', () => {
    const verdict = evaluateTransitionOracles([]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail[0]).toContain('fails closed');
  });

  it('fails a case with no observations instead of skipping it', () => {
    const verdict = evaluateTransitionOracles([oracleCase({ trace: [] })]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail[0]).toContain('no observations');
  });

  it('reports every failing oracle, not just the first', () => {
    const verdict = evaluateTransitionOracles([
      oracleCase({
        trace: [
          obs(0, 'default', { text: 'x' }),
          obs(100, 'success', { visualOnly: true, text: 'x' }),
          obs(110, 'error', { text: 'x', seq: 2 }),
          obs(120, 'loading', { text: 'x', seq: 1 }),
        ],
      }),
    ]);
    const joined = verdict.detail.join(' ');
    expect(joined).toContain('flash-as-only-feedback');
    expect(joined).toContain('stale-async-applied');
    expect(joined).toContain('state-diverged');
    expect(verdict.evidence).toContain('case-1');
  });

  it('extracts information tokens deterministically', () => {
    const tokens = informationTokens([
      obs(0, 'a', { text: 'Saved; Receipt 12' }),
      obs(10, 'b', { text: 'Saved' }),
    ]);
    expect(tokens).toEqual(['Receipt 12', 'Saved']);
  });
});
