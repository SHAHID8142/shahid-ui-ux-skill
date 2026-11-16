#!/usr/bin/env node
/**
 * verify-pin.mjs (T1016, issue #14) — fetch the pinned guides and record real digests.
 *
 * The pin at evals/research/modern-web-guidance/pin.json is a claim that specific
 * bytes at a specific commit have specific digests. That claim is only worth
 * something if the digests were measured rather than typed. This script is the
 * only thing in the repository that measures them, and it is deliberately not
 * part of `pnpm verify`: the build must never need the network, and a gate that
 * reached out would fail for reasons that say nothing about the code.
 *
 * Two rules make the record hard to fake:
 *
 *  1. Every file is fetched twice by different transports — the raw content host
 *     and the GitHub contents API at the pinned ref — and the bytes must agree.
 *     A single fetch proves only that one host answered; two independent answers
 *     make a truncated or cached body visible instead of silently hashed.
 *  2. `--write` refuses to change a digest that is already recorded. Replacing a
 *     recorded digest means the upstream bytes moved under a fixed revision,
 *     which is a content review (docs/RESEARCH_SOURCES.md §4 step 4), not a
 *     refresh. An unrecorded digest (`null`) may be filled in; a recorded one
 *     may only be cleared by a person editing the pin deliberately.
 *
 * No upstream code is installed, executed or inspected as code: only raw file
 * bytes are read, over HTTPS, with a fixed user agent.
 *
 * Usage:
 *   SUS_RESEARCH_ONLINE=1 node scripts/research/verify-pin.mjs           # check
 *   SUS_RESEARCH_ONLINE=1 node scripts/research/verify-pin.mjs --write   # record
 *
 * Exit 0 = the pin matches what was fetched. Exit 1 = it does not (nothing was
 * written). Exit 2 = refused before fetching (offline flag unset, or bad usage).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Repository-relative pin path; the single input and the only thing written. */
export const PIN_RELATIVE_PATH = 'evals/research/modern-web-guidance/pin.json';

/** Upstream coordinates. `{revision}` is substituted from the pin, never guessed. */
const RAW_BASE = 'https://raw.githubusercontent.com/GoogleChrome/modern-web-guidance';
const CONTENTS_API = 'https://api.github.com/repos/GoogleChrome/modern-web-guidance/contents';

/** The licence text is pinned too: the attribution claim rests on it being Apache-2.0. */
export const LICENSE_PATH = 'LICENSE';

/** A stable, identifiable client. GitHub asks for one and a log should name us. */
const USER_AGENT = 'sus-pin-verify (+https://github.com/shahid-io/sus)';

/** Fetch timeout. A hung socket must fail the check, not hang a person's terminal. */
const TIMEOUT_MS = 20000;

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The parent pin digest is a manifest digest, not a copy of any one file: it
 * covers the revision, the licence text and each guide path + digest in pin
 * order. Recomputable by hand from the pin itself, which is the point.
 */
export function manifestDigest({ revision, licenseSha256, guides }) {
  const parts = ['modern-web-guidance', revision, LICENSE_PATH, licenseSha256];
  for (const guide of guides) {
    parts.push(guide.guideId, guide.path, guide.sha256);
  }
  return sha256Hex(parts.join('\u0000'));
}

