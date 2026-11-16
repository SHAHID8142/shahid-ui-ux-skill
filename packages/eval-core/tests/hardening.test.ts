/**
 * T0551: hardening matrix on fixture A — per-cell overflow/pass results in
 * the evidence shape; locale set prioritized per brief (recorded, not
 * universal).
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHardeningMatrix, type HardeningResult } from '../src/index.js';
// The gate that consumes this record lives in scripts/lib; importing it here binds
// producer to consumer so a shape drift cannot pass both sides separately.
import { evaluateZoom400 } from '../../../scripts/lib/gates/g7-reflow.mjs';

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
  });
  it('measures the 400% zoom equivalence as its own viewport, not the 320px column', () => {
    expect(result.zoom400).not.toBeNull();
    const zoom = result.zoom400;
    if (zoom === null) throw new Error('unreachable: asserted above');
    // 400% zoom on a 1280x1024 window: 320x256 CSS px, rasterised at dsf 4.
    expect(zoom.width).toBe(320);
    expect(zoom.height).toBe(256);
    expect(zoom.deviceScaleFactor).toBe(4);
    expect(zoom.overflow).toBe(false);
    expect(zoom.documentScrollWidth).toBeLessThanOrEqual(zoom.documentClientWidth);
    // The UA zoom setting and text-only zoom are still named as not driven.
    expect(result.zoomNote).toMatch(/400%-zoom equivalence measured/);
    expect(result.zoomNote).toMatch(/not-run/);
  });
  it('produces a zoom record the G7 evaluator accepts (producer/consumer contract)', () => {
    const verdict = evaluateZoom400(result.zoom400);
    expect(verdict.status).toBe('pass');
    expect(verdict.detail).toMatch(/400%-zoom equivalence measured/);
  });
});

/**
 * Negative control for the zoom measurement: the record must follow the page.
 * A 900 px block in a 320 px viewport has to be recorded as overflow, otherwise
 * the "measured" zoom half is decoration.
 */
describe('zoom400 record reflects the page (negative control)', () => {
  it('records horizontal overflow at 320x256 when the page needs it', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<!doctype html><html><head><title>wide</title></head><body style="margin:0">' +
          '<div style="width:900px;height:120px;background:#111"></div></body></html>',
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const result = await runHardeningMatrix(`http://127.0.0.1:${port}/`);
      expect(result.zoom400).not.toBeNull();
      const zoom = result.zoom400;
      if (zoom === null) throw new Error('unreachable: asserted above');
      expect(zoom.overflow).toBe(true);
      expect(zoom.documentScrollWidth).toBeGreaterThan(zoom.documentClientWidth);
      expect(result.failures.some((f) => f.startsWith('zoom400/'))).toBe(true);
      expect(evaluateZoom400(zoom).status).toBe('fail');
    } finally {
      server.close();
    }
  }, 120000);
});
