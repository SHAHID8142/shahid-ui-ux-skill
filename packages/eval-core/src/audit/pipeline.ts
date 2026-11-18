/**
 * Read-only audit pipeline (T1012/T1013, issue #13).
 *
 * Everything with a side effect lives here: resolving the target, serving local
 * build output on a loopback port, driving the browser phases, reading sources.
 * The verdicts themselves are composed in compose.ts, which is pure.
 *
 * Read-only guarantees enforced by construction:
 *  - a local target is read, never written; the static server only answers GET;
 *  - every artifact is written under --out, never inside the target;
 *  - a fix is written to fix-plan.json as a proposal, never applied;
 *  - an unavailable browser or host degrades a check to not-run with a reason.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

import type { ScanResult } from '@sus/scanners';
import { scanText } from '@sus/scanners';
import type { AxeScanResult, LighthouseSummary } from '../harness/a11y-budgets.js';
import { captureMatrix, type CaptureResult } from '../harness/capture.js';
import { scanKeyboard, type KeyboardScanResult } from '../harness/keyboard.js';
import type { HardeningResult } from '../hardening.js';
import { runHardeningMatrix } from '../hardening.js';
import {
  followAuthorized,
  guardNavigations,
  isAuthorizationRefused,
  launchGuardedBrowser,
} from '../harness/net-guard.js';
import { onAnyRefusal, startAuthorizedProxy } from '../harness/authorized-proxy.js';
import { chromeForTestingPath, runLighthouse, scanA11y } from '../harness/scans.js';
import { probeMotionWith, type MotionProbeResult } from '../harness/motion.js';
import { probeStatesWith, type StatesProbeResult } from '../harness/states.js';
import type { AuditMode } from './contract.js';
import { AUDIT_OUTPUT_FILES, assertAuthorizedUrl, parseRoutes } from './contract.js';
import type { ArtifactRef, AuditInputs, LiveGroup, RouteHtml, SlopInput } from './compose.js';
import { buildEvidenceBundle, captureViewportName, composeReport, emptyGroup } from './compose.js';
import type { AuditFinding, AuditReport, AuditTarget } from './report.js';
import { exitCodeFor, renderAuditMarkdown } from './report.js';

const MAX_HTML_ROUTES = 50;
const MAX_SOURCE_FILES = 400;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git', '.turbo', 'coverage']);
const MAX_FETCH_BYTES = 4_000_000;

export interface AuditOptions {
  /** Exactly what the operator typed: a filesystem path or an http(s) URL. */
  readonly target: string;
  /**
   * Optional live origin for the browser phases. With --path, this lets the
   * audit measure an already-running server instead of serving the files itself.
   */
  readonly liveUrl?: string | null;
  readonly mode: AuditMode;
  /** Raw --routes value; null/undefined means the documented default. */
  readonly routes?: string | null;
  readonly outDir: string;
  /** Hosts the operator explicitly accepted with --authorize. */
  readonly authorizedHosts?: readonly string[];
  /** Write a remediation plan proposal next to the report (never applied). */
  readonly fixPlan?: boolean;
  /**
   * Element descriptors to scan with axe *inside* their own subtree (issue #21 R2 / #15).
   * Each selector is passed to axe's `include`, so a violation found this way belongs to that
   * element by construction; the page-wide scan is unchanged and still counts everything.
   */
  readonly scopeSelectors?: readonly ScopeSelector[];
}

/** A scope for the element-confined axe scan: what axe includes, and what the finding names. */
export interface ScopeSelector {
  /** CSS selector handed to axe's `include`; it must be a valid selector. */
  readonly selector: string;
  /** Element descriptor the finding is attributed to (the resolved target's own name). */
  readonly label: string;
}

export interface AuditRun {
  readonly report: AuditReport;
  readonly markdown: string;
  readonly target: AuditTarget;
  readonly exitCode: 0 | 1 | 3;
  readonly outDir: string;
  readonly reportPath: string;
  readonly markdownPath: string;
  readonly evidencePath: string | null;
  readonly fixPlanPath: string | null;
}

/**
 * A remediation proposal. It is data, not an action: nothing here is applied,
 * and every entry says what approval it needs before a human or agent may act.
 */
