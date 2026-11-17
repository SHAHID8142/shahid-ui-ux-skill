/**
 * T1046 — the Lighthouse Chrome launches behind the allowlisting proxy when the audit asks it to.
 *
 * Audit finding T1003-1: the deep-mode Lighthouse Chrome was launched by chrome-launcher with no
 * proxy and no guard, so a hostile page's subresources and script-initiated requests reached
 * unauthorized hosts directly during exactly one phase. These unit tests pin the launch-flag
 * wiring; the real-Chrome end-to-end refusal lives in `net-guard.test.ts` (this file's mocks are
 * file-scoped and would leak into a real browser run here).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runLighthouse } from '../src/harness/scans.js';

describe('lighthouse launch flags (unit, mocked chrome-launcher)', () => {
  const { launchCalls } = vi.hoisted(() => ({ launchCalls: [] as string[][] }));
  vi.mock('chrome-launcher', () => ({
    launch: async (options: { chromeFlags?: string[] }) => {
      launchCalls.push(options.chromeFlags ?? []);
      return { port: 0, kill: async () => {} };
    },
    getChromePath: () => '/mock/chrome-for-testing',
  }));
  vi.mock('lighthouse', () => ({
    default: async () => ({
      lhr: {
        audits: {
          'total-byte-weight': { numericValue: 1234 },
          'largest-contentful-paint': { numericValue: 42 },
        },
      },
    }),
  }));

  afterEach(() => {
    launchCalls.length = 0;
    vi.clearAllMocks();
  });

  it('adds the proxy server and the loopback bypass flag when a proxy is given', async () => {
    await runLighthouse('http://127.0.0.1:1/', '/mock/chrome', {
      proxyUrl: 'http://127.0.0.1:3999',
    });
    const flags = launchCalls.at(-1) ?? [];
    expect(flags).toContain('--proxy-server=http://127.0.0.1:3999');
    expect(flags).toContain('--proxy-bypass-list=<-loopback>');
  });

  it('launches without proxy flags when no proxy is given (standalone runs are unchanged)', async () => {
    await runLighthouse('http://127.0.0.1:1/', '/mock/chrome');
    const flags = launchCalls.at(-1) ?? [];
    expect(flags.join(' ')).not.toContain('--proxy-server');
  });
});
