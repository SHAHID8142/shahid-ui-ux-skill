/**
 * T1018 — the loader the research provider was waiting for (issue #14).
 *
 * `research-provider.ts` can only hand out a hit when a loader supplies bytes
 * whose digest matches the pin. Until this file existed there was no such
 * loader in the repository, so the provider arm of every paired run was
 * `not-run` — an honest statement of a missing part, not a capability.
 *
 * What this loader is:
 * - **Cache-only, never network.** It reads a local directory of guide files
 *   that an operator populated with `scripts/research/cache-guides.mjs`. No
 *   socket, no client import: "does SUS reach the network?" stays answerable by
 *   reading imports, and `pnpm verify` never needs a connection.
 * - **Digest-bound.** Every file is hashed on read and compared with the pin.
 *   A file that does not match is skipped, never served with a warning: text we
 *   did not record is not text we may cite.
 * - **Bounded.** File size, excerpt length, candidate count and the provider's
 *   own call/hit caps apply here too. A cap that lives only in prose is a cap
 *   that gets exceeded.
 * - **Deterministic.** Ranking is token overlap over the guide id and title —
 *   no embeddings, no network service, no clock. The same cache and query give
 *   the same hits in the same order.
 *
 * What it is not:
 * - Not a search engine. Four guides are pinned; the ~250 other upstream guides
 *   are unpinned and unreachable through this loader by construction.
 * - Not an instruction channel. It returns text; `research-provider.ts` stamps
 *   `trusted: false` on every hit and nothing here injects a hit into a prompt.
 * - Not a licence decision. It reads only what the pin's licence allows the
 *   provider to attribute (Apache-2.0), and the cache directory is git-ignored
 *   so upstream text is not copied into this repository (D06 stays open).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import {
  RESEARCH_MAX_EXCERPT_CHARS,
  type ResearchGuidePin,
  type ResearchLookup,
  type ResearchLookupOutcome,
  type ResearchSourcePin,
} from './research-provider.js';

/** Below this, a matched section is padded from the sections that follow. */
const MIN_USEFUL_EXCERPT_CHARS = 300;

/** 512 KiB: larger than any pinned guide, small enough that a wrong file is refused. */
export const CACHE_MAX_FILE_BYTES = 512 * 1024;

/** A guide id is a slug. Anything else (`../`, an absolute path, a NUL) is refused. */
const GUIDE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CacheGuideState = 'verified' | 'missing' | 'digest-mismatch' | 'unreadable';

/** One guide's cache condition. Reported, so "no hit" can be explained without guessing. */
export interface CacheGuideStatus {
  guideId: string;
  state: CacheGuideState;
  /** Digest computed over the file on disk, when it could be read. */
  sha256: string | null;
  bytes: number | null;
  detail: string | null;
}

export interface CacheLoaderOptions {
  /** Directory holding `<guideId>.md` files. Git-ignored by convention. */
  dir: string;
  pin: ResearchSourcePin;
  guides: readonly ResearchGuidePin[];
  /** Read override for tests. Defaults to `readFileSync(path, 'utf8')`. */
  readText?: (path: string) => string;
  /** Existence override for tests. Defaults to `existsSync`. */
  fileExists?: (path: string) => boolean;
  maxFileBytes?: number;
  maxExcerptChars?: number;
}

export interface CacheLoader {
  /** The injected transport `createResearchProvider()` expects. */
  readonly lookup: ResearchLookup;
  /** Per-guide cache state, computed on demand (files may appear or be removed). */
  status(): CacheGuideStatus[];
  /** Absolute path the loader reads for one guide, or null when the id is unsafe. */
  pathFor(guideId: string): string | null;
}

function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

/**
 * Section whose heading best matches the query, otherwise the head of the guide.
 *
 * A whole guide is 5–20k characters; an excerpt that ignores the query is noise
 * the caller pays for and cannot use. The first section is the fallback because
 * a guide's opening section states what it is about.
 */
