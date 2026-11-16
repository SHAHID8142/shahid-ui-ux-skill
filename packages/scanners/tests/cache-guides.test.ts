/**
 * T1018 — tests for the two research scripts, without touching the network.
 *
 * `cache-guides.mjs` splits into a pure decision (`planCacheWrites`) and a write
 * (`writeCache`), because those are where the refusals live: an unverified pin,
 * an undigested guide, bytes that do not match the record. The HTTPS half is
 * exercised by running the script once, recorded in the T1018 receipt — a test
 * that mocked HTTP and called it reachability would be asserting its own fixture.
 *
 * `paired-run.mjs` is tested with a synthetic cache and a synthetic pin, so the
 * provider arm's bounds are checked offline and the `not-run` arms stay `not-run`
 * rather than being quietly upgraded to a claim.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planCacheWrites, writeCache } from '../../../scripts/research/cache-guides.mjs';
import { PAIRED_QUERIES, runProviderArm } from '../../../scripts/research/paired-run.mjs';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const tmp = () => mkdtempSync(join(tmpdir(), 'sus-cache-script-'));

const TABLE = '# Responsive table\n\n## Header association\n\nKeep the header row.\n';
const DRAWER = '# Navigation drawer\n\n## Focus\n\nMove focus in, return it.\n';

const PIN = {
  id: 'modern-web-guidance',
  upstreamUrl: 'https://github.com/GoogleChrome/modern-web-guidance',
  revision: '4dd968349e54ca45a05dd5c818fb035c9054b022',
  license: 'Apache-2.0',
  sha256: 'a'.repeat(64),
  verified: 'verified',
  guides: [
    {
      guideId: 'responsive-table',
      path: 'g/responsive-table.md',
      title: 'Responsive table',
      sha256: sha256(TABLE),
      verified: 'verified',
    },
    {
      guideId: 'navigation-drawer',
      path: 'g/navigation-drawer.md',
      title: 'Navigation drawer',
      sha256: sha256(DRAWER),
      verified: 'verified',
    },
  ],
};

const fetchedFor = (pin) =>
  pin.guides.map((guide) => ({
    guideId: guide.guideId,
    sha256: guide.sha256,
    bytes: 34,
  }));

describe('cache-guides: what may be written', () => {
  it('accepts guides whose bytes match the pin', () => {
    const plan = planCacheWrites({ pin: PIN, guides: fetchedFor(PIN) });
    expect(plan.ok).toBe(true);
    expect(plan.writable.map((g) => g.guideId)).toEqual(['responsive-table', 'navigation-drawer']);
    expect(plan.refusals).toHaveLength(0);
  });

  it('refuses everything when the pin is not verified', () => {
    const plan = planCacheWrites({
      pin: { ...PIN, verified: 'unverified' },
      guides: fetchedFor(PIN),
    });
    expect(plan.ok).toBe(false);
    expect(plan.writable).toHaveLength(0);
    expect(plan.refusals[0]?.reason).toMatch(/not verified/);
  });

  it('refuses a guide whose digest moved under a fixed revision', () => {
    const guides = fetchedFor(PIN).map((g) => ({ ...g, sha256: 'b'.repeat(64) }));
    const plan = planCacheWrites({ pin: PIN, guides });
    expect(plan.ok).toBe(false);
    expect(plan.writable).toHaveLength(0);
    expect(plan.refusals.every((r) => /content review/.test(r.reason))).toBe(true);
  });

  it('refuses an undigested guide and one the pin does not list', () => {
    const pin = {
      ...PIN,
      guides: [{ ...PIN.guides[0], sha256: null }, PIN.guides[1]],
    };
    const guides = [
      { guideId: 'responsive-table', sha256: sha256(TABLE), bytes: 34 },
      { guideId: 'invented-guide', sha256: 'c'.repeat(64), bytes: 10 },
    ];
    const plan = planCacheWrites({ pin, guides });
    expect(plan.ok).toBe(false);
    expect(plan.refusals.map((r) => r.guideId).sort()).toEqual([
      'invented-guide',
      'responsive-table',
    ]);
    expect(plan.refusals.some((r) => /verify-pin\.mjs --write/.test(r.reason))).toBe(true);
  });
});

describe('cache-guides: what was written', () => {
  it('writes the guide files and a digest-only manifest', () => {
    const dir = tmp();
    const texts = new Map([
      ['responsive-table', TABLE],
      ['navigation-drawer', DRAWER],
    ]);
    const plan = planCacheWrites({ pin: PIN, guides: fetchedFor(PIN) });
    const result = writeCache({ dir, pin: PIN, writable: plan.writable, texts });
    expect(result.written).toHaveLength(2);
    expect(readFileSync(join(dir, 'responsive-table.md'), 'utf8')).toBe(TABLE);

    const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8'));
    expect(manifest.revision).toBe(PIN.revision);
    expect(manifest.license).toBe('Apache-2.0');
    expect(manifest.guides.map((g) => g.guideId).sort()).toEqual([
      'navigation-drawer',
      'responsive-table',
    ]);
    // The manifest records digests and counts. It must not carry guide text.
    const raw = readFileSync(result.manifestPath, 'utf8');
    expect(raw).not.toContain('Keep the header row');
    expect(raw).not.toContain('Move focus in');
    rmSync(dir, { recursive: true, force: true });
  });

  it('skips a guide whose text was never supplied, instead of writing an empty file', () => {
    const dir = tmp();
    const plan = planCacheWrites({ pin: PIN, guides: fetchedFor(PIN) });
    const result = writeCache({
      dir,
      pin: PIN,
      writable: plan.writable,
      texts: new Map([['responsive-table', TABLE]]),
    });
    expect(result.written).toHaveLength(1);
    expect(existsSync(join(dir, 'navigation-drawer.md'))).toBe(false);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('paired-run: the provider arm is mechanics, and the other arms stay not-run', () => {
  it('serves the pinned topics from a verified cache and holds every bound', async () => {
    const dir = tmp();
    writeFileSync(join(dir, 'responsive-table.md'), TABLE, 'utf8');
    writeFileSync(join(dir, 'navigation-drawer.md'), DRAWER, 'utf8');

    const arm = await runProviderArm({ pin: PIN, guides: PIN.guides, cacheDir: dir });
    expect(arm.status).toBe('pass');
    expect(arm.boundsHeld).toBe(true);
    expect(arm.queriesAsked).toBe(PAIRED_QUERIES.length);
    expect(arm.queriesServed).toBeGreaterThan(0);
    expect(arm.callsUsed).toBeLessThanOrEqual(3);

    for (const result of arm.results) {
      for (const hit of result.hits) {
        expect(hit.trusted).toBe(false);
        expect(hit.hasUrl).toBe(true);
        expect(hit.hasLicense).toBe(true);
        expect(hit.sha256).toHaveLength(64);
        expect(hit.revision).toBe(PIN.revision);
        // Mechanics only: a character count is recorded, the excerpt is not.
        expect(typeof hit.characters).toBe('number');
        expect('excerpt' in hit).toBe(false);
      }
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it('fails its own bounds when the cache text does not match the pin', async () => {
    const dir = tmp();
    writeFileSync(join(dir, 'responsive-table.md'), `${TABLE}\nlocal edit`, 'utf8');
    writeFileSync(join(dir, 'navigation-drawer.md'), `${DRAWER}\nlocal edit`, 'utf8');
    const arm = await runProviderArm({ pin: PIN, guides: PIN.guides, cacheDir: dir });
    expect(arm.status).toBe('fail');
    expect(arm.queriesServed).toBe(0);
    expect(arm.cache.every((c) => c.state === 'digest-mismatch')).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
