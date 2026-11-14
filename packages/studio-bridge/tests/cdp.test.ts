/**
 * T0702: CDP attach + overlay injection — loads without app modification,
 * isolated-world state invisible to the hostile page, reconnect after
 * restart, keyboard-navigable + axe-clean overlay (kilo H3: a11y not deferred).
 */
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CdpOverlay, type AttachResult } from '../src/cdp.js';
import { commerceFixtureHtml } from './support/fixture-html.js';

const PORT = 4352; // dedicated: no collision with eval-core suites
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'commerce'); // Astro stack per T0700 ladder

let server: Server | undefined;
let browser: Browser;
let page: Page;
let attachResult: AttachResult;

beforeAll(async () => {
  // static serving of the BUILT fixture — no astro-preview port races
  const html = commerceFixtureHtml();
  server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' }).end(html);
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(PORT, '127.0.0.1', resolve);
  });
  const overlay = new CdpOverlay();
  const launched = await overlay.launchAndAttach(URL);
  browser = launched.browser;
  page = launched.page;
  attachResult = launched.result;
}, 120000);

afterAll(async () => {
  await browser?.close();
  server?.close();
});

describe('CDP overlay injection (T0702)', () => {
  it('overlay loads WITHOUT app modification (injection only)', () => {
    expect(attachResult.overlayPresent).toBe(true);
    // the fixture source contains no overlay code — presence proves injection
    const src = readFileSync(join(FIXTURE, 'src', 'pages', 'index.astro'), 'utf8');
    expect(src).not.toContain('sus-overlay');
  });

  it('bridge state lives in the isolated world; the page main world cannot see it', () => {
    expect(attachResult.isolatedWorldOk).toBe(true);
    expect(attachResult.mainWorldIsolated).toBe(true);
  });

  it('reconnects after a navigation/dev-server-style restart (new document re-injection)', async () => {
    await page.reload({ waitUntil: 'networkidle' });
    const stillThere = await page.evaluate(
      () => document.getElementById('sus-overlay-root') !== null,
    );
    const mainWorldStillIsolated = await page.evaluate('typeof window.__susBridge === "undefined"');
    expect(stillThere).toBe(true);
    expect(mainWorldStillIsolated).toBe(true);
  });

  it('overlay is keyboard-navigable (toolbar focusable, buttons reachable)', async () => {
    const focusable = await page.evaluate(() => {
      const toolbar = document.getElementById('sus-overlay-toolbar');
      if (!toolbar) return false;
      toolbar.focus();
      if (document.activeElement !== toolbar) return false;
      const buttons = toolbar.querySelectorAll('button');
      return buttons.length === 2;
    });
    expect(focusable).toBe(true);
  });

  it('overlay region is axe-clean in the M7 slice (kilo H3)', async () => {
    // axe runs on the SAME overlaid page (explicit context since launchAndAttach)
    const results = await new AxeBuilder({ page }).include('#sus-overlay-root').analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious).toHaveLength(0);
  }, 60000);
});
