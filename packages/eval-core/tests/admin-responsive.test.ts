/**
 * T1007 / issue #10 — the admin reference implementation really reflows.
 *
 * The dogfood run (T0906) recorded two findings on this fixture: 343px of
 * document-level horizontal scroll at 390px (F1) and muted text at 4.46:1
 * (F2). Both were measured, neither was fixed, because the fixture is also the
 * ruler the dogfood checks run against. This test is the other half of that
 * decision: the fixture has to be a page whose mobile layout actually holds up,
 * so the rules are now measured here instead of only reported.
 *
 * What is asserted, and why each one exists:
 *
 * - **No document-level overflow at 320/390/768/1440.** Row data must not drive
 *   the page wider. Measured as scrollWidth vs clientWidth, not as a CSS guess.
 * - **No `overflow-x: hidden` on html/body.** Concealing the broken content is
 *   the cheat this test is meant to refuse (issue #10 point 3).
 * - **The layout switches for a reason.** Below the reflow threshold a record is
 *   a block card; at tablet and desktop it is a real table row. Both are the
 *   same DOM — there is no duplicate presentation to keep in sync.
 * - **Every card field is self-labelled.** The five `td::before` labels match
 *   the header row's text in the same order, so the narrow layout says what each
 *   value is instead of leaving five anonymous values stacked.
 * - **Long unbroken content still fits.** A long entry title and a long editor
 *   name are injected at 320px: an id or a machine name is the usual cause of a
 *   late-discovered overflow.
 * - **The check can fail.** Forcing the desktop table back on at 390px *must*
 *   produce overflow. A responsive test that cannot fail proves nothing.
 * - **axe finds no serious or critical violation** at the narrow and wide ends,
 *   which is where F2 (contrast) lives.
 *
 * Honest limits: this measures a synthetic four-row fixture at four widths in
 * headless Chromium with the `en` locale. Zoom reflow, 200% text scaling,
 * translated labels and real volume are covered elsewhere or not at all — see
 * `.sus-dev/VERIFICATION/T1007.md` for what was and was not run.
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = 4337;
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'admin');
/** 40rem, the width the fixture's media query uses. Kept in one place here. */
const REFLOW_MAX = 640;

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 640 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const;

let server: ChildProcess | undefined;
let browser: Browser | undefined;

// The wait is for `next start` to bind, not an assertion about speed. 30 s was enough in isolation and
// not enough when the whole suite ran in parallel (two suites failed this way in one run and passed
// alone), so the wait is wider and the failure says how long it waited.
async function waitForReady(url: string, timeoutMs = 90000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`admin fixture server not ready at ${url}`);
}

interface LayoutFacts {
  scrollWidth: number;
  clientWidth: number;
  overflow: number;
  rowDisplay: string;
  labels: string[];
  headerLabels: string[];
  concealment: string[];
  actionHeight: number;
  theadHidden: boolean;
  /** Narrowest cell in the first record, in CSS px — the compression measure. */
  minCellWidth: number;
}

async function measure(width: number, height: number, extraCss?: string): Promise<LayoutFacts> {
  if (!browser) throw new Error('browser not launched');
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (extraCss) await page.addStyleTag({ content: extraCss });
  const facts = await page.evaluate(() => {
    const doc = document.documentElement;
    const row = document.querySelector('#content-queue tbody tr');
    if (!row) throw new Error('content queue row missing');
    const cells = Array.from(row.querySelectorAll('td'));
    const thead = document.querySelector('#content-queue thead');
    const action = row.querySelector('.row-action');
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth - doc.clientWidth,
      rowDisplay: getComputedStyle(row).display,
      labels: cells.map((cell) => getComputedStyle(cell, '::before').content.replace(/^"|"$/g, '')),
      headerLabels: Array.from(document.querySelectorAll('#content-queue thead th')).map((th) =>
        (th.textContent ?? '').trim(),
      ),
      concealment: [
        getComputedStyle(doc).overflowX,
        getComputedStyle(document.body).overflowX,
      ].filter((v) => v === 'hidden' || v === 'clip'),
      actionHeight: action ? action.getBoundingClientRect().height : 0,
      theadHidden: !thead || getComputedStyle(thead).display === 'none',
      minCellWidth: Math.min(...cells.map((cell) => cell.getBoundingClientRect().width)),
    };
  });
  await context.close();
  return facts;
}