async function fetchOnce(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** The contents API returns base64 with newlines; decode to the same bytes. */
function decodeContentsApi(body) {
  const parsed = JSON.parse(body.toString('utf8'));
  if (parsed.type !== 'file' || typeof parsed.content !== 'string') {
    throw new Error('contents API did not return a file blob');
  }
  return Buffer.from(parsed.content.replace(/\s+/g, ''), 'base64');
}

/**
 * One file, two transports, byte-identical or the check stops. The returned
 * digest is therefore a measurement of the bytes both hosts agreed on.
 */
export async function fetchPinnedFile({ revision, path, fetchImpl = fetch }) {
  const rawUrl = `${RAW_BASE}/${revision}/${path}`;
  const apiUrl = `${CONTENTS_API}/${path}?ref=${revision}`;
  const [raw, api] = await Promise.all([
    fetchOnce(rawUrl, fetchImpl),
    fetchOnce(apiUrl, fetchImpl),
  ]);
  const decoded = decodeContentsApi(api);
  if (!raw.equals(decoded)) {
    throw new Error(`transports disagree for ${path}: raw ${raw.length}B, api ${decoded.length}B`);
  }
  return { bytes: raw.length, sha256: sha256Hex(raw), url: rawUrl };
}

/** Fetch every pinned file: the licence text first, then each guide in pin order. */
export async function fetchPin({ pin, fetchImpl = fetch }) {
  const revision = pin.revision;
  const license = await fetchPinnedFile({ revision, path: LICENSE_PATH, fetchImpl });
  const guides = [];
  for (const guide of pin.guides) {
    const fetched = await fetchPinnedFile({ revision, path: guide.path, fetchImpl });
    guides.push({ ...guide, ...fetched });
  }
  return { revision, license, guides };
}

/**
 * Compare a fetch against the record. `fillable` digests are unrecorded, so
 * filling them in is measurement. `conflicts` are recorded digests that moved,
 * which no script is allowed to resolve on its own.
 */
export function compareWithPin({ pin, fetched }) {
  const fillable = [];
  const conflicts = [];
  for (const guide of fetched.guides) {
    const recorded = pin.guides.find((entry) => entry.guideId === guide.guideId);
    if (!recorded) {
      conflicts.push({ id: guide.guideId, recorded: 'absent from pin', fetched: guide.sha256 });
    } else if (recorded.sha256 === null) {
      fillable.push({ id: guide.guideId, sha256: guide.sha256 });
    } else if (recorded.sha256 !== guide.sha256) {
      conflicts.push({ id: guide.guideId, recorded: recorded.sha256, fetched: guide.sha256 });
    }
  }
  const recordedCount = pin.guides.filter((entry) => entry.sha256 !== null).length;
  return {
    fillable,
    conflicts,
    /** True when the record already equals the fetch, including the manifest. */
    complete:
      conflicts.length === 0 &&
      fillable.length === 0 &&
      pin.verified === 'verified' &&
      pin.sha256 ===
        manifestDigest({
          revision: fetched.revision,
          licenseSha256: fetched.license.sha256,
          guides: fetched.guides,
        }),
    recordedCount,
  };
}

function buildRecord({ pin, fetched }) {
  const guides = pin.guides.map((guide) => {
    const measured = fetched.guides.find((entry) => entry.guideId === guide.guideId);
    return { ...guide, sha256: measured.sha256, verified: 'verified' };
  });
  return {
    ...pin,
    sha256: manifestDigest({
      revision: fetched.revision,
      licenseSha256: fetched.license.sha256,
      guides,
    }),
    licenseSha256: fetched.license.sha256,
    verified: 'verified',
    guides,
  };
}

function printFetch(fetched) {
  console.log(`revision ${fetched.revision}`);
  console.log(
    `  ${LICENSE_PATH}  ${String(fetched.license.bytes).padStart(6)} B  ${fetched.license.sha256}`,
  );
  for (const guide of fetched.guides) {
    console.log(`  ${guide.path}  ${String(guide.bytes).padStart(6)} B  ${guide.sha256}`);
  }
}

async function main() {
  const write = process.argv.includes('--write');
  if (process.env.SUS_RESEARCH_ONLINE !== '1') {
    console.error(
      'refused: set SUS_RESEARCH_ONLINE=1 to fetch upstream.\n' +
        'This script is the only thing that touches the network, and it does so only on request.',
    );
    process.exit(2);
  }

  const root = join(import.meta.dirname, '..', '..');
  const pinPath = join(root, PIN_RELATIVE_PATH);
  const pin = JSON.parse(readFileSync(pinPath, 'utf8'));

  let fetched;
  try {
    fetched = await fetchPin({ pin });
  } catch (error) {
    console.error(`refused: could not fetch the pin — ${error.message}`);
    console.error('Nothing was written. An unreachable source is not a verification.');
    process.exit(1);
  }
  printFetch(fetched);

  const comparison = compareWithPin({ pin, fetched });
  if (comparison.conflicts.length > 0) {
    console.error('\nrefused: recorded digests do not match the fetched bytes:');
    for (const conflict of comparison.conflicts) {
      console.error(`  ${conflict.id}: recorded ${conflict.recorded}, fetched ${conflict.fetched}`);
    }
    console.error(
      'A recorded digest moving under a fixed revision is a content review\n' +
        '(docs/RESEARCH_SOURCES.md §4 step 4), not a refresh. Nothing was written.',
    );
    process.exit(1);
  }

  if (!write) {
    if (comparison.complete) {
      console.log('\n[PASS] every recorded digest matches the fetched bytes.');
      return;
    }
    console.error(
      '\n[FAIL] the pin is not complete: ' +
        `${comparison.fillable.length} guide(s) unrecorded, verified="${pin.verified}".\n` +
        'Run with --write to record the measured digests.',
    );
    process.exit(1);
  }

  const record = buildRecord({ pin, fetched });
  writeFileSync(pinPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`\n[PASS] recorded ${record.guides.length} guide digests, verified="verified"`);
  console.log(`  parent sha256 ${record.sha256}`);
  console.log('  Next: pnpm verify, then review docs/RESEARCH_SOURCES.md §5 for wording.');
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  await main();
}
