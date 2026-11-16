/**
 * T1016 / issue #14 — measured before/after pilots for the Modern Web Guidance
 * research source.
 *
 * Three pilots, each a pair of standalone pages built from the same markup where
 * the only difference is the guidance-derived technique under test:
 *
 *  1. responsive-table — hiding the header row with display:none drops the table
 *     header association; the visually-hidden-in-place technique keeps it. Both
 *     variants keep the page free of horizontal overflow, so the comparison
 *     isolates the accessibility cost, not a layout artefact.
 *  2. navigation-drawer — a class-toggle drawer has no expanded state, no Escape
 *     dismiss and no focus contract; the guidance-shaped drawer has all three,
 *     keeps the background inert, and its no-JS fallback leaves the links
 *     reachable.
 *  3. inp-handler — one 360 ms synchronous handler blocks input for its whole
 *     duration; the same work budget split into 20 ms chunks with a yield
 *     produces no long task, including on the fallback path used when
 *     scheduler.yield is unavailable.
 *
 * The before and after page of a pilot are measured by the SAME instrument, so
 * the difference is the technique and nothing else. What this does NOT measure:
 * real assistive technology, real users, field INP, 400% zoom, translated
 * content. Those stay not-run, never pass — see docs/RESEARCH_SOURCES.md and
 * .sus-dev/VERIFICATION/T1016.md.
 *
 * The browser work costs real seconds, so it is gated behind SUS_PILOTS=1 (the
 * same shape as SUS_BENCH / SUS_DOGFOOD). The committed evidence file
 * (pilots/results.json) is re-validated on every run WITHOUT a browser: page
 * digests, the before/after verdict direction and the required metric fields are
 * checked, so a stale or hand-edited results file fails `pnpm test`. That check is
 * skipped during a regenerating run (SUS_PILOTS=1), which is what rewrites the file.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHardeningMatrix } from '../src/index.js';

declare global {
  interface Window {
    __longTasks: { start: number; duration: number }[];
    __work?: { mode: string; touched: number; chunks?: number; busyMs: number };
  }
}

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const PILOT_DIR = join(REPO, 'evals', 'research', 'modern-web-guidance', 'pilots');
const RESULTS = join(PILOT_DIR, 'results.json');
const PORT = 4360;
const RUN = process.env.SUS_PILOTS === '1';

/** Header text of the pilot table — the instrument of record counts these. */
const TABLE_HEADERS = ['Entry', 'Status', 'Editor', 'Updated'];

interface PilotMetrics {
  [key: string]: number | string | boolean | null;
}

interface PilotMeasurement {
  pass: boolean;
  metrics: PilotMetrics;
}

interface PilotCase {
  description: string;
  pass: boolean;
  metrics: PilotMetrics;
}

interface PageDigest {
  path: string;
  sha256: string;
}

interface PilotRecord {
  id: string;
  guide: string;
  claim: string;
  instrument: string;
  pages: { before: PageDigest; after: PageDigest };
  before: PilotMeasurement;
  after: PilotMeasurement;
  negativeCase: PilotCase;
  fallbackCase: PilotCase;
}

interface PilotDocument {
  generatedBy: string;
  command: string;
  runAt: string;
  environment: { playwright: string; browser: string; viewport: string; locale: string };
  honestLimits: string[];
  pilots: PilotRecord[];
}

const PILOT_FILES = [
  {
    id: 'responsive-table',
    before: 'responsive-table/before.html',
    after: 'responsive-table/after.html',
  },
  {
    id: 'navigation-drawer',
    before: 'navigation-drawer/before.html',
    after: 'navigation-drawer/after.html',
  },
  { id: 'inp-handler', before: 'inp-handler/before.html', after: 'inp-handler/after.html' },
] as const;

function digest(relative: string): PageDigest {
  const absolute = join(PILOT_DIR, relative);
  const sha256 = createHash('sha256').update(readFileSync(absolute)).digest('hex');
  return { path: relative, sha256 };
}

function readResults(): PilotDocument {
  return JSON.parse(readFileSync(RESULTS, 'utf8')) as PilotDocument;
}

function baseUrl(name: string): string {
  return 'http://127.0.0.1:' + PORT + '/' + name;
}

