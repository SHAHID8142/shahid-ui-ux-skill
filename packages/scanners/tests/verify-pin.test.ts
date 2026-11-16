/**
 * T1016 / issue #14 — the pin's measuring script, tested without a network.
 *
 * `scripts/research/verify-pin.mjs` is the only code in this repository that
 * reaches the network, and it is deliberately absent from `pnpm verify`: a build
 * that failed because GitHub was slow would teach people to skip the build. That
 * leaves a gap worth closing here — the parts that decide *whether to write* are
 * pure, and they are the parts that matter:
 *
 * - **Two transports must agree.** A single fetch proves one host answered. The
 *   fake transports below disagree on one file to show the check stops instead of
 *   hashing whichever answer arrived first.
 * - **A recorded digest is never replaced.** Filling in a `null` is measurement;
 *   overwriting a digest that is already there is a content review, and the script
 *   must refuse it rather than "refresh" it.
 * - **The manifest digest is the pin's own arithmetic.** The shipped pin is
 *   recomputed here from its own fields, so a hand-edited guide row breaks this
 *   test even if the script that wrote the pin is never run again.
 *
 * What this does NOT cover: the actual HTTPS requests. Those are exercised by
 * running the script (SUS_RESEARCH_ONLINE=1 node scripts/research/verify-pin.mjs),
 * which is recorded in .sus-dev/VERIFICATION/T1016.md. A test that mocked HTTP
 * and claimed to prove reachability would be asserting its own fixture.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LICENSE_PATH,
  PIN_RELATIVE_PATH,
  compareWithPin,
  fetchPin,
  fetchPinnedFile,
  manifestDigest,
  sha256Hex,
} from '../../../scripts/research/verify-pin.mjs';

const ROOT = join(__dirname, '..', '..', '..');

function readPin() {
  return JSON.parse(readFileSync(join(ROOT, PIN_RELATIVE_PATH), 'utf8'));
}

/** The fake transports answer by repository-relative path, like the hosts do. */
const RAW_PREFIX = 'https://raw.githubusercontent.com/GoogleChrome/modern-web-guidance/';
const API_PREFIX = 'https://api.github.com/repos/GoogleChrome/modern-web-guidance/contents/';

/** Two transports returning the same bytes for every path. */
function agreeingFetch(bodies: Record<string, string>) {
  return async (url: string) => {
    const path = url.startsWith(RAW_PREFIX)
      ? url.slice(RAW_PREFIX.length).split('/').slice(1).join('/')
      : (url.slice(API_PREFIX.length).split('?')[0] ?? '');
    const body = bodies[path];
    if (body === undefined) return new Response('missing', { status: 404 });
    const isApi = url.includes('api.github.com');
    const payload = isApi
      ? JSON.stringify({ type: 'file', content: Buffer.from(body).toString('base64') })
      : body;
    return new Response(payload, { status: 200 });
  };
}

