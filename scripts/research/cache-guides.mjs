#!/usr/bin/env node
/**
 * cache-guides.mjs (T1018, issue #14) — populate the local research cache.
 *
 * `research-provider.ts` can only serve a hit when a loader supplies bytes whose
 * digest matches the pin. `research-cache-loader.ts` is that loader, and it reads
 * from a directory. This script is the only thing that puts files there, and it
 * does exactly three things:
 *
 *  1. fetches each pinned guide twice by different transports (reusing
 *     `verify-pin.mjs`, so the same byte-agreement rule applies here as there);
 *  2. refuses to write anything whose digest does not equal the pin's recorded
 *     digest — a mismatched file is a content review, not a cache refresh;
 *  3. writes `<guideId>.md` plus a digest-only manifest into a git-ignored
 *     directory, and prints digests and byte counts, never guide text.
 *
 * Network access is explicit and off by default. Nothing in `pnpm verify`,
 * `pnpm regression` or any test imports this script's network path.
 *
 * Usage:
 *   SUS_RESEARCH_ONLINE=1 node scripts/research/cache-guides.mjs
 *   SUS_RESEARCH_ONLINE=1 node scripts/research/cache-guides.mjs --dir /tmp/sus-cache
 *
 * Exit 0 = every pinned guide is cached and verified. Exit 1 = at least one was
 * refused (nothing was written for it). Exit 2 = refused before fetching.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PIN_RELATIVE_PATH, fetchPinnedFile, sha256Hex } from './verify-pin.mjs';

/** Where the loader looks by default. Git-ignored: upstream text is not vendored. */
export const DEFAULT_CACHE_RELATIVE = join('.sus-cache', 'research', 'modern-web-guidance');

const USER_AGENT = 'sus-cache-guides (+https://github.com/shahid-io/sus)';
const TIMEOUT_MS = 20000;

/**
 * Pure half: given already-fetched bytes and the pin, decide what may be written.
 *
 * Kept separate from fetching so it can be tested without a network, which is
 * where the interesting refusals live: an unverified pin, an undigested guide,
 * and bytes that do not match the record.
 */
export function planCacheWrites({ pin, guides }) {
  const refusals = [];
  if (pin.verified !== 'verified' || pin.sha256 === null) {
    return {
      writable: [],
      refusals: [
        {
          guideId: null,
          reason: 'the pin is not verified; a cache entry may not be created against a claim',
        },
      ],
      ok: false,
    };
  }
  const writable = [];
  for (const fetched of guides) {
    const recorded = pin.guides.find((guide) => guide.guideId === fetched.guideId);
    if (!recorded) {
      refusals.push({
        guideId: fetched.guideId,
        reason: 'the pin does not list this guide, so there is no digest to verify against',
      });
      continue;
    }
    if (recorded.sha256 === null) {
      refusals.push({
        guideId: fetched.guideId,
        reason: 'the pin records no digest for this guide; run verify-pin.mjs --write first',
      });
      continue;
    }
    if (recorded.sha256 !== fetched.sha256) {
      refusals.push({
        guideId: fetched.guideId,
        reason: `fetched bytes hash to ${fetched.sha256.slice(0, 12)}… but the pin records ${recorded.sha256.slice(0, 12)}… — content review, not a refresh`,
      });
      continue;
    }
    writable.push({
      guideId: fetched.guideId,
      path: recorded.path,
      sha256: fetched.sha256,
      bytes: fetched.bytes,
    });
  }
  return { writable, refusals, ok: refusals.length === 0 };
}

/** Write the verified files and a digest-only manifest. Returns what was written. */
export function writeCache({ dir, pin, writable, texts }) {
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const entry of writable) {
    const text = texts.get(entry.guideId);
    if (typeof text !== 'string') continue;
    const path = join(dir, `${entry.guideId}.md`);
    writeFileSync(path, text, 'utf8');
    written.push({
      guideId: entry.guideId,
      path,
      bytes: Buffer.byteLength(text, 'utf8'),
      sha256: sha256Hex(text),
    });
  }
  const manifest = {
    source: pin.id,
    upstreamUrl: pin.upstreamUrl,
    revision: pin.revision,
    license: pin.license,
    cachedAt: new Date().toISOString(),
    guides: written.map(({ guideId, bytes, sha256 }) => ({ guideId, bytes, sha256 })),
    note:
      'Digest-only manifest. Guide text is present in this directory and nowhere in the repository; ' +
      'delete this directory to remove it. Attribution and revision must travel with any quoting.',
  };
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { written, manifestPath: join(dir, 'manifest.json') };
}

