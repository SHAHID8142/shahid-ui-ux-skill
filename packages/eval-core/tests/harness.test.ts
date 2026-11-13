/**
 * T0152: run the capture harness against fixture A served locally.
 * Builds the fixture if needed, starts `next start`, captures the full
 * 3-viewport × 2-theme matrix, asserts JSON metrics and evidence files.
 * This is the task's prescribed test: "run on fixture A; assert JSON metrics".
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureMatrix, THEMES, VIEWPORTS, type CaptureResult } from '../src/index.js';

const PORT = 4317;
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'marketing');

let server: ChildProcess | undefined;
let result: CaptureResult;
let outDir: string;

async function waitForReady(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`fixture server not ready at ${url}`);
}

beforeAll(async () => {
  if (!existsSync(join(FIXTURE, '.next', 'BUILD_ID'))) {
    execSyncInFixture('pnpm exec next build');
  }
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: FIXTURE,
    stdio: 'ignore',
    detached: true,
  });
  await waitForReady(URL);
  outDir = mkdtempSync(join(tmpdir(), 't0152-'));
  result = await captureMatrix(URL, outDir);
}, 120000);

afterAll(() => {
  if (server?.pid) {
    try {
      process.kill(-server.pid);
    } catch {
      /* already gone */
    }
  }
});

function execSyncInFixture(cmd: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- setup-only
  const { execSync } = require('node:child_process') as typeof import('node:child_process');
  execSync(cmd, { cwd: FIXTURE, stdio: 'ignore' });
}

describe('capture harness on fixture A (T0152)', () => {
  it('captures the full 3-viewport × 2-theme matrix deterministically', () => {
    expect(result.combos).toHaveLength(6);
    const names = result.combos.map((c) => `${c.viewport}-${c.theme}`);
    for (const v of Object.keys(VIEWPORTS)) {
      for (const t of THEMES) expect(names).toContain(`${v}-${t}`);
    }
    for (const combo of result.combos) {
      expect(existsSync(combo.screenshot), combo.screenshot).toBe(true);
    }
  });

  it('emits G7/G8-relevant JSON metrics per combo', () => {
    for (const combo of result.combos) {
      const m = combo.metrics;
      expect(typeof m.horizontalOverflow).toBe('boolean');
      expect(m.cls).toBeGreaterThanOrEqual(0);
      expect(m.lcpMs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(m.smallTapTargets)).toBe(true);
      expect(Array.isArray(m.landmarks)).toBe(true);
      expect(Array.isArray(m.headings)).toBe(true);
    }
  });

  it('fixture A has no horizontal overflow and stable layout', () => {
    for (const combo of result.combos) {
      expect(combo.metrics.horizontalOverflow, `${combo.viewport}-${combo.theme}`).toBe(false);
      expect(combo.metrics.cls).toBeLessThan(0.1);
    }
  });

  it('records the six landmark sections in desktop metrics', () => {
    const desktop = result.combos.find((c) => c.viewport === 'desktop' && c.theme === 'light');
    expect(desktop).toBeDefined();
    for (const id of ['navbar', 'hero', 'features', 'social-proof', 'cta', 'footer']) {
      expect(desktop?.metrics.landmarks.join(' ')).toContain(id);
    }
  });

  it('writes capture.json evidence with the full matrix', () => {
    expect(existsSync(join(result.outDir, 'capture.json'))).toBe(true);
  });
});
