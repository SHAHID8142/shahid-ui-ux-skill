/**
 * T0905 — generated compatibility record.
 *
 * Three things go wrong with support tables that are written by hand:
 *
 *  1. the docs say a host is "supported" long after the adapter that earned the
 *     evidence changed underneath it;
 *  2. nobody can tell what the row was actually tested against (host version,
 *     browser, framework, OS), so a user on a different version has no way to
 *     judge whether the claim applies;
 *  3. someone edits the table by hand and the generator silently overwrites it a
 *     week later — or worse, disagrees with it.
 *
 * So the record binds every row to the **artifact hash** it was verified with and
 * to the environment facts it was verified in. When the artifact changes, the old
 * smoke evidence is *stale*, not still-true: the row is downgraded rather than
 * upgraded, because a hash mismatch means the test did not run against this code.
 *
 * The docs page and the CLI both render this module. Neither author the content.
 */
import type { HostAdapter, HostCapabilities, SupportTier } from './adapter-interface.js';
import { supportTier } from './adapter-interface.js';

export type EvidenceState = 'verified' | 'stale' | 'missing';

export interface EnvironmentFacts {
  /** Host application version the smoke test ran on. */
  hostVersion: string;
  /** Browser + version used for Live Studio checks, or 'n/a'. */
  browser: string;
  /** Framework + version of the fixture used, or 'n/a'. */
  framework: string;
  /** OS + version of the machine the run happened on. */
  os: string;
}

export interface SmokeEvidence {
  /** Where the evidence lives (test path, receipt, CI run). */
  ref: string;
  /** Artifact hash the evidence was produced against. */
  artifactSha256: string;
  /** Calendar date of the run, YYYY-MM-DD. */
  recordedAt: string;
}

export interface CompatibilityRow {
  host: string;
  /** Tier derived from capabilities (T0901), before evidence is considered. */
  derivedTier: SupportTier;
  /** Tier after evidence freshness: a stale 'supported' row drops to experimental. */
  tier: SupportTier;
  capabilities: HostCapabilities;
  environment: EnvironmentFacts;
  artifactId: string;
  artifactSha256: string;
  evidence: SmokeEvidence | null;
  evidenceState: EvidenceState;
}

export interface UntestedHostRow {
  id: string;
  label: string;
  why: string;
}

export interface CompatibilityDocument {
  schema: 'sus.compatibility';
  version: 1;
  /** Provenance of the generator's inputs, so a reader can diff two records. */
  generatedFrom: { adapterCount: number; artifactIds: string[] };
  rows: CompatibilityRow[];
  /** Hosts the owner named that have no adapter; kept out of `rows` on purpose. */
  untestedHosts?: UntestedHostRow[];
}

export interface ArtifactBinding {
  id: string;
  sha256: string;
}

/**
 * Freshness is a hash comparison, never a date comparison: a package rebuilt
 * yesterday from unchanged sources is still the same artifact, and an artifact
 * rebuilt today from changed sources invalidates evidence even if it is newer.
 */
export function evidenceState(
  evidence: SmokeEvidence | null,
  artifactSha256: string,
): EvidenceState {
  if (!evidence) return 'missing';
  return evidence.artifactSha256 === artifactSha256 ? 'verified' : 'stale';
}

/**
 * A stale row is downgraded, never kept: 'supported' requires evidence that ran
 * against exactly this artifact.
 */
export function effectiveTier(derived: SupportTier, state: EvidenceState): SupportTier {
  if (derived === 'supported' && state !== 'verified') return 'experimental';
  return derived;
}

export interface BuildInput {
  adapters: HostAdapter[];
  artifacts: Record<string, ArtifactBinding>;
  environments: Record<string, EnvironmentFacts>;
  evidence: Record<string, SmokeEvidence | null>;
  /** Owner-named hosts without an adapter; rendered as untested, never as a tiered row. */
  untestedHosts?: UntestedHostRow[];
}

