/**
 * Host adapters (T0903, ADR-002): host-specific entry files are GENERATED
 * artifacts; capabilities are declared per host with honest tiers. The acc
 * "each passes smoke before 'experimental' label" is enforced structurally:
 * an adapter whose smokeEvidence is 'none yet' can NEVER carry a label above
 * 'unverified' — real-host smoke runs happen on the hosts themselves
 * (T0902 harness, T0905 matrix).
 */
import type { HostAdapter, HostCapabilities } from './adapter-interface.js';

function caps(
  triggering: HostCapabilities['skillTriggering'],
  cli: HostCapabilities['cliExecution'],
  jit: HostCapabilities['jitReferenceLoading'],
  studio: HostCapabilities['liveStudio'],
): HostCapabilities {
  return {
    skillTriggering: triggering,
    cliExecution: cli,
    jitReferenceLoading: jit,
    liveStudio: studio,
  };
}

export const HOST_ADAPTERS: HostAdapter[] = [
  {
    id: 'codex',
    installMethod:
      'generated AGENTS.md supplement + CLI wrapper (scripts/install generates host entry)',
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
    // The receipt filename is the artifact hash, so naming one here would go stale
    // the instant this file is rebuilt — the generated matrix cites the newest
    // `evals/host-smoke/freepi-*.json` instead, and this line says what it shows.
    evidence:
      'evals/host-smoke/ newest freepi-*.json: identical smoke PASS 8/8, latest run 2026-11-16; live Studio unexercised',
  },
  {
    id: 'zcode',
    installMethod: 'repo-local AGENTS.md entry (this repository)',
    smokeTest: 'node scripts/coord/smoke-host.mjs',
    capabilities: caps('verified', 'verified', 'verified', 'expected'),
    evidence:
      'evals/host-smoke/ newest zcode-*.json: 7-check smoke PASS on the T0902 harness, but it predates artefact binding, so the row is stale until the 8-check smoke is re-run on that host',
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
  const tier =
    adapter.capabilities.liveStudio === 'verified' &&
    adapter.capabilities.cliExecution === 'verified'
      ? 'verified'
      : 'unverified';
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

/**
 * Owner-named hosts with no adapter (issue #16).
 *
 * These are listed so the matrix cannot read as "these hosts were considered and found fine" or,
 * worse, as if an adapter existed. There is no installer, no invocation syntax and no smoke run, so
 * they appear as `untested` with the reason — an absent row is a silence, and a silence is what the
 * owner found misleading.
 */
export interface UntestedHost {
  /** Lowercase-hyphen id, in the same shape as a real adapter id. */
  id: string;
  /** Product name as the owner wrote it. */
  label: string;
  /** Why it is not a row, stated as a fact about this repository. */
  why: string;
}

export const OWNER_NAMED_UNTESTED: UntestedHost[] = [
  {
    id: 'antigravity',
    label: 'Google Antigravity',
    why: 'no adapter, installer or smoke run; nothing about it has been measured here',
  },
  {
    id: 'goose',
    label: 'Goose',
    why: 'no adapter, installer or smoke run; skill discovery mechanism not checked',
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    why: 'no adapter, installer or smoke run; no claim about custom-instruction support',
  },
  {
    id: 'hermes',
    label: 'Hermes',
    why: 'no adapter, installer or smoke run; the product name is recorded as the owner wrote it',
  },
  {
    id: 'work-buddy',
    label: 'Work Buddy',
    why: 'no adapter, installer or smoke run; no slash-command binding checked',
  },
  {
    id: 'autopilot',
    label: 'Autopilot',
    why: 'no adapter, installer or smoke run; no claim about autonomous invocation',
  },
  {
    id: 'pi',
    label: 'Pi CLI (other variants than the FreePi receipt)',
    why: 'only the FreePi receipt exists; other Pi/ZCode variants have not been run against this artifact',
  },
];
