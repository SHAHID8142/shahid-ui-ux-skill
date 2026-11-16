/**
 * T1019 — the keyboard traversal has to measure the page, not itself.
 *
 * Every case here is a real headless browser against a real page: a fixture that
 * paints a ring must be reported as painting one, a fixture that strips it must be
 * reported as missing, and a fixture whose focus vanishes must show a detour. Without
 * those negative controls a `pass` would only mean the scanner ran.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { KEYBOARD_MAX_STOPS, scanKeyboard } from '../src/harness/keyboard.js';

const RING = `<!doctype html><html><head><title>ring</title><style>
  :focus-visible { outline: 2px solid #0a0; outline-offset: 2px; }
</style></head><body>
  <a href="#one" id="one">one</a>
  <button id="two">two</button>
  <input id="three" />
</body></html>`;

const NO_RING = `<!doctype html><html><head><title>no ring</title><style>
  *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }
</style></head><body>
  <a href="#one" id="one">one</a>
  <button id="two">two</button>
</body></html>`;

const VANISHING = `<!doctype html><html><head><title>vanishing</title><style>
  :focus-visible { outline: 2px solid #0a0; }
</style></head><body>
  <a href="#one" id="one">one</a>
  <button id="two" onfocus="this.blur()">two</button>
  <button id="three">three</button>
</body></html>`;

const LOOPING = `<!doctype html><html><head><title>loop</title><style>
  :focus-visible { outline: 2px solid #0a0; }
</style></head><body>
  <button id="one">one</button>
  <button id="two">two</button>
  <script>
    // Focus re-asserted on every Tab: the shape of a modal trap, minus the Escape
    // path the check deliberately does not test.
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      document.getElementById('one').focus();
    });
  </script>
</body></html>`;

const PAGES: Record<string, string> = {
  '/ring': RING,
  '/no-ring': NO_RING,
  '/vanishing': VANISHING,
  '/looping': LOOPING,
};

let server: Server;
let origin: string;
let browser: Browser;

beforeAll(async () => {
  server = createServer((req, res) => {
    const html = PAGES[req.url ?? '/'];
    if (html === undefined) {
      res.writeHead(404).end('no');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' }).end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await chromium.launch();
}, 120000);

afterAll(async () => {
  await browser.close();
  server.close();
});

async function scan(path: string, maxStops = KEYBOARD_MAX_STOPS) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(origin + path, { waitUntil: 'load' });
    return await scanKeyboard(page, maxStops);
  } finally {
    await context.close();
  }
}

describe('scanKeyboard measures real traversal', () => {
  it('records the focus order and finds a visible ring', async () => {
    const result = await scan('/ring', 3);
    expect(result.stops.map((s) => s.tag)).toEqual(['a', 'button', 'input']);
    expect(result.stops.map((s) => s.selector)).toEqual(['a#one', 'button#two', 'input#three']);
    expect(result.indicatorMissing).toEqual([]);
    expect(result.stops.every((s) => s.indicator)).toBe(true);
    expect(result.detours).toBe(0);
    expect(result.cycle).toBeNull();
  }, 60000);

  it('reports every focusable element that paints no indicator', async () => {
    const result = await scan('/no-ring', 2);
    expect(result.stops).toHaveLength(2);
    expect(result.indicatorMissing).toEqual(['a#one', 'button#two']);
    expect(result.stops.every((s) => !s.indicator)).toBe(true);
  }, 60000);

  it('counts a detour only when focus vanishes while controls are unreached', async () => {
    const result = await scan('/vanishing', 4);
    expect(result.detours).toBeGreaterThan(0);
    expect(result.focusable).toBe(3);
    expect(result.stops.some((s) => s.tag === 'body')).toBe(true);
  }, 60000);

  it('does not call the end of the document a detour', async () => {
    // Three controls, ten presses: the traversal ends and wraps, which a naive
    // counter would report as seven detours and a cycle.
    const result = await scan('/ring', 10);
    expect(result.endReached).toBe(true);
    expect(result.detours).toBe(0);
    expect(result.cycle).toBeNull();
    expect(result.indicatorMissing).toEqual([]);
  }, 60000);

  it('records a repeated focus cycle without calling it a pass', async () => {
    const result = await scan('/looping', 4);
    expect(result.cycle).not.toBeNull();
    expect(result.cycle?.selector).toBe('button#one');
  }, 60000);

  it('is bounded: it presses Tab at most maxStops times', async () => {
    const result = await scan('/ring', 2);
    expect(result.stops).toHaveLength(2);
    expect(KEYBOARD_MAX_STOPS).toBe(30);
  }, 60000);
});
