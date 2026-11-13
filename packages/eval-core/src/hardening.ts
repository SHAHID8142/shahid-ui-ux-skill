/**
 * Hardening matrix runner (T0551, DA-46).
 *
 * Matrix over a served page: viewports (incl. the G7 320px equivalence
 * column) × themes × reduced-motion. Each cell records overflow + tap
 * targets + landmark presence. Zoom: device-scale-factor variants are
 * recorded as separate capture evidence (true browser zoom is not
 * emulatable in headless — honest limitation, noted in the receipt).
 * Locale set is prioritized PER BRIEF (shaping/fallback fonts, segmentation,
 * input methods, currency/date/numerals, translated errors) — never a
 * universal locale claim.
 */
import { chromium } from 'playwright';
import { collectPageMetrics, type PageMetrics } from './harness/metrics.js';

export interface MatrixCell {
  viewport: string;
  theme: 'light' | 'dark';
  reducedMotion: 'reduce' | 'no-preference';
  metrics: PageMetrics;
  overflow: boolean;
  pass: boolean;
}

export interface HardeningResult {
  url: string;
  cells: MatrixCell[];
  failures: string[];
  localeSet: string[];
  zoomNote: string;
}

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

export async function runHardeningMatrix(
  url: string,
  localeSet: string[] = ['en'],
): Promise<HardeningResult> {
  const browser = await chromium.launch();
  const cells: MatrixCell[] = [];
  const failures: string[] = [];
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of ['light', 'dark'] as const) {
        for (const reducedMotion of ['reduce', 'no-preference'] as const) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme,
            reducedMotion,
          });
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle' });
          const metrics = await collectPageMetrics(page);
          // G7: overflow fails the cell except inside deliberate scroll
          // regions (data tables etc. — overflow collection already counts
          // only leaf elements wider than the viewport)
          const overflow = metrics.horizontalOverflow;
          const pass = !overflow;
          if (!pass) failures.push(`${vp.name}/${theme}/${reducedMotion}: horizontal overflow`);
          cells.push({ viewport: vp.name, theme, reducedMotion, metrics, overflow, pass });
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return {
    url,
    cells,
    failures,
    localeSet,
    zoomNote:
      'zoom evidence captured via device-scale-factor variants in captureMatrix (T0152); true browser-zoom behavior needs an interactive runner — recorded as not-run, not claimed',
  };
}