describe('sha256Hex', () => {
  it('is the plain digest of the bytes, so a reviewer can reproduce it by hand', () => {
    expect(sha256Hex(Buffer.from(''))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex(Buffer.from('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('manifestDigest', () => {
  it('covers the revision, the licence digest and every guide row', () => {
    const guides = [
      { guideId: 'a', path: 'p/a.md', sha256: '1'.repeat(64) },
      { guideId: 'b', path: 'p/b.md', sha256: '2'.repeat(64) },
    ];
    const base = { revision: 'r', licenseSha256: '3'.repeat(64), guides };

    const digest = manifestDigest(base);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);

    // Each field must move the digest: a field that does not is a field the
    // manifest does not actually cover.
    expect(manifestDigest({ ...base, revision: 'r2' })).not.toBe(digest);
    expect(manifestDigest({ ...base, licenseSha256: '4'.repeat(64) })).not.toBe(digest);
    expect(
      manifestDigest({ ...base, guides: [{ ...guides[0], sha256: '5'.repeat(64) }, guides[1]] }),
    ).not.toBe(digest);
    expect(manifestDigest({ ...base, guides: [guides[0]] })).not.toBe(digest);
  });

  it('reproduces the digest recorded in the shipped pin', () => {
    // The strongest form of this check: the committed pin's parent digest is
    // recomputed from the committed guide rows, with no network and no trust in
    // whoever wrote the file.
    const pin = readPin();
    expect(pin.sha256).toBe(
      manifestDigest({
        revision: pin.revision,
        licenseSha256: pin.licenseSha256,
        guides: pin.guides,
      }),
    );
  });
});

describe('compareWithPin', () => {
  const guide = (guideId: string, sha256: string | null) => ({
    guideId,
    path: `skills/guides/${guideId}.md`,
    title: guideId,
    sha256,
    verified: sha256 === null ? 'unverified' : 'verified',
  });
  const pin = (overrides: Record<string, unknown> = {}) => ({
    id: 'modern-web-guidance',
    revision: 'rev',
    license: 'Apache-2.0',
    sha256: null,
    verified: 'unverified',
    guides: [guide('one', null)],
    ...overrides,
  });
  const fetched = {
    revision: 'rev',
    license: { bytes: 3, sha256: 'l'.repeat(64) },
    guides: [{ ...guide('one', null), sha256: 'a'.repeat(64), bytes: 10 }],
  };

  it('offers an unrecorded digest as fillable, not as a conflict', () => {
    const result = compareWithPin({ pin: pin(), fetched });
    expect(result.fillable).toEqual([{ id: 'one', sha256: 'a'.repeat(64) }]);
    expect(result.conflicts).toEqual([]);
    expect(result.complete).toBe(false);
  });

  it('refuses to treat moved bytes as a refresh', () => {
    const recorded = pin({ guides: [guide('one', 'b'.repeat(64))] });
    const result = compareWithPin({ pin: recorded, fetched });
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual({
      id: 'one',
      recorded: 'b'.repeat(64),
      fetched: 'a'.repeat(64),
    });
    expect(result.complete).toBe(false);
  });

  it('reports a guide the pin never listed as a conflict', () => {
    // A guide with no row in the pin has no recorded path to cite, so a loader
    // offering it is offering something uncitable.
    const result = compareWithPin({
      pin: pin({ guides: [] }),
      fetched,
    });
    expect(result.conflicts[0]?.recorded).toBe('absent from pin');
  });

  it('is complete only when the record already equals the fetch', () => {
    const digest = manifestDigest({
      revision: 'rev',
      licenseSha256: 'l'.repeat(64),
      guides: fetched.guides,
    });
    const recorded = pin({
      sha256: digest,
      verified: 'verified',
      guides: [guide('one', 'a'.repeat(64))],
    });
    expect(compareWithPin({ pin: recorded, fetched }).complete).toBe(true);

    // One field off — the parent digest — and the pin is not complete, even
    // though every guide row matches. Partial provenance is not provenance.
    expect(compareWithPin({ pin: { ...recorded, sha256: 'f'.repeat(64) }, fetched }).complete).toBe(
      false,
    );
  });
});

describe('fetchPinnedFile', () => {
  it('hashes the bytes both transports agreed on', async () => {
    const result = await fetchPinnedFile({
      revision: 'rev',
      path: LICENSE_PATH,
      fetchImpl: agreeingFetch({ [LICENSE_PATH]: 'Apache License' }),
    });
    expect(result.bytes).toBe('Apache License'.length);
    expect(result.sha256).toBe(sha256Hex(Buffer.from('Apache License')));
    expect(result.url).toContain('/rev/');
  });

  it('stops when the transports disagree instead of picking a winner', async () => {
    const fetchImpl = async (url: string) => {
      if (url.includes('api.github.com')) {
        return new Response(
          JSON.stringify({ type: 'file', content: Buffer.from('short').toString('base64') }),
        );
      }
      return new Response('truncated body that is longer', { status: 200 });
    };
    await expect(fetchPinnedFile({ revision: 'rev', path: 'LICENSE', fetchImpl })).rejects.toThrow(
      /transports disagree/,
    );
  });

  it('treats a non-200 as a failure, not as empty content', async () => {
    const fetchImpl = async () => new Response('nope', { status: 404, statusText: 'Not Found' });
    await expect(fetchPinnedFile({ revision: 'rev', path: 'LICENSE', fetchImpl })).rejects.toThrow(
      /404/,
    );
  });
});

describe('fetchPin', () => {
  it('fetches the licence and every pinned guide in pin order', async () => {
    const pin = readPin();
    const bodies: Record<string, string> = { [LICENSE_PATH]: 'Apache License' };
    for (const guide of pin.guides) bodies[guide.path] = `body of ${guide.guideId}`;

    const fetched = await fetchPin({ pin, fetchImpl: agreeingFetch(bodies) });
    expect(fetched.revision).toBe(pin.revision);
    expect(fetched.license.sha256).toBe(sha256Hex(Buffer.from('Apache License')));
    expect(fetched.guides.map((entry: { guideId: string }) => entry.guideId)).toEqual(
      pin.guides.map((entry: { guideId: string }) => entry.guideId),
    );
    for (const entry of fetched.guides) {
      expect(entry.sha256).toBe(sha256Hex(Buffer.from(bodies[entry.path] ?? '')));
    }
  });
});
