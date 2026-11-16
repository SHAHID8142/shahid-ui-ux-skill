/**
 * Issue #18 — the audit authorised the first URL and then followed redirects anywhere.
 *
 * These tests are the proof the fix asks for: two origins, one authorised; the authorised one
 * redirects to the other, and the audit must refuse instead of fetching it. Nothing here claims to
 * prove an exploit existed — it proves the boundary is now enforced per hop, for the HTTP path and
 * for browser document navigations.
 */
import { createServer, type Server } from 'node:http';
import { existsSync, mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAudit } from '../src/audit/pipeline.js';
import {
  MAX_REDIRECT_HOPS,
  followAuthorized,
  launchGuardedBrowser,
} from '../src/harness/net-guard.js';

interface Origin {
  server: Server;
  url: string;
  hits: string[];
  close: () => Promise<void>;
}

async function startOrigin(
  handler: (path: string, res: import('node:http').ServerResponse) => void,
): Promise<Origin> {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    hits.push(req.url ?? '/');
    handler(req.url ?? '/', res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
    hits,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

function page(body: string): (path: string, res: import('node:http').ServerResponse) => void {
  return (_path, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  };
}

describe('redirect policy (unit)', () => {
  const response = (status: number, location?: string) =>
    ({
      status,
      headers: { get: (name: string) => (name === 'location' ? (location ?? null) : null) },
    }) as unknown as Response;

  it('follows a redirect inside the allowlist and reports the chain', async () => {
    const seen: string[] = [];
    const result = await followAuthorized(
      'https://allowed.example/a',
      ['allowed.example'],
      async (url) => {
        seen.push(url);
        return url.endsWith('/a') ? response(302, '/b') : response(200);
      },
    );
    expect(result.url).toBe('https://allowed.example/b');
    expect(result.chain).toEqual(['https://allowed.example/a', 'https://allowed.example/b']);
    expect(seen).toEqual(['https://allowed.example/a', 'https://allowed.example/b']);
  });

  it('refuses an off-allowlist hop before it is fetched', async () => {
    const fetched: string[] = [];
    await expect(
      followAuthorized('https://allowed.example/a', ['allowed.example'], async (url) => {
        fetched.push(url);
        return response(302, 'https://private.example/secret');
      }),
    ).rejects.toThrow(/refusing redirect to unauthorized host "private\.example"/);
    // The proof that matters: the unauthorised origin was never requested.
    expect(fetched).toEqual(['https://allowed.example/a']);
  });

  it('refuses a redirect into a private range address', async () => {
    await expect(
      followAuthorized('https://allowed.example/a', ['allowed.example'], async () =>
        response(302, 'http://169.254.169.254/latest/meta-data/'),
      ),
    ).rejects.toThrow(/refusing redirect to unauthorized host "169\.254\.169\.254"/);
  });

  it('refuses a credential-bearing redirect and a non-http scheme', async () => {
    await expect(
      followAuthorized('https://allowed.example/a', ['allowed.example'], async () =>
        response(302, 'https://user:pw@allowed.example/b'),
      ),
    ).rejects.toThrow(/unauthorized host/);
    await expect(
      followAuthorized('https://allowed.example/a', ['allowed.example'], async () =>
        response(302, 'file:///etc/passwd'),
      ),
    ).rejects.toThrow(/unauthorized host/);
  });

  it('refuses a redirect chain longer than the cap, naming it as a possible loop', async () => {
    const fetched: string[] = [];
    await expect(
      followAuthorized('https://loop.example/a', ['loop.example'], async (url) => {
        fetched.push(url);
        return response(302, '/next');
      }),
    ).rejects.toThrow(new RegExp(`longer than ${MAX_REDIRECT_HOPS} hops`));
    expect(fetched.length).toBeLessThanOrEqual(MAX_REDIRECT_HOPS + 1);
  });
});

describe('redirect policy (real servers)', () => {
  let allowed: Origin;
  let outside: Origin;

  beforeAll(async () => {
    allowed = await startOrigin(page('<!doctype html><title>allowed</title><p>ok</p>'));
    outside = await startOrigin(
      page('<!doctype html><title>outside</title><p>should not be read</p>'),
    );
  });

  afterAll(async () => {
    await allowed.close();
    await outside.close();
  });

  it('still audits a loopback redirect, because loopback is authorised by default', async () => {
    const redirecting = await startOrigin((_path, res) => {
      res.writeHead(302, { location: allowed.url + '/' });
      res.end();
    });
    try {
      const out = mkdtempSync(join(tmpdir(), 'sus-redirect-ok-'));
      const run = await runAudit({
        target: redirecting.url,
        liveUrl: null,
        mode: 'quick',
        outDir: out,
        routes: null,
        authorizedHosts: [],
        fixPlan: false,
      });
      expect(run.report.target.routes).toContain('/');
    } finally {
      await redirecting.close();
    }
  }, 60000);

  it('refuses a redirect to a host the operator did not authorise', async () => {
    // `.invalid` never resolves: the point is that the refusal happens before any request is made.
    const redirecting = await startOrigin((_path, res) => {
      res.writeHead(302, { location: 'http://unauthorized.invalid/audit-me' });
      res.end();
    });
    try {
      const out = mkdtempSync(join(tmpdir(), 'sus-redirect-bad-'));
      await expect(
        runAudit({
          target: redirecting.url,
          liveUrl: null,
          mode: 'quick',
          outDir: out,
          routes: null,
          authorizedHosts: [],
          fixPlan: false,
        }),
      ).rejects.toThrow(/refusing redirect to unauthorized host "unauthorized\.invalid"/);
      // Fail closed: no report is written for a target the audit refused to follow.
      expect(existsSync(join(out, 'audit.json'))).toBe(false);
    } finally {
      await redirecting.close();
    }
  }, 60000);

  it('blocks an unauthorised redirect hop in the browser through the proxy', async () => {
    const redirecting = await startOrigin((_path, res) => {
      res.writeHead(302, { location: 'http://blocked.invalid/' });
      res.end();
    });
    const guarded = await launchGuardedBrowser([]);
    try {
      const context = await guarded.browser.newContext();
      const tab = await context.newPage();
      // The proxy answers the hop with 403, so the browser never receives the blocked page: what
      // renders is the refusal. Chromium keeps the refused URL in the address bar, so the body and
      // the refusal log are the evidence, not `page.url()`.
      const response = await tab.goto(redirecting.url, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(403);
      expect(guarded.proxy.refused()).toContain('blocked.invalid');
      expect(await tab.content()).toContain('is not authorized');
      await context.close();
    } finally {
      await guarded.close();
      await redirecting.close();
    }
  }, 90000);

  it('lets an authorised browser navigation through the proxy', async () => {
    const guarded = await launchGuardedBrowser([]);
    try {
      const context = await guarded.browser.newContext();
      const tab = await context.newPage();
      const response = await tab.goto(allowed.url, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      expect(guarded.proxy.refused()).toEqual([]);
      expect(await tab.title()).toBe('allowed');
      await context.close();
    } finally {
      await guarded.close();
    }
  }, 90000);
});
