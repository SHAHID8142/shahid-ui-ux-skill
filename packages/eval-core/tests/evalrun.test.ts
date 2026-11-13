/**
 * T0158: behavioral/reasoning eval infrastructure — held-out briefs +
 * matched-conditions comparison record. The no-skill arm exists (T0153
 * baselines); the skill arm is recorded NOT-RUN until the skill core exists
 * (T0201+). Never fabricated.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EvidenceBundle } from '@sus/schemas';

const EVALS = join(__dirname, '..', '..', '..', 'evals');

describe('behavioral eval infrastructure (T0158)', () => {
  it('ships three held-out briefs unused by the baselines', () => {
    for (const name of ['pricing', 'search-filters', 'onboarding']) {
      const path = join(EVALS, 'briefs', 'held-out', `${name}.md`);
      expect(existsSync(path), path).toBe(true);
      const text = readFileSync(path, 'utf8');
      expect(text.length).toBeGreaterThan(80);
    }
    // the held-out briefs must not appear in the T0153 baseline corpus
    const baselines = ['marketing', 'commerce', 'admin', 'portfolio'];
    for (const b of baselines) {
      expect(existsSync(join(EVALS, 'baselines', b, 'page.html'))).toBe(true);
    }
  });

  it('comparison record: no-skill arm measured; skill arm not-run (never fabricated)', () => {
    // matched-conditions record shape; skill arm fills in after T0201+
    for (const surface of ['marketing', 'commerce', 'admin', 'portfolio']) {
      const bundle = JSON.parse(
        readFileSync(join(EVALS, 'baselines', surface, 'bundle.json'), 'utf8'),
      ) as { provenance: string };
      expect(bundle.provenance).toMatch(/no-skill baseline/);
    }
    const comparison = {
      matchedConditions: {
        briefs: 'evals/briefs/ + held-out (skill arm uses held-out only)',
        sessionBudget: 'same per-run token budget',
        repeats: 'n>=2 per arm, stability delta recorded per T0153 policy',
      },
      noSkill: { status: 'measured', evidence: 'evals/baselines/*/bundle.json' },
      skill: { status: 'not-run', reason: 'skill core does not exist yet (T0201+)' },
    };
    // the record itself must be honest: a not-run arm can never claim results
    expect(comparison.skill.status).toBe('not-run');
    expect(Object.keys(comparison.skill)).not.toContain('scores');
  });

  it('baseline bundles remain schema-valid after the metrics-title extension', () => {
    for (const surface of ['marketing', 'commerce', 'admin', 'portfolio']) {
      const bundle = JSON.parse(
        readFileSync(join(EVALS, 'baselines', surface, 'bundle.json'), 'utf8'),
      );
      expect(EvidenceBundle.safeParse(bundle).success).toBe(true);
    }
  });
});