export interface FixPlanProposal {
  readonly finding: string;
  readonly severity: string;
  readonly effort: string;
  readonly route: string | null;
  readonly viewport: string | null;
  readonly action: string;
  readonly requiresApproval: true;
  readonly applied: false;
}

export interface FixPlan {
  readonly schemaVersion: 1;
  readonly command: 'sus-eval audit';
  readonly generatedAt: string;
  readonly target: AuditTarget;
  readonly proposals: readonly FixPlanProposal[];
  /** Why this file is not a change: stated in the artifact, not only in the docs. */
  readonly note: string;
}

function isUrlLike(raw: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
}

function walk(dir: string, visit: (file: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, visit);
      continue;
    }
    if (entry.isFile()) visit(full);
  }
}

/** Route for a built HTML file: index.html collapses to its directory. */
function routeForFile(root: string, file: string): string {
  const rel = relative(root, file).split(sep).join('/');
  const withoutIndex = rel === 'index.html' ? '' : rel.replace(/(^|\/)index\.html$/, '');
  const trimmed = withoutIndex.replace(/\/$/, '');
  return trimmed.length === 0 ? '/' : '/' + trimmed;
}

interface LocalSite {
  readonly root: string;
  readonly files: ReadonlyMap<string, string>;
}

function describeLocal(raw: string): LocalSite {
  const absolute = resolve(raw);
  if (!existsSync(absolute)) throw new Error('target path does not exist: ' + absolute);
  const stat = statSync(absolute);
  const root = stat.isDirectory() ? absolute : dirname(absolute);
  const files = new Map<string, string>();
  if (stat.isDirectory()) {
    walk(root, (file) => {
      if (files.size >= MAX_HTML_ROUTES) return;
      if (extname(file) !== '.html') return;
      const route = routeForFile(root, file);
      if (!files.has(route)) files.set(route, file);
    });
  } else {
    if (extname(absolute) !== '.html') {
      throw new Error('a local target file must be .html: ' + absolute);
    }
    files.set('/', absolute);
  }
  if (files.size === 0) {
    throw new Error(
      'no .html file found under ' + root + ' — point --target at a build output directory',
    );
  }
  return { root, files };
}

async function serveLocal(site: LocalSite): Promise<{ origin: string; close: () => void }> {
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    const pathname = decodeURIComponent((request.url ?? '/').split('?')[0] ?? '/');
    const route = pathname.endsWith('/') ? pathname.replace(/\/$/, '') : pathname;
    const key = route.length === 0 ? '/' : route;
    const file = site.files.get(key);
    if (file === undefined) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    try {
      const body = readFileSync(file);
      const type = extname(file) === '.html' ? 'text/html' : 'application/octet-stream';
      response.writeHead(200, { 'content-type': type }).end(body);
    } catch {
      response.writeHead(500, { 'content-type': 'text/plain' }).end('unreadable');
    }
  });
  // A Chromium teardown reset on a keep-alive socket is expected at the end of a run (T1061
  // follow-up): answer it instead of letting it surface as an uncaught ECONNRESET, and drop the
  // idle keep-alives on close so server.close() is not left waiting on them.
  server.on('clientError', (_error: Error, socket: import('node:net').Socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', done);
  });
  const address = server.address() as AddressInfo;
  return {
    origin: 'http://127.0.0.1:' + address.port,
    close: () => {
      server.closeAllConnections?.();
      server.close();
    },
  };
}

