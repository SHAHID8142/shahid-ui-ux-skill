/**
 * T1016 — the research provider's caps, offline default and provenance
 * refusal, proven rather than documented.
 *
 * What each block exists to prove:
 *
 * - **Offline is the default.** With no flag and no loader the provider says
 *   `offline` and the loader is never called — the assertion is on the loader's
 *   own call count, not only on the returned reason, because a provider that
 *   reports offline while still fetching would pass the weaker check.
 * - **The flag alone is not enough.** `SUS_RESEARCH_ONLINE=1` with no loader
 *   reports `not-installed`; the module cannot import a client, so the only way
 *   to reach the network is a function the embedder passed in.
 * - **Caps hold at the boundary.** Three calls per run, five hits per query and
 *   1200 characters per excerpt, each asserted with an over-supplying loader.
 * - **Bad queries cost nothing.** A sentence, a single word, a generic phrase
 *   and punctuation are rejected as `invalid-query` without spending a call.
 * - **Provenance is a gate, not a label.** A digest mismatch drops the hit
 *   instead of downgrading it, and an id absent from the pin never becomes a
 *   hit. Both are asserted on the hits array, so a "rejected" hit that still
 *   appears fails the test.
 * - **An unavailable provider does not throw.** The callers are render paths.
 * - **The shipped pin is honest.** The last block reads
 *   `evals/research/modern-web-guidance/pin.json` and holds it to both halves of
 *   the claim: every digest is a real 64-hex digest, the parent manifest digest
 *   is the one the recorded guides imply, and the provider serves a hit from
 *   that pin only when a loader returns bytes matching it. A pin edited by hand
 *   breaks the manifest check; a provider that trusts its loader breaks the
 *   mismatch check.
 *
 * Deterministic and offline: no test performs a request. Every lookup is a local
 * closure and every digest a literal; the only file read is the committed pin,
 * which this package's suite already does for the provenance catalog.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RESEARCH_MAX_CALLS_PER_RUN,
  RESEARCH_MAX_EXCERPT_CHARS,
  RESEARCH_MAX_HITS_PER_QUERY,
  createResearchProvider,
  parseResearchQuery,
  researchOnlineByEnv,
  type ResearchGuidePin,
  type ResearchLookup,
  type ResearchLookupOutcome,
  type ResearchSourcePin,
} from '../src/research-provider.js';

const REVISION = '4dd968349e54ca45a05dd5c818fb035c9054b022';
const TABLE_SHA = 'a'.repeat(64);
const DRAWER_SHA = 'b'.repeat(64);
const INP_SHA = 'c'.repeat(64);

const PIN: ResearchSourcePin = {
  id: 'modern-web-guidance',
  upstreamUrl: 'https://github.com/GoogleChrome/modern-web-guidance',
  revision: REVISION,
  license: 'Apache-2.0',
  retrievedAt: '2026-11-10',
  sha256: 'f'.repeat(64),
  verified: 'verified',
};

const GUIDES: ResearchGuidePin[] = [
  {
    guideId: 'responsive-table',
    path: 'skills/modern-web-guidance/guides/ui-atoms/responsive-table.md',
    title: 'Responsive table',
    sha256: TABLE_SHA,
    verified: 'verified',
  },
  {
    guideId: 'navigation-drawer',
    path: 'skills/modern-web-guidance/guides/ui-components/navigation-drawer.md',
    title: 'Navigation drawer',
    sha256: DRAWER_SHA,
    verified: 'verified',
  },
  {
    guideId: 'identify-inp-causes',
    path: 'skills/modern-web-guidance/guides/performance/identify-inp-causes.md',
    title: 'Identify INP causes',
    sha256: INP_SHA,
    verified: 'verified',
  },
  {
    guideId: 'unpinned-guide',
    path: 'skills/modern-web-guidance/guides/css/unverified.md',
    title: 'Never fetched',
    sha256: null,
    verified: 'unverified',
  },
];

function hit(guideId: string, sha256: string | null, excerpt = 'Upstream text.') {
  return { guideId, sha256, excerpt };
}

/** An online provider over the fixture pin, with a counting loader. */
function onlineProvider(outcome: ResearchLookupOutcome | (() => ResearchLookupOutcome)) {
  const calls: string[] = [];
  const lookup: ResearchLookup = ({ query }) => {
    calls.push(query);
    return typeof outcome === 'function' ? outcome() : outcome;
  };
  const provider = createResearchProvider({
    pin: PIN,
    guides: GUIDES,
    lookup,
    isOnline: () => true,
  });
  return { provider, calls };
}

