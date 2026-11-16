/**
 * T1016 — bounded, versioned adapter for one external research source
 * (GoogleChrome/modern-web-guidance, issue #14).
 *
 * Why this file exists, and why it is shaped this way:
 *
 * - **It is a reader, not a rulebook.** SUS's own guidance stays authoritative.
 *   This module can hand a caller a short, hash-verified excerpt of a pinned
 *   upstream guide and nothing else. It never adds rules, never rewrites a rule,
 *   and never decides that SUS now meets an upstream standard.
 * - **It is not an instruction channel.** Upstream text is third-party data.
 *   Every hit is returned with `trusted: false` and must be treated as quoted
 *   reference material, never as directions to the agent reading it. Text that
 *   says "ignore your previous instructions" is evidence about the upstream
 *   file, not an instruction. Nothing here injects a hit into a prompt; putting
 *   a hit in front of a model is the caller's explicit, visible decision.
 * - **Offline by default, and inert when it cannot verify.** With no
 *   `SUS_RESEARCH_ONLINE=1`, or with no injected loader, or with a pin that has
 *   not been verified, the provider returns `available: false` and a reason.
 *   Callers continue with SUS's own guidance. It never throws at a caller and
 *   never degrades a rejected hit into an accepted one.
 * - **Caps are in the code, not in a document.** Three lookups per run, five
 *   hits per query, 1200 characters per excerpt, 2–5 word single-topic queries.
 *   A cap that lives only in prose is a cap that gets exceeded.
 * - **No network client is imported here.** A lookup function is injected. This
 *   module cannot open a socket, so an audit of "does SUS reach the network?"
 *   does not have to trust a flag.
 * - **The licence is not decided here (D06 stays open).** Hits exist only for a
 *   pin whose licence is Apache-2.0, because that is the only licence this
 *   module's attribution text was written for. Any other licence needs an owner
 *   decision, not a code path.
 *
 * Honest limit: the pin this module ships against (evals/research/
 * modern-web-guidance/pin.json) records measured digests, and since T1018 a
 * shipped loader exists that supplies bytes matching them from a verified,
 * git-ignored cache (`research-cache-loader.ts`, filled by
 * `scripts/research/cache-guides.mjs`). What that does not buy is authority:
 * a hit is still quoted reference material, never a SUS rule, and whether the
 * guidance helps an agent is unmeasured — the paired run records mechanics
 * (`scripts/research/paired-run.mjs`), not effectiveness. The digests were
 * measured by `scripts/research/verify-pin.mjs`, deliberately absent from
 * `pnpm verify` because a build must never need the network; this module does
 * not re-verify, so a stale pin degrades to a rejected hit, never to a quiet one.
 */

/** How much the pin's provenance has actually been checked. */
export type ResearchPinVerification = 'verified' | 'unverified';

/**
 * One immutable snapshot of an upstream source.
 *
 * `sha256` is the digest recorded when the source was inspected, and
 * `revision` is the commit the paths were read from. Both are required before
 * any hit can be produced: a pin without a digest is a claim, not a record.
 */
export interface ResearchSourcePin {
  id: string;
  upstreamUrl: string;
  revision: string;
  license: string;
  retrievedAt: string;
  sha256: string | null;
  verified: ResearchPinVerification;
  /**
   * Digest of the upstream licence text, when the pin recorded one. Optional
   * because a pin may predate the measurement; when present it makes the
   * licence claim a measured fact rather than a remembered name. The field the
   * provider *enforces* is `license` above — this one is evidence for a
   * reviewer, and no call path may infer permission from it.
   */
  licenseSha256?: string;
  /** Date and tool that measured the digests. Provenance for a human, not input. */
  verifiedAt?: string;
  verifiedBy?: string;
}

/**
 * A query is a *topic*, not a question.
 *
 * Deliberately narrow: 2–5 words describing a single topic. Sentence-like input
 * ("how should I fix my table on mobile?") is rejected rather than guessed at,
 * because a provider that interprets a sentence is an interpreter with a search
 * box, and its output can no longer be pinned to specific upstream text.
 */
export interface ResearchQuery {
  /** 2–5 words, single topic. Sentence-like or über-broad input is rejected. */
  query: string;
  /** Requested hits, clamped to 1..5 (RESEARCH_MAX_HITS_PER_QUERY). */
  limit?: number;
}

/**
 * A returned hit. Every field is provenance except `excerpt` and
 * `truncated`, and `trusted` is the literal `false` — a hit cannot be
 * constructed as trusted, so no caller can accidentally promote one.
 */
export interface ResearchHit {
  guideId: string;
  path: string;
  title: string;
  license: string;
  url: string;
  revision: string;
  sha256: string;
  excerpt: string;
  truncated: boolean;
  trusted: false;
}

/** Why the provider gave nothing back. */
export type ResearchUnavailableReason =
  'offline' | 'disabled' | 'not-installed' | 'invalid-query' | 'no-match';

/**
 * The only shape a provider call returns. `available: false` with a reason is a
 * normal outcome, not an error: the caller keeps working with SUS's guidance.
 */
