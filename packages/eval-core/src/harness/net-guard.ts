/**
 * Network-permission guard for the audit (issue #18).
 *
 * The audit authorises a target *before* it fetches: `assertAuthorizedUrl` checks the initial
 * `--url`/`--path` origin against loopback or the `--authorize` allowlist. That check said nothing
 * about where the request *ended up*: `fetch(url, { redirect: 'follow' })` follows a 30x to any
 * host, and a browser page follows redirects and subresource requests on its own. A server the
 * operator authorised could therefore make the audit request a different origin — including a
 * private address — without the operator authorising it.
 *
 * This module makes the boundary explicit and fail-closed:
 *  - HTTP fetches follow redirects **manually**, one hop at a time, and every hop must pass the same
 *    allowlist; the chain is capped so a redirect loop cannot hang the audit.
 *  - Browser *document* navigations are blocked unless the destination host is authorised. Non-document
 *    subresources (fonts, images, scripts) are allowed, because blocking them would change what is
 *    being measured. That is a stated limitation, printed in the report's limitations rather than
 *    hidden: the tool constrains which documents it will audit, not every byte a page pulls.
 */
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import { isAuthorizedUrl } from '../audit/contract.js';
import { startAuthorizedProxy, type AuthorizedProxy } from './authorized-proxy.js';

/** A refusal is a policy decision: the audit stops instead of measuring a half-authorised page. */
export class AuthorizationRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationRefusedError';
  }
}

export function isAuthorizationRefused(error: unknown): error is AuthorizationRefusedError {
  return error instanceof AuthorizationRefusedError;
}

/** A redirect chain longer than this is a loop or an open redirect chain; both are refused. */
export const MAX_REDIRECT_HOPS = 5;

export interface AuthorizedFetchResult {
  readonly url: string;
  readonly response: Response;
  /** Each hop that was followed, ending with the final URL. */
  readonly chain: readonly string[];
}

export type FetchLike = (
  url: string,
  init?: { redirect?: 'manual' | 'follow' | 'error' },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
}>;

function locationOf(response: AuthorizedFetchResult['response']): string | null {
  const value = response.headers.get('location');
  return value === null || value.trim().length === 0 ? null : value;
}

/**
 * Fetch a URL, following redirects only while every hop is authorised.
 *
 * Throws (rather than returning a partial result) when a hop is off-allowlist: an audit that
 * silently stops at the authorised hop would report on a page the operator did not ask for.
 */
export async function followAuthorized(
  raw: string,
  authorizedHosts: readonly string[],
  fetchImpl: (url: string, init: { redirect: 'manual' }) => Promise<Response> = (url, init) =>
    fetch(url, init),
): Promise<AuthorizedFetchResult> {
  const chain: string[] = [];
  let current = new URL(raw);
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    if (!isAuthorizedUrl(current, authorizedHosts)) {
      throw new AuthorizationRefusedError(
        'refusing redirect to unauthorized host "' +
          current.hostname +
          '"' +
          (chain.length === 0 ? '' : ' (chain: ' + [...chain, current.href].join(' → ') + ')') +
          ': pass --authorize ' +
          current.hostname +
          ' to accept it explicitly',
      );
    }
    chain.push(current.href);
    const response = await fetchImpl(current.href, { redirect: 'manual' });
    const isRedirect = response.status >= 300 && response.status < 400;
    const location = locationOf(response as unknown as AuthorizedFetchResult['response']);
    if (!isRedirect || location === null) {
      return { url: current.href, response, chain };
    }
    // Resolve relative Location headers against the hop that produced them, as a browser does.
    current = new URL(location, current);
    if (hop === MAX_REDIRECT_HOPS) {
      throw new AuthorizationRefusedError(
        'refusing redirect chain longer than ' +
          MAX_REDIRECT_HOPS +
          ' hops (possible loop): ' +
          [...chain, current.href].join(' → '),
      );
    }
  }
  // Unreachable: the loop either returns or throws on the last iteration.
  throw new Error('redirect follow failed');
}

export interface NavigationGuard {
  /** The URLs this guard blocked, newest last. Empty when nothing was refused. */
  blocked(): readonly string[];
  /** Assert the page really ended up on an authorised URL. */
  assertOnAuthorizedPage(page: Page): void;
  dispose(): Promise<void>;
}

/**
 * Constrain a page's document navigations to authorised hosts.
 *
 * Playwright gives no "same request, extra check" hook beyond routing, so the guard intercepts only
 * navigation requests and lets subresources through; anything refused is recorded so the report can
 * say it happened instead of pretending the page loaded cleanly.
 */
export async function guardNavigations(
  page: Page,
  authorizedHosts: readonly string[],
): Promise<NavigationGuard> {
  const refused: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!request.isNavigationRequest()) {
      await route.continue();
      return;
    }
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      refused.push(request.url());
      await route.abort('blockedbyclient');
      return;
    }
    // `about:blank` and `file://` are local: the target itself is checked before the guard exists.
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      await route.continue();
      return;
    }
    if (!isAuthorizedUrl(url, authorizedHosts)) {
      refused.push(request.url());
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  return {
    blocked: () => [...refused],
    assertOnAuthorizedPage: (target: Page) => {
      const finalUrl = target.url();
      let parsed: URL;
      try {
        parsed = new URL(finalUrl);
      } catch {
        throw new Error('the page never navigated (final URL: ' + finalUrl + ')');
      }
      if (parsed.protocol === 'about:' || parsed.protocol === 'file:') return;
      if (!isAuthorizedUrl(parsed, authorizedHosts)) {
        throw new Error(
          'page ended on unauthorized host "' +
            parsed.hostname +
            '" after redirect: pass --authorize ' +
            parsed.hostname +
            ' to accept it explicitly',
        );
      }
    },
    dispose: () => page.unroute('**/*'),
  };
}

export interface GuardedBrowser {
  readonly browser: Browser;
  readonly proxy: AuthorizedProxy;
  close(): Promise<void>;
}

/**
 * Launch Chromium with every request routed through the allowlisting proxy.
 *
 * `--proxy-bypass-list=<-loopback>` is required: Chromium otherwise bypasses proxies for loopback
 * targets, which would leave the one target class the audit uses most unguarded.
 */
export async function launchGuardedBrowser(
  authorizedHosts: readonly string[],
): Promise<GuardedBrowser> {
  const proxy = await startAuthorizedProxy(authorizedHosts);
  const browser = await chromium.launch({
    proxy: { server: proxy.server, bypass: '' },
    args: ['--proxy-bypass-list=<-loopback>'],
  });
  return {
    browser,
    proxy,
    close: async () => {
      await browser.close();
      await proxy.close();
    },
  };
}