async function fetchHtml(
  url: string,
  authorizedHosts: readonly string[],
): Promise<{ html: string | null; reason?: string }> {
  try {
    // Redirects are followed here, not by fetch: every hop has to pass the same allowlist the
    // initial target did (issue #18). A server authorised for one origin could otherwise send the
    // audit to a private or unrelated host without the operator authorising it.
    const { response, url: finalUrl } = await followAuthorized(url, authorizedHosts);
    if (!response.ok) return { html: null, reason: 'HTTP ' + response.status };
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('html'))
      return { html: null, reason: 'not an HTML response (' + type + ')' };
    const text = await response.text();
    void finalUrl;
    // The cap is a BYTE cap, measured on the response's bytes — `text.length` counts UTF-16 code
    // units and would slice a multi-byte page mid-measurement while labelling the result with a
    // byte number it never measured (re-audit finding F11, the class T1003-19 fixed in the bridge).
    if (Buffer.byteLength(text) > MAX_FETCH_BYTES) {
      return {
        html: text.slice(0, MAX_FETCH_BYTES),
        reason: 'truncated at ' + MAX_FETCH_BYTES + ' bytes',
      };
    }
    return { html: text };
  } catch (error) {
    // An authorization refusal is not a fetch hiccup: it must stop the audit rather than turn one
    // check into `not-run` while the rest of the report describes a page nobody authorised.
    if (isAuthorizationRefused(error)) throw error;
    return { html: null, reason: 'fetch failed: ' + describeError(error) };
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message.split('\n')[0] ?? error.message;
  return String(error);
}

function routeUrl(base: string, route: string): string {
  return base.replace(/\/$/, '') + (route === '/' ? '/' : route);
}

