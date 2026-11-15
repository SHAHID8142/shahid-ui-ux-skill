/**
 * T0400 tests — direction derivation must refuse to be a mood board.
 *
 * TASKS.json acceptance: "derivation record schema validates | banned-defaults
 * check runs". The negative cases are the ones that matter: a record that names
 * a refusal nobody can check, three restatements of one idea, a chosen direction
 * that refuses nothing blocking, and anti-references copied from a candidate.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TAXONOMY } from '../src/slop-taxonomy.js';
import { DirectionDerivation, SusDirectionDerivation, checkDerivation } from '../src/direction.js';

const example = JSON.parse(
  readFileSync(join(__dirname, '../../../evals/directions/fixture-marketing-01.json'), 'utf8'),
);
const clone = () => JSON.parse(JSON.stringify(example));

describe('the worked example is the specification', () => {
  it('validates against the schema and every semantic check', () => {
    const result = checkDerivation(example);
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.record?.decision.chosen).toBe('c2');
  });

  it('is a versioned SUS schema', () => {
    expect(SusDirectionDerivation.$id).toBe('sus.direction-derivation');
    expect(SusDirectionDerivation.version).toBe(1);
  });

  it('refuses two candidates or four', () => {
    const three = clone();
    expect(DirectionDerivation.safeParse(three).success).toBe(true);
    const four = clone();
    four.candidates.push({ ...four.candidates[0], id: 'c3' });
    expect(DirectionDerivation.safeParse(four).success).toBe(false);
    const two = clone();
    two.candidates.pop();
    expect(DirectionDerivation.safeParse(two).success).toBe(false);
  });

  it('rejects unknown fields rather than silently ignoring them', () => {
    const extra = clone();
    extra.candidates[0].vibe = 'bold';
    expect(DirectionDerivation.safeParse(extra).success).toBe(false);
  });
});

describe('banned-defaults check', () => {
  it('fails when a refusal names an id that is not in the taxonomy', () => {
    const record = clone();
    record.candidates[0].defaultsRefused = ['invented-default'];
    const result = checkDerivation(record);
    expect(result.violations.map((v) => v.code)).toContain('unknown-default');
    expect(result.violations[0].detail).toContain('invented-default');
  });

  it('fails when the chosen direction refuses only advisory defaults', () => {
    const advisory = TAXONOMY.filter((entry) => entry.severity === 'advisory');
    expect(advisory.length).toBeGreaterThan(0);
    const record = clone();
    const chosen = record.candidates.find((c: { id: string }) => c.id === record.decision.chosen);
    chosen.defaultsRefused = [advisory[0].id];
    const result = checkDerivation(record);
    expect(result.violations.map((v) => v.code)).toContain('chosen-refuses-nothing-blocking');
  });

  it('every taxonomy id a record may legitimately use exists and has a severity', () => {
    for (const entry of TAXONOMY) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/);
      expect(['blocking', 'advisory']).toContain(entry.severity);
    }
  });
});

describe('the record has to argue', () => {
  it('fails three restatements of one idea', () => {
    const record = clone();
    for (const candidate of record.candidates)
      candidate.thesis = 'a calm grid that respects the content';
    const result = checkDerivation(record);
    expect(result.violations.map((v) => v.code)).toContain('duplicate-thesis');
  });

  it('fails a rejection that was never explained', () => {
    const record = clone();
    record.decision.rejected = record.decision.rejected.slice(0, 1);
    // the schema requires two entries before semantics even run
    expect(checkDerivation(record).ok).toBe(false);

    // two entries, but the *chosen* one is "explained" and the real loser is not:
    // only the semantic check can catch this
    const semantic = clone();
    const other = semantic.candidates.find(
      (c: { id: string }) => c.id !== semantic.decision.chosen,
    ).id;
    semantic.decision.rejected = [
      { id: semantic.decision.chosen, reason: 'not actually rejected' },
      { id: other, reason: 'genuinely lost for a stated reason' },
    ];
    const second = checkDerivation(semantic);
    expect(second.violations.map((v) => v.code)).toContain('unexplained-rejection');
  });

  it('fails anti-references that are only copies of a candidate list', () => {
    const record = clone();
    record.antiReferences = [...record.candidates[0].antiReferences];
    const result = checkDerivation(record);
    expect(result.violations.map((v) => v.code)).toContain('anti-references-borrowed');
  });

  it('reports schema issues with a path instead of throwing', () => {
    const result = checkDerivation({ briefId: '' });
    expect(result.ok).toBe(false);
    expect(result.record).toBeNull();
    expect(result.violations.every((v) => v.code.startsWith('schema:'))).toBe(true);
  });
});

describe('imagery plan is part of the direction record (T0408)', () => {
  const withImagery = () => {
    const record = clone();
    record.imagery = {
      strategy: 'photography-led',
      rationale:
        'a single real photograph of a working desk at dusk carries the claim better than three flat illustrations',
      assets: [
        {
          id: 'asset-hero',
          role: 'hero',
          source: 'commissioned',
          provider: 'Studio Barents CB-114',
          licence: {
            name: 'Commission, full commercial rights',
            permitsCommercial: true,
            requiresAttribution: false,
            expiresAt: null,
            proofRef: 'contracts/CB-114.pdf#page=2',
          },
          focalPoint: { x: 0.42, y: 0.36 },
          budgetBytes: 180000,
        },
        {
          id: 'asset-fade',
          role: 'texture',
          source: 'css-only',
          licence: {
            name: 'Authored in CSS (no third-party rights)',
            permitsCommercial: true,
            requiresAttribution: false,
            expiresAt: null,
            proofRef: 'skill/references/art-direction.md#textures',
          },
          focalPoint: { x: 0.5, y: 0.9 },
          budgetBytes: 0,
        },
      ],
      totalBudgetBytes: 400000,
      fallback: 'type-only fallback: the hero becomes the week row, 0 bytes',
    };
    return record;
  };

  it('accepts a plan with licences, focal points and budgets', () => {
    expect(checkDerivation(withImagery()).ok).toBe(true);
  });

  it('rejects an asset whose licence forbids commercial use', () => {
    const record = withImagery();
    // @ts-expect-error deliberately invalid: the literal type guards this
    record.imagery.assets[0].licence.permitsCommercial = false;
    expect(checkDerivation(record).ok).toBe(false);
  });

  it('rejects a licence record with no proof reference', () => {
    const record = withImagery();
    delete record.imagery.assets[0].licence.proofRef;
    const codes = checkDerivation(record).violations.map((v) => v.code);
    expect(codes.some((code) => code.includes('proofRef'))).toBe(true);
  });

  it('fails a stock or generated asset with no recorded provider', () => {
    const record = withImagery();
    record.imagery.assets[0].source = 'stock';
    delete record.imagery.assets[0].provider;
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain('provider-unrecorded');
  });

  it('fails required attribution with no attribution text', () => {
    const record = withImagery();
    record.imagery.assets[0].licence.requiresAttribution = true;
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain(
      'attribution-text-missing',
    );
  });

  it('fails an expiring licence with no renewal owner', () => {
    const record = withImagery();
    record.imagery.assets[0].licence.expiresAt = '2027-01-01';
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain('expiry-without-owner');
  });

  it('fails a type-only strategy that ships assets', () => {
    const record = withImagery();
    record.imagery.strategy = 'type-only';
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain(
      'type-only-with-assets',
    );
  });

  it('fails a strategy that names no assets', () => {
    const record = withImagery();
    record.imagery.assets = [];
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain(
      'strategy-without-assets',
    );
  });

  it('fails a weight budget the assets overrun in total', () => {
    const record = withImagery();
    record.imagery.totalBudgetBytes = 100000;
    const codes = checkDerivation(record).violations.map((v) => v.code);
    expect(codes).toContain('weight-budget-exceeded');
    expect(codes).toContain('asset-exceeds-total-budget');
  });

  it('fails an unchosen hero focal point (exact centre)', () => {
    const record = withImagery();
    record.imagery.assets[0].focalPoint = { x: 0.5, y: 0.5 };
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain('focal-point-unchosen');
  });

  it('fails a zero budget on anything the browser has to download', () => {
    const record = withImagery();
    record.imagery.assets[0].budgetBytes = 0;
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain(
      'zero-budget-without-css',
    );
  });

  it('fails duplicate asset ids that would double-count the budget', () => {
    const record = withImagery();
    record.imagery.assets[1].id = record.imagery.assets[0].id;
    expect(checkDerivation(record).violations.map((v) => v.code)).toContain('duplicate-asset-id');
  });

  it('requires the imagery plan at all — a direction with none is incomplete', () => {
    const record = clone();
    delete record.imagery;
    const result = checkDerivation(record);
    expect(result.ok).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain('schema:imagery');
  });
});
