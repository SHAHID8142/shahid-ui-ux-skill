/**
 * T0154: evidence bundle validator — complete bundles pass; bundles missing
 * shots, metrics, or gate verdicts are REJECTED (G11, fail-closed).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EvidenceBundle, evaluateG11, type EvidenceBundleData } from '@sus/schemas';

const complete: EvidenceBundleData = {
  subject: 'fixtures/marketing#hero',
  provenance: 'no-skill baseline',
  generatedAt: '2026-11-14T00:00:00Z',
  shots: [{ viewport: 'desktop', theme: 'light', path: 'evals/baselines/x/desktop-light.png' }],
  metrics: [
    {
      url: 'http://127.0.0.1:4317/',
      horizontalOverflow: false,
      overflowingElements: [],
      cls: 0,
      lcpMs: 800,
      smallTapTargets: [],
      landmarks: ['main'],
      headings: [{ level: 1, text: 'Hero' }],
    },
  ],
  gates: [
    { gate: 'G4', status: 'pass', detail: ['zero serious/critical axe violations'] },
    { gate: 'G5', status: 'pass', detail: ['within budgets'] },
  ],
};

describe('evidence bundle validation (T0154)', () => {
  it('accepts a complete bundle and G11 passes with detail', () => {
    expect(EvidenceBundle.safeParse(complete).success).toBe(true);
    const g11 = evaluateG11(EvidenceBundle.parse(complete));
    expect(g11.status).toBe('pass');
    expect(g11.detail.join(' ')).toMatch(/complete: 1 shot/);
  });

  it('rejects a bundle without shots (G11 fail-closed)', () => {
    const noShots = { ...complete, shots: [] };
    expect(EvidenceBundle.safeParse(noShots).success).toBe(false);
    // even if the schema gap were bypassed, the gate fails closed
    const g11 = evaluateG11({ ...noShots, shots: [] });
    expect(g11.status).toBe('fail');
    expect(g11.detail.join(' ')).toMatch(/no archived shots/);
  });

  it('rejects a bundle without metrics records', () => {
    const noMetrics = { ...complete, metrics: [] };
    expect(EvidenceBundle.safeParse(noMetrics).success).toBe(false);
  });

  it('rejects a bundle without gate verdicts', () => {
    const noGates = { ...complete, gates: [] };
    expect(EvidenceBundle.safeParse(noGates).success).toBe(false);
  });

  it('CLI validates a complete bundle and fails on an incomplete one', () => {
    const dir = mkdtempSync(join(tmpdir(), 't0154-'));
    const cli = join(__dirname, '..', 'dist', 'cli.js');
    const good = join(dir, 'good.json');
    writeFileSync(good, JSON.stringify(complete));
    const out = execFileSync(process.execPath, [cli, 'evidence', '--in', good], {
      encoding: 'utf8',
    });
    expect(out).toContain('"status": "pass"');

    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ ...complete, gates: [] }));
    expect(() =>
      execFileSync(process.execPath, [cli, 'evidence', '--in', bad], { stdio: 'pipe' }),
    ).toThrow();
  });
});