describe('offline default', () => {
  it('never calls the loader when SUS_RESEARCH_ONLINE is not set', async () => {
    const calls: string[] = [];
    const lookup: ResearchLookup = ({ query }) => {
      calls.push(query);
      return { available: true, hits: [hit('responsive-table', TABLE_SHA)] };
    };
    const provider = createResearchProvider({
      pin: PIN,
      guides: GUIDES,
      lookup,
      isOnline: researchOnlineByEnv,
    });

    const result = await provider.search({ query: 'responsive table' });

    expect(result.available).toBe(false);
    expect(result.reason).toBe('offline');
    expect(result.hits).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('reports not-installed when online but no loader was injected', async () => {
    const provider = createResearchProvider({ pin: PIN, guides: GUIDES, isOnline: () => true });
    const result = await provider.search({ query: 'responsive table' });

    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-installed');
    expect(provider.callsUsed()).toBe(0);
  });

  it('reads the environment flag literally', () => {
    const previous = process.env.SUS_RESEARCH_ONLINE;
    try {
      delete process.env.SUS_RESEARCH_ONLINE;
      expect(researchOnlineByEnv()).toBe(false);
      process.env.SUS_RESEARCH_ONLINE = '1';
      expect(researchOnlineByEnv()).toBe(true);
      process.env.SUS_RESEARCH_ONLINE = 'true';
      expect(researchOnlineByEnv()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.SUS_RESEARCH_ONLINE;
      else process.env.SUS_RESEARCH_ONLINE = previous;
    }
  });

  it('turns a throwing loader into an unavailable result instead of an error', async () => {
    const provider = createResearchProvider({
      pin: PIN,
      guides: GUIDES,
      lookup: () => {
        throw new Error('connection reset');
      },
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('offline');
    expect(result.hits).toEqual([]);
  });
});

describe('hard caps', () => {
  it('stops after three lookups per run', async () => {
    const { provider, calls } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA)],
    });

    for (let index = 0; index < RESEARCH_MAX_CALLS_PER_RUN; index += 1) {
      const result = await provider.search({ query: 'responsive table' });
      expect(result.available).toBe(true);
    }

    const refused = await provider.search({ query: 'responsive table' });
    expect(refused.available).toBe(false);
    expect(refused.reason).toBe('disabled');
    expect(calls).toHaveLength(RESEARCH_MAX_CALLS_PER_RUN);
    expect(provider.callsUsed()).toBe(RESEARCH_MAX_CALLS_PER_RUN);
  });

  it('returns at most five hits even when the loader offers more', async () => {
    // Seven verified guides, so the loader can genuinely over-supply and the cap
    // is what stops the list — not a shortage of known ids.
    const wideGuides: ResearchGuidePin[] = Array.from({ length: 7 }, (_, index) => ({
      guideId: `guide-${index}`,
      path: `skills/modern-web-guidance/guides/synthetic/guide-${index}.md`,
      title: `Synthetic guide ${index}`,
      sha256: TABLE_SHA,
      verified: 'verified' as const,
    }));
    const provider = createResearchProvider({
      pin: PIN,
      guides: wideGuides,
      lookup: () => ({
        available: true,
        hits: wideGuides.map((guide) => hit(guide.guideId, TABLE_SHA)),
      }),
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(true);
    expect(result.hits).toHaveLength(RESEARCH_MAX_HITS_PER_QUERY);
    expect(result.hits.map((entry) => entry.guideId)).toEqual([
      'guide-0',
      'guide-1',
      'guide-2',
      'guide-3',
      'guide-4',
    ]);
  });

  it('de-duplicates repeated guide ids from one loader response', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [
        hit('responsive-table', TABLE_SHA),
        hit('responsive-table', TABLE_SHA),
        hit('navigation-drawer', DRAWER_SHA),
      ],
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.hits).toHaveLength(2);
    expect(result.hits.map((entry) => entry.guideId)).toEqual([
      'responsive-table',
      'navigation-drawer',
    ]);
  });

  it('clamps a requested limit to the declared ceiling', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [
        hit('responsive-table', TABLE_SHA),
        hit('navigation-drawer', DRAWER_SHA),
        hit('identify-inp-causes', INP_SHA),
      ],
    });

    const one = await provider.search({ query: 'responsive table', limit: 1 });
    expect(one.hits).toHaveLength(1);
    expect(one.hits[0]?.guideId).toBe('responsive-table');

    const parsed = parseResearchQuery({ query: 'responsive table', limit: 999 });
    expect(parsed.ok && parsed.limit).toBe(RESEARCH_MAX_HITS_PER_QUERY);
  });

  it('truncates an excerpt at 1200 characters and flags it', async () => {
    const long = 'x'.repeat(RESEARCH_MAX_EXCERPT_CHARS + 500);
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA, long)],
    });

    const result = await provider.search({ query: 'responsive table' });
    const first = result.hits[0];
    expect(first?.excerpt).toHaveLength(RESEARCH_MAX_EXCERPT_CHARS);
    expect(first?.truncated).toBe(true);
    expect(result.tokensUsed).toBe(Math.ceil(RESEARCH_MAX_EXCERPT_CHARS / 4));
  });

  it('leaves a short excerpt untruncated', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA, 'Rows become cards.')],
    });
    const result = await provider.search({ query: 'responsive table' });
    expect(result.hits[0]?.excerpt).toBe('Rows become cards.');
    expect(result.hits[0]?.truncated).toBe(false);
  });
});