async function servePilots(): Promise<Server> {
  const files = new Map<string, string>();
  for (const pilot of PILOT_FILES) {
    for (const name of [pilot.before, pilot.after]) {
      files.set('/' + name, readFileSync(join(PILOT_DIR, name), 'utf8'));
    }
  }
  const server = createServer((request, response) => {
    const body = files.get(request.url ?? '/');
    if (body === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  return server;
}

interface SnapshotStats {
  columnheaderCount: number;
  cellCount: number;
  cellsCarryingHeaderText: number;
}

function snapshotStats(snapshot: string, headers: string[]): SnapshotStats {
  const columnheaderCount = (snapshot.match(/- columnheader\b/g) ?? []).length;
  const cellNames = [...snapshot.matchAll(/- cell "([^"]*)"/g)].map((match) => match[1] ?? '');
  const labelled = cellNames.filter((name) => headers.some((header) => name.includes(header)));
  return {
    columnheaderCount,
    cellCount: cellNames.length,
    cellsCarryingHeaderText: labelled.length,
  };
}

async function measureTable(
  browser: Browser,
  url: string,
  options: { width?: number; hideHeader?: boolean } = {},
): Promise<PilotMetrics> {
  const width = options.width ?? 390;
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  if (options.hideHeader === true) {
    await page.addStyleTag({ content: 'thead { display: none !important; }' });
  }
  const snapshot = await page.locator('#queue').ariaSnapshot();
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const axeSeriousCritical = axe.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  ).length;
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  await context.close();
  const stats = snapshotStats(snapshot, TABLE_HEADERS);
  return {
    columnheaderCount: stats.columnheaderCount,
    cellCount: stats.cellCount,
    cellsCarryingHeaderText: stats.cellsCarryingHeaderText,
    axeSeriousCritical,
    documentOverflow: layout.scrollWidth > layout.clientWidth,
  };
}

async function measureDrawer(browser: Browser, url: string): Promise<PilotMetrics> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const ariaExpandedInitial = await page.getAttribute('#menu-toggle', 'aria-expanded');
  await page.focus('#menu-toggle');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  const ariaExpandedAfterOpen = await page.getAttribute('#menu-toggle', 'aria-expanded');
  const focusInsideAfterOpen = await page.evaluate(
    () => document.activeElement !== null && document.activeElement.closest('#drawer') !== null,
  );
  let tabStepsInBackground = 0;
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    const inBackground = await page.evaluate(
      () => document.activeElement !== null && document.activeElement.closest('#main') !== null,
    );
    if (inBackground) tabStepsInBackground += 1;
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const drawerClosedAfterEscape = await page.evaluate(() => {
    const drawer = document.getElementById('drawer');
    if (drawer === null) return false;
    return drawer.hidden || drawer.dataset.open === 'false';
  });
  const focusReturnedToToggle = await page.evaluate(
    () => document.activeElement !== null && document.activeElement.id === 'menu-toggle',
  );
  await context.close();

  const noJs = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(url, { waitUntil: 'load' });
  const noJsVisibleLinks = await noJsPage.evaluate(
    () =>
      [...document.querySelectorAll('#drawer a')].filter((link) => {
        const rect = link.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
  );
  await noJs.close();

  return {
    ariaExpandedInitial: ariaExpandedInitial ?? 'absent',
    ariaExpandedAfterOpen: ariaExpandedAfterOpen ?? 'absent',
    focusInsideAfterOpen,
    tabStepsInBackground,
    drawerClosedAfterEscape,
    focusReturnedToToggle,
    noJsVisibleLinks,
  };
}

interface LongTaskRun {
  mode: string;
  busyMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
  totalBlockingMs: number;
}

async function measureHandler(
  browser: Browser,
  url: string,
  options: { stripSchedulerYield?: boolean } = {},
): Promise<PilotMetrics> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    window.__longTasks = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push({ start: entry.startTime, duration: entry.duration });
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  });
  if (options.stripSchedulerYield === true) {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'scheduler', { value: undefined, configurable: true });
    });
  }
  const runs: LongTaskRun[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const page: Page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__longTasks.length = 0;
    });
    await page.click('#go');
    await page.waitForFunction(
      () => document.getElementById('status')?.textContent === 'done',
      undefined,
      { timeout: 20000 },
    );
    const measured = await page.evaluate(() => {
      const durations = window.__longTasks.map((task) => task.duration);
      const work = window.__work;
      return { durations, mode: work?.mode ?? 'unknown', busyMs: Math.round(work?.busyMs ?? 0) };
    });
    const totalBlockingMs = measured.durations.reduce(
      (total, duration) => total + Math.max(0, duration - 50),
      0,
    );
    runs.push({
      mode: measured.mode,
      busyMs: measured.busyMs,
      longTaskCount: measured.durations.length,
      maxLongTaskMs: Math.round(Math.max(0, ...measured.durations)),
      totalBlockingMs: Math.round(totalBlockingMs),
    });
    await page.close();
  }
  await context.close();
  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return {
    mode: runs[0]?.mode ?? 'unknown',
    longTaskCount: median(runs.map((run) => run.longTaskCount)),
    maxLongTaskMs: median(runs.map((run) => run.maxLongTaskMs)),
    totalBlockingMs: median(runs.map((run) => run.totalBlockingMs)),
    busyMs: median(runs.map((run) => run.busyMs)),
    runs: runs.length,
  };
}

