/**
 * Fixture D smoke (T0102b): portfolio + Read/docs route landmarks,
 * long-heading/anchor/code/table structure, localization stub.
 */
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PORT = 4342;
const baseUrl = `http://127.0.0.1:${PORT}/`;
const FIXTURE = new URL('..', import.meta.url).pathname;
const LANDMARKS = [
  'portfolio-nav',
  'case-grid',
  'docs-article',
  'docs-toc',
  'docs-search',
  'portfolio-footer',
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

describe('fixture D (portfolio + docs, Astro)', () => {
  let html: string;

  beforeAll(async () => {
    html = await (await fetch(baseUrl)).text();
  });

  it('serves all six landmarks', () => {
    for (const id of LANDMARKS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('Read/docs route: anchors, TOC links, code block, scrollable table, lang stub', () => {
    for (const id of ['docs-why', 'docs-structure', 'docs-code-tables']) {
      expect(html).toContain(`id="${id}"`); // anchors exist
      expect(html).toContain(`href="#${id}"`); // TOC links to them
    }
    expect(html).toContain('<code'); // code block present
    expect(html).toContain('role="region"'); // scrollable table region
    expect(html).toContain('lang="de"'); // localization stub
    expect(html).toContain('lang="en"'); // document language set
  });

  it('no external URLs; styles are rem/percent based (zoom-safe)', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('font-size: 16px'); // rem policy, not px
  });
});