export interface ResearchProviderResult {
  available: boolean;
  reason?: ResearchUnavailableReason;
  hits: ResearchHit[];
  callsUsed: number;
  tokensUsed: number;
}

/** Three lookups per run: enough to compare two topics and re-check one. */
export const RESEARCH_MAX_CALLS_PER_RUN = 3;
/** Five hits per query: a reading list, not a corpus dump. */
export const RESEARCH_MAX_HITS_PER_QUERY = 5;
/** 1200 characters: roughly one section of a guide, small enough to audit by eye. */
export const RESEARCH_MAX_EXCERPT_CHARS = 1200;
/** Two words minimum, because one word is always über-broad. */
export const RESEARCH_MIN_QUERY_WORDS = 2;
/** Five words maximum: past this the input is a sentence. */
export const RESEARCH_MAX_QUERY_WORDS = 5;
/** The only licence this module was written to attribute. Others need a decision. */
export const RESEARCH_SUPPORTED_LICENSE = 'Apache-2.0';

/**
 * Words that name a field rather than a topic. A query built only from these
 * ("web design", "css") matches hundreds of upstream guides, so it is rejected
 * as über-broad instead of returning an arbitrary five.
 */
const GENERIC_TOPIC_WORDS: ReadonlySet<string> = new Set([
  'a11y',
  'accessibility',
  'best',
  'css',
  'design',
  'development',
  'frontend',
  'guidance',
  'guidelines',
  'html',
  'javascript',
  'layout',
  'modern',
  'performance',
  'practices',
  'responsiveness',
  'standards',
  'ui',
  'ux',
  'web',
]);

/** A guide inside the pinned source, with its own recorded digest. */
export interface ResearchGuidePin {
  guideId: string;
  /** Path inside the upstream repository, e.g. `guides/css/responsive-design.md`. */
  path: string;
  title: string;
  sha256: string | null;
  verified: ResearchPinVerification;
}

/**
 * What a lookup is allowed to hand back: an id, the text it actually read, and
 * the digest it computed over those bytes. No title, licence or URL — those come
 * from the pin, so a compromised loader cannot relabel upstream content.
 */
export interface ResearchLookupHit {
  guideId: string;
  excerpt: string;
  /** Digest the loader computed over the bytes it read. Null when it could not. */
  sha256: string | null;
}

/** A loader's own outcome. Its `available: false` is passed through. */
export interface ResearchLookupOutcome {
  available: boolean;
  reason?: ResearchUnavailableReason;
  hits: readonly ResearchLookupHit[];
}

/**
 * The injected transport. Synchronous or asynchronous; throwing is allowed (the
 * provider turns a throw into `available: false`), because a missing native
 * module or a dropped connection is not a programming error at the call site.
 */
export type ResearchLookup = (request: {
  query: string;
  limit: number;
  pin: ResearchSourcePin;
}) => Promise<ResearchLookupOutcome> | ResearchLookupOutcome;

export interface ResearchProviderOptions {
  pin: ResearchSourcePin;
  guides: readonly ResearchGuidePin[];
  /** Absent by default — that alone keeps the provider offline. */
  lookup?: ResearchLookup;
  /** Overridable for deterministic tests; defaults to the env flag. */
  isOnline?: () => boolean;
}

export interface ResearchProvider {
  readonly pin: ResearchSourcePin;
  /** Lookups consumed so far, whether they succeeded or not. */
  callsUsed(): number;
  search(input: ResearchQuery): Promise<ResearchProviderResult>;
}

/** Offline unless the operator opts in for this process. */
export function researchOnlineByEnv(): boolean {
  return process.env.SUS_RESEARCH_ONLINE === '1';
}

export type ResearchQueryParse =
  { ok: true; query: string; limit: number } | { ok: false; reason: 'invalid-query' };

function isGenericTopicWord(word: string): boolean {
  return GENERIC_TOPIC_WORDS.has(word);
}

/**
 * Accepts a topic, rejects everything else.
 *
 * The rejection is total rather than corrective: trimming a sentence down to its
 * first five words would invent a query the caller did not write, and the result
 * would still be pinned to upstream text that may not answer it.
 */
export function parseResearchQuery(input: ResearchQuery): ResearchQueryParse {
  const raw = typeof input.query === 'string' ? input.query : '';
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 96) return { ok: false, reason: 'invalid-query' };
  // Sentence punctuation and line breaks mean prose, not a topic.
  if (/[?!.;:,\n\r\t"'()[\]]/.test(trimmed)) return { ok: false, reason: 'invalid-query' };

  const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < RESEARCH_MIN_QUERY_WORDS || words.length > RESEARCH_MAX_QUERY_WORDS) {
    return { ok: false, reason: 'invalid-query' };
  }
  // "web design" is two words and still names no topic.
  if (words.every((word) => isGenericTopicWord(word.toLowerCase()))) {
    return { ok: false, reason: 'invalid-query' };
  }

  const requested =
    typeof input.limit === 'number' && Number.isFinite(input.limit)
      ? Math.trunc(input.limit)
      : RESEARCH_MAX_HITS_PER_QUERY;
  const limit = Math.min(Math.max(requested, 1), RESEARCH_MAX_HITS_PER_QUERY);

  return { ok: true, query: words.join(' ').toLowerCase(), limit };
}

