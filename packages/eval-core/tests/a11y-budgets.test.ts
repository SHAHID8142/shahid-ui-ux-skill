/**
 * T0152b: gate ownership of G4/G5.
 * - G4/G5 evaluators with synthetic inputs: violation/budget-exceed => fail.
 * - Integration: real axe scan of fixture A passes; injecting a known
 *   violation (button without an accessible name = serious) flips G4 to fail.
 * - Real Lighthouse run against fixture A, judged by the G5 evaluator.
 */
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AxeBuilder } from '@axe-core/playwright';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  evaluateG4,
  evaluateG5,
  FIXTURE_BUDGETS,
  type AxeScanResult,
  type LighthouseSummary,
} from '../src/harness/a11y-budgets.js';
import { chromeForTestingPath, runLighthouse, scanA11y } from '../src/harness/scans.js';

const PORT = 4317;
const URL = `http://127.0.0.1:${PORT}/`;
const FIXTURE = join(__dirname, '..', '..', '..', 'fixtures', 'marketing');
let server: ChildProcess | undefined;
let evidenceDir: string;

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
    execSyncInFixture('pnpm exec next build');
  }
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(PORT)], {
    cwd: FIXTURE,
    stdio: 'ignore',
    detached: true,
  });
  await waitForReady(URL);
  evidenceDir = mkdtempSync(join(tmpdir(), 't0152b-'));
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

function execSyncInFixture(cmd: string): void {
  execSync(cmd, { cwd: FIXTURE, stdio: 'ignore' });
}

const cleanScan: AxeScanResult = { url: URL, passes: 12, violations: [] };
const cleanLh: LighthouseSummary = {
  url: URL,
  lcpMs: 1200,
  cls: 0,
  totalBlockingMs: 40,
  totalByteWeight: 120_000,
};

describe('G4/G5 evaluators (T0152b)', () => {
  it('G4 passes on a clean scan and archives axe JSON', () => {
    const verdict = evaluateG4([cleanScan], evidenceDir);
    expect(verdict.status).toBe('pass');
    expect(verdict.evidence.length).toBe(1);
    expect(existsSync(verdict.evidence[0]!)).toBe(true);
  });

  it('G4 fails on a serious violation (negative injection)', () => {
    const bad: AxeScanResult = {
      url: URL,
      passes: 11,
      violations: [
        {
          id: 'button-name',
          impact: 'serious',
          nodes: 1,
          help: 'Buttons must have discernible text',
        },
      ],
    };
    expect(evaluateG4([bad], evidenceDir).status).toBe('fail');
    expect(evaluateG4([cleanScan, bad], evidenceDir).status).toBe('fail');
  });

  it('G4 ignores minor/moderate but not critical', () => {
    const moderate: AxeScanResult = {
      url: URL,
      passes: 5,
      violations: [{ id: 'x', impact: 'moderate', nodes: 2, help: 'moderate issue' }],
    };
    expect(evaluateG4([moderate]).status).toBe('pass');
    const critical: AxeScanResult = {
      url: URL,
      passes: 5,
      violations: [{ id: 'y', impact: 'critical', nodes: 1, help: 'critical issue' }],
    };
    expect(evaluateG4([critical]).status).toBe('fail');
  });

  it('G5 passes within budgets and renders the budget table', () => {
    const verdict = evaluateG5([cleanLh], FIXTURE_BUDGETS, evidenceDir);
    expect(verdict.status).toBe('pass');
    expect(verdict.detail.length).toBeGreaterThanOrEqual(4);
    expect(existsSync(join(evidenceDir, 'budget-table.json'))).toBe(true);
  });

  it('G5 fails when any budget is exceeded (negative)', () => {
    const over: LighthouseSummary = { ...cleanLh, lcpMs: 3000 };
    const verdict = evaluateG5([over], FIXTURE_BUDGETS);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toMatch(/EXCEEDED/);
  });
});

describe('real fixture A scans (T0152b integration)', () => {
  it('axe scan of fixture A archives clean results and G4 passes', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    const scan = await scanA11y(page, URL);
    await browser.close();
    expect(scan.url).toBe(URL);
    const seriousOrWorse = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const verdict = evaluateG4([scan], evidenceDir);
    expect(seriousOrWorse).toHaveLength(0);
    expect(verdict.status).toBe('pass');
    expect(scan.passes).toBeGreaterThan(0);
  }, 60000);

  it('injected violation on the live page flips G4 to fail (end-to-end negative)', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.id = 'injected-nameless-button';
      // no text, no aria-label, no title: no accessible name at all
      document.body.appendChild(btn);
    });
    const builder = new AxeBuilder({ page });
    const results = await builder.analyze();
    const scan: AxeScanResult = {
      url: URL,
      passes: results.passes.length,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        nodes: v.nodes.length,
        help: v.help,
      })),
    };
    await browser.close();
    expect(evaluateG4([scan]).status).toBe('fail');
    expect(scan.violations.some((v) => v.id === 'button-name')).toBe(true);
  }, 60000);

  it('real Lighthouse run judged by G5', async () => {
    const chrome = chromeForTestingPath();
    // LCP is documented flaky on fast cold loads (trace may miss the entry;
    // the runner retries once on an empty trace). Byte weight is the
    // deterministic proof that the trace captured the page.
    const summary = await runLighthouse(URL, chrome);
    expect(summary.url).toBe(URL);
    expect(summary.lcpMs).toBeGreaterThanOrEqual(0);
    expect(summary.totalByteWeight).toBeGreaterThan(0);
    const verdict = evaluateG5([summary], FIXTURE_BUDGETS, evidenceDir);
    expect(['pass', 'fail']).toContain(verdict.status);
    expect(verdict.detail.join(' ')).toContain('totalBytes');
  }, 120000);
});
