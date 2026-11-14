/**
 * Host adapters (T0903, ADR-002): host-specific entry files are GENERATED
 * artifacts; capabilities are declared per host with honest tiers. The acc
 * "each passes smoke before 'experimental' label" is enforced structurally:
 * an adapter whose smokeEvidence is 'none yet' can NEVER carry a label above
 * 'unverified' — real-host smoke runs happen on the hosts themselves
 * (T0902 harness, T0905 matrix).
 */
import type { HostAdapter, HostCapabilities } from './adapter-interface.js';

function caps(triggering: HostCapabilities['skillTriggering'], cli: HostCapabilities['cliExecution'], jit: HostCapabilities['jitReferenceLoading'], studio: HostCapabilities['liveStudio']): HostCapabilities {
  return { skillTriggering: triggering, cliExecution: cli, jitReferenceLoading: jit, liveStudio: studio };
}

export const HOST_ADAPTERS: HostAdapter[] = [
  {
    id: 'codex',
    installMethod: 'generated AGENTS.md supplement + CLI wrapper (scripts/install generates host entry)',
    smokeTest: 'node scripts/coord/smoke-host.mjs (run on the host machine)',
    capabilities: caps('expected', 'expected', 'expected', 'expected'),
    evidence: 'none yet — Codex host not exercised; tiers are expectations pending smoke',
  },
  {
    id: 'claude-code',
    installMethod: 'generated plugin wrapper + CLAUDE.md supplement',
    smokeTest: 'node scripts/coord/smoke-host.mjs (run on the host machine)',
    capabilities: caps('expected', 'expected', 'expected', 'expected'),
    evidence: 'none yet — Claude Code host not exercised; tiers are expectations pending smoke',
  },
  {
    id: 'cursor',
    installMethod: 'generated .cursor/rules entry',
    smokeTest: 'node scripts/coord/smoke-host.mjs (run on the host machine)',
    capabilities: caps('expected', 'expected', 'expected', 'expected'),
    evidence: 'none yet — Cursor host not exercised; tiers are expectations pending smoke',
  },
  {
    id: 'freepi',
    installMethod: 'generated skill entry (FreePi skills dir)',
    smokeTest: 'node scripts/coord/smoke-host.mjs (run on the host machine)',
    capabilities: caps('verified', 'verified', 'verified', 'expected'),
    evidence: 'evals/host-smoke/freepi-fe06295.json (T0902: identical smoke PASS 7/7; live Studio unexercised)',
  },
  {
    id: 'zcode',
    installMethod: 'repo-local AGENTS.md entry (this repository)',
    smokeTest: 'node scripts/coord/smoke-host.mjs',
    capabilities: caps('verified', 'verified', 'verified', 'expected'),
    evidence: 'evals/host-smoke/zcode-b061cc4.json (T0902: identical smoke PASS 7/7; live Studio unexercised)',
  },
];

/**
 * Generated host-entry CONFIG content per host (the real files the installer
 * writes). Validated by tests for well-formedness; actual placement is the
 * installer's job (T0904 flow).
 */
export function generateHostEntry(hostId: string): string {
  const adapter = HOST_ADAPTERS.find((h) => h.id === hostId);
  if (!adapter) throw new Error(`unknown host "${hostId}"`);
  const tier = adapter.capabilities.liveStudio === 'verified' && adapter.capabilities.cliExecution === 'verified' ? 'verified' : 'unverified';
  switch (hostId) {
    case 'codex':
      return `# SUS host entry (generated — do not hand-edit)\n# tier: ${tier} | smoke: ${adapter.smokeTest}\nWhen the user says 'continue', read AGENTS.md and follow it.\n`;
    case 'claude-code':
      return `---\nname: sus-bridge-entry\ntier: ${tier}\n---\nRead AGENTS.md and follow it on 'continue'. (generated)\n`;
    case 'cursor':
      return `# SUS rules (generated)\nOn 'continue': read AGENTS.md, follow the continuation protocol. tier: ${tier}\n`;
    default:
      return `# SUS host entry (generated) — tier: ${tier}\nRead AGENTS.md and follow it on 'continue'.\n`;
  }
}