function unavailable(reason: ResearchUnavailableReason, callsUsed: number): ResearchProviderResult {
  return { available: false, reason, hits: [], callsUsed, tokensUsed: 0 };
}

/**
 * Keeps a loader's reason inside the declared set. An unlabelled failure is
 * reported as `offline` rather than invented as a specific cause.
 */
function normalizeReason(reason: unknown): ResearchUnavailableReason {
  switch (reason) {
    case 'offline':
    case 'disabled':
    case 'not-installed':
    case 'invalid-query':
    case 'no-match':
      return reason;
    default:
      return 'offline';
  }
}

/** `https://github.com/o/r` + `a/b.md` + rev → a link to the pinned revision. */
function guideUrl(pin: ResearchSourcePin, path: string): string {
  const base = pin.upstreamUrl.replace(/\/+$/, '').replace(/\.git$/, '');
  return `${base}/blob/${pin.revision}/${path}`;
}

/**
 * Characters/4 is an *estimate* of prompt cost, not a measurement: this module
 * has no tokeniser and will not pretend to. It is reported so a caller can state
 * what a hit set cost instead of guessing.
 */
function estimateTokens(hits: readonly ResearchHit[]): number {
  const chars = hits.reduce((total, hit) => total + hit.excerpt.length, 0);
  return Math.ceil(chars / 4);
}

/**
 * Builds a provider bound to one pin.
 *
 * Order of refusals — each is a hard stop, none is a warning:
 *   1. query shape (invalid-query) — rejected before anything is charged;
 *   2. offline flag (offline);
 *   3. missing loader (not-installed);
 *   4. unsupported licence, unverified pin or exhausted call budget (disabled);
 *   5. loader failure or loader-declared unavailability (passed through);
 *   6. no hit surviving verification (no-match).
 */
export function createResearchProvider(options: ResearchProviderOptions): ResearchProvider {
  const { pin, guides, lookup } = options;
  const isOnline = options.isOnline ?? researchOnlineByEnv;
  const guidesById = new Map<string, ResearchGuidePin>(
    guides.map((guide) => [guide.guideId, guide]),
  );
  let calls = 0;

  async function search(input: ResearchQuery): Promise<ResearchProviderResult> {
    const parsed = parseResearchQuery(input);
    // A malformed query is a caller bug, not a lookup: it must not spend budget.
    if (!parsed.ok) return unavailable('invalid-query', calls);

    if (!isOnline()) return unavailable('offline', calls);
    if (!lookup) return unavailable('not-installed', calls);

    // Fail closed on provenance: no digest, no verified pin, no licence this
    // module can attribute → no hits, even when a loader is available.
    if (pin.verified !== 'verified' || pin.sha256 === null) return unavailable('disabled', calls);
    if (pin.license !== RESEARCH_SUPPORTED_LICENSE) return unavailable('disabled', calls);
    if (calls >= RESEARCH_MAX_CALLS_PER_RUN) return unavailable('disabled', calls);

    calls += 1;

    let outcome: ResearchLookupOutcome;
    try {
      outcome = await lookup({ query: parsed.query, limit: parsed.limit, pin });
    } catch {
      // A loader that throws is an unavailable source, not an exception for the
      // caller to handle while rendering a page.
      return unavailable('offline', calls);
    }

    if (!outcome.available) return unavailable(normalizeReason(outcome.reason), calls);

    const hits: ResearchHit[] = [];
    const seen = new Set<string>();
    for (const raw of outcome.hits) {
      if (hits.length >= parsed.limit) break;
      if (typeof raw.guideId !== 'string' || seen.has(raw.guideId)) continue;

      const guide = guidesById.get(raw.guideId);
      // An id the pin does not know is not a hit; it is a loader invention.
      if (!guide) continue;
      if (guide.verified !== 'verified' || guide.sha256 === null) continue;
      // A digest that does not match the pin is a rejection, never a downgrade:
      // the excerpt is not the text we recorded, so it is not citable here.
      if (raw.sha256 === null || raw.sha256 !== guide.sha256) continue;

      const excerpt = typeof raw.excerpt === 'string' ? raw.excerpt.trim() : '';
      if (excerpt.length === 0) continue;

      const truncated = excerpt.length > RESEARCH_MAX_EXCERPT_CHARS;
      seen.add(raw.guideId);
      hits.push({
        guideId: guide.guideId,
        path: guide.path,
        title: guide.title,
        license: pin.license,
        url: guideUrl(pin, guide.path),
        revision: pin.revision,
        sha256: guide.sha256,
        excerpt: truncated ? excerpt.slice(0, RESEARCH_MAX_EXCERPT_CHARS) : excerpt,
        truncated,
        trusted: false,
      });
    }

    if (hits.length === 0) return unavailable('no-match', calls);
    return { available: true, hits, callsUsed: calls, tokensUsed: estimateTokens(hits) };
  }

  return {
    pin,
    callsUsed: () => calls,
    search,
  };
}