async function collectCapture(
  origin: string,
  routes: readonly string[],
  shotsRoot: string,
  authorizedHosts: readonly string[],
): Promise<LiveGroup<CaptureResult>> {
  const samples: { route: string; value: CaptureResult }[] = [];
  const failed: { route: string; reason: string }[] = [];
  for (const route of routes) {
    try {
      const outDir = join(
        shotsRoot,
        route === '/' ? 'root' : route.replace(/^\//, '').replace(/\//g, '_'),
      );
      samples.push({
        route,
        value: await captureMatrix(routeUrl(origin, route), outDir, authorizedHosts),
      });
    } catch (error) {
      failed.push({ route, reason: describeError(error) });
    }
  }
  return { samples, failed, skipped: null };
}

async function collectReflow(
  origin: string,
  routes: readonly string[],
  authorizedHosts: readonly string[],
): Promise<LiveGroup<HardeningResult>> {
  const samples: { route: string; value: HardeningResult }[] = [];
  const failed: { route: string; reason: string }[] = [];
  for (const route of routes) {
    try {
      samples.push({
        route,
        value: await runHardeningMatrix(routeUrl(origin, route), ['en'], authorizedHosts),
      });
    } catch (error) {
      failed.push({ route, reason: describeError(error) });
    }
  }
  return { samples, failed, skipped: null };
}

async function collectScans(
  origin: string,
  routes: readonly string[],
  authorizedHosts: readonly string[],
  scopeSelectors: readonly ScopeSelector[],
): Promise<{
  axe: LiveGroup<AxeScanResult>;
  keyboard: LiveGroup<KeyboardScanResult>;
  lighthouse: LiveGroup<LighthouseSummary>;
  scopedAxe: LiveGroup<AxeScanResult>;
  browser: string | null;
  networkRefusals: string[];
}> {
  const axe: { route: string; value: AxeScanResult }[] = [];
  const keyboard: { route: string; value: KeyboardScanResult }[] = [];
  const lighthouse: { route: string; value: LighthouseSummary }[] = [];
  const axeFailed: { route: string; reason: string }[] = [];
  const keyboardFailed: { route: string; reason: string }[] = [];
  const lhFailed: { route: string; reason: string }[] = [];
  const scopedAxe: { route: string; value: AxeScanResult }[] = [];
  const scopedAxeFailed: { route: string; reason: string }[] = [];
  let browser: string | null = null;
  // T1052 (audit finding T1003-7): refusals the network boundary makes are evidence — a page
  // measured without its refused resources must say so instead of reading as a full page.
  const refusals: string[] = [];
  try {
    const guarded = await launchGuardedBrowser(authorizedHosts);
    const instance = guarded.browser;
    browser = instance.version();
    try {
      const context = await instance.newContext();
      const page = await context.newPage();
      const axeGuard = await guardNavigations(page, authorizedHosts);
      for (const route of routes) {
        try {
          axe.push({ route, value: await scanA11y(page, routeUrl(origin, route)) });
          axeGuard.assertOnAuthorizedPage(page);
        } catch (error) {
          axeFailed.push({ route, reason: describeError(error) });
        }
        // Scoped scans reuse the same loaded page. axe's `include` confines the analysis to the
        // element's subtree, which is what makes a scoped finding attributable instead of "somewhere
        // on the page" (issue #21 R2).
        for (const scope of scopeSelectors) {
          try {
            scopedAxe.push({
              route,
              value: await scanA11y(page, routeUrl(origin, route), {
                include: [scope.selector],
                scope: scope.label,
              }),
            });
          } catch (error) {
            scopedAxeFailed.push({ route, reason: scope.selector + ': ' + describeError(error) });
          }
        }
      }
      // Keyboard traversal gets its own page at the desktop anchor: Tab order is a
      // document property, so pressing it on the axe page would measure whatever
      // the scan left focused.
      const kbContext = await instance.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light',
      });
      const kbPage = await kbContext.newPage();
      const kbGuard = await guardNavigations(kbPage, authorizedHosts);
      for (const route of routes) {
        try {
          await kbPage.goto(routeUrl(origin, route), { waitUntil: 'networkidle' });
          kbGuard.assertOnAuthorizedPage(kbPage);
          keyboard.push({ route, value: await scanKeyboard(kbPage) });
        } catch (error) {
          keyboardFailed.push({ route, reason: describeError(error) });
        }
      }
      refusals.push(...kbGuard.blocked());
      await kbGuard.dispose();
      await kbContext.close();
      refusals.push(...axeGuard.blocked());
      await axeGuard.dispose();
      await context.close();
    } finally {
      refusals.push(...guarded.proxy.refused());
      await guarded.close();
    }
  } catch (error) {
    const reason = 'no browser: ' + describeError(error);
    for (const route of routes) {
      axeFailed.push({ route, reason });
      keyboardFailed.push({ route, reason });
    }
  }
  const chromePath = chromeForTestingPath();
  // T1046 (audit finding T1003-1): the performance phase launches its own Chrome through
  // chrome-launcher, which no playwright guard ever covered — the one phase a page could reach an
  // unauthorized host directly. It gets its own allowlisting proxy (the guarded browser's proxy
  // was closed with the guarded browser) held across every route, under the same policy every
  // other phase answers to: a host that is not authorized is refused and the refusal is recorded.
  try {
    const lighthouseProxy = await startAuthorizedProxy(authorizedHosts);
    try {
      for (const route of routes) {
        try {
          lighthouse.push({
            route,
            value: await runLighthouse(routeUrl(origin, route), chromePath, {
              proxyUrl: lighthouseProxy.server,
            }),
          });
        } catch (error) {
          lhFailed.push({ route, reason: describeError(error) });
        }
      }
      refusals.push(...lighthouseProxy.refused());
    } finally {
      await lighthouseProxy.close();
    }
  } catch (error) {
    // Fail-closed: without the proxy the phase does not run at all rather than run unguarded;
    // every route lands in `failed`, which keeps the lighthouse check out of `pass`.
    const reason = 'no network guard: ' + describeError(error);
    for (const route of routes) {
      lhFailed.push({ route, reason });
    }
  }
  return {
    axe: { samples: axe, failed: axeFailed, skipped: null },
    keyboard: { samples: keyboard, failed: keyboardFailed, skipped: null },
    lighthouse: { samples: lighthouse, failed: lhFailed, skipped: null },
    // An empty selector list means "no scoped scan was asked for", not "the scan was skipped".
    scopedAxe:
      scopeSelectors.length === 0
        ? { samples: [], failed: [], skipped: 'no scopes requested' }
        : { samples: scopedAxe, failed: scopedAxeFailed, skipped: null },
    browser,
    networkRefusals: refusals,
  };
}

function collectSlop(site: LocalSite | null): SlopInput {
  if (site === null) {
    return {
      results: [],
      reason: 'a remote target has no local sources to scan for anti-slop patterns',
    };
  }
  const results: ScanResult[] = [];
  walk(site.root, (file) => {
    if (results.length >= MAX_SOURCE_FILES) return;
    if (!SOURCE_EXTENSIONS.has(extname(file))) return;
    try {
      const text = readFileSync(file, 'utf8');
      results.push(scanText(text, relative(site.root, file).split(sep).join('/')));
    } catch {
      // unreadable file: skipped, not silently counted as clean
    }
  });
  if (results.length === 0) {
    return { results: [], reason: 'no scannable source file was found under ' + site.root };
  }
  return { results, reason: null };
}

