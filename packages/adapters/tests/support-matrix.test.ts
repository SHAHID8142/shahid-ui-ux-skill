/**
 * T0901: adapter interface + support matrix — tiers derive from evidence,
 * never guesses; unbuilt hosts stay 'expected'/'unsupported' with explicit
 * evidence references.
 */
import { describe, expect, it } from 'vitest';
import { generateSupportMatrix, supportTier, type HostAdapter } from '../src/index.js';

const adapters: HostAdapter[] = [
  {
    id: 'claude-code',
    installMethod: 'generated plugin entry (T0904)',
    smokeTest: 'sus doctor --host claude-code',
    capabilities: {
      skillTriggering: 'expected',
      cliExecution: 'expected',
      jitReferenceLoading: 'expected',
      liveStudio: 'expected',
    },
    evidence: 'none yet — tiers are expectations, not claims',
  },
  {
    id: 'cli-generic',
    installMethod: 'npx sus',
    smokeTest: 'sus capabilities',
    capabilities: {
      skillTriggering: 'unsupported',
      cliExecution: 'verified',
      jitReferenceLoading: 'verified',
      liveStudio: 'unsupported',
    },
    evidence: 'packages/adapters/tests/cli.test.ts (smoke verified this session)',
  },
];

describe('support matrix (T0901)', () => {
  it('tiers derive from capabilities: mixed = experimental, verified = supported', () => {
    expect(supportTier(adapters[0]!.capabilities)).toBe('experimental');
    expect(supportTier(adapters[1]!.capabilities)).toBe('experimental');
    expect(
      supportTier({
        skillTriggering: 'verified',
        cliExecution: 'verified',
        jitReferenceLoading: 'verified',
        liveStudio: 'verified',
      }),
    ).toBe('supported');
    expect(
      supportTier({
        skillTriggering: 'unsupported',
        cliExecution: 'unsupported',
        jitReferenceLoading: 'unsupported',
        liveStudio: 'unsupported',
      }),
    ).toBe('unsupported');
  });
  it('generated matrix carries no verified claims without evidence', () => {
    const md = generateSupportMatrix(adapters);
    expect(md).toContain('| claude-code | experimental |');
    expect(md).not.toMatch(/\| \w+ \| supported \|/); // no unverified 'supported' rows
    expect(md).toContain('none yet — tiers are expectations, not claims');
  });
});