beforeAll(async () => {
  if (!existsSync(join(FIXTURE, '.next', 'BUILD_ID'))) {
    execSync('pnpm exec next build', { cwd: FIXTURE, stdio: 'ignore' });
  }
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: FIXTURE,
    stdio: 'ignore',
    detached: true,
  });
  await waitForReady(URL);
  browser = await chromium.launch();
}, 180000);

afterAll(async () => {
  await browser?.close();
  if (server?.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* already gone */
    }
  }
});

describe('admin fixture — content-adaptive records (issue #10)', () => {
  it('does not overflow the document at 320/390/768/1440, and does not hide overflow', async () => {
    for (const vp of VIEWPORTS) {
      const facts = await measure(vp.width, vp.height);
      expect({ vp: vp.name, overflow: facts.overflow }).toEqual({ vp: vp.name, overflow: 0 });
      expect({ vp: vp.name, concealment: facts.concealment }).toEqual({
        vp: vp.name,
        concealment: [],
      });
    }
  }, 120000);

  it('is a table on desktop and a block-record card on mobile, from the same markup', async () => {
    for (const vp of VIEWPORTS) {
      const facts = await measure(vp.width, vp.height);
      const expected = vp.width <= REFLOW_MAX ? 'block' : 'table-row';
      expect({ vp: vp.name, display: facts.rowDisplay }).toEqual({
        vp: vp.name,
        display: expected,
      });
    }
  }, 120000);

  it('self-labels each card field, in the same order as the desktop header', async () => {
    const facts = await measure(320, 640);
    expect(facts.labels).toEqual(facts.headerLabels);
    expect(facts.labels).toEqual(['Entry', 'Status', 'Editor', 'Updated', 'Actions']);
    // The header row stays in the accessibility tree rather than being removed.
    expect(facts.theadHidden).toBe(false);
  }, 60000);

  it('keeps 44px touch targets for row actions on mobile', async () => {
    const facts = await measure(390, 844);
    expect(facts.actionHeight).toBeGreaterThanOrEqual(44);
  }, 60000);

  it('gives each record field a readable width, not five squeezed columns', async () => {
    // The pre-fix table at 390px produced cells 70-115px wide; below 5rem a
    // status pill or a date breaks mid-word. The card layout gives every field
    // the full card width.
    for (const width of [320, 390]) {
      const facts = await measure(width, 844);
      expect({ width, minCellWidth: facts.minCellWidth >= 128 }).toEqual({
        width,
        minCellWidth: true,
      });
    }
  }, 60000);

  it('absorbs a long unbroken entry title and editor name at 320px', async () => {
    const longTitle = 'Autumn-release-notes-and-pricing-page-copy-consolidation-2026-11-edition';
    const longEditor = 'automation-service-account-publisher-batch-2';
    if (!browser) throw new Error('browser not launched');
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    const after = await page.evaluate(
      ({ title, editor }) => {
        const cells = document.querySelectorAll('#content-queue tbody tr:first-child td');
        cells[0].textContent = title;
        cells[2].textContent = editor;
        const doc = document.documentElement;
        return { overflow: doc.scrollWidth - doc.clientWidth };
      },
      { title: longTitle, editor: longEditor },
    );
    await context.close();
    expect(after.overflow).toBe(0);
  }, 60000);

  it('passes axe at 390px and 1440px with no serious or critical violation', async () => {
    for (const width of [390, 1440]) {
      if (!browser) throw new Error('browser not launched');
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await page.goto(URL, { waitUntil: 'networkidle' });
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const bad = scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect({ width, bad: bad.map((v) => `${v.id}: ${v.nodes.length}`) }).toEqual({
        width,
        bad: [],
      });
      await context.close();
    }
  }, 120000);

  it('fails when the pre-fix desktop layout is forced back on at 390px (negative control)', async () => {
    // Reproduces F1 exactly: the old `1fr` grid track, the desktop table display
    // and unrestricted word wrapping. If this stops overflowing, the measurement
    // above has stopped detecting the defect it was written for.
    const preFix =
      '#admin-shell{grid-template-columns:14rem 1fr}' +
      '#content-queue table,#content-queue tbody,#content-queue tr,#content-queue td{display:revert}' +
      '#content-queue th,#content-queue td{overflow-wrap:normal}';
    const facts = await measure(390, 844, preFix);
    expect(facts.rowDisplay).toBe('table-row');
    expect(facts.overflow).toBeGreaterThan(0);
    expect(facts.minCellWidth).toBeLessThan(80);
  }, 60000);
});