function proposalFor(entry: AuditFinding): FixPlanProposal {
  return {
    finding: entry.id,
    severity: entry.severity,
    effort: entry.effort,
    route: entry.route,
    viewport: entry.viewport,
    action:
      (entry.effort === 'quick-win' ? 'Quick win: ' : 'Structural: ') +
      entry.detail +
      ' (rule ' +
      entry.check +
      ')',
    requiresApproval: true,
    applied: false,
  };
}

interface ResolvedTarget {
  readonly target: AuditTarget;
  readonly origin: string;
  readonly site: LocalSite | null;
  readonly close: () => void;
}

/**
 * Turn the operator's target into a base origin and the routes to measure.
 * A local path is served on a private loopback port unless --url names an
 * already-running origin; a remote target is only reachable when authorized.
 */
async function resolveTarget(options: AuditOptions): Promise<ResolvedTarget> {
  if (isUrlLike(options.target)) {
    const url = assertAuthorizedUrl(options.target, options.authorizedHosts ?? []);
    return {
      target: {
        kind: 'authorized-url',
        path: null,
        url: url.origin,
        routes: parseRoutes(options.routes),
      },
      origin: url.origin,
      site: null,
      close: () => {},
    };
  }

  const site = describeLocal(options.target);
  const liveUrl = options.liveUrl ?? null;
  const served = liveUrl === null ? await serveLocal(site) : null;
  const origin =
    served === null
      ? assertAuthorizedUrl(liveUrl ?? '', options.authorizedHosts ?? []).origin
      : served.origin;
  const close = (): void => {
    served?.close();
  };

  const explicit =
    options.routes !== undefined && options.routes !== null && options.routes.trim().length > 0;
  const requested = parseRoutes(options.routes);
  const available = [...site.files.keys()].sort();
  const routes = explicit ? requested : served === null ? ['/'] : available;

  if (explicit && served !== null) {
    const missing = requested.filter((route) => !site.files.has(route));
    if (missing.length > 0) {
      close();
      throw new Error('requested route(s) not found in ' + site.root + ': ' + missing.join(', '));
    }
  }
  if (routes.length === 0) {
    close();
    throw new Error('no route to audit under ' + site.root);
  }

  return {
    target: { kind: 'local-path', path: site.root, url: origin, routes },
    origin,
    site,
    close,
  };
}

interface MeasureRequest {
  readonly mode: AuditMode;
  readonly target: AuditTarget;
  readonly origin: string;
  readonly site: LocalSite | null;
  readonly outDir: string;
  readonly authorizedHosts: readonly string[];
  readonly scopeSelectors: readonly ScopeSelector[];
}