async function fetchTexts({ revision, paths, fetchImpl = fetch }) {
  const texts = new Map();
  const digests = new Map();
  for (const { guideId, path } of paths) {
    const fetched = await fetchPinnedFile({
      revision,
      path,
      fetchImpl: (url, init) =>
        fetchImpl(url, {
          ...init,
          headers: { ...(init?.headers ?? {}), 'user-agent': USER_AGENT },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }),
    });
    // fetchPinnedFile returns the digest of the agreed bytes; re-read the raw text
    // through the same transport so the file we write is the file we hashed.
    const raw = await fetchImpl(
      `https://raw.githubusercontent.com/GoogleChrome/modern-web-guidance/${revision}/${path}`,
      { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!raw.ok) throw new Error(`${raw.status} ${raw.statusText} for ${path}`);
    const text = await raw.text();
    digests.set(guideId, fetched.sha256);
    if (sha256Hex(text) !== fetched.sha256) {
      throw new Error(`third fetch of ${path} disagreed with the verified bytes; nothing written`);
    }
    texts.set(guideId, text);
  }
  return { texts, digests };
}

async function main() {
  if (process.env.SUS_RESEARCH_ONLINE !== '1') {
    console.error(
      'refused: set SUS_RESEARCH_ONLINE=1 to fetch upstream.\n' +
        'This script reaches the network; nothing in the build or test path does.',
    );
    process.exit(2);
  }
  const args = process.argv.slice(2);
  const dirIndex = args.indexOf('--dir');
  const root = join(import.meta.dirname, '..', '..');
  const dir =
    dirIndex >= 0 && args[dirIndex + 1]
      ? resolve(args[dirIndex + 1])
      : join(root, DEFAULT_CACHE_RELATIVE);

  const pin = JSON.parse(readFileSync(join(root, PIN_RELATIVE_PATH), 'utf8'));
  if (pin.verified !== 'verified') {
    console.error('refused: the pin is not verified. Run verify-pin.mjs --write first.');
    process.exit(2);
  }

  let fetched;
  try {
    fetched = await fetchTexts({
      revision: pin.revision,
      paths: pin.guides.map((guide) => ({ guideId: guide.guideId, path: guide.path })),
    });
  } catch (error) {
    console.error(`refused: ${error.message}`);
    process.exit(1);
  }

  const guides = [...fetched.texts.entries()].map(([guideId, text]) => ({
    guideId,
    sha256: sha256Hex(text),
    bytes: Buffer.byteLength(text, 'utf8'),
  }));
  const plan = planCacheWrites({ pin, guides });
  for (const refusal of plan.refusals) {
    console.error(`[REFUSED] ${refusal.guideId ?? 'pin'}: ${refusal.reason}`);
  }
  if (plan.writable.length === 0) {
    console.error('nothing was written.');
    process.exit(1);
  }
  const result = writeCache({ dir, pin, writable: plan.writable, texts: fetched.texts });
  for (const entry of result.written) {
    console.log(`[CACHED] ${entry.guideId}  ${String(entry.bytes).padStart(6)} B  ${entry.sha256}`);
  }
  console.log(`manifest: ${result.manifestPath}`);
  console.log(
    `\n[${plan.ok ? 'PASS' : 'PARTIAL'}] ${result.written.length}/${plan.writable.length + plan.refusals.length} guide(s) cached in ${dir}`,
  );
  console.log(
    'The cache is git-ignored. Guide text is not copied into the repository, and quoting any of it\n' +
      'requires the Apache-2.0 notice, the upstream URL, the revision and the guide path (D06 open).',
  );
  process.exit(plan.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  await main();
}