export function buildCompatibility(input: BuildInput): CompatibilityDocument {
  const rows: CompatibilityRow[] = [];
  for (const adapter of input.adapters) {
    const artifact = input.artifacts[adapter.id];
    if (!artifact) {
      // Refusing to invent a binding is the whole point: a row without an
      // artifact hash cannot say what it was verified against.
      throw new Error(`no artifact binding recorded for host "${adapter.id}"`);
    }
    const environment = input.environments[adapter.id];
    if (!environment) {
      throw new Error(`no environment facts recorded for host "${adapter.id}"`);
    }
    const evidence = input.evidence[adapter.id] ?? null;
    const state = evidenceState(evidence, artifact.sha256);
    const derived = supportTier(adapter.capabilities);
    rows.push({
      host: adapter.id,
      derivedTier: derived,
      tier: effectiveTier(derived, state),
      capabilities: adapter.capabilities,
      environment,
      artifactId: artifact.id,
      artifactSha256: artifact.sha256,
      evidence,
      evidenceState: state,
    });
  }
  const untestedHosts = input.untestedHosts ?? [];
  const claimed = new Set(rows.map((row) => row.host));
  const contradiction = untestedHosts.find((host) => claimed.has(host.id));
  if (contradiction) {
    // A host cannot be both measured and unmeasured; one of the two claims is false.
    throw new Error(`host "${contradiction.id}" is listed as untested and has a compatibility row`);
  }
  return {
    schema: 'sus.compatibility',
    version: 1,
    generatedFrom: {
      adapterCount: rows.length,
      artifactIds: [...new Set(rows.map((row) => row.artifactId))].sort(),
    },
    rows,
    untestedHosts,
  };
}

const STATE_NOTE: Record<EvidenceState, string> = {
  verified: 'verified against this artifact',
  stale: 'STALE — the artifact changed after the smoke run; tier downgraded',
  missing: 'no smoke evidence recorded',
};

export function renderSupportMatrix(doc: CompatibilityDocument): string {
  const lines = [
    '# SUS support matrix',
    '',
    '<!-- GENERATED by scripts/generate-support.mjs — do not edit by hand.',
    '     Regenerate with `pnpm support:write`; `pnpm support` fails when this file',
    '     is out of date. -->',
    '',
    'A row is only `supported` when a smoke test ran against *this* artifact hash in',
    'the environment shown. When the adapter changes, the old evidence goes stale and',
    'the row drops to `experimental` rather than quietly staying on the old claim.',
    '',
    '| Host | Tier | Triggering | CLI | JIT | Studio | Artifact | Environment | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of doc.rows) {
    const env = `${row.environment.hostVersion}; ${row.environment.browser}; ${row.environment.framework}; ${row.environment.os}`;
    const evidence = row.evidence
      ? `${row.evidence.ref} (${row.evidence.recordedAt}) — ${STATE_NOTE[row.evidenceState]}`
      : STATE_NOTE.missing;
    lines.push(
      `| ${row.host} | ${row.tier} | ${row.capabilities.skillTriggering} | ${row.capabilities.cliExecution} | ${row.capabilities.jitReferenceLoading} | ${row.capabilities.liveStudio} | ${row.artifactId}@${row.artifactSha256.slice(0, 12)} | ${env} | ${evidence} |`,
    );
  }
  if (doc.untestedHosts && doc.untestedHosts.length > 0) {
    lines.push(
      '',
      '## Named by the owner, untested here',
      '',
      'These hosts have no adapter and no smoke run against this artifact. They are listed so their',
      'absence from the table above is read as "not measured", not as "measured and fine".',
      '',
      '| Host | Product | Why it is untested | What would make it a row |',
      '| --- | --- | --- | --- |',
    );
    for (const host of doc.untestedHosts) {
      lines.push(
        `| \`${host.id}\` | ${host.label} | ${host.why} | an adapter with an install method, plus \`node scripts/coord/smoke-host.mjs\` run on that host against this artifact |`,
      );
    }
  }
  lines.push(
    '',
    '## What this table cannot tell you',
    '',
    '- Any host or version not listed has **no evidence**; absence here is not a claim of incompatibility.',
    '- Tiers describe what was tested, not what will work: `experimental` means partly verified, never "probably fine".',
    '- Generated assets and model capabilities vary by host; see `sus capabilities` for per-capability degradation.',
  );
  return `${lines.join('\n')}\n`;
}

/** Compact CLI rendering — same facts, one line per host, stale rows called out. */
export function statusText(doc: CompatibilityDocument): string {
  const lines = ['SUS host support (generated; `pnpm support` keeps it honest)', ''];
  for (const row of doc.rows) {
    const flags = [
      `tier=${row.tier}`,
      row.tier !== row.derivedTier ? `derived=${row.derivedTier}` : null,
      `evidence=${row.evidenceState}`,
      `artifact=${row.artifactSha256.slice(0, 12)}`,
      `env=${row.environment.hostVersion} / ${row.environment.browser}`,
    ].filter((value): value is string => Boolean(value));
    lines.push(`${row.host.padEnd(16)} ${flags.join('  ')}`);
  }
  for (const host of doc.untestedHosts ?? []) {
    lines.push(`${host.id.padEnd(16)} tier=untested  evidence=missing  ${host.label}`);
  }
  if (doc.rows.some((row) => row.evidenceState === 'stale')) {
    lines.push(
      '',
      'Stale evidence: re-run the smoke test for the hosts above before claiming support.',
    );
  }
  return `${lines.join('\n')}\n`;
}