/** Collect every observation the composer needs; performs no writing of its own. */
async function measure(request: MeasureRequest): Promise<AuditInputs> {
  const { mode, origin, outDir, authorizedHosts, scopeSelectors } = request;
  const routes = request.target.routes;

  const html: RouteHtml[] = [];
  for (const route of routes) {
    const fetched = await fetchHtml(routeUrl(origin, route), authorizedHosts);
    // T1066 (audit finding T1003-22): the reason is carried even when the HTML is present — a
    // >4MB page is measured as a truncated prefix, and a truncated measurement must say so
    // instead of reading as a whole-page measurement.
    html.push({
      route,
      html: fetched.html,
      ...(fetched.reason === undefined ? {} : { reason: fetched.reason }),
    });
  }

  let capture: LiveGroup<CaptureResult>;
  let reflow: LiveGroup<HardeningResult>;
  let axe: LiveGroup<AxeScanResult>;
  let keyboard: LiveGroup<KeyboardScanResult>;
  let lighthouse: LiveGroup<LighthouseSummary>;
  let scopedAxe: LiveGroup<AxeScanResult>;
  let motion: LiveGroup<MotionProbeResult>;
  let states: LiveGroup<StatesProbeResult>;
  let browser: string | null = null;
  let networkRefusals: string[] = [];
  if (mode === 'quick') {
    const reason =
      'quick mode runs no browser phase: pass --mode deep for accessibility, reflow and performance';
    capture = emptyGroup<CaptureResult>(reason);
    reflow = emptyGroup<HardeningResult>(reason);
    axe = emptyGroup<AxeScanResult>(reason);
    keyboard = emptyGroup<KeyboardScanResult>(reason);
    lighthouse = emptyGroup<LighthouseSummary>(reason);
    scopedAxe = emptyGroup<AxeScanResult>(reason);
    motion = emptyGroup<MotionProbeResult>(reason);
    states = emptyGroup<StatesProbeResult>(reason);
  } else {
    // T1052 follow-up (re-audit finding F2): every proxy in EVERY phase records into the shared
    // sink, so a hostile subresource refused during capture, reflow, the scan phases, motion or
    // states surfaces exactly like one refused anywhere else. Unregistered in `finally`.
    const stopCollectingRefusals = onAnyRefusal((host) => networkRefusals.push(host));
    try {
      capture = await collectCapture(
        origin,
        routes,
        join(outDir, AUDIT_OUTPUT_FILES.shotsDir),
        authorizedHosts,
      );
      reflow = await collectReflow(origin, routes, authorizedHosts);
      const scans = await collectScans(origin, routes, authorizedHosts, scopeSelectors);
      axe = scans.axe;
      keyboard = scans.keyboard;
      lighthouse = scans.lighthouse;
      scopedAxe = scans.scopedAxe;
      motion = await collectMotion(origin, routes, authorizedHosts);
      states = await collectStates(origin, routes, authorizedHosts);
      browser = scans.browser;
      networkRefusals = scans.networkRefusals;
    } finally {
      stopCollectingRefusals();
    }
  }

  return {
    mode,
    target: request.target,
    generatedAt: new Date().toISOString(),
    provenance: {
      evaluator: 'sus-eval audit 1',
      node: process.version,
      platform: process.platform + '/' + process.arch,
      browser,
    },
    html,
    slop: collectSlop(request.site),
    capture,
    reflow,
    axe,
    keyboard,
    lighthouse,
    scopedAxe,
    motion,
    states,
    networkRefusals,
  };
}

/**
 * Motion is measured by driving one disclosure per route (issue #21 R7). It gets its own browser
 * phases because reduced motion is a context-level emulation, so it cannot share the axe page.
 */
async function collectMotion(
  origin: string,
  routes: readonly string[],
  authorizedHosts: readonly string[],
): Promise<LiveGroup<MotionProbeResult>> {
  const samples: { route: string; value: MotionProbeResult }[] = [];
  const failed: { route: string; reason: string }[] = [];
  const guarded = await launchGuardedBrowser(authorizedHosts);
  try {
    for (const route of routes) {
      try {
        samples.push({
          route,
          value: await probeMotionWith(guarded.browser, routeUrl(origin, route), authorizedHosts),
        });
      } catch (error) {
        failed.push({ route, reason: describeError(error) });
      }
    }
  } catch (error) {
    const reason = 'no browser: ' + describeError(error);
    for (const route of routes) failed.push({ route, reason });
  } finally {
    await guarded.close();
  }
  return { samples, failed, skipped: null };
}

/** Component states share one browser, like motion: the probe is one navigation per route. */
async function collectStates(
  origin: string,
  routes: readonly string[],
  authorizedHosts: readonly string[],
): Promise<LiveGroup<StatesProbeResult>> {
  const samples: { route: string; value: StatesProbeResult }[] = [];
  const failed: { route: string; reason: string }[] = [];
  const guarded = await launchGuardedBrowser(authorizedHosts);
  try {
    for (const route of routes) {
      try {
        samples.push({
          route,
          value: await probeStatesWith(guarded.browser, routeUrl(origin, route), authorizedHosts),
        });
      } catch (error) {
        failed.push({ route, reason: describeError(error) });
      }
    }
  } catch (error) {
    const reason = 'no browser: ' + describeError(error);
    for (const route of routes) failed.push({ route, reason });
  } finally {
    await guarded.close();
  }
  return { samples, failed, skipped: null };
}