describe('query validation', () => {
  it('rejects sentences', () => {
    for (const query of [
      'how should I fix my table on mobile?',
      'What is the best way to test INP',
      'tables, cards and drawers',
    ]) {
      expect(parseResearchQuery({ query }).ok).toBe(false);
    }
  });

  it('rejects single words and über-broad phrases', () => {
    expect(parseResearchQuery({ query: 'tables' }).ok).toBe(false);
    expect(parseResearchQuery({ query: 'web design' }).ok).toBe(false);
    expect(parseResearchQuery({ query: 'css layout' }).ok).toBe(false);
    expect(parseResearchQuery({ query: '   ' }).ok).toBe(false);
  });

  it('accepts a two-to-five word topic and normalises it', () => {
    const parsed = parseResearchQuery({ query: '  Responsive   Table ' });
    expect(parsed.ok).toBe(true);
    expect(parsed.ok && parsed.query).toBe('responsive table');
  });

  it('rejects six words', () => {
    expect(parseResearchQuery({ query: 'responsive table with card fallback narrow' }).ok).toBe(
      false,
    );
  });

  it('does not spend a lookup on an invalid query', async () => {
    const { provider, calls } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA)],
    });

    const result = await provider.search({ query: 'how do I fix my table?' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('invalid-query');
    expect(calls).toHaveLength(0);
    expect(provider.callsUsed()).toBe(0);
  });
});

