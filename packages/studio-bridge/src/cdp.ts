/**
 * CDP attach + trusted overlay injection (T0702, ADR-003).
 *
 * The overlay runs in an ISOLATED WORLD: it shares the page DOM (so it can
 * draw over the app) but its JavaScript state — bridge token, handlers,
 * selection bookkeeping — is invisible to the page's main world. A hostile
 * inspected page cannot read bridge internals or spoof bridge state.
 *
 * Reconnect: attachOverlay re-attaches cleanly after navigation/dev-server
 * restarts (registerOnNewDocument re-injects on every new document).
 *
 * No app modification: injection is via CDP only; the fixture/app needs no
 * code changes for the overlay to load.
 */
import { chromium, type Browser, type CDPSession, type Page } from 'playwright';

const OVERLAY_SCRIPT = `
(() => {
  if (window.__susBridge) return; // idempotent re-injection
  const root = document.createElement('div');
  root.id = 'sus-overlay-root';
  root.setAttribute('data-sus-overlay', 'true');
  // trusted overlay chrome: keyboard navigable (kilo H3 — not deferred)
  root.innerHTML = [
    '<div role="toolbar" aria-label="SUS Live Studio overlay" tabindex="0" id="sus-overlay-toolbar">',
    '<button type="button" id="sus-overlay-select" aria-pressed="false">Select</button>',
    '<button type="button" id="sus-overlay-annotate" aria-pressed="false">Annotate</button>',
    '<span id="sus-overlay-status" role="status" aria-live="polite"></span>',
    '</div>',
  ].join('');
  const style = document.createElement('style');
  style.textContent = [
    '#sus-overlay-root { position: fixed; inset: auto 0 0 0; z-index: 2147483000; }',
    '#sus-overlay-toolbar { display: flex; gap: 8px; padding: 8px; background: rgba(20,22,26,0.92); }',
    '#sus-overlay-toolbar button { min-width: 44px; min-height: 24px; color: #e8eaf0; background: transparent; border: 1px solid #565d68; }',
    '#sus-overlay-toolbar button[aria-pressed="true"] { outline: 2px solid #8ab4ff; }',
    '#sus-overlay-toolbar button:focus-visible { outline: 2px solid #8ab4ff; outline-offset: 2px; }',
  ].join('');
  document.documentElement.appendChild(style);
  document.body.appendChild(root);

  // Bridge state lives ONLY in this isolated world:
  window.__susBridge = {
    world: 'isolated',
    activeTool: null,
    select() { window.__susBridge.activeTool = 'select'; },
    annotate() { window.__susBridge.activeTool = 'annotate'; },
    status() { return window.__susBridge.activeTool; },
  };
})();
`;

export interface AttachResult {
  attached: boolean;
  /** True when the isolated world sees bridge state. */
  isolatedWorldOk: boolean;
  /** True when the page MAIN world cannot see bridge state (hostile-page guard). */
  mainWorldIsolated: boolean;
  overlayPresent: boolean;
}

export class CdpOverlay {
  private browser: Browser | null = null;
  private session: CDPSession | null = null;

  private page: Page | null = null;
  private loadHandler: (() => void) | null = null;

  /** Injects the overlay into a fresh isolated world for the current document. */
  private lastWorldContextId: number | null = null;

  private async injectIntoFreshWorld(): Promise<void> {
    if (!this.session || !this.page) return;
    const world = await this.session.send('Page.createIsolatedWorld', {
      frameId: (await this.session.send('Page.getFrameTree')).frameTree.frame.id,
      worldName: 'sus-bridge-isolated',
    });
    this.lastWorldContextId = world.executionContextId;
    await this.session.send('Runtime.evaluate', {
      expression: OVERLAY_SCRIPT,
      contextId: world.executionContextId,
    });
  }

  async attach(page: Page): Promise<AttachResult> {
    this.page = page;
    this.session = await page.context().newCDPSession(page);
    await this.session.send('Page.enable');
    // belt: register for new documents...
    await this.session.send('Page.addScriptToEvaluateOnNewDocument', {
      source: OVERLAY_SCRIPT,
      worldName: 'sus-bridge-isolated',
    });
    // ...and braces: explicit re-injection on every load (reconnect semantics
    // — survives dev-server restarts/navigations even where worldName replay
    // is unreliable)
    this.loadHandler = () => {
      void this.injectIntoFreshWorld();
    };
    page.on('load', this.loadHandler);
    await this.injectIntoFreshWorld();

    const isolatedWorldOk = await this.session.send('Runtime.evaluate', {
      expression: 'typeof window.__susBridge === "object" && window.__susBridge.world',
      contextId: this.lastWorldContextId!,
      returnByValue: true,
    });
    const mainWorld = await page.evaluate(
      'typeof window.__susBridge === "undefined" ? "isolated-from-main" : "LEAKED"',
    );
    const overlayPresent = await page.evaluate(
      () => document.getElementById('sus-overlay-root') !== null,
    );
    return {
      attached: true,
      isolatedWorldOk: isolatedWorldOk.result.value === 'isolated',
      mainWorldIsolated: mainWorld === 'isolated-from-main',
      overlayPresent,
    };
  }

  /** Launches a dedicated browser with CDP access for the studio session. */
  async launchAndAttach(
    url: string,
  ): Promise<{ browser: Browser; page: Page; result: AttachResult }> {
    this.browser = await chromium.launch();
    // explicit context: required by @axe-core/playwright on the same page and
    // keeps the attach/audit path on one page instance
    const context = await this.browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    const result = await this.attach(page);
    return { browser: this.browser, page, result };
  }

  async dispose(): Promise<void> {
    if (this.page && this.loadHandler) this.page.off('load', this.loadHandler);
    await this.browser?.close();
    this.browser = null;
    this.session = null;
    this.page = null;
    this.loadHandler = null;
  }
}
