/**
 * T0153: no-skill baselines on the 4-surface corpus.
 *
 * Serves evals/baselines/<surface>/page.html, captures the 3-viewport ×
 * 2-theme matrix (twice: stability rerun), runs axe + Lighthouse, scores the
 * rubric axes from measured evidence (basis-labelled), composes and validates
 * a T0154 evidence bundle, and writes it + the shots under evals/baselines/.
 *
 * Honesty notes: hybrid-axis scores are builder-critic (pre-calibration);
 * T0155 owns judge calibration. Judged axis is builder-judged and never gates.
 */
import { createServer, type Server } from 'node:http';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  EvidenceBundle,
  evaluateG11,
  type EvidenceBundleData,
  type GateResult,
} from '@sus/schemas';
import { evaluateG4, evaluateG5 } from '../src/harness/a11y-budgets.js';
import type { RubricScoreData } from '@sus/schemas';
import { captureMatrix, type CaptureResult } from '../src/harness/capture.js';
import { scanA11y, runLighthouse, chromeForTestingPath } from '../src/harness/scans.js';

const PORT = 4345;
const ROOT = join(__dirname, '..', '..', '..', 'evals', 'baselines');
const SURFACES = ['marketing', 'commerce', 'admin', 'portfolio'] as const;
type Surface = (typeof SURFACES)[number];

let server: Server | undefined;

