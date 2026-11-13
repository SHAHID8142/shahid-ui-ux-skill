/**
 * Host adapter interface (T0901, ADR-002). A host adapter declares what it
 * can detect and do — every field is evidence-backed; NO GUESSED CLAIMS.
 * The support matrix is generated from adapters, never hand-written.
 */
export interface HostCapabilities {
  /** Host can trigger the skill on matching requests. */
  skillTriggering: 'verified' | 'expected' | 'unsupported';
  /** Host can run the deterministic CLI (npx/node). */
  cliExecution: 'verified' | 'expected' | 'unsupported';
  /** Host can load skill reference files just-in-time. */
  jitReferenceLoading: 'verified' | 'expected' | 'unsupported';
  /** Host can execute Live Studio bridge flows. */
  liveStudio: 'verified' | 'expected' | 'unsupported';
}

export interface HostAdapter {
  /** Host id (lowercase-hyphen). */
  id: string;
  /** How SUS is installed in this host. */
  installMethod: string;
  /** Smoke-test command whose passing EVIDENCE upgrades tiers to 'verified'. */
  smokeTest: string;
  capabilities: HostCapabilities;
  /** Evidence reference or 'none yet — tiers are expectations, not claims'. */
  evidence: string;
}

export type SupportTier = 'supported' | 'experimental' | 'unsupported';

export function supportTier(caps: HostCapabilities): SupportTier {
  const values = Object.values(caps);
  if (values.every((v) => v === 'verified')) return 'supported';
  if (values.every((v) => v === 'unsupported')) return 'unsupported';
  return 'experimental';
}

export function generateSupportMatrix(adapters: HostAdapter[]): string {
  const lines = [
    '# Host support matrix (generated — do not hand-edit)',
    '',
    'Tiers derive from adapter capabilities; `verified` requires smoke-test',
    'evidence. No guessed host claims appear here (T0901 acceptance).',
    '',
    '| Host | Tier | Triggering | CLI | JIT loading | Live Studio | Evidence |',
    '|---|---|---|---|---|---|---|',
  ];
  for (const a of adapters) {
    lines.push(
      `| ${a.id} | ${supportTier(a.capabilities)} | ${a.capabilities.skillTriggering} | ${a.capabilities.cliExecution} | ${a.capabilities.jitReferenceLoading} | ${a.capabilities.liveStudio} | ${a.evidence} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}
