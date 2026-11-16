#!/usr/bin/env node
/**
 * paired-run.mjs (T1018, issue #14) — record what the provider arm actually does.
 *
 * The honest gap after T1016 was specific: no shipped loader supplied bytes to a
 * paired run, so the provider arm was `not-run` and nothing could be said about it.
 * `research-cache-loader.ts` closes the mechanical half of that. This script turns
 * it into a record, and it is deliberately split into three arms that are NOT
 * interchangeable:
 *
 *  - **provider** — measured here, offline, from the verified cache: which guides
 *    were served, how many characters and estimated tokens each hit cost, whether
 *    the digest travelled with the hit, and whether the call/hit caps held. This
 *    is mechanics. It says nothing about whether the text is good.
 *  - **baseline** — `not-run`. A no-provider arm needs a task and an output, and
 *    this repository ships neither for research guidance.
 *  - **effectiveness** — `not-run`. Comparing the two arms needs a host model to
 *    produce output twice over the same task set. No shipped harness runs a
 *    model, so no comparison is made here and none is implied. Upstream's own
 *    trial harness (`gd dev`) is not adopted and its results are not evidence
 *    about SUS (issue #14 says as much).
 *
 * Nothing in `pnpm verify` calls this: with no cache it reports `not-run`, which
 * is the truthful state of a machine that has not opted into the network.
 *
 * Usage:
 *   node scripts/research/paired-run.mjs                    # uses the default cache
 *   node scripts/research/paired-run.mjs --dir /tmp/cache --write
 *
 * Exit 0 = provider arm measured, 1 = provider arm failed its own bounds,
 * 3 = provider arm not-run (no verified cache present).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEFAULT_CACHE_RELATIVE } from './cache-guides.mjs';
import {
  RESEARCH_MAX_CALLS_PER_RUN,
  RESEARCH_MAX_EXCERPT_CHARS,
  RESEARCH_MAX_HITS_PER_QUERY,
  createCacheLoader,
  createResearchProvider,
} from '../../packages/scanners/dist/index.js';

/** Fixed topic set: the four pinned guides, asked as a reader would ask. */
export const PAIRED_QUERIES = [
  'responsive table header',
  'responsive design breakpoints',
  'navigation drawer focus',
  'input latency causes',
];

function pinAndGuides(root) {
  const pin = JSON.parse(
    readFileSync(join(root, 'evals', 'research', 'modern-web-guidance', 'pin.json'), 'utf8'),
  );
  const guides = pin.guides ?? [];
  return { pin, guides };
}

/** Run the fixed topic set through the provider and reduce it to mechanics. */
export async function runProviderArm({ pin, guides, cacheDir }) {
  const loader = createCacheLoader({ dir: cacheDir, pin, guides });
  const provider = createResearchProvider({
    pin,
    guides,
    lookup: loader.lookup,
    isOnline: () => true,
  });
  const results = [];
  for (const query of PAIRED_QUERIES) {
    const result = await provider.search({ query });
    results.push({
      query,
      available: result.available,
      reason: result.reason ?? null,
      callsUsed: result.callsUsed,
      estimatedTokens: result.tokensUsed,
      hits: result.hits.map((hit) => ({
        guideId: hit.guideId,
        characters: hit.excerpt.length,
        truncated: hit.truncated,
        trusted: hit.trusted,
        sha256: hit.sha256,
        revision: hit.revision,
        // The provenance fields must be present on every hit; the text is not recorded.
        hasUrl: typeof hit.url === 'string' && hit.url.length > 0,
        hasLicense: hit.license === pin.license,
      })),
    });
  }
  const boundsHeld =
    provider.callsUsed() <= RESEARCH_MAX_CALLS_PER_RUN &&
    results.every((r) => r.hits.length <= RESEARCH_MAX_HITS_PER_QUERY) &&
    results.every((r) => r.hits.every((h) => h.characters <= RESEARCH_MAX_EXCERPT_CHARS)) &&
    results.every((r) => r.hits.every((h) => h.trusted === false && h.hasUrl && h.hasLicense));
  const served = results.filter((r) => r.available).length;
  return {
    status: served > 0 && boundsHeld ? 'pass' : 'fail',
    boundsHeld,
    callsUsed: provider.callsUsed(),
    queriesServed: served,
    queriesAsked: results.length,
    results,
    cache: loader.status().map((s) => ({ guideId: s.guideId, state: s.state, bytes: s.bytes })),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');
  const write = args.includes('--write');
  const root = join(import.meta.dirname, '..', '..');
  const cacheDir =
    dirIndex >= 0 && args[dirIndex + 1]
      ? resolve(args[dirIndex + 1])
      : join(root, DEFAULT_CACHE_RELATIVE);

  const { pin, guides } = pinAndGuides(root);
  const record = {
    generatedBy: 'scripts/research/paired-run.mjs',
    generatedAt: new Date().toISOString(),
    source: { id: pin.id, revision: pin.revision, license: pin.license, sha256: pin.sha256 },
    cacheDir: cacheDir.startsWith(root)
      ? cacheDir.slice(root.length + 1)
      : '(outside the repository)',
    arms: {
      provider: { status: 'not-run', reason: `no verified cache at ${cacheDir}` },
      baseline: {
        status: 'not-run',
        reason: 'a no-provider arm needs a task and an output; neither ships in this repository',
      },
      effectiveness: {
        status: 'not-run',
        reason:
          'comparing arms needs a host model to produce output twice over the same tasks; no shipped harness runs one, so no comparison is claimed',
      },
    },
    notes: [
      'Mechanics only. A served excerpt says the loader and the pin agree; it says nothing about whether the guidance is right or useful.',
      'No guide text is recorded here, only digests, character counts and provenance presence.',
      'Upstream legacy-scan and trial-harness results are not evidence about SUS and are not used.',
    ],
  };

  if (!existsSync(cacheDir)) {
    console.log(`[not-run] provider arm: no cache at ${cacheDir}`);
    console.log('Populate it with: SUS_RESEARCH_ONLINE=1 node scripts/research/cache-guides.mjs');
    if (write) {
      writeFileSync(
        join(root, 'evals', 'research', 'modern-web-guidance', 'paired-run.json'),
        `${JSON.stringify(record, null, 2)}\n`,
      );
    }
    process.exit(3);
  }

  record.arms.provider = await runProviderArm({ pin, guides, cacheDir });
  const provider = record.arms.provider;
  for (const result of provider.results) {
    const hits = result.hits.map((h) => `${h.guideId}(${h.characters}c)`).join(', ');
    console.log(
      `${result.available ? '[SERVED]' : '[EMPTY] '} "${result.query}" → ${hits || result.reason}`,
    );
  }
  console.log(
    `\n[${provider.status.toUpperCase()}] provider arm: ${provider.queriesServed}/${provider.queriesAsked} queries served, ` +
      `${provider.callsUsed}/${RESEARCH_MAX_CALLS_PER_RUN} calls, bounds ${provider.boundsHeld ? 'held' : 'BROKEN'}`,
  );
  console.log('baseline arm:       not-run (no task/output harness)');
  console.log('effectiveness arm:  not-run (needs a host model; no comparison is claimed)');

  if (write) {
    writeFileSync(
      join(root, 'evals', 'research', 'modern-web-guidance', 'paired-run.json'),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log('wrote evals/research/modern-web-guidance/paired-run.json');
  }
  process.exit(provider.status === 'pass' ? 0 : 1);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  await main();
}