function excerptFor(text: string, query: string, maxChars: number): string {
  const wanted = new Set(tokensOf(query));
  const lines = text.split(/\r?\n/);
  const sections: Array<{ heading: string; body: string[]; score: number }> = [];
  let current: { heading: string; body: string[]; score: number } | null = null;
  for (const line of lines) {
    const heading = /^#{1,4}\s+(.*)$/.exec(line);
    if (heading) {
      if (current) sections.push(current);
      const title = heading[1] ?? '';
      current = {
        heading: title,
        body: [line],
        score: tokensOf(title).filter((token) => wanted.has(token)).length,
      };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);

  const bestIndex = sections.reduce(
    (winner, section, index) =>
      winner === -1 || section.score > sections[winner]!.score ? index : winner,
    -1,
  );
  if (bestIndex === -1) {
    const head = text.trim();
    return head.length > maxChars ? head.slice(0, maxChars) : head;
  }
  // A matched heading with two lines under it is not an excerpt, it is a label.
  // Pad from the sections that follow until the excerpt is worth the tokens, and
  // never cross maxChars.
  const parts: string[] = [];
  for (let index = bestIndex; index < sections.length; index += 1) {
    parts.push(sections[index]!.body.join('\n').trim());
    if (parts.join('\n\n').length >= MIN_USEFUL_EXCERPT_CHARS) break;
  }
  const joined = parts.join('\n\n').trim();
  return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
}

/**
 * Builds a loader over a cache directory. Synchronous reads, deterministic
 * ranking, and every failure is a skip with a reason rather than a throw.
 */
export function createCacheLoader(options: CacheLoaderOptions): CacheLoader {
  const root = resolve(options.dir);
  const readText = options.readText ?? ((path: string) => readFileSync(path, 'utf8'));
  const fileExists = options.fileExists ?? existsSync;
  const maxFileBytes = options.maxFileBytes ?? CACHE_MAX_FILE_BYTES;
  const maxExcerptChars = options.maxExcerptChars ?? RESEARCH_MAX_EXCERPT_CHARS;
  const byId = new Map(options.guides.map((guide) => [guide.guideId, guide]));

  function pathFor(guideId: string): string | null {
    if (typeof guideId !== 'string' || !GUIDE_ID.test(guideId)) return null;
    const candidate = resolve(join(root, `${guideId}.md`));
    // Belt and braces: the slug pattern already forbids traversal, this makes the
    // containment explicit so a future pattern change cannot escape the cache.
    if (candidate !== root && !candidate.startsWith(root + sep)) return null;
    return candidate;
  }

  function inspect(guide: ResearchGuidePin): CacheGuideStatus {
    const path = pathFor(guide.guideId);
    if (path === null) {
      return {
        guideId: guide.guideId,
        state: 'unreadable',
        sha256: null,
        bytes: null,
        detail: 'guide id is not a cache-safe slug',
      };
    }
    if (!fileExists(path)) {
      return {
        guideId: guide.guideId,
        state: 'missing',
        sha256: null,
        bytes: null,
        detail: `not cached: ${guide.guideId}.md is absent from the cache directory`,
      };
    }
    let text: string;
    try {
      const size = statSync(path).size;
      if (size > maxFileBytes) {
        return {
          guideId: guide.guideId,
          state: 'unreadable',
          sha256: null,
          bytes: size,
          detail: `file is ${size} bytes, above the ${maxFileBytes} byte cap`,
        };
      }
      text = readText(path);
    } catch (error) {
      return {
        guideId: guide.guideId,
        state: 'unreadable',
        sha256: null,
        bytes: null,
        detail: error instanceof Error ? error.message : 'unreadable',
      };
    }
    const sha256 = createHash('sha256').update(text, 'utf8').digest('hex');
    const bytes = Buffer.byteLength(text, 'utf8');
    if (guide.sha256 === null) {
      return {
        guideId: guide.guideId,
        state: 'unreadable',
        sha256,
        bytes,
        detail: 'the pin records no digest for this guide, so nothing can be verified',
      };
    }
    if (sha256 !== guide.sha256) {
      return {
        guideId: guide.guideId,
        state: 'digest-mismatch',
        sha256,
        bytes,
        detail: `cached text hashes to ${sha256.slice(0, 12)}… but the pin records ${guide.sha256.slice(0, 12)}…`,
      };
    }
    return { guideId: guide.guideId, state: 'verified', sha256, bytes, detail: null };
  }

  const lookup: ResearchLookup = ({ query, limit }) => {
    const wanted = tokensOf(query);
    // Rank on the pinned identity first (a title match is a strong signal) and on
    // the cached text second, because most real topics ("header association") name
    // something *inside* a guide rather than its title. Both are token overlap: no
    // embeddings, no service, no clock, so the same cache and query always rank the
    // same way. Content is read at most once per guide per call.
    const ranked = [...byId.values()]
      .map((guide) => {
        const identity = new Set(tokensOf(`${guide.guideId} ${guide.title}`));
        const identityScore = wanted.filter((token) => identity.has(token)).length;
        let contentScore = 0;
        const path = pathFor(guide.guideId);
        if (path !== null && fileExists(path)) {
          try {
            const body = new Set(tokensOf(readText(path)));
            contentScore = wanted.filter((token) => body.has(token)).length;
          } catch {
            contentScore = 0;
          }
        }
        return { guide, score: identityScore * 2 + contentScore };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) =>
        b.score === a.score ? a.guide.guideId.localeCompare(b.guide.guideId) : b.score - a.score,
      );
    // Keep only guides that are in the same league as the best match. A guide
    // that shares one incidental token is noise the caller pays for.
    const best = ranked[0]?.score ?? 0;
    const shortlist = ranked
      .filter((candidate) => candidate.score * 2 >= best)
      .slice(0, Math.max(limit, 1));

    const outcome: ResearchLookupOutcome & {
      hits: Array<{ guideId: string; excerpt: string; sha256: string | null }>;
    } = {
      available: true,
      hits: [],
    };

    let cachedAny = false;
    for (const { guide } of shortlist) {
      const state = inspect(guide);
      if (state.state === 'missing') continue;
      cachedAny = true;
      if (state.state !== 'verified' || state.sha256 === null) continue;
      let text: string;
      try {
        text = readText(pathFor(guide.guideId) as string);
      } catch {
        continue;
      }
      const excerpt = excerptFor(text, query, maxExcerptChars);
      if (excerpt.length === 0) continue;
      outcome.hits.push({ guideId: guide.guideId, excerpt, sha256: state.sha256 });
    }

    if (outcome.hits.length > 0) return outcome;
    // Distinguish "the cache is not populated" from "nothing matched the query":
    // the caller fixes one by caching and the other by rephrasing.
    if (shortlist.length === 0) return { available: false, reason: 'no-match', hits: [] };
    return { available: false, reason: cachedAny ? 'no-match' : 'not-installed', hits: [] };
  };

  return {
    lookup,
    pathFor,
    status: () => [...byId.values()].map(inspect),
  };
}
