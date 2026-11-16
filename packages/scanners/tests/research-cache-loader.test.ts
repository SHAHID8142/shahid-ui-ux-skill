/**
 * T1018 — tests for the cache loader, the last missing part of the issue #14
 * research source.
 *
 * The value of these tests is that most of them are negative. A loader that
 * serves bytes it was not asked to serve, or serves bytes the pin does not
 * record, is worse than no loader: it turns a missing capability into a
 * quietly wrong citation. So each refusal is asserted by name, and the one
 * happy path goes end-to-end through `createResearchProvider` rather than
 * stopping at the loader.
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CACHE_MAX_FILE_BYTES,
  createCacheLoader,
  createResearchProvider,
  RESEARCH_MAX_EXCERPT_CHARS,
  type ResearchGuidePin,
  type ResearchSourcePin,
} from '../src/index.js';

// Every case uses its own directory; nothing here touches a real cache.

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

const TABLE_TEXT = [
  '# Responsive table',
  '',
  'A table that stacks on narrow screens.',
  '',
  '## Header association',
  '',
  'Keep the header row in the accessibility tree with display: contents on the table part,',
  'and do not rely on pseudo-element labels alone: they are not a header association.',
  '',
  '## Overflow',
  '',
  'Contain deliberate two-dimensional scrolling in its own region.',
  '',
].join('\n');

const DRAWER_TEXT = [
  '# Navigation drawer',
  '',
  'A drawer holds secondary navigation.',
  '',
  '## Focus',
  '',
  'Move focus into the drawer and return it to the trigger on close.',
  '',
].join('\n');

const PIN: ResearchSourcePin = {
  id: 'modern-web-guidance',
  upstreamUrl: 'https://github.com/GoogleChrome/modern-web-guidance',
  revision: '4dd968349e54ca45a05dd5c818fb035c9054b022',
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
    sha256: sha256(TABLE_TEXT),
    verified: 'verified',
  },
  {
    guideId: 'navigation-drawer',
    path: 'skills/modern-web-guidance/guides/ui-components/navigation-drawer.md',
    title: 'Navigation drawer',
    sha256: sha256(DRAWER_TEXT),
    verified: 'verified',
  },
];

function freshCache(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sus-research-cache-case-'));
  return dir;
}

const providerOver = (dir: string, guides: readonly ResearchGuidePin[] = GUIDES) =>
  createResearchProvider({
    pin: PIN,
    guides,
    isOnline: () => true,
    lookup: createCacheLoader({ dir, pin: PIN, guides }).lookup,
  });

describe('cache loader: digest discipline', () => {
  it('serves a guide whose bytes match the pin, end to end through the provider', async () => {
    const dir = freshCache();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');

    const result = await providerOver(dir).search({ query: 'responsive table' });
    expect(result.available).toBe(true);
    expect(result.hits).toHaveLength(1);
    const hit = result.hits[0];
    expect(hit?.guideId).toBe('responsive-table');
    expect(hit?.sha256).toBe(sha256(TABLE_TEXT));
    expect(hit?.trusted).toBe(false);
    expect(hit?.revision).toBe(PIN.revision);
    expect(hit?.license).toBe('Apache-2.0');
    expect(hit?.url).toContain(PIN.revision);
    expect(hit?.excerpt.length).toBeGreaterThan(0);
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a file whose bytes do not match the pin, and says why', async () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), `${TABLE_TEXT}\nEdited locally.\n`, 'utf8');
    const loader = createCacheLoader({ dir, pin: PIN, guides: GUIDES });
    const status = loader.status().find((s) => s.guideId === 'responsive-table');
    expect(status?.state).toBe('digest-mismatch');
    expect(status?.detail).toMatch(/hashes to/);

    const result = await providerOver(dir).search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.hits).toHaveLength(0);
    expect(result.reason).toBe('no-match');
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a guide the pin never digested', async () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const undigested: ResearchGuidePin[] = [{ ...GUIDES[0]!, sha256: null }];
    const loader = createCacheLoader({ dir, pin: PIN, guides: undigested });
    expect(loader.status()[0]?.state).toBe('unreadable');
    expect(loader.status()[0]?.detail).toMatch(/no digest/);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('cache loader: refusals', () => {
  it('reports an unpopulated cache as not-installed, not as no-match', async () => {
    const dir = freshCache();
    const result = await providerOver(dir).search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-installed');
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports a candidate guide that is not cached as not-installed', async () => {
    const dir = freshCache();
    // Only the drawer is cached; a table query ranks the table guide, which is absent.
    writeFileSync(join(dir, 'navigation-drawer.md'), DRAWER_TEXT, 'utf8');
    const result = await providerOver(dir).search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('not-installed');
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports a populated cache with no topical match as no-match', async () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'navigation-drawer.md'), DRAWER_TEXT, 'utf8');
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const result = await providerOver(dir).search({ query: 'sticky toolbar' });
    // Nothing pinned — identity or cached text — mentions a sticky toolbar.
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no-match');
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a guide id that is not a slug, so the cache cannot be escaped', () => {
    const dir = freshCache();
    const loader = createCacheLoader({ dir, pin: PIN, guides: GUIDES });
    for (const id of ['../etc/passwd', '/etc/passwd', 'a/b', 'Upper', 'a\0b', '..']) {
      expect(loader.pathFor(id), id).toBeNull();
    }
    expect(loader.pathFor('responsive-table')).toContain(`${dir}`);
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a file above the size cap instead of reading it', () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), 'x'.repeat(CACHE_MAX_FILE_BYTES + 1), 'utf8');
    const status = createCacheLoader({ dir, pin: PIN, guides: GUIDES }).status();
    const table = status.find((s) => s.guideId === 'responsive-table');
    expect(table?.state).toBe('unreadable');
    expect(table?.detail).toMatch(/byte cap/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('turns a read failure into a skip, not an exception at the caller', async () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const loader = createCacheLoader({
      dir,
      pin: PIN,
      guides: GUIDES,
      readText() {
        throw new Error('EACCES');
      },
    });
    const result = await createResearchProvider({
      pin: PIN,
      guides: GUIDES,
      isOnline: () => true,
      lookup: loader.lookup,
    }).search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });

  it('stays offline unless the operator opts in, even with a perfect cache', async () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const result = await createResearchProvider({
      pin: PIN,
      guides: GUIDES,
      isOnline: () => false,
      lookup: createCacheLoader({ dir, pin: PIN, guides: GUIDES }).lookup,
    }).search({ query: 'responsive table' });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('offline');
    expect(result.hits).toHaveLength(0);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('cache loader: excerpts and bounds', () => {
  it('picks the section whose heading matches the query', () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const loader = createCacheLoader({ dir, pin: PIN, guides: GUIDES });
    const outcome = loader.lookup({ query: 'header association', limit: 1, pin: PIN });
    const hit = (outcome as { hits: Array<{ excerpt: string }> }).hits[0];
    expect(hit?.excerpt).toMatch(/^## Header association/);
    // The matched section is padded from what follows it (a heading plus one line
    // is a label, not an excerpt), but the intro before it never leaks in.
    expect(hit?.excerpt).not.toMatch(/^A table that stacks/);
    expect(hit?.excerpt.length).toBeLessThanOrEqual(RESEARCH_MAX_EXCERPT_CHARS);
    rmSync(dir, { recursive: true, force: true });
  });

  it('caps the excerpt at 1200 characters rather than the whole guide', () => {
    const dir = freshCache();
    const long = `# Long guide\n\n${'word '.repeat(2000)}`;
    writeFileSync(join(dir, 'responsive-table.md'), long, 'utf8');
    const guides: ResearchGuidePin[] = [{ ...GUIDES[0]!, sha256: sha256(long) }];
    const loader = createCacheLoader({ dir, pin: PIN, guides });
    const outcome = loader.lookup({ query: 'responsive table', limit: 1, pin: PIN });
    const hit = (outcome as { hits: Array<{ excerpt: string }> }).hits[0];
    expect(hit?.excerpt.length).toBe(RESEARCH_MAX_EXCERPT_CHARS);
    rmSync(dir, { recursive: true, force: true });
  });

  it('never returns more hits than asked for, and orders deterministically', () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    writeFileSync(join(dir, 'navigation-drawer.md'), DRAWER_TEXT, 'utf8');
    const loader = createCacheLoader({ dir, pin: PIN, guides: GUIDES });
    const first = loader.lookup({ query: 'responsive navigation', limit: 1, pin: PIN });
    const second = loader.lookup({ query: 'responsive navigation', limit: 1, pin: PIN });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect((first as { hits: unknown[] }).hits).toHaveLength(1);
    rmSync(dir, { recursive: true, force: true });
  });

  it('carries no title, licence or URL of its own, so a loader cannot relabel content', () => {
    const dir = freshCache();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE_TEXT, 'utf8');
    const outcome = createCacheLoader({ dir, pin: PIN, guides: GUIDES }).lookup({
      query: 'responsive table',
      limit: 1,
      pin: PIN,
    });
    for (const hit of (outcome as { hits: Array<Record<string, unknown>> }).hits) {
      expect(Object.keys(hit).sort()).toEqual(['excerpt', 'guideId', 'sha256']);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});
