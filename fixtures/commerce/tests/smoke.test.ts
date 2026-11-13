/**
 * Fixture B smoke (T0102b): built Astro output serves and exposes the
 * commerce landmarks. Runs against `astro preview`.
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = 4341;
const baseUrl = `http://127.0.0.1:${PORT}/`;
const FIXTURE = new URL('..', import.meta.url).pathname;
const LANDMARKS = [
  'site-header',
  'product-grid',
  'product-detail',
  'cart-summary',
  'checkout-steps',
  'site-footer',
];

let server: ChildProcess | undefined;

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
  execSync('pnpm exec astro build', { cwd: FIXTURE, stdio: 'ignore' });
  server = spawn(
    'pnpm',
    ['exec', 'astro', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
    {
      cwd: FIXTURE,
      stdio: 'ignore',
      detached: true,
    },
  );
  await waitForReady(baseUrl);
}, 120000);

afterAll(() => {
  if (server?.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* gone */
    }
  }
});

describe('fixture B (commerce, Astro)', () => {
  let html: string;

  beforeAll(async () => {
    html = await (await fetch(baseUrl)).text();
  });

  it('serves the storefront with all six landmarks', () => {
    for (const id of LANDMARKS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('renders six synthetic products with prices', () => {
    expect((html.match(/class="card"/g) ?? []).length).toBe(6);
    expect(html).toContain('$42.00');
  });

  it('contains no external URLs and no scripts', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script');
  });
});
