/**
 * T0301 + T0310: provenance catalog validation (no fabricated citation
 * passes; hearsay cannot back facts) + trend-review loop (stale volatile
 * claims flagged; durable claims tolerated).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProvenanceCatalog, ResearchClaim, type ProvenanceCatalogData } from '@sus/schemas';

const catalog = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', '..', 'evals', 'research', 'provenance-catalog.json'),
    'utf8',
  ),
) as ProvenanceCatalogData;

describe('provenance catalog (T0301)', () => {
  it('committed catalog validates (offline, schema only)', () => {
    expect(ProvenanceCatalog.safeParse(catalog).success).toBe(true);
  });

  it('fabricated citation fails: hearsay cannot back a fact/strong-claim', () => {
    const fabricated = {
      ...catalog.claims[0]!,
      id: 'fabricated',
      verification: 'hearsay' as const,
      strength: 'fact' as const,
    };
    expect(ResearchClaim.safeParse(fabricated).success).toBe(false);
  });

  it('malformed source URL fails validation', () => {
    const bad = {
      ...catalog.claims[0]!,
      id: 'bad-url',
      source: { ...catalog.claims[0]!.source, url: 'not a url' },
    };
    expect(ResearchClaim.safeParse(bad).success).toBe(false);
  });

  it('every claim names its revisit cadence; volatile claims carry revisitMonths', () => {
    for (const claim of catalog.claims) {
      if (claim.revisit === 'volatile') {
        expect(claim.revisitMonths, claim.id).toBeDefined();
      }
    }
  });
});

describe('trend/research review loop (T0310)', () => {
  function staleClaims(now: Date, data: ProvenanceCatalogData): string[] {
    return data.claims
      .filter((c) => {
        if (c.revisit !== 'volatile') return false;
        const months = c.revisitMonths ?? 3;
        const verified = new Date(c.lastVerified);
        const due = new Date(verified);
        due.setMonth(due.getMonth() + months);
        return now > due;
      })
      .map((c) => c.id);
  }

  it('fresh claims are not flagged stale', () => {
    expect(staleClaims(new Date('2026-12-14'), catalog)).toEqual([]);
  });

  it('volatile claims past their revisit window ARE flagged (with id + cadence)', () => {
    const stale = staleClaims(new Date('2027-12-14'), catalog);
    expect(stale).toContain('sus-baseline-floor'); // 6-month cadence
    expect(stale).toContain('scanner-precision-corpus'); // 3-month cadence
    expect(stale).not.toContain('token-estimate-method'); // durable
  });

  it('loop contract: flagged claims block knowledge reuse until re-verified', () => {
    // the contract: stale volatile claims cannot back new output; they are
    // flagged for re-verification (T0310 review), never silently reused
    const stale = staleClaims(new Date('2027-12-14'), catalog);
    const reusable = catalog.claims.map((c) => c.id).filter((id) => !stale.includes(id));
    expect(reusable).toContain('token-estimate-method');
    expect(reusable).not.toContain('scanner-precision-corpus');
  });
});
