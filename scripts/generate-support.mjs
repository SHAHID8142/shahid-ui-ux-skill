#!/usr/bin/env node
/**
 * generate-support.mjs (T0905) — writes the compatibility record and the docs page.
 *
 * `pnpm support` (verify) runs with --check: it regenerates in memory and fails
 * when the committed files differ, which is what makes "generated, never
 * hand-edited" enforceable rather than a comment.
 *
 * Evidence is discovered, not asserted: for each host, the newest
 * `evals/host-smoke/<host>-*.json` is read for its artifact hash and environment
 * facts. A file recorded before artifact binding existed cannot prove it ran
 * against today's code, so it counts as stale — which is exactly the invalidation
 * the task asks for.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync as existsForHint } from 'node:fs';
import { ARTIFACT_ID, artifactSha256 } from './lib/artifact-hash.mjs';
import { buildHint, missingBuildArtifacts } from './lib/ensure-built.mjs';

// Compiled packages are imported below; on a fresh clone they may not exist yet.
// `pnpm check`/`pnpm verify` build first, but `pnpm support:status` is advertised
// as a standalone smoke command, and a raw ERR_MODULE_NOT_FOUND stack trace does
// not tell a person what to run.
{
  const root = join(import.meta.dirname, '..');
  const missing = missingBuildArtifacts({
    exists: (artifact) => existsForHint(join(root, artifact)),
  });
  if (missing.length > 0) {
    console.error(buildHint(missing));
    process.exit(1);
  }
}

const { HOST_ADAPTERS, buildCompatibility, renderSupportMatrix, statusText } =
  await import('../packages/adapters/dist/index.js');

const ROOT = join(import.meta.dirname, '..');
const SMOKE_DIR = join(ROOT, 'evals', 'host-smoke');
const DOC_PATH = join(ROOT, 'docs', 'SUPPORT_MATRIX.md');
const JSON_PATH = join(ROOT, 'docs', 'compatibility.json');

const check = process.argv.includes('--check');
const statusOnly = process.argv.includes('--status');

/** Newest smoke receipt for a host, or null. */
function latestSmoke(host) {
  if (!existsSync(SMOKE_DIR)) return null;
  const files = readdirSync(SMOKE_DIR).filter(
    (name) => name.startsWith(`${host}-`) && name.endsWith('.json'),
  );
  if (files.length === 0) return null;
  // "newest" must mean newest by run time, not by filename: a hash-named receipt
  // sorts before a date-named one, which silently selected the older evidence.
  const receipts = files.map((name) => ({
    name,
    receipt: JSON.parse(readFileSync(join(SMOKE_DIR, name), 'utf8')),
  }));
  receipts.sort((a, b) => String(a.receipt.at ?? '').localeCompare(String(b.receipt.at ?? '')));
  const latest = receipts[receipts.length - 1];
  return { path: `evals/host-smoke/${latest.name}`, receipt: latest.receipt };
}

function evidenceFor(host) {
  const found = latestSmoke(host);
  if (!found) return null;
  const { path, receipt } = found;
  const artifact = receipt.artifact;
  return {
    ref: `${path} (${receipt.verdict})`,
    // an unbound receipt cannot name its bytes: '' can never equal a real hash
    artifactSha256: artifact?.sha256 ?? '',
    recordedAt: (receipt.at ?? '').slice(0, 10),
  };
}

function environmentFor(host) {
  const found = latestSmoke(host);
  const env = found?.receipt.environment;
  return {
    hostVersion: env?.hostVersion ?? 'unrecorded',
    browser: env?.browser ?? 'n/a',
    framework: env?.framework ?? 'n/a',
    os: env?.os ?? 'unrecorded',
  };
}

const artifacts = Object.fromEntries(
  HOST_ADAPTERS.map((adapter) => [adapter.id, { id: ARTIFACT_ID, sha256: artifactSha256(ROOT) }]),
);
const environments = Object.fromEntries(
  HOST_ADAPTERS.map((adapter) => [adapter.id, environmentFor(adapter.id)]),
);
const evidence = Object.fromEntries(
  HOST_ADAPTERS.map((adapter) => [adapter.id, evidenceFor(adapter.id)]),
);

const doc = buildCompatibility({ adapters: HOST_ADAPTERS, artifacts, environments, evidence });
const markdown = renderSupportMatrix(doc);
const json = `${JSON.stringify(doc, null, 2)}\n`;

if (statusOnly) {
  process.stdout.write(statusText(doc));
  process.exit(0);
}

if (check) {
  const problems = [];
  for (const [path, expected] of [
    [DOC_PATH, markdown],
    [JSON_PATH, json],
  ]) {
    if (!existsSync(path)) problems.push(`${path}: missing — run \`pnpm support:write\``);
    else if (readFileSync(path, 'utf8') !== expected)
      problems.push(`${path}: out of date — run \`pnpm support:write\``);
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`[FAIL] ${problem}`);
    console.error('VERDICT: support matrix is not the generated one');
    process.exit(1);
  }
  const stale = doc.rows.filter((row) => row.evidenceState !== 'verified');
  console.log(
    `VERDICT: support matrix current (${doc.rows.length} host(s), ${stale.length} without fresh evidence)`,
  );
  process.exit(0);
}

writeFileSync(DOC_PATH, markdown);
writeFileSync(JSON_PATH, json);
console.log(`wrote ${DOC_PATH} and ${JSON_PATH} (${doc.rows.length} host(s))`);
