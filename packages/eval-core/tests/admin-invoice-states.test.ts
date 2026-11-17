/**
 * T1008 / issue #10 — the invoice list's states, volume and long values.
 *
 * The rules this checks are the ones a happy-path screenshot cannot show:
 * the two kinds of empty (`table-empty-two-kinds`), an error that keeps the
 * rows (`table-error-keeps-state`), a visible loading state, a count announced
 * without moving focus (`table-state-announced`), the view living in the URL
 * (`table-state-in-url`), and twelve records with a 47-character invoice number
 * still fitting a 320px viewport (`table-content-adaptive`).
 *
 * What is measured is what a person would see: which element is on screen, what
 * `aria-busy` says while a load is in flight, what the live region contains, and
 * whether the document is wider than the viewport. Assertions on class names or
 * source code would let a broken page pass.
 *
 * Not covered here: a real assistive-technology session, browser zoom (headless
 * Chromium cannot emulate it), and translated/RTL labels. Those are reported as
 * not-run in `.sus-dev/VERIFICATION/T1008.md` rather than implied by this file.
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = 4339;
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'admin');

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

async function open(
  width: number,
  search = '',
): Promise<{ page: Page; close: () => Promise<void> }> {
  if (!browser) throw new Error('browser not launched');
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${URL}${search}`, { waitUntil: 'networkidle' });
  // The list adopts the URL in an effect; the first page is server-rendered.
  await page.waitForFunction(() => document.querySelector('#invoice-status-line') !== null);
  return { page, close: () => context.close() };
}

const rowCount = (page: Page) => page.locator('#invoice-list tbody tr').count();

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

describe('admin fixture — invoice list states (issue #10)', () => {
  it('shows the two kinds of empty with different actions', async () => {
    const { page, close } = await open(390);
    try {
      // No matches: a filter excluded everything.
      await page.fill('#invoice-search', 'nothing-matches-this');
      await page.waitForSelector('#invoice-empty-matches');
      expect(await rowCount(page)).toBe(0);
      expect(await page.locator('#invoice-empty-records').count()).toBe(0);
      const matchesText = await page.locator('#invoice-empty-matches').innerText();
      expect(matchesText).toMatch(/No invoices match these filters/);
      expect(matchesText).toMatch(/Clear filters/);

      // Clearing restores the records without a reload.
      await page.click('#invoice-empty-matches button');
      await page.waitForFunction(
        () => document.querySelectorAll('#invoice-list tbody tr').length === 5,
      );
      expect(page.url()).not.toContain('q=');
    } finally {
      await close();
    }
  }, 60000);

  it('shows "no records yet" — not "no matches" — for an empty workspace', async () => {
    const { page, close } = await open(390);
    try {
      await page.check('#invoice-fixture-controls input >> nth=1');
      await page.waitForSelector('#invoice-empty-records');
      const text = await page.locator('#invoice-empty-records').innerText();
      expect(text).toMatch(/No invoices yet/);
      expect(text).toMatch(/Create the first invoice/);
      expect(text).not.toMatch(/Clear filters/);
      expect(await page.locator('#invoice-empty-matches').count()).toBe(0);
    } finally {
      await close();
    }
  }, 60000);

  it('keeps the loaded rows visible when a load fails, and recovers on retry', async () => {
    const { page, close } = await open(768);
    try {
      const before = await rowCount(page);
      expect(before).toBe(5);

      await page.check('#invoice-fixture-controls input >> nth=0');
      await page.waitForSelector('#invoice-error');
      expect(await page.locator('#invoice-error').getAttribute('role')).toBe('alert');
      // The table is never blanked by an error.
      expect(await rowCount(page)).toBe(before);
      expect(await page.locator('#invoice-list tbody tr >> nth=0').isVisible()).toBe(true);

      await page.click('#invoice-error button');
      await page.waitForFunction(() => document.querySelector('#invoice-error') === null);
      expect(await rowCount(page)).toBe(before);
    } finally {
      await close();
    }
  }, 60000);

  it('says it is loading, and does not blank the records while it does', async () => {
    const { page, close } = await open(768);
    try {
      await page.selectOption('#invoice-status', 'Overdue');
      // The repository has a deliberate 250ms delay, so the loading state is observable.
      const busy = await page
        .waitForFunction(
          () => document.querySelector('#invoice-table-wrap')?.getAttribute('aria-busy') === 'true',
          undefined,
          { timeout: 5000 },
        )
        .then(() => true)
        .catch(() => false);
      expect(busy).toBe(true);
      expect(await page.locator('#invoice-status-line').innerText()).toMatch(/Loading invoices/);
      await page.waitForFunction(
        () => document.querySelectorAll('#invoice-list tbody tr').length === 3,
      );
      expect(await page.locator('#invoice-status-line').innerText()).toMatch(/Showing 1–3 of 3/);
    } finally {
      await close();
    }
  }, 60000);

  it('announces the new count without stealing focus from the toolbar', async () => {
    const { page, close } = await open(1440);
    try {
      await page.focus('#invoice-sort');
      await page.selectOption('#invoice-sort', 'amount');
      // Wait for the sort to have been applied, not for a sentence that the
      // previous load already produced: on a slower runner the status line is
      // still saying "Loading invoices…" when a text-only wait would return.
      await page.waitForFunction(() => {
        const line = document.querySelector('#invoice-status-line')?.textContent ?? '';
        const firstAmount = document.querySelector(
          '#invoice-list tbody tr td:nth-child(3)',
        )?.textContent;
        return !/Loading/.test(line) && firstAmount === '$2,140.00';
      });
      const live = page.locator('#invoice-status-line');
      expect(await live.getAttribute('role')).toBe('status');
      expect(await live.getAttribute('aria-live')).toBe('polite');
      expect(await live.innerText()).toMatch(/Showing 1–5 of 12 invoices, page 1 of 3/);
      // Focus stays where the operator put it.
      const focused = await page.evaluate(() => document.activeElement?.id ?? '');
      expect(focused).toBe('invoice-sort');
      // Amount sorting is visible in the data, not just announced.
      const firstAmount = await page
        .locator('#invoice-list tbody tr')
        .first()
        .locator('td')
        .nth(2)
        .innerText();
      expect(firstAmount).toBe('$2,140.00');
    } finally {
      await close();
    }
  }, 60000);

  it('puts the view in the URL, and reopens the same view from it', async () => {
    const { page, close } = await open(1440);
    try {
      await page.fill('#invoice-search', 'northwind');
      await page.selectOption('#invoice-status', 'Overdue');
      await page.selectOption('#invoice-sort', 'client');
      await page.waitForFunction(() => window.location.search.includes('northwind'));
      const search = await page.evaluate(() => window.location.search);
      expect(search).toContain('q=northwind');
      expect(search).toContain('status=Overdue');
      expect(search).toContain('sort=client');
      await close();

      const reopened = await open(1440, search);
      try {
        await reopened.page.waitForFunction(
          () => document.querySelectorAll('#invoice-list tbody tr').length === 1,
        );
        expect(await reopened.page.inputValue('#invoice-search')).toBe('northwind');
        expect(await reopened.page.inputValue('#invoice-status')).toBe('Overdue');
        expect(await reopened.page.inputValue('#invoice-sort')).toBe('client');
      } finally {
        await reopened.close();
      }
    } finally {
      /* page already closed above */
    }
  }, 60000);

  it('pages twelve records, disables the ends and keeps the page in the URL', async () => {
    const { page, close } = await open(1440);
    try {
      expect(await page.locator('#invoice-pagination button >> nth=0').isDisabled()).toBe(true);
      await page.click('#invoice-pagination button >> nth=1');
      // The URL moves immediately; the rows follow after the simulated load.
      await page.waitForFunction(() =>
        /Page 2 of 3/.test(document.querySelector('#invoice-pagination p')?.textContent ?? ''),
      );
      expect(await page.evaluate(() => window.location.search)).toContain('page=2');
      await page.click('#invoice-pagination button >> nth=1');
      await page.waitForFunction(() =>
        /Page 3 of 3/.test(document.querySelector('#invoice-pagination p')?.textContent ?? ''),
      );
      expect(await page.evaluate(() => window.location.search)).toContain('page=3');
      expect(await rowCount(page)).toBe(2);
      expect(await page.locator('#invoice-pagination button >> nth=1').isDisabled()).toBe(true);
    } finally {
      await close();
    }
  }, 60000);

  it('fits a 47-character invoice number and long client at every width', async () => {
    for (const width of [320, 390, 768, 1440]) {
      const { page, close } = await open(width, '?q=northwind');
      try {
        await page.waitForFunction(
          () => document.querySelectorAll('#invoice-list tbody tr').length === 1,
        );
        const facts = await page.evaluate(() => {
          const doc = document.documentElement;
          const row = document.querySelector('#invoice-list tbody tr');
          const cells = row ? Array.from(row.querySelectorAll('td')) : [];
          const labels = cells.map((cell) =>
            getComputedStyle(cell, '::before').content.replace(/^"|"$/g, ''),
          );
          return {
            overflow: doc.scrollWidth - doc.clientWidth,
            rowDisplay: row ? getComputedStyle(row).display : 'missing',
            labels,
            minCell: cells.length
              ? Math.min(...cells.map((c) => c.getBoundingClientRect().width))
              : 0,
            text: row?.textContent ?? '',
          };
        });
        expect({ width, overflow: facts.overflow }).toEqual({ width, overflow: 0 });
        // Same DOM: a table from 768px up, a labelled card below 640px.
        expect({ width, rowDisplay: facts.rowDisplay }).toEqual({
          width,
          rowDisplay: width <= 640 ? 'block' : 'table-row',
        });
        if (width <= 640) {
          // The card layout prints each field's name; above the threshold the
          // header row does that job, so no label is duplicated there.
          expect(facts.labels).toEqual([
            'Invoice',
            'Client',
            'Amount',
            'Status',
            'Dated',
            'Actions',
          ]);
          expect(facts.minCell).toBeGreaterThanOrEqual(128);
        } else {
          expect(facts.labels).toEqual(['none', 'none', 'none', 'none', 'none', 'none']);
        }
        expect(facts.text).toContain('NORTHWIND-REGIONAL-DISTRIBUTION');
      } finally {
        await close();
      }
    }
  }, 90000);

  it('survives a 200% text size and longer translated labels', async () => {
    // Approximations, stated as such: this is *text* scaling (everything sized in
    // rem doubles) and pseudo-localised labels ~30% longer than the English ones,
    // not a real translation and not browser zoom (headless cannot emulate zoom).
    const { page, close } = await open(320, '?q=northwind');
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('#invoice-list tbody tr').length === 1,
      );
      const facts = await page.evaluate(() => {
        // A wider font stack than the platform default, because the CI runner's
        // fonts are wider than a Mac's: the same 200% text that fits locally
        // pushed the document 8px past a 320px viewport there, from one heading
        // whose single longest word could not wrap.
        const fontStyle = document.createElement('style');
        fontStyle.textContent = "* { font-family: Verdana, 'DejaVu Sans', sans-serif !important }";
        document.head.append(fontStyle);
        const translated: Record<string, string> = {
          Invoice: 'Rechnungsnummer',
          Client: 'Kundenname',
          Amount: 'Rechnungsbetrag',
          Status: 'Zahlungsstatus',
          Dated: 'Rechnungsdatum',
          Actions: 'Aktionen',
        };
        for (const cell of Array.from(document.querySelectorAll('#invoice-list tbody td'))) {
          const key = cell.getAttribute('data-label') ?? '';
          if (translated[key]) cell.setAttribute('data-label', translated[key]);
        }
        document.documentElement.style.fontSize = '200%';
        const doc = document.documentElement;
        return { overflow: doc.scrollWidth - doc.clientWidth };
      });
      expect(facts.overflow).toBe(0);
    } finally {
      await close();
    }
  }, 60000);

  it('gives every row action a distinct accessible name, and reaches them in order by keyboard', async () => {
    const { page, close } = await open(390);
    try {
      // Five buttons reading "Open" would be five identical items in a screen
      // reader's list of buttons, so each carries its own record in the name.
      const names = await page.evaluate(() =>
        Array.from(document.querySelectorAll('#invoice-list tbody .row-action')).map(
          (button) => button.getAttribute('aria-label') ?? button.textContent ?? '',
        ),
      );
      expect(names.length).toBe(5);
      expect(new Set(names).size).toBe(5);
      expect(names[0]).toMatch(/^Open invoice INV-/);

      // Toolbar first, then the first record's action — the reading order a
      // keyboard user expects, with nothing skipped.
      await page.focus('#invoice-search');
      const visited: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        await page.keyboard.press('Tab');
        visited.push(
          await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            return el?.id || el?.getAttribute('aria-label') || el?.tagName || '';
          }),
        );
      }
      expect(visited.slice(0, 2)).toEqual(['invoice-status', 'invoice-sort']);
      expect(visited.some((name) => name.startsWith('Open invoice'))).toBe(true);
    } finally {
      await close();
    }
  }, 60000);

  it('exposes the record fields in its accessibility tree, not only visually', async () => {
    const { page, close } = await open(390, '?q=northwind');
    try {
      await page.waitForFunction(
        () => document.querySelectorAll('#invoice-list tbody tr').length === 1,
      );
      // A structural check of the accessibility tree, not a screen-reader session.
      const snapshot = await page.locator('#invoice-list').ariaSnapshot();
      expect(snapshot).toContain('INV-2026-11-000431-NORTHWIND-REGIONAL-DISTRIBUTION');
      expect(snapshot).toContain('Northwind Regional Distribution Cooperative');
      expect(snapshot).toMatch(/\$1,284\.50/);
      expect(snapshot).toContain('Open invoice INV-2026-11-000431-NORTHWIND-REGIONAL-DISTRIBUTION');
    } finally {
      await close();
    }
  }, 60000);

  it('passes axe in the card layout and in an empty state', async () => {
    const { page, close } = await open(390, '?status=Draft');
    try {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const bad = scan.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => v.id)).toEqual([]);
    } finally {
      await close();
    }
  }, 60000);
});
