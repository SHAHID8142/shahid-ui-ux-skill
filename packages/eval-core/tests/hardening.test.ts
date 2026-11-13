/**
 * T0551: hardening matrix on fixture A — per-cell overflow/pass results in
 * the evidence shape; locale set prioritized per brief (recorded, not
 * universal).
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHardeningMatrix, type HardeningResult } from '../src/index.js';

const PORT = 4331;
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'marketing');
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
  throw new Error(`fixture server not ready at ${url}`);
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

describe('hardening matrix (T0551)', () => {
  let result: HardeningResult;
  it('runs 12 cells (3 viewports incl. 320px × 2 themes × reduced-motion)', async () => {
    result = await runHardeningMatrix(URL, [
      'en',
      'bn (per-brief: shaping/fallback fonts, segmented input)',
    ]);
    expect(result.cells).toHaveLength(12);
    const vp = new Set(result.cells.map((c) => c.viewport));
    expect(vp.has('mobile-320')).toBe(true);
  }, 180000);
  it('fixture A passes every cell (no overflow, G7 precursor)', () => {
    expect(result.failures).toEqual([]);
    expect(result.cells.every((c) => c.pass)).toBe(true);
  });
  it('records the locale set per brief, not a universal claim', () => {
    expect(result.localeSet.length).toBeGreaterThan(0);
    expect(result.localeSet.join(' ')).toMatch(/per-brief/);
    expect(result.zoomNote).toMatch(/not-run/);
  });
});
