/**
 * Real-page scan runners (T0152b): axe via @axe-core/playwright, Lighthouse
 * via its programmatic API against a Chrome-for-Testing binary. Both produce
 * the plain summaries the G4/G5 evaluators consume.
 */
import type { Page } from 'playwright';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import type { AxeScanResult, LighthouseSummary } from './a11y-budgets.js';

export async function scanA11y(
  page: Page,
  url: string,
  /**
   * Limit the scan to these subtrees (axe `include`). Used by the scoped best-practice path
   * (issue #21 R2): a violation reported this way is inside the selection by construction.
   */
  options: { include?: readonly string[]; scope?: string } = {},
): Promise<AxeScanResult> {
  await page.goto(url, { waitUntil: 'networkidle' });
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  for (const selector of options.include ?? []) builder = builder.include(selector);
  const results = await builder.analyze();
  return {
    url,
    ...(options.scope === undefined ? {} : { scope: options.scope }),
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

export interface LighthouseLaunchOptions {
  /**
   * Route every request the Lighthouse Chrome makes through this allowlisting proxy (T1046,
   * audit finding T1003-1). Without it the performance phase was the one browser phase that
   * could reach an unauthorized host directly: its Chrome is launched by chrome-launcher, not
   * playwright, so `launchGuardedBrowser` never covered it.
   */
  proxyUrl?: string;
}

export async function runLighthouse(
  url: string,
  chromePath?: string,
  options: LighthouseLaunchOptions = {},
): Promise<LighthouseSummary> {
  const lighthouse = (await import('lighthouse')).default;
  const { launch } = await import('chrome-launcher');
  // Chrome 136+ refuses remote debugging on the default profile (ADR-003 note):
  // each run launches its own Chrome-for-Testing with a fresh profile.
  const chromeFlags = ['--headless=new', '--no-sandbox', '--disable-gpu'];
  if (options.proxyUrl !== undefined) {
    // `--proxy-bypass-list=<-loopback>` is required for the same reason launchGuardedBrowser
    // needs it: Chromium otherwise bypasses proxies for loopback targets, which is exactly the
    // target class the audit points at most.
    chromeFlags.push('--proxy-server=' + options.proxyUrl, '--proxy-bypass-list=<-loopback>');
  }
  const chrome = await launch({
    chromePath: chromePath ?? (await import('chrome-launcher')).getChromePath(),
    chromeFlags,
  });
  let result;
  try {
    // Documented flake policy (T0152 rollback note): under load a trace can
    // come back empty or miss required metrics; retry up to 3 attempts while
    // a required metric (byte weight, LCP) is absent from the report.
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      result = await lighthouse(url, {
        port: chrome.port,
        logLevel: 'error' as const,
        output: 'json' as const,
        onlyCategories: ['performance'],
      });
      const audits = result?.lhr?.audits as Record<string, { numericValue?: number }> | undefined;
      const has = (id: string): boolean => {
        const v = audits?.[id]?.numericValue;
        return typeof v === 'number' && Number.isFinite(v);
      };
      if (audits && has('total-byte-weight') && has('largest-contentful-paint')) break;
      if (attempt < MAX_ATTEMPTS) continue;
    }
  } finally {
    await Promise.resolve(chrome.kill()).catch(() => {});
  }
  if (!result?.lhr) throw new Error('lighthouse produced no report');
  // Fail-closed metric extraction (issue #8): an absent/non-finite numeric
  // value becomes null — never a silent zero. G5 treats nulls as invalid.
  const num = (id: string): number | null => {
    const audit = result.lhr.audits[id] as { numericValue?: number } | undefined;
    const v = audit?.numericValue;
    return typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;
  };
  const clsRaw = result.lhr.audits['cumulative-layout-shift']?.numericValue;
  return {
    url,
    lcpMs: num('largest-contentful-paint'),
    cls:
      typeof clsRaw === 'number' && Number.isFinite(clsRaw)
        ? Math.round(clsRaw * 1000) / 1000
        : null,
    totalBlockingMs: num('total-blocking-time'),
    totalByteWeight: num('total-byte-weight'),
  };
}
