/**
 * T0702: CDP attach + overlay injection — loads without app modification,
 * isolated-world state invisible to the hostile page, reconnect after
 * restart, keyboard-navigable + axe-clean overlay (kilo H3: a11y not deferred).
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CdpOverlay, type AttachResult } from '../src/cdp.js';

const PORT = 4341; // dedicated: no collision with eval-core suites
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'commerce'); // Astro stack per T0700 ladder

let server: ChildProcess | undefined;
let browser: Browser;
let page: Page;
let attachResult: AttachResult;

async function waitForReady(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`preview server not ready at ${url}`);
}

beforeAll(async () => {
  if (!existsSync(join(FIXTURE, 'dist', 'index.html'))) {
    execSync('pnpm exec astro build', { cwd: FIXTURE, stdio: 'ignore' });
  }
  server = spawn(
    'pnpm',
    ['exec', 'astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
    {
      cwd: FIXTURE,
      stdio: 'ignore',
      detached: true,
    },
  );
  await waitForReady(URL);
  const overlay = new CdpOverlay();
  const launched = await overlay.launchAndAttach(URL);
  browser = launched.browser;
  page = launched.page;
  attachResult = launched.result;
  // keep a handle alive for the tests: re-attach through a module-level instance
  attachHandle = overlay;
}, 120000);

let attachHandle: CdpOverlay;

afterAll(async () => {
  await browser?.close();
  if (server?.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* gone */
    }
  }
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