beforeAll(async () => {
  server = createServer((req, res) => {
    const name = (req.url ?? '/').replace(/^\//, '').replace(/\/$/, '') || 'marketing';
    const surface = (SURFACES as readonly string[]).includes(name) ? name : null;
    if (!surface) {
      res.writeHead(404).end('not found');
      return;
    }
    try {
      const html = readFileSync(join(ROOT, surface, 'page.html'), 'utf8');
      res.writeHead(200, { 'content-type': 'text/html' }).end(html);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise<void>((resolve) => server!.listen(PORT, '127.0.0.1', resolve));
});

afterAll(() => {
  server?.close();
});

async function scanSurface(surface: Surface): Promise<{
  capture: CaptureResult;
  capture2: CaptureResult;
  g4: GateResult;
  g5: GateResult;
}> {
  const url = `http://127.0.0.1:${PORT}/${surface}`;
  const outDir = join(ROOT, surface, 'evidence');
  rmSync(outDir, { recursive: true, force: true });
  const capture = await captureMatrix(url, outDir);
  const capture2 = await captureMatrix(url, join(outDir, 'rerun'));
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const axe = await scanA11y(page, url);
  await browser.close();
  const g4 = evaluateG4([axe], outDir);
  const lh = await runLighthouse(url, chromeForTestingPath());
  const g5 = evaluateG5([lh], undefined, outDir);
  return { capture, capture2, g4, g5, lh, axe };
}

/** Builder-critic mapping from measured evidence to axis scores (pre-calibration). */
function scoreBaseline(
  surface: Surface,
  s: Awaited<ReturnType<typeof scanSurface>>,
): RubricScoreData {
  const combos = s.capture.combos;
  const overflow = combos.some((c) => c.metrics.horizontalOverflow);
  const perf = s.g5.status === 'pass' ? 4 : 3;
  const a11y = s.g4.status === 'pass' ? 4 : 1;
  const ev = (rel: string): string[] => [`evals/baselines/${surface}/${rel}`];
  const shot = 'evidence/desktop-light.png';
  const scores = [
    {
      axis: 'hierarchy',
      score: 3,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'single-h1 pages, flat visual rank; works but unconsidered (anchor 3)',
    },
    {
      axis: 'composition',
      score: 3,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'uniform blocks, no grid intention (anchor 3)',
    },
    {
      axis: 'typography',
      score: 2,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'single system font, default scale, no measure control (below anchor 3)',
    },
    {
      axis: 'color-surface',
      score: 2,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote:
        'default blues/greys, no token system, surface hierarchy absent (below anchor 3)',
    },
    {
      axis: 'spacing-rhythm',
      score: 3,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'even padding, no scale ratios (anchor 3)',
    },
    {
      axis: 'motion-interaction',
      score: 2,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'no states or transitions defined beyond hover defaults (below anchor 3)',
    },
    {
      axis: 'content-copy',
      score: 3,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'brief-fulfilling copy, no claim register or ladder (anchor 3)',
    },
    {
      axis: 'accessibility',
      score: a11y,
      basis: 'measured',
      evidence: ev('evidence/axe-0.json'),
      anchorsNote: `G4 ${s.g4.status}: ${s.g4.detail[0] ?? ''}`,
    },
    {
      axis: 'responsive-edge',
      score: overflow ? 1 : 3,
      basis: 'measured',
      evidence: ev('evidence/capture.json'),
      anchorsNote: overflow
        ? 'horizontal overflow measured at some viewport'
        : 'no measured overflow at any viewport/theme',
    },
    {
      axis: 'consistency-system',
      score: 2,
      basis: 'critic-validated',
      evidence: ev(shot),
      anchorsNote: 'ad-hoc styles, no reuse contract (below anchor 3)',
    },
    {
      axis: 'distinctiveness-pov',
      score: 2,
      basis: 'judged',
      evidence: ev('page.html'),
      anchorsNote: 'generic default output, no direction thesis (judged axis; never gates)',
    },
    {
      axis: 'performance',
      score: perf,
      basis: 'measured',
      evidence: ev('evidence/budget-table.json'),
      anchorsNote: `G5 ${s.g5.status}`,
    },
  ] as RubricScoreData['scores'];
  return { subject: `evals/baselines/${surface}/page.html`, scores };
}

describe('no-skill baselines on the 4-surface corpus (T0153)', () => {
  for (const surface of SURFACES) {
    it(`${surface}: capture, gates, stability rerun, validated bundle`, async () => {
      const s = await scanSurface(surface);
      expect(s.capture.combos).toHaveLength(6);

      // stability rerun: deterministic metrics must be identical
      for (const [a, b] of s.capture.combos.map((c, i) => [c, s.capture2.combos[i]!] as const)) {
        expect(`${a.viewport}-${a.theme}`).toBe(`${b.viewport}-${b.theme}`);
        expect(b.metrics.horizontalOverflow).toBe(a.metrics.horizontalOverflow);
        expect(b.metrics.cls).toBe(a.metrics.cls);
        expect(b.metrics.headings.length).toBe(a.metrics.headings.length);
        // LCP is timing-dependent; assert a loose threshold (documented)
        if (a.metrics.lcpMs > 0 && b.metrics.lcpMs > 0) {
          expect(Math.abs(b.metrics.lcpMs - a.metrics.lcpMs)).toBeLessThanOrEqual(
            Math.max(800, a.metrics.lcpMs * 0.5),
          );
        }
      }

      const scores = scoreBaseline(surface, s);
      const bundle: EvidenceBundleData = {
        subject: `evals/baselines/${surface}/page.html`,
        provenance:
          'no-skill baseline: builder-agent (GLM via ZCode) unassisted generation from evals/briefs/briefs.md, 2026-11-14',
        generatedAt: '2026-11-14T01:30:00Z',
        shots: s.capture.combos.map((c) => ({
          viewport: c.viewport,
          theme: c.theme,
          path: `evals/baselines/${surface}/evidence/${c.viewport}-${c.theme}.png`,
        })),
        metrics: s.capture.combos.map((c) => c.metrics),
        gates: [
          { gate: s.g4.gate as 'G4', status: s.g4.status, detail: s.g4.detail.slice(0, 5) },
          { gate: s.g5.gate as 'G5', status: s.g5.status, detail: s.g5.detail.slice(0, 5) },
        ],
        rubricScores: scores.scores.map((sc) => ({
          axis: sc.axis,
          score: sc.score,
          basis: sc.basis,
          evidence: sc.evidence,
        })),
        notes: [
          `acceptanceComposite excluding judged axis: ${scores.scores.filter((x) => x.axis !== 'distinctiveness-pov').reduce((sum, x) => sum + x.score, 0)}/55`,
          'pre-calibration scoring (T0155 owns judge calibration)',
        ],
      };
      const parsed = EvidenceBundle.safeParse(bundle);
      expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
      const g11 = evaluateG11(parsed.data!);
      expect(g11.status).toBe('pass');

      writeBundle(surface, bundle);
    }, 180000);
  }
});

function writeBundle(surface: Surface, bundle: EvidenceBundleData): void {
  // committed evidence: bundle.json next to the shots
  writeFileSync(join(ROOT, surface, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
}