describe('provenance is a gate', () => {
  it('rejects a hit whose digest does not match the pin', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', '9'.repeat(64))],
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-match');
    expect(result.hits).toEqual([]);
  });

  it('rejects a hit the loader could not hash at all', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', null)],
    });
    const result = await provider.search({ query: 'responsive table' });
    expect(result.hits).toEqual([]);
    expect(result.reason).toBe('no-match');
  });

  it('ignores a guide id the pin does not carry', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('invented-guide', TABLE_SHA), hit('responsive-table', TABLE_SHA)],
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.guideId).toBe('responsive-table');
  });

  it('ignores a guide whose pin entry is unverified', async () => {
    const { provider } = onlineProvider({
      available: true,
      hits: [hit('unpinned-guide', 'd'.repeat(64))],
    });
    const result = await provider.search({ query: 'responsive table' });
    expect(result.hits).toEqual([]);
    expect(result.reason).toBe('no-match');
  });

  it('refuses every hit when the pin itself is unverified', async () => {
    const { provider, calls } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA)],
    });
    const unverified = createResearchProvider({
      pin: { ...PIN, sha256: null, verified: 'unverified' },
      guides: GUIDES,
      lookup: () => ({ available: true, hits: [hit('responsive-table', TABLE_SHA)] }),
      isOnline: () => true,
    });

    const result = await unverified.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(calls).toHaveLength(0);
    expect(provider.callsUsed()).toBe(0);
  });

  it('refuses a licence this module cannot attribute', async () => {
    const provider = createResearchProvider({
      pin: { ...PIN, license: 'MIT' },
      guides: GUIDES,
      lookup: () => ({ available: true, hits: [hit('responsive-table', TABLE_SHA)] }),
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('disabled');
  });
});