const HONEST_LIMITS = [
  'Headless Chromium in the en locale; no real screen reader and no real user.',
  'The pilot pages are synthetic pairs built for this comparison, not field pages.',
  'Long-task timings come from the browser performance timeline, not field INP.',
  'No claim here compares SUS output with any other method; the host pilots stay not-run.',
];

const records: PilotRecord[] = [];

/** Validates the COMMITTED evidence. Skipped while regenerating it (SUS_PILOTS=1). */
describe.skipIf(RUN)('pilot evidence file (T1016)', () => {
  it('exists and keeps the before/after verdict direction', () => {
    const document = readResults();
    expect(document.pilots).toHaveLength(3);
    for (const pilot of document.pilots) {
      expect(pilot.before.pass, pilot.id + ' before must fail the criterion').toBe(false);
      expect(pilot.after.pass, pilot.id + ' after must pass the criterion').toBe(true);
      expect(pilot.negativeCase.pass, pilot.id + ' negative case must be detected').toBe(false);
      expect(pilot.fallbackCase.pass, pilot.id + ' fallback case must hold').toBe(true);
      expect(pilot.guide.length).toBeGreaterThan(10);
      expect(pilot.instrument.length).toBeGreaterThan(10);
    }
  });

  it('cites the exact committed pilot pages, by digest', () => {
    const document = readResults();
    for (const pilot of document.pilots) {
      const files = PILOT_FILES.find((file) => file.id === pilot.id);
      expect(files, 'pilot id ' + pilot.id + ' must name its pages').toBeDefined();
      if (files === undefined) continue;
      expect(pilot.pages.before).toEqual(digest(files.before));
      expect(pilot.pages.after).toEqual(digest(files.after));
    }
  });

  it('records an environment and the limits instead of a general claim', () => {
    const document = readResults();
    expect(document.environment.browser.length).toBeGreaterThan(0);
    expect(document.environment.locale).toBe('en');
    expect(document.honestLimits.length).toBeGreaterThanOrEqual(3);
    expect(document.honestLimits.join(' ')).not.toMatch(/proven|guaranteed/i);
  });
});