/** sha256 of a file on disk, hex encoded. The only hashing the audit performs. */
function sha256OfFile(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/**
 * Artefacts a finding can cite, keyed by `route|viewport-family` so evidence
 * names the screen it was captured on, plus a `route|*` fallback for findings
 * that carry no viewport (axe, SEO, source scans). Only a file that exists and
 * hashes is recorded — a path that was never written must not appear as
 * evidence, and a hash that no reader can re-derive is not evidence either.
 */
function artifactsFor(inputs: AuditInputs, outDir: string): Map<string, ArtifactRef> {
  const map = new Map<string, ArtifactRef>();
  for (const sample of inputs.capture.samples) {
    const usable = sample.value.combos.filter((c) => existsSync(c.screenshot));
    let fallback: ArtifactRef | null = null;
    for (const combo of usable) {
      const ref: ArtifactRef = {
        path: relative(outDir, combo.screenshot),
        hash: sha256OfFile(combo.screenshot),
      };
      // One shot per viewport, keyed by the width-qualified name a finding uses,
      // light theme preferred: a light shot is what a reader can read a layout
      // defect from.
      const key = sample.route + '|' + captureViewportName(combo.viewport);
      if (!map.has(key) || combo.theme === 'light') map.set(key, ref);
      if (combo.viewport === 'mobile' && combo.theme === 'light') fallback = ref;
      fallback ??= ref;
    }
    if (fallback !== null) map.set(sample.route + '|*', fallback);
  }
  return map;
}

export async function runAudit(options: AuditOptions): Promise<AuditRun> {
  const mode = options.mode;
  const outDir = resolve(options.outDir);
  // Reports never go into the target. Writing there pollutes the audited tree, and on the next
  // run the report directory is inside the thing being measured (found by hand, T1024 follow-up).
  // A live URL target has no local tree, so the check only applies to --path.
  if (options.liveUrl === null && !/^https?:\/\//i.test(options.target)) {
    const target = resolve(options.target);
    if (outDir === target || outDir.startsWith(target + sep)) {
      throw new Error(
        'refusing --out inside the audited target (' +
          target +
          '): write reports somewhere else, e.g. --out ./audit-out',
      );
    }
  }
  mkdirSync(outDir, { recursive: true });

  const resolved = await resolveTarget(options);
  const target = resolved.target;

  try {
    const measured = await measure({
      mode,
      target,
      origin: resolved.origin,
      site: resolved.site,
      outDir,
      authorizedHosts: options.authorizedHosts ?? [],
      scopeSelectors: options.scopeSelectors ?? [],
    });
    const artifacts = artifactsFor(measured, outDir);
    const inputs: AuditInputs = artifacts.size === 0 ? measured : { ...measured, artifacts };
    const report = composeReport(inputs);
    const markdown = renderAuditMarkdown(report);
    const reportPath = join(outDir, AUDIT_OUTPUT_FILES.report);
    const markdownPath = join(outDir, AUDIT_OUTPUT_FILES.markdown);
    writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(markdownPath, markdown);

    let evidencePath: string | null = null;
    const bundle = buildEvidenceBundle(inputs);
    if (bundle !== null) {
      const dir = join(outDir, AUDIT_OUTPUT_FILES.evidenceDir);
      mkdirSync(dir, { recursive: true });
      evidencePath = join(dir, 'bundle.json');
      writeFileSync(evidencePath, JSON.stringify(bundle, null, 2) + '\n');
    }

    let fixPlanPath: string | null = null;
    if (options.fixPlan === true) {
      fixPlanPath = join(outDir, AUDIT_OUTPUT_FILES.fixPlan);
      const plan: FixPlan = {
        schemaVersion: 1,
        command: 'sus-eval audit',
        generatedAt: inputs.generatedAt,
        target,
        proposals: report.findings.map(proposalFor),
        note:
          'This file proposes fixes; it applies none. Every proposal needs explicit approval, ' +
          'and the audit must be re-run after a change is applied.',
      };
      writeFileSync(fixPlanPath, JSON.stringify(plan, null, 2) + '\n');
    }

    return {
      report,
      markdown,
      target,
      exitCode: exitCodeFor(report),
      outDir,
      reportPath,
      markdownPath,
      evidencePath,
      fixPlanPath,
    };
  } finally {
    resolved.close();
  }
}