describe('a verified hit carries full provenance and is never trusted', () => {
  it('returns the pinned fields unchanged and marks the hit untrusted', async () => {
    const { provider, calls } = onlineProvider({
      available: true,
      hits: [hit('responsive-table', TABLE_SHA, 'Wide tables become cards below 640px.')],
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.callsUsed).toBe(1);
    expect(calls).toEqual(['responsive table']);

    const first = result.hits[0];
    expect(first).toBeDefined();
    expect(first?.guideId).toBe('responsive-table');
    expect(first?.path).toBe('skills/modern-web-guidance/guides/ui-atoms/responsive-table.md');
    expect(first?.license).toBe('Apache-2.0');
    expect(first?.revision).toBe(REVISION);
    expect(first?.sha256).toBe(TABLE_SHA);
    expect(first?.url).toBe(
      `https://github.com/GoogleChrome/modern-web-guidance/blob/${REVISION}/skills/modern-web-guidance/guides/ui-atoms/responsive-table.md`,
    );
    // The literal type is the guard: a caller cannot widen this at runtime.
    expect(first?.trusted).toBe(false);
  });

  it('passes a loader-declared reason through', async () => {
    const { provider } = onlineProvider({ available: false, reason: 'no-match', hits: [] });
    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-match');
  });
});

describe('the shipped pin is a measured record, and still not a rulebook', () => {
  const pinPath = join(
    __dirname,
    '..',
    '..',
    '..',
    'evals',
    'research',
    'modern-web-guidance',
    'pin.json',
  );
  /** The pin's own row shape is the module's, so the file is checked, not asserted. */
  type PinGuide = ResearchGuidePin;
  const record = JSON.parse(readFileSync(pinPath, 'utf8')) as {
    id: string;
    upstreamUrl: string;
    revision: string;
    license: string;
    licenseSha256: string;
    retrievedAt: string;
    sha256: string | null;
    verified: 'verified' | 'unverified';
    verifiedBy: string;
    verificationNote: string;
    guides: PinGuide[];
  };

  /**
   * The manifest digest is defined by the pin's own contents, so a test can
   * re-derive it without trusting the script that wrote it: revision, licence
   * digest, then each guide's id, path and digest, NUL-joined. If a guide digest
   * is edited without the parent, or a guide is added without re-recording, this
   * stops matching — which is exactly the hand-edit this test exists to catch.
   */
  function manifestDigest(): string {
    const parts = ['modern-web-guidance', record.revision, 'LICENSE', record.licenseSha256];
    for (const guide of record.guides) parts.push(guide.guideId, guide.path, guide.sha256 ?? '');
    return createHash('sha256').update(parts.join('\u0000')).digest('hex');
  }

  it('records the revision, licence and paths from issue #14 triage', () => {
    expect(record.revision).toBe('4dd968349e54ca45a05dd5c818fb035c9054b022');
    expect(record.license).toBe('Apache-2.0');
    expect(record.upstreamUrl).toBe('https://github.com/GoogleChrome/modern-web-guidance');
    expect(record.guides).toHaveLength(4);
    expect(record.guides.map((guide) => guide.guideId)).toEqual([
      'responsive-table',
      'responsive-design',
      'identify-inp-causes',
      'navigation-drawer',
    ]);
  });

  it('records digests it can point at a measuring script for', () => {
    // A verified pin is a claim that bytes were fetched. The claim is only
    // meaningful if it says which tool measured them, so that a reviewer can
    // re-run it; the digest shapes below are the ones that tool writes.
    expect(record.verified).toBe('verified');
    expect(record.verifiedBy).toBe('scripts/research/verify-pin.mjs');
    expect(record.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(record.licenseSha256).toBe(
      'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
    );
    for (const guide of record.guides) {
      expect(guide.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(guide.verified).toBe('verified');
    }
    // No two guides may claim the same bytes: that would mean one digest was
    // copied across rows instead of measured.
    const digests = record.guides.map((guide) => guide.sha256);
    expect(new Set(digests).size).toBe(digests.length);
  });

  it('reports a parent digest that its own guide rows imply', () => {
    expect(record.sha256).toBe(manifestDigest());
  });

  it('says in prose that it is a measured record, not an approved one', () => {
    // The note has to keep carrying the limits a digest cannot express: a
    // matching hash proves which bytes, never that SUS adopted their advice.
    expect(record.verificationNote).toContain('HTTPS');
    expect(record.verificationNote).toContain('no guide text is quoted');
  });

  it('serves a hit once a loader returns the pinned bytes', async () => {
    const provider = createResearchProvider({
      // The whole record is passed through, including the measurement fields:
      // a pin that declares its own provenance must still type-check as one.
      pin: record,
      guides: record.guides,
      lookup: () => ({
        available: true,
        hits: [hit('responsive-table', record.guides[0]?.sha256 ?? null)],
      }),
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(true);
    if (!result.available) throw new Error('unreachable');
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0]?.guideId).toBe('responsive-table');
    expect(result.hits[0]?.sha256).toBe(record.guides[0]?.sha256);
    // A verified digest buys provenance, not trust: third-party text stays data.
    expect(result.hits[0]?.trusted).toBe(false);
  });

  it('rejects a loader that returns different bytes than the pin records', async () => {
    const provider = createResearchProvider({
      // The whole record is passed through, including the measurement fields:
      // a pin that declares its own provenance must still type-check as one.
      pin: record,
      guides: record.guides,
      lookup: () => ({ available: true, hits: [hit('responsive-table', 'e'.repeat(64))] }),
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    // Verification applies to the pin, not to whatever the loader offers: a
    // loader is a transport, and a transport that returns other bytes is wrong.
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-match');
    expect(result.hits).toEqual([]);
  });

  it('still refuses an unverified pin before spending a lookup', async () => {
    let loaderCalls = 0;
    const provider = createResearchProvider({
      pin: { ...PIN, sha256: null, verified: 'unverified' },
      guides: GUIDES,
      lookup: () => {
        loaderCalls += 1;
        return { available: true, hits: [] };
      },
      isOnline: () => true,
    });

    const result = await provider.search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('disabled');
    expect(loaderCalls).toBe(0);
  });
});
