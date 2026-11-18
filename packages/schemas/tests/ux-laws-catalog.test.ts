/**
 * Issue #31 first slice: the UX-laws catalog is evidence-gated and self-consistent. These tests
 * are the honesty gate for the catalog itself: the owner's ten named laws are present, every
 * entry classifies itself (kind, evidence tier, decision, reason), no source URL is broken, and
 * the human-readable matrix mentions every law. A name in a UX list is not sufficient research
 * evidence — so every entry carries its evidence tier and an explicit decision with a reason.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CATALOG = JSON.parse(readFileSync('evals/research/ux-laws/catalog.json', 'utf8'));
const MATRIX = readFileSync('docs/UX_LAWS_COVERAGE.md', 'utf8');

const OWNER_TEN = [
  'jakobs-law',
  'hicks-law',
  'millers-law',
  'gestalt-similarity',
  'gestalt-common-region',
  'gestalt-continuity',
  'von-restorff',
  'serial-position',
  'fittss-law',
  'gestalt-proximity',
];
const KINDS = new Set([
  'empirical-law',
  'perceptual-principle',
  'effect',
  'empirical-guideline',
  'empirical-observation',
  'model',
  'concept',
  'heuristic',
  'principle',
  'contested-claim',
  'adage',
]);
const TIERS = new Set([
  'strong-empirical',
  'replicated-with-boundaries',
  'mixed-replication',
  'popular-heuristic',
  'popular-heuristic-with-real-basis',
  'strong-empirical-as-model',
  'contested',
]);
const DECISIONS = new Set(['queued-integration', 'queued-research', 'not-applicable']);

describe('the UX-laws catalog (issue #31, T1089)', () => {
  it("carries the owner's ten named laws", () => {
    const ids = CATALOG.laws.map((l: { id: string }) => l.id);
    for (const id of OWNER_TEN) expect(ids).toContain(id);
    expect(CATALOG.laws.find((l: { id: string }) => l.id === 'millers-law').evidenceTier).toBe(
      'contested',
    );
  });

  it('classifies every entry completely: kind, tier, decision, reason, sources', () => {
    for (const law of CATALOG.laws) {
      expect(KINDS.has(law.kind), law.id + ' kind').toBe(true);
      expect(TIERS.has(law.evidenceTier), law.id + ' evidenceTier').toBe(true);
      expect(DECISIONS.has(law.integrationDecision), law.id + ' decision').toBe(true);
      expect(law.decisionReason.length, law.id + ' reason').toBeGreaterThan(40);
      expect(law.sources.length, law.id + ' sources').toBeGreaterThan(0);
      for (const source of law.sources) {
        expect(source.startsWith('https://'), law.id + ' source scheme').toBe(true);
        expect(source.includes(' '), law.id + ' source URL clean').toBe(false);
      }
    }
  });

  it('asserts no measured capability: no decision claims a check or gate exists', () => {
    for (const law of CATALOG.laws) {
      expect(law.integrationDecision).not.toBe('measured');
      expect(law.integrationDecision).not.toBe('integrated');
    }
  });

  it('is reflected in the human-readable coverage matrix', () => {
    for (const law of CATALOG.laws) {
      expect(MATRIX).toContain(law.name);
    }
    expect(MATRIX).toContain('does not claim new');
  });

  it('records the licence position (D06 open: nothing copied)', () => {
    expect(CATALOG.provenance.licenceNote).toContain('D06');
    expect(CATALOG.provenance.writtenBy).toContain('no guide text copied');
  });
});
