/**
 * Evidence capture matrix (T0152): 3 viewports × 2 themes, deterministic
 * filenames, JSON metrics. Screenshots disable animations and use a fixed
 * device scale for reproducibility; retry policy: none needed for static
 * fixtures (documented rollback: masking for animated production pages).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { collectPageMetrics, type PageMetrics } from './metrics.js';

export const VIEWPORTS = {
  mobile: { width: 390, height: 844, dsf: 3 },
  tablet: { width: 768, height: 1024, dsf: 2 },
  desktop: { width: 1440, height: 900, dsf: 1 },
} as const;

export const THEMES = ['light', 'dark'] as const;
export type ViewportName = keyof typeof VIEWPORTS;
export type ThemeName = (typeof THEMES)[number];

export interface CaptureCombo {
  viewport: ViewportName;
  theme: ThemeName;
  screenshot: string;
  metrics: PageMetrics;
}

export interface CaptureResult {
  url: string;
  outDir: string;
  combos: CaptureCombo[];
}

async function newContext(
  browser: Browser,
  viewport: ViewportName,
  theme: ThemeName,
): Promise<BrowserContext> {
  const vp = VIEWPORTS[viewport];
  return browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
}

export async function captureMatrix(url: string, outDir: string): Promise<CaptureResult> {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const combos: CaptureCombo[] = [];
  try {
    for (const viewportName of Object.keys(VIEWPORTS) as ViewportName[]) {
      for (const theme of THEMES) {
        const context = await newContext(browser, viewportName, theme);
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(150); // settle fonts/layout
        const metrics = await collectPageMetrics(page);
        const file = join(outDir, `${viewportName}-${theme}.png`);
        await page.screenshot({ path: file, animations: 'disabled', fullPage: true });
        combos.push({ viewport: viewportName, theme, screenshot: file, metrics });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const result: CaptureResult = { url, outDir, combos };
  writeFileSync(join(outDir, 'capture.json'), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
