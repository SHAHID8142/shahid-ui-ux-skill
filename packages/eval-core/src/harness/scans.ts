/**
 * Real-page scan runners (T0152b): axe via @axe-core/playwright, Lighthouse
 * via its programmatic API against a Chrome-for-Testing binary. Both produce
 * the plain summaries the G4/G5 evaluators consume.
 */
import type { Page } from 'playwright';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { AxeScanResult, LighthouseSummary } from './a11y-budgets.js';

export async function scanA11y(page: Page, url: string): Promise<AxeScanResult> {
  await page.goto(url, { waitUntil: 'networkidle' });
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  const results = await builder.analyze();
  return {
    url,
    passes: results.passes.length,
    violations: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      nodes: v.nodes.length,
      help: v.help,
    })),
  };
}

/** Locates the Chrome-for-Testing binary installed by Playwright. */
export function chromeForTestingPath(): string | undefined {
  try {
    return chromium.executablePath();
  } catch {
    return undefined;
  }
}

export async function runLighthouse(url: string, chromePath?: string): Promise<LighthouseSummary> {
  const lighthouse = (await import('lighthouse')).default;
  const { launch } = await import('chrome-launcher');
  // Chrome 136+ refuses remote debugging on the default profile (ADR-003 note):
  // each run launches its own Chrome-for-Testing with a fresh profile.
  const chrome = await launch({
    chromePath: chromePath ?? (await import('chrome-launcher')).getChromePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });
  let result;
  try {
    result = await lighthouse(url, {
      port: chrome.port,
      logLevel: 'error' as const,
      output: 'json' as const,
      onlyCategories: ['performance'],
    });
    // Documented flake policy (T0152 rollback note): a trace can come back
    // effectively empty under load; one internal retry on an empty trace.
    const audits = result?.lhr?.audits as Record<string, { numericValue?: number }> | undefined;
    const traceEmpty =
      !audits ||
      (Number(audits['total-byte-weight']?.numericValue ?? 0) === 0 &&
        Number(audits['total-blocking-time']?.numericValue ?? 0) === 0);
    if (traceEmpty) {
      result = await lighthouse(url, {
        port: chrome.port,
        logLevel: 'error' as const,
        output: 'json' as const,
        onlyCategories: ['performance'],
      });
    }
  } finally {
    await Promise.resolve(chrome.kill()).catch(() => {});
  }
  if (!result?.lhr) throw new Error('lighthouse produced no report');
  const num = (id: string): number => {
    const audit = result.lhr.audits[id] as { numericValue?: number } | undefined;
    return Math.round(audit?.numericValue ?? 0);
  };
  const totalBytes = result.lhr.audits['total-byte-weight'] as
    { numericValue?: number } | undefined;
  return {
    url,
    lcpMs: num('largest-contentful-paint'),
    cls: result.lhr.audits['cumulative-layout-shift']?.numericValue
      ? Math.round(result.lhr.audits['cumulative-layout-shift'].numericValue! * 1000) / 1000
      : 0,
    totalBlockingMs: num('total-blocking-time'),
    totalByteWeight: Math.round(totalBytes?.numericValue ?? 0),
  };
}