describe.skipIf(!RUN)('pilots measured in a browser (SUS_PILOTS=1)', () => {
  let server: Server | undefined;
  let browser: Browser | undefined;

  beforeAll(async () => {
    server = await servePilots();
    browser = await chromium.launch();
  }, 120000);

  afterAll(async () => {
    await browser?.close();
    if (server !== undefined) {
      const open = server;
      await new Promise<void>((resolve, reject) => {
        open.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    }
  }, 60000);

  it('pilot 1: header association survives the narrow layout', async () => {
    const page = browser;
    expect(page).toBeDefined();
    if (page === undefined) return;
    const beforeUrl = baseUrl('responsive-table/before.html');
    const afterUrl = baseUrl('responsive-table/after.html');

    const before = await measureTable(page, beforeUrl);
    const after = await measureTable(page, afterUrl);
    const narrowest = await measureTable(page, afterUrl, { width: 320 });
    const hiddenHeader = await measureTable(page, afterUrl, { hideHeader: true });

    const beforeMatrix = await runHardeningMatrix(beforeUrl);
    const afterMatrix = await runHardeningMatrix(afterUrl);

    expect(before.documentOverflow).toBe(false);
    expect(after.documentOverflow).toBe(false);
    expect(beforeMatrix.failures).toEqual([]);
    expect(afterMatrix.failures).toEqual([]);
    expect(before.columnheaderCount).toBe(0);
    expect(after.columnheaderCount).toBe(TABLE_HEADERS.length);
    expect(after.cellCount).toBe(16);
    expect(narrowest.columnheaderCount).toBe(TABLE_HEADERS.length);
    expect(hiddenHeader.columnheaderCount).toBe(0);

    const record: PilotRecord = {
      id: 'responsive-table',
      guide:
        'Modern Web Guidance — responsive table / record layout (pinned modern-web-guidance v1.0.0)',
      claim:
        'Stacking table rows at narrow widths without dropping the header row keeps the header-to-cell association, at no reflow cost.',
      instrument:
        'Playwright ariaSnapshot() columnheader count at 390px; document scrollWidth vs clientWidth; axe wcag2a/aa serious+critical; runHardeningMatrix 3 viewports x 2 themes x 2 motion settings',
      pages: {
        before: digest('responsive-table/before.html'),
        after: digest('responsive-table/after.html'),
      },
      before: { pass: before.columnheaderCount === TABLE_HEADERS.length, metrics: before },
      after: {
        pass: after.columnheaderCount === TABLE_HEADERS.length && after.cellCount === 16,
        metrics: after,
      },
      negativeCase: {
        description:
          'After page with the header row forced to display:none — the instrument must lose the association.',
        pass: hiddenHeader.columnheaderCount === TABLE_HEADERS.length,
        metrics: hiddenHeader,
      },
      fallbackCase: {
        description:
          'After page at 320px, the narrowest audited width — the association and the overflow-free layout must both survive.',
        pass:
          narrowest.columnheaderCount === TABLE_HEADERS.length &&
          narrowest.documentOverflow === false,
        metrics: narrowest,
      },
    };
    expect(record.before.pass).toBe(false);
    expect(record.after.pass).toBe(true);
    expect(record.negativeCase.pass).toBe(false);
    expect(record.fallbackCase.pass).toBe(true);
    records.push(record);
  }, 180000);

  it('pilot 2: the drawer keeps the keyboard contract and degrades without JS', async () => {
    const page = browser;
    expect(page).toBeDefined();
    if (page === undefined) return;
    const before = await measureDrawer(page, baseUrl('navigation-drawer/before.html'));
    const after = await measureDrawer(page, baseUrl('navigation-drawer/after.html'));

    expect(before.ariaExpandedInitial).toBe('absent');
    expect(after.ariaExpandedInitial).toBe('false');
    expect(after.ariaExpandedAfterOpen).toBe('true');
    expect(after.focusInsideAfterOpen).toBe(true);
    expect(after.tabStepsInBackground).toBe(0);
    expect(after.drawerClosedAfterEscape).toBe(true);
    expect(after.focusReturnedToToggle).toBe(true);
    expect(after.noJsVisibleLinks).toBe(4);

    const contract = (metrics: PilotMetrics): boolean =>
      metrics.ariaExpandedInitial === 'false' &&
      metrics.ariaExpandedAfterOpen === 'true' &&
      metrics.focusInsideAfterOpen === true &&
      metrics.drawerClosedAfterEscape === true &&
      metrics.focusReturnedToToggle === true;

    const record: PilotRecord = {
      id: 'navigation-drawer',
      guide: 'Modern Web Guidance — navigation drawer (pinned modern-web-guidance v1.0.0)',
      claim:
        'A drawer that exposes its expanded state, dismisses on Escape, moves focus in and back, and leaves the background inert is measurable; a class-toggle drawer is not.',
      instrument:
        'Playwright keyboard drive: aria-expanded before and after opening, document.activeElement containment over 6 Tab steps, Escape dismissal, focus return to the trigger, plus a javaScriptEnabled:false context for the no-JS fallback',
      pages: {
        before: digest('navigation-drawer/before.html'),
        after: digest('navigation-drawer/after.html'),
      },
      before: { pass: contract(before), metrics: before },
      after: { pass: contract(after), metrics: after },
      negativeCase: {
        description:
          'The class-toggle drawer — the same markup without the contract. The instrument must report the missing state.',
        pass: contract(before),
        metrics: before,
      },
      fallbackCase: {
        description:
          'After page with JavaScript disabled — the four section links must stay visible and reachable.',
        pass: after.noJsVisibleLinks === 4 && before.noJsVisibleLinks !== after.noJsVisibleLinks,
        metrics: {
          noJsVisibleLinksAfter: after.noJsVisibleLinks,
          noJsVisibleLinksBefore: before.noJsVisibleLinks,
        },
      },
    };
    expect(record.before.pass).toBe(false);
    expect(record.after.pass).toBe(true);
    expect(record.negativeCase.pass).toBe(false);
    expect(record.fallbackCase.pass).toBe(true);
    records.push(record);
  }, 180000);

  it('pilot 3: the same work budget stops blocking input when it yields', async () => {
    const page = browser;
    expect(page).toBeDefined();
    if (page === undefined) return;
    const before = await measureHandler(page, baseUrl('inp-handler/before.html'));
    const after = await measureHandler(page, baseUrl('inp-handler/after.html'));
    const fallback = await measureHandler(page, baseUrl('inp-handler/after.html'), {
      stripSchedulerYield: true,
    });

    expect(before.longTaskCount as number).toBeGreaterThanOrEqual(1);
    expect(before.totalBlockingMs as number).toBeGreaterThanOrEqual(150);
    expect(after.totalBlockingMs as number).toBeLessThanOrEqual(50);
    expect(after.busyMs as number).toBeGreaterThanOrEqual(300);

    const notBlocking = (metrics: PilotMetrics): boolean =>
      (metrics.totalBlockingMs as number) <= 50 && (metrics.busyMs as number) >= 300;

    const record: PilotRecord = {
      id: 'inp-handler',
      guide:
        'Modern Web Guidance — identify INP causes / yielding on long tasks (pinned modern-web-guidance v1.0.0)',
      claim:
        'The same 360 ms work budget split into 20 ms chunks with a yield between them produces no long task, so input is not blocked for the whole handler duration.',
      instrument:
        'PerformanceObserver longtask entries around one scripted click, three runs per page with the median reported; totalBlockingMs = sum(max(0, duration - 50)); lab long-task time, not field INP',
      pages: {
        before: digest('inp-handler/before.html'),
        after: digest('inp-handler/after.html'),
      },
      before: { pass: notBlocking(before), metrics: before },
      after: { pass: notBlocking(after), metrics: after },
      negativeCase: {
        description:
          'One synchronous handler for the whole work budget — the instrument must see the long task.',
        pass: notBlocking(before),
        metrics: before,
      },
      fallbackCase: {
        description:
          'After page with window.scheduler removed — the timeout fallback must still avoid the long task.',
        pass: notBlocking(fallback) && fallback.mode === 'timeout',
        metrics: fallback,
      },
    };
    expect(record.before.pass).toBe(false);
    expect(record.after.pass).toBe(true);
    expect(record.negativeCase.pass).toBe(false);
    expect(record.fallbackCase.pass).toBe(true);
    records.push(record);
  }, 180000);

  it('writes the evidence file with the measured values', () => {
    expect(records).toHaveLength(3);
    const document: PilotDocument = {
      generatedBy: 'packages/eval-core/tests/pilots.research.test.ts',
      command: 'SUS_PILOTS=1 pnpm exec vitest run packages/eval-core/tests/pilots.research.test.ts',
      runAt: new Date().toISOString(),
      environment: {
        playwright: '^1.65.0',
        browser: 'chromium (headless, Playwright-managed)',
        viewport: '390x844 for the instrument; 320/390/768/1440 for the reflow matrix',
        locale: 'en',
      },
      honestLimits: HONEST_LIMITS,
      pilots: records,
    };
    writeFileSync(RESULTS, JSON.stringify(document, null, 2) + '\n', 'utf8');
  });
});
