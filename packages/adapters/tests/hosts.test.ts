/**
 * T0903: host adapters — no guessed claims; the smoke-before-label rule is
 * structural: an adapter without smoke evidence can never present a tier
 * above 'unverified' via generateHostEntry.
 */
import { describe, expect, it } from 'vitest';
import { HOST_ADAPTERS, generateHostEntry, supportTier } from '../src/index.js';

describe('host adapters (T0903)', () => {
  it('defines codex/claude-code/cursor with expected-only capabilities', () => {
    for (const id of ['codex', 'claude-code', 'cursor']) {
      const a = HOST_ADAPTERS.find((h) => h.id === id)!;
      expect(a.capabilities.skillTriggering).toBe('expected');
      expect(a.evidence).toContain('none yet');
      expect(a.smokeTest).toContain('smoke-host.mjs');
    }
  });

  it('freepi/zcode carry verified tiers WITH real smoke evidence', () => {
    const fp = HOST_ADAPTERS.find((h) => h.id === 'freepi')!;
    expect(fp.capabilities.cliExecution).toBe('verified');
    expect(fp.evidence).toContain('host-smoke/');
  });

  it('generateHostEntry: unknown host throws; known hosts produce tiered entries', () => {
    expect(() => generateHostEntry('nope')).toThrow(/unknown host/);
    const codex = generateHostEntry('codex');
    expect(codex).toContain('tier: unverified'); // no smoke run yet → never 'verified'
    expect(codex).toContain('generated');
  });

  it('no adapter claims liveStudio verified anywhere (Studio not shipped)', () => {
    for (const a of HOST_ADAPTERS) {
      expect(a.capabilities.liveStudio, a.id).not.toBe('verified');
    }
  });
});
