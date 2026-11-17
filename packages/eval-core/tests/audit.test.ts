/**
 * T1012: the /sus audit invocation contract and the composed read-only pipeline.
 *
 * These tests are deterministic: the contract and the composer are pure, and the
 * end-to-end cases run quick mode, which needs no browser. The deep path is
 * exercised by the deep-mode regression, not here, so this suite never depends on
 * Chromium being installed.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AUDIT_CHECKS,
  AUDIT_EXIT_CODES,
  AUDIT_HELP,
  AUDIT_VIEWPORTS,
  AUDIT_WILL_NOT,
  assertAuthorizedUrl,
  parseRoutes,
  renderContractMarkdown,
  viewportNames,
} from '../src/audit/contract.js';
import {
  AuditReport,
  exitCodeFor,
  summariseFindings,
  requiredIn,
  stableFindingId,
  checkResult,
  finding,
  NEEDS_REVIEW_ITEMS,
} from '../src/audit/report.js';
import {
  buildEvidenceBundle,
  composeReport,
  emptyGroup,
  type AuditInputs,
  type LiveGroup,
} from '../src/audit/compose.js';
import type { AxeScanResult } from '../src/harness/a11y-budgets.js';
import type { CaptureResult } from '../src/harness/capture.js';
import type { MotionProbeResult } from '../src/harness/motion.js';
import type { StatesProbeResult } from '../src/harness/states.js';
import { runAudit } from '../src/audit/pipeline.js';

const WORK = mkdtempSync(join(tmpdir(), 'sus-audit-test-'));
afterAll(() => rmSync(WORK, { recursive: true, force: true }));

function page(files: Record<string, string>, name: string): string {
  const dir = join(WORK, name);
  mkdirSync(dir, { recursive: true });
  for (const [file, body] of Object.entries(files)) {
    const full = join(dir, file);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

const GOOD_HTML =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Audit fixture</title>' +
  '<meta name="description" content="A calm, measurable description of the audit fixture page.">' +
  '</head><body><header>h</header><main><h1>Audit fixture</h1><p>Real copy.</p>' +
  '<img src="a.png" alt="A described image"></main><footer>f</footer></body></html>';

const BAD_HTML =
  '<!doctype html><html><head><title>' +
  'This title runs long past the sixty character budget a search result actually shows for it' +
  '</title></head><body><h2>Skips a heading level</h2><img src="a.png">' +
  '<p>lorem ipsum dolor sit amet</p></body></html>';

describe('audit contract', () => {
  it('documents every check with a gate, a mode and an effort', () => {
    expect(AUDIT_CHECKS.length).toBeGreaterThan(4);
    for (const check of AUDIT_CHECKS) {
      expect(check.modes.length).toBeGreaterThan(0);
      expect(['quick-win', 'structural']).toContain(check.effort);
      expect(typeof check.required).toBe('boolean');
    }
    expect(new Set(AUDIT_CHECKS.map((c) => c.id)).size).toBe(AUDIT_CHECKS.length);
  });

  it('pins the viewport set including the 320 px width G7 requires', () => {
    expect(viewportNames()).toEqual(['mobile-320', 'mobile-390', 'tablet-768', 'desktop-1440']);
    const narrowest = AUDIT_VIEWPORTS.reduce((a, b) => (a.width <= b.width ? a : b));
    expect(narrowest.name).toBe('mobile-320');
    expect(narrowest.width).toBe(320);
  });

  it('accepts loopback targets and refuses an unauthorized host', () => {
    expect(assertAuthorizedUrl('http://127.0.0.1:3000').host).toBe('127.0.0.1:3000');
    expect(assertAuthorizedUrl('http://localhost:8080/x').host).toBe('localhost:8080');
    expect(() => assertAuthorizedUrl('https://example.com')).toThrow(/not authorized/);
    expect(assertAuthorizedUrl('https://example.com', ['example.com']).host).toBe('example.com');
    expect(assertAuthorizedUrl('https://docs.example.com', ['.example.com']).host).toBe(
      'docs.example.com',
    );
  });

  it('refuses a non-http scheme and an embedded credential', () => {
    expect(() => assertAuthorizedUrl('file:///etc/passwd')).toThrow(/http/);
    expect(() => assertAuthorizedUrl('not a url')).toThrow(/absolute URL/);
    expect(() => assertAuthorizedUrl('https://user:pw@example.com', ['example.com'])).toThrow(
      /credential/,
    );
  });

  it('parses a route list, defaults to /, and dedupes', () => {
    expect(parseRoutes(undefined)).toEqual(['/']);
    expect(parseRoutes(null)).toEqual(['/']);
    expect(parseRoutes('')).toEqual(['/']);
    expect(parseRoutes('/,pricing')).toEqual(['/', '/pricing']);
    expect(parseRoutes('/,/,/about')).toEqual(['/', '/about']);
  });

  it('states the exit codes and the will-not-do list', () => {
    expect(AUDIT_EXIT_CODES[0]).toMatch(/no P0\/P1 findings/);
    expect(AUDIT_EXIT_CODES[3]).toMatch(/not-run/i);
    expect(AUDIT_WILL_NOT.length).toBeGreaterThan(2);
    expect(AUDIT_HELP).toContain('--mode deep');
    expect(AUDIT_HELP).toContain('Will not do:');
  });

  it('renders the same contract as markdown', () => {
    const md = renderContractMarkdown();
    expect(md).toContain('# /sus audit: invocation contract');
    expect(md).toContain('| `mobile-320` | 320×568 |');
    expect(md).toContain('Exit codes:');
    for (const line of AUDIT_WILL_NOT) expect(md).toContain('- ' + line);
    expect(md.endsWith('\n')).toBe(true);
  });
});

describe('audit report contract', () => {
  it('gives the same id to the same finding and a different id to a moved one', () => {
    const base = { check: 'axe-a11y', route: '/', viewport: 'mobile-390', title: 'label' };
    expect(stableFindingId(base)).toBe(stableFindingId({ ...base }));
    expect(stableFindingId(base)).toMatch(/^[0-9a-f]{12}$/);
    expect(stableFindingId({ ...base, route: '/pricing' })).not.toBe(stableFindingId(base));
  });

  it('counts a not-run required check as incomplete but never as a pass', () => {
    expect(requiredIn('axe-a11y', 'deep')).toBe(true);
    expect(requiredIn('axe-a11y', 'quick')).toBe(false);
    expect(requiredIn('made-up-check', 'quick')).toBe(true);
    const checks = [checkResult('axe-a11y', 'Axe', 'G4', 'not-run', [], 'no browser')];
    expect(summariseFindings([], checks, 'deep').incomplete).toBe(true);
    expect(summariseFindings([], checks, 'quick').incomplete).toBe(false);
  });

  it('refuses a not-run check with no reason', () => {
    const broken = {
      schemaVersion: 1,
      command: 'sus-eval audit',
      generatedAt: '2026-11-16T00:00:00Z',
      mode: 'quick',
      target: { kind: 'local-path', path: '/x', url: null, routes: ['/'] },
      viewports: ['mobile-320'],
      checks: [checkResult('seo-structure', 'SEO', 'G3', 'not-run', [])],
      findings: [],
      summary: summariseFindings(
        [],
        [checkResult('seo-structure', 'SEO', 'G3', 'not-run', [])],
        'quick',
      ),
      needsReview: NEEDS_REVIEW_ITEMS,
      provenance: { evaluator: 'x', node: 'v22', platform: 'linux/x64', browser: null },
    };
    expect(AuditReport.safeParse(broken).success).toBe(false);
  });

  it('refuses a P0 finding that is really a human-judgment item', () => {
    const bad = finding({
      check: 'axe-a11y',
      severity: 'P0',
      effort: 'structural',
      title: 'maybe the contrast is off',
      detail: 'a guess',
      needsReview: true,
      evaluator: 'human',
      remediation: 'inspect the contrast in a real browser',
      confidence: 'unjudged',
    });
    expect(AuditReport.shape.findings.element.safeParse(bad).success).toBe(false);
  });

  it('maps severities to exit codes so a clean run is the only zero', () => {
    const pass = [checkResult('seo-structure', 'SEO', 'G3', 'pass', ['ok'])];
    const report = (findings: ReturnType<typeof finding>[], checks = pass) =>
      AuditReport.parse({
        schemaVersion: 1,
        command: 'sus-eval audit',
        generatedAt: '2026-11-16T00:00:00Z',
        mode: 'quick',
        target: { kind: 'local-path', path: '/x', url: null, routes: ['/'] },
        viewports: ['mobile-320'],
        checks,
        findings,
        summary: summariseFindings(findings, checks, 'quick'),
        needsReview: [...NEEDS_REVIEW_ITEMS],
        provenance: { evaluator: 'x', node: 'v22', platform: 'linux/x64', browser: null },
      });
    const p1 = finding({
      check: 'seo-structure',
      severity: 'P1',
      effort: 'quick-win',
      title: 'no-placeholders',
      detail: 'placeholder text',
      evaluator: 'checkSeo',
      remediation: 'replace the placeholder',
    });
    const p3 = finding({
      check: 'anti-slop',
      severity: 'P3',
      effort: 'quick-win',
      title: 'generic voice',
      detail: 'advisory',
      evaluator: 'scanText',
      remediation: 'rewrite in the product voice',
      confidence: 'inferred',
    });
    expect(exitCodeFor(report([]))).toBe(0);
    expect(exitCodeFor(report([p3]))).toBe(0);
    expect(exitCodeFor(report([p1]))).toBe(1);
    const incomplete = [checkResult('seo-structure', 'SEO', 'G3', 'not-run', [], 'no html')];
    expect(exitCodeFor(report([], incomplete))).toBe(3);
  });

  it('rejects a summary that disagrees with the findings list', () => {
    const checks = [checkResult('seo-structure', 'SEO', 'G3', 'pass', ['ok'])];
    const parsed = AuditReport.safeParse({
      schemaVersion: 1,
      command: 'sus-eval audit',
      generatedAt: '2026-11-16T00:00:00Z',
      mode: 'quick',
      target: { kind: 'local-path', path: '/x', url: null, routes: ['/'] },
      viewports: ['mobile-320'],
      checks,
      findings: [],
      summary: {
        P0: 0,
        P1: 7,
        P2: 0,
        P3: 0,
        quickWins: 0,
        structural: 0,
        needsReview: 0,
        incomplete: false,
      },
      needsReview: [...NEEDS_REVIEW_ITEMS],
      provenance: { evaluator: 'x', node: 'v22', platform: 'linux/x64', browser: null },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('composed report', () => {
  const base = (over: Partial<AuditInputs>): AuditInputs => ({
    mode: 'quick',
    target: { kind: 'local-path', path: '/site', url: 'http://127.0.0.1:1', routes: ['/'] },
    generatedAt: '2026-11-16T00:00:00Z',
    provenance: {
      evaluator: 'sus-eval audit 1',
      node: 'v22',
      platform: 'linux/x64',
      browser: null,
    },
    html: [{ route: '/', html: GOOD_HTML }],
    slop: { results: [], reason: 'no source' },
    capture: emptyGroup('not requested'),
    reflow: emptyGroup('not requested'),
    axe: emptyGroup('not requested'),
    keyboard: emptyGroup('not requested'),
    lighthouse: emptyGroup('not requested'),
    ...over,
  });

  it('composes a valid report for a page with no measured defect', () => {
    const report = composeReport(base({}));
    expect(AuditReport.safeParse(report).success).toBe(true);
    expect(report.summary.P0).toBe(0);
    expect(report.summary.P1).toBe(0);
    expect(report.checks.find((c) => c.id === 'seo-structure')?.status).toBe('pass');
  });

  it('reports a broken page as findings, worst first', () => {
    const report = composeReport(base({ html: [{ route: '/', html: BAD_HTML }] }));
    expect(report.findings.length).toBeGreaterThan(2);
    expect(report.summary.P1).toBeGreaterThanOrEqual(1);
    const ranks = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const order = report.findings.map((f) => ranks[f.severity]);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(report.checks.find((c) => c.id === 'seo-structure')?.status).toBe('fail');
  });

  it('keeps a missing measurement as not-run, never as a pass', () => {
    const report = composeReport(
      base({ html: [{ route: '/', html: null, reason: 'host unreachable' }] }),
    );
    const seo = report.checks.find((c) => c.id === 'seo-structure');
    expect(seo?.status).toBe('not-run');
    expect(seo?.reason).toMatch(/host unreachable/);
    expect(report.summary.incomplete).toBe(true);
    expect(exitCodeFor(report)).toBe(3);
  });

  it('never calls a browser phase pass when no browser ran', () => {
    const report = composeReport(base({ mode: 'deep' }));
    for (const id of ['axe-a11y', 'lighthouse-budgets', 'capture-matrix', 'reflow-matrix']) {
      const check = report.checks.find((c) => c.id === id);
      expect(check?.status, id).toBe('not-run');
      expect(check?.reason, id).toBeTruthy();
    }
    expect(report.summary.incomplete).toBe(true);
  });

  it('lists the human-judgment items so they can never be silently passed', () => {
    const report = composeReport(base({}));
    for (const item of NEEDS_REVIEW_ITEMS) {
      expect(report.needsReview.some((line) => line.startsWith(item))).toBe(true);
    }
    expect(report.findings.every((f) => !(f.needsReview && f.severity === 'P1'))).toBe(true);
  });

  it('emits no evidence bundle when the required parts are missing', () => {
    expect(buildEvidenceBundle(base({}))).toBeNull();
  });

  it('reports one P1 per exceeded budget metric and none for the metrics that pass', () => {
    const report = composeReport(
      base({
        mode: 'deep',
        lighthouse: {
          samples: [
            {
              route: '/',
              value: {
                url: 'http://127.0.0.1:1/',
                lcpMs: 610,
                cls: 0,
                totalBlockingMs: 7613,
                totalByteWeight: 844,
              },
            },
          ],
          failed: [],
          skipped: null,
        },
      }),
    );
    const misses = report.findings.filter((f) => f.check === 'lighthouse-budgets');
    expect(misses.length).toBe(1);
    expect(misses[0]?.severity).toBe('P1');
    expect(misses[0]?.title).toBe('Budget miss: TBT ms');
    expect(misses[0]?.detail).toMatch(/TBT ms: 7613 \/ limit 200/);
    expect(misses[0]?.detail).toMatch(/EXCEEDED/);
    expect(report.checks.find((c) => c.id === 'lighthouse-budgets')?.status).toBe('fail');
  });

  it('reports an unmeasured budget metric as a fail-closed P1, not a zero', () => {
    const report = composeReport(
      base({
        mode: 'deep',
        lighthouse: {
          samples: [
            {
              route: '/',
              value: {
                url: 'http://127.0.0.1:1/',
                lcpMs: null,
                cls: 0.02,
                totalBlockingMs: 10,
                totalByteWeight: 1000,
              },
            },
          ],
          failed: [],
          skipped: null,
        },
      }),
    );
    const misses = report.findings.filter((f) => f.check === 'lighthouse-budgets');
    expect(misses.length).toBe(1);
    expect(misses[0]?.title).toBe('Budget miss: LCP ms');
    expect(misses[0]?.detail).toMatch(/FAIL CLOSED/);
    expect(report.checks.find((c) => c.id === 'lighthouse-budgets')?.status).toBe('fail');
  });
});

describe('audit evidence contract (T1013)', () => {
  const base = (over: Partial<AuditInputs>): AuditInputs => ({
    mode: 'deep',
    target: { kind: 'local-path', path: '/site', url: 'http://127.0.0.1:1', routes: ['/'] },
    generatedAt: '2026-11-16T00:00:00Z',
    provenance: {
      evaluator: 'sus-eval audit 1',
      node: 'v22',
      platform: 'linux/x64',
      browser: null,
    },
    html: [{ route: '/', html: GOOD_HTML }],
    slop: { results: [], reason: 'no source' },
    capture: emptyGroup('not requested'),
    reflow: emptyGroup('not requested'),
    axe: emptyGroup('not requested'),
    keyboard: emptyGroup('not requested'),
    lighthouse: emptyGroup('not requested'),
    ...over,
  });

  /** A keyboard traversal whose page is clean: the check must read pass, not skipped. */
  const cleanKeyboard = (): LiveGroup<KeyboardScanResult> => ({
    samples: [
      {
        route: '/',
        value: {
          url: 'http://127.0.0.1:1/',
          stops: [
            {
              index: 0,
              selector: 'a#skip',
              tag: 'a',
              role: null,
              indicator: true,
              outline: 'solid 2px rgb(0, 119, 255)',
              boxShadow: 'none',
            },
          ],
          focusable: 3,
          indicatorMissing: [],
          detours: 0,
          cycle: null,
        },
      },
    ],
    failed: [],
    skipped: null,
  });

  it('passes keyboard-flow when the traversal found no problem', () => {
    const report = composeReport(base({ keyboard: cleanKeyboard() }));
    const check = report.checks.find((c) => c.id === 'keyboard-flow');
    expect(check?.status).toBe('pass');
    expect(report.findings.filter((f) => f.check === 'keyboard-flow')).toEqual([]);
  });

  it('reports a missing focus indicator as a P1 with the element named', () => {
    const group = cleanKeyboard();
    const report = composeReport(
      base({
        keyboard: {
          ...group,
          samples: [
            {
              route: '/',
              value: { ...group.samples[0]!.value, indicatorMissing: ['button#save'] },
            },
          ],
        },
      }),
    );
    const found = report.findings.filter((f) => f.check === 'keyboard-flow');
    expect(found).toHaveLength(1);
    expect(found[0]!.severity).toBe('P1');
    expect(found[0]!.observation.location).toBe('button#save');
    expect(found[0]!.observation.confidence).toBe('measured');
    expect(report.checks.find((c) => c.id === 'keyboard-flow')?.status).toBe('fail');
    expect(report.summary.P1).toBe(1);
  });

  it('reports focus leaving the document as a P1 and a cycle as P2', () => {
    const group = cleanKeyboard();
    const report = composeReport(
      base({
        keyboard: {
          ...group,
          samples: [
            {
              route: '/',
              value: {
                ...group.samples[0]!.value,
                detours: 2,
                cycle: { selector: 'button#open', repeats: 3 },
              },
            },
          ],
        },
      }),
    );
    const found = report.findings.filter((f) => f.check === 'keyboard-flow');
    expect(found.map((f) => f.severity).sort()).toEqual(['P1', 'P2']);
    // Escape is never pressed, so the cycle stays an observation, not a verdict.
    expect(found.find((f) => f.severity === 'P2')?.title).toContain('cycles');
  });

  it('never passes keyboard-flow when no traversal was recorded', () => {
    const report = composeReport(base({ keyboard: emptyGroup('no browser') }));
    const check = report.checks.find((c) => c.id === 'keyboard-flow');
    expect(check?.status).toBe('not-run');
    expect(check?.reason).toContain('no browser');
  });

  // T1047 (audit finding T1003-2): a route the probe never measured must keep a check out of
  // pass. The all-unmeasured and all-measured paths were pinned; the mixed run — one route clean,
  // one route without a control, one probe error — is exactly the case that used to go green.

  /** One measured state sample for a control that shows all three driven differences. */
  const measuredStates = (route: string): LiveGroup<StatesProbeResult> => ({
    samples: [
      {
        route,
        value: {
          url: 'http://127.0.0.1:1' + route,
          status: 'measured',
          reason: null,
          controls: [
            {
              descriptor: 'button#save',
              hover: { changed: ['background-color'], styleCount: 10 },
              pressed: { changed: ['transform'], styleCount: 10 },
              pressSkippedReason: null,
              disabled: { changed: ['opacity'], styleCount: 10 },
              checked: null,
              checkedSkippedReason: null,
            },
          ],
          notDriven: [],
        },
      },
    ],
    failed: [],
    skipped: null,
  });

  const notRunStates = (route: string) => ({
    route,
    value: {
      url: 'http://127.0.0.1:1' + route,
      status: 'not-run',
      reason: 'no interactive control on this route',
      controls: [],
      notDriven: [],
    },
  });

  it('keeps component-states out of pass when some routes were never measured (T1003-2)', () => {
    const group = measuredStates('/');
    const report = composeReport(
      base({
        states: {
          ...group,
          samples: [...group.samples, notRunStates('/about')],
          failed: [{ route: '/pricing', reason: 'probe timed out' }],
        },
      }),
    );
    const check = report.checks.find((c) => c.id === 'component-states');
    expect(check?.status).toBe('not-run');
    expect(check?.detail.join(' ')).toContain('/about');
    expect(check?.detail.join(' ')).toContain('/pricing');
    expect(check?.reason).toContain('/pricing');
  });

  it('passes component-states only when every route measured clean (T1003-2)', () => {
    const report = composeReport(base({ states: measuredStates('/') }));
    const check = report.checks.find((c) => c.id === 'component-states');
    expect(check?.status).toBe('pass');
  });

  it('fails component-states on a measured defect even when other routes are unmeasured (T1003-2)', () => {
    const group = measuredStates('/');
    const silentHover = {
      ...group.samples[0]!.value,
      controls: [
        { ...group.samples[0]!.value.controls[0]!, hover: { changed: [], styleCount: 10 } },
      ],
    };
    const report = composeReport(
      base({
        states: {
          ...group,
          samples: [{ route: '/', value: silentHover }],
          failed: [{ route: '/pricing', reason: 'probe timed out' }],
        },
      }),
    );
    const check = report.checks.find((c) => c.id === 'component-states');
    expect(check?.status).toBe('fail');
    expect(check?.detail.join(' ')).toContain('/pricing');
    expect(
      report.findings.some((f) => f.check === 'component-states' && f.title.includes('hover')),
    ).toBe(true);
  });

  /** One measured motion sample with a chosen verdict. */
  const measuredMotion = (
    route: string,
    verdictStatus: 'pass' | 'fail',
  ): LiveGroup<MotionProbeResult> => ({
    samples: [
      {
        route,
        value: {
          url: 'http://127.0.0.1:1' + route,
          status: 'measured',
          reason: null,
          trigger: 'button#disclosure',
          transitionsMs: 120,
          verdict:
            verdictStatus === 'fail'
              ? {
                  status: 'fail',
                  detail: ['reduced-motion trace lost the panel content — parity violated'],
                }
              : { status: 'pass', detail: ['reduced-motion trace carried the same information'] },
        },
      },
    ],
    failed: [],
    skipped: null,
  });

  const notRunMotion = (route: string) => ({
    route,
    value: {
      url: 'http://127.0.0.1:1' + route,
      status: 'not-run',
      reason: 'no disclosure on this route',
      trigger: null,
      transitionsMs: 0,
      verdict: null,
    },
  });

  it('keeps transition-oracle out of pass when a route errored or was never driven (T1003-2)', () => {
    const group = measuredMotion('/', 'pass');
    const report = composeReport(
      base({
        motion: {
          ...group,
          samples: [...group.samples, notRunMotion('/about')],
          failed: [{ route: '/pricing', reason: 'navigation refused' }],
        },
      }),
    );
    const check = report.checks.find((c) => c.id === 'transition-oracle');
    expect(check?.status).toBe('not-run');
    expect(check?.detail.join(' ')).toContain('/about');
    expect(check?.detail.join(' ')).toContain('/pricing');
    expect(check?.reason).toContain('/pricing');
  });

  it('reads a measured parity failure as fail even when another route was unmeasured', () => {
    const group = measuredMotion('/', 'fail');
    const report = composeReport(
      base({
        motion: { ...group, samples: [...group.samples, notRunMotion('/about')] },
      }),
    );
    const check = report.checks.find((c) => c.id === 'transition-oracle');
    expect(check?.status).toBe('fail');
    expect(report.findings.filter((f) => f.check === 'transition-oracle')).toHaveLength(1);
  });

  it('reads a partial motion run as not-run rather than a parity failure (T1003-26)', () => {
    const group = measuredMotion('/', 'pass');
    const partial = composeReport(
      base({ motion: { ...group, samples: [...group.samples, notRunMotion('/about')] } }),
    );
    const check = partial.checks.find((c) => c.id === 'transition-oracle');
    expect(check?.status).toBe('not-run');
    expect(check?.detail.join(' ')).toContain('/about');
  });

  /** One captured route whose mobile layout overflows: a measured P0 with a shot. */
  const overflowCapture = (): LiveGroup<CaptureResult> => ({
    samples: [
      {
        route: '/',
        value: {
          url: 'http://127.0.0.1:1/',
          outDir: '/tmp/shots',
          combos: [
            {
              viewport: 'mobile',
              theme: 'light',
              screenshot: '/tmp/shots/mobile-light.png',
              metrics: {
                url: 'http://127.0.0.1:1/',
                title: 'Audit fixture',
                horizontalOverflow: true,
                documentScrollWidth: 640,
                documentClientWidth: 320,
                overflowingElements: ['main > table'],
                cls: 0,
                lcpMs: 800,
                smallTapTargets: [],
                landmarks: ['main'],
                headings: [{ level: 1, text: 'Audit fixture' }],
              },
            },
          ],
        },
      },
    ],
    failed: [],
    skipped: null,
  });

  const cleanAxe = (): LiveGroup<AxeScanResult> => ({
    samples: [{ route: '/', value: { url: 'http://127.0.0.1:1/', violations: [], passes: 17 } }],
    failed: [],
    skipped: null,
  });

  it('refuses a finding that carries no observation at all', () => {
    const bare = {
      id: stableFindingId({ check: 'seo-structure', route: '/', viewport: null, title: 'x' }),
      severity: 'P2',
      effort: 'quick-win',
      check: 'seo-structure',
      route: '/',
      viewport: null,
      title: 'x',
      detail: 'y',
      evidence: [],
      needsReview: false,
    };
    expect(AuditReport.shape.findings.element.safeParse(bare).success).toBe(false);
  });

  it('refuses an artefact with no hash and a hash with no artefact', () => {
    const unhashed = finding({
      check: 'capture-matrix',
      severity: 'P1',
      effort: 'structural',
      title: 'overflow',
      detail: 'the page scrolls sideways',
      evaluator: 'captureMatrix',
      remediation: 'let the content wrap',
      artifact: 'shots/mobile-light.png',
    });
    expect(unhashed.observation.artifact).toBe('shots/mobile-light.png');
    expect(AuditReport.shape.findings.element.safeParse(unhashed).success).toBe(false);

    const orphan = finding({
      check: 'capture-matrix',
      severity: 'P1',
      effort: 'structural',
      title: 'overflow',
      detail: 'the page scrolls sideways',
      evaluator: 'captureMatrix',
      remediation: 'let the content wrap',
      artifactHash: 'a'.repeat(64),
    });
    expect(AuditReport.shape.findings.element.safeParse(orphan).success).toBe(false);
  });

  it('refuses a machine verdict on an item only a human can judge', () => {
    const confirmed = finding({
      check: 'axe-a11y',
      severity: 'P2',
      effort: 'structural',
      title: 'contrast may be low',
      detail: 'a human must look',
      evaluator: 'human',
      remediation: 'open the page and compare',
      confidence: 'unjudged',
      verdict: 'confirmed',
    });
    expect(AuditReport.shape.findings.element.safeParse(confirmed).success).toBe(false);

    const guessedBlocker = finding({
      check: 'anti-slop',
      severity: 'P1',
      effort: 'quick-win',
      title: 'generic voice',
      detail: 'a pattern matched',
      evaluator: 'scanText',
      remediation: 'rewrite it',
      confidence: 'inferred',
    });
    expect(AuditReport.shape.findings.element.safeParse(guessedBlocker).success).toBe(false);
  });

  it('points a finding at the artefact that records it, hash included', () => {
    const hash = 'b'.repeat(64);
    const report = composeReport(
      base({
        capture: overflowCapture(),
        artifacts: new Map([['/|mobile-390', { path: 'shots/mobile-light.png', hash }]]),
      }),
    );
    const overflow = report.findings.find((f) => f.check === 'capture-matrix');
    expect(overflow?.observation.artifact).toBe('shots/mobile-light.png');
    expect(overflow?.observation.artifactHash).toBe(hash);
    expect(overflow?.observation.confidence).toBe('measured');
    expect(AuditReport.safeParse(report).success).toBe(true);
  });

  it('cites the shot of the screen the finding was measured on', () => {
    const mobileHash = 'a'.repeat(64);
    const tabletHash = 'c'.repeat(64);
    const captured = overflowCapture();
    const first = captured.samples[0];
    if (first === undefined) throw new Error('fixture lost its sample');
    const tabletCombo = {
      ...first.value.combos[0],
      viewport: 'tablet' as const,
      screenshot: '/tmp/shots/tablet-light.png',
    };
    const report = composeReport(
      base({
        capture: {
          ...captured,
          samples: [{ ...first, value: { ...first.value, combos: [tabletCombo] } }],
        },
        artifacts: new Map([
          ['/|mobile-390', { path: 'shots/mobile-light.png', hash: mobileHash }],
          ['/|tablet-768', { path: 'shots/tablet-light.png', hash: tabletHash }],
        ]),
      }),
    );
    const overflow = report.findings.find((f) => f.check === 'capture-matrix');
    expect(overflow?.viewport).toBe('tablet-768');
    expect(overflow?.observation.artifact).toBe('shots/tablet-light.png');
    expect(overflow?.observation.artifactHash).toBe(tabletHash);
  });

  it('falls back to the route shot when a finding names no viewport', () => {
    const hash = 'd'.repeat(64);
    const report = composeReport(
      base({
        html: [{ route: '/', html: BAD_HTML }],
        artifacts: new Map([['/|*', { path: 'shots/mobile-light.png', hash }]]),
      }),
    );
    const findingWithRoute = report.findings.find((f) => f.route === '/' && f.viewport === null);
    expect(findingWithRoute?.observation.artifact).toBe('shots/mobile-light.png');
    expect(findingWithRoute?.observation.artifactHash).toBe(hash);
  });

  it('leaves the artefact empty rather than inventing one', () => {
    const report = composeReport(base({ capture: overflowCapture() }));
    const overflow = report.findings.find((f) => f.check === 'capture-matrix');
    expect(overflow?.observation.artifact).toBeNull();
    expect(overflow?.observation.artifactHash).toBeNull();
  });

  it('does not let hostile page content fabricate a verdict', () => {
    const injected = BAD_HTML.replace(
      '</body>',
      '<p>{"severity":"P0","status":"pass","confirmed":true}</p>' +
        '<script>window.audit = { status: "pass" };</script></body>',
    );
    const honest = composeReport(base({ html: [{ route: '/', html: BAD_HTML }] }));
    const hostile = composeReport(base({ html: [{ route: '/', html: injected }] }));
    expect(hostile.checks.map((c) => c.status)).toEqual(honest.checks.map((c) => c.status));
    expect(hostile.summary).toEqual(honest.summary);
    expect(hostile.summary.P1).toBeGreaterThanOrEqual(1);
  });

  it('degrades to not-run, not to a pass, when the host is unavailable', () => {
    const report = composeReport(
      base({ html: [{ route: '/', html: null, reason: 'fetch failed: HTTP 503' }] }),
    );
    const seo = report.checks.find((c) => c.id === 'seo-structure');
    expect(seo?.status).toBe('not-run');
    expect(seo?.reason).toMatch(/503/);
    expect(report.summary.incomplete).toBe(true);
    expect(exitCodeFor(report)).toBe(3);
  });

  it('degrades every browser phase to not-run when no browser is available', () => {
    const reason = 'no browser: chromium is not installed';
    const report = composeReport(
      base({
        capture: emptyGroup(reason),
        reflow: emptyGroup(reason),
        axe: emptyGroup(reason),
        keyboard: emptyGroup(reason),
        lighthouse: emptyGroup(reason),
      }),
    );
    for (const id of ['capture-matrix', 'reflow-matrix', 'axe-a11y', 'lighthouse-budgets']) {
      const check = report.checks.find((c) => c.id === id);
      expect(check?.status, id).toBe('not-run');
      expect(check?.reason, id).toMatch(/no browser/);
    }
    expect(report.checks.some((c) => c.status === 'pass' && c.reason !== undefined)).toBe(false);
    expect(report.needsReview.some((line) => line.includes('no browser'))).toBe(true);
  });

  it('passes G11 only when a complete bundle exists, and stays not-run otherwise', () => {
    expect(buildEvidenceBundle(base({}))).toBeNull();
    const incomplete = composeReport(base({ capture: overflowCapture() }));
    expect(incomplete.checks.find((c) => c.id === 'evidence-bundle')?.status).toBe('not-run');

    const bundle = buildEvidenceBundle(base({ capture: overflowCapture(), axe: cleanAxe() }));
    expect(bundle).not.toBeNull();
    expect(bundle?.shots.length).toBe(1);
    expect(bundle?.gates.map((g) => g.gate)).toEqual(['G4']);
    const complete = composeReport(base({ capture: overflowCapture(), axe: cleanAxe() }));
    expect(complete.checks.find((c) => c.id === 'evidence-bundle')?.status).toBe('pass');
  });
});
describe('audit pipeline (quick mode, no browser)', () => {
  it('audits a local directory, writes only under --out, and leaves the target untouched', async () => {
    const dir = page({ 'index.html': GOOD_HTML, 'notes.md': 'plain notes' }, 'clean-site');
    const before = readFileSync(join(dir, 'index.html'), 'utf8');
    const out = join(WORK, 'clean-out');
    const run = await runAudit({ target: dir, mode: 'quick', outDir: out });
    expect(run.target.kind).toBe('local-path');
    expect(run.report.checks.every((c) => c.status !== 'pass' || c.detail.length > 0)).toBe(true);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe(before);
    const written = JSON.parse(readFileSync(run.reportPath, 'utf8')) as unknown;
    expect(AuditReport.safeParse(written).success).toBe(true);
    expect(run.markdownPath.endsWith('audit.md')).toBe(true);
  });

  it('returns exit code 1 when a measured page has a release blocker', async () => {
    const dir = page({ 'index.html': BAD_HTML }, 'broken-site');
    const run = await runAudit({ target: dir, mode: 'quick', outDir: join(WORK, 'broken-out') });
    expect(run.exitCode).toBe(1);
    expect(run.report.summary.P1).toBeGreaterThanOrEqual(1);
  });

  it('proposes fixes without applying them', async () => {
    const dir = page({ 'index.html': BAD_HTML }, 'fix-site');
    const before = readFileSync(join(dir, 'index.html'), 'utf8');
    const run = await runAudit({
      target: dir,
      mode: 'quick',
      outDir: join(WORK, 'fix-out'),
      fixPlan: true,
    });
    expect(run.fixPlanPath).not.toBeNull();
    const plan = JSON.parse(readFileSync(run.fixPlanPath as string, 'utf8')) as {
      proposals: { requiresApproval: boolean; applied: boolean }[];
      note: string;
    };
    expect(plan.proposals.length).toBe(run.report.findings.length);
    expect(plan.proposals.every((p) => p.requiresApproval && !p.applied)).toBe(true);
    expect(plan.note).toMatch(/applies none/);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe(before);
  });

  it('fails cleanly on a target that does not exist', async () => {
    await expect(
      runAudit({ target: join(WORK, 'nope'), mode: 'quick', outDir: join(WORK, 'nope-out') }),
    ).rejects.toThrow(/does not exist/);
  });

  it('fails cleanly when a directory has no HTML to audit', async () => {
    const dir = page({ 'a.css': 'body{}' }, 'no-html');
    await expect(
      runAudit({ target: dir, mode: 'quick', outDir: join(WORK, 'no-html-out') }),
    ).rejects.toThrow(/no \.html file/);
  });

  it('refuses an unauthorized remote target before any request', async () => {
    await expect(
      runAudit({ target: 'https://example.com', mode: 'quick', outDir: join(WORK, 'remote-out') }),
    ).rejects.toThrow(/not authorized/);
  });

  it('is reproducible: same target and options give the same finding ids', async () => {
    const dir = page({ 'index.html': BAD_HTML }, 'repeat-site');
    const a = await runAudit({ target: dir, mode: 'quick', outDir: join(WORK, 'rep-a') });
    const b = await runAudit({ target: dir, mode: 'quick', outDir: join(WORK, 'rep-b') });
    expect(b.report.findings.map((f) => f.id)).toEqual(a.report.findings.map((f) => f.id));
    expect(b.report.summary).toEqual(a.report.summary);
  });
});

describe('reflow check covers both halves of G7', () => {
  /** A clean 320 px cell plus the 400% zoom equivalence record, as the harness emits them. */
  const reflowGroup = (
    zoom400: Record<string, unknown> | null,
  ): LiveGroup<import('../src/index.js').HardeningResult> =>
    ({
      samples: [
        {
          route: '/',
          value: {
            url: 'http://127.0.0.1:1/',
            cells: [
              {
                viewport: 'mobile-320',
                theme: 'light',
                reducedMotion: 'no-preference',
                metrics: {
                  url: 'http://127.0.0.1:1/',
                  title: 'Audit fixture',
                  horizontalOverflow: false,
                  documentScrollWidth: 320,
                  documentClientWidth: 320,
                  overflowingElements: [],
                  cls: 0,
                  lcpMs: 700,
                  smallTapTargets: [],
                  landmarks: ['main'],
                  headings: [{ level: 1, text: 'Audit fixture' }],
                },
                overflow: false,
                pass: true,
              },
            ],
            failures: [],
            localeSet: ['en'],
            zoom400,
            zoomNote: zoom400 === null ? '400%-zoom equivalence not-run' : 'measured',
          },
        },
      ],
      failed: [],
      skipped: null,
    }) as unknown as LiveGroup<import('../src/index.js').HardeningResult>;

  const inputs = (zoom400: Record<string, unknown> | null): AuditInputs => ({
    mode: 'deep',
    target: { kind: 'local-path', path: '/site', url: 'http://127.0.0.1:1', routes: ['/'] },
    generatedAt: '2026-11-16T00:00:00Z',
    provenance: { evaluator: 'sus-eval audit 1', node: 'v22', platform: 'linux/x64', browser: 'x' },
    html: [],
    slop: { results: [], reason: 'no source' },
    capture: emptyGroup('not requested'),
    reflow: reflowGroup(zoom400),
    axe: emptyGroup('not requested'),
    keyboard: emptyGroup('not requested'),
    lighthouse: emptyGroup('not requested'),
  });

  const cleanZoom = {
    url: 'http://127.0.0.1:1/',
    width: 320,
    height: 256,
    deviceScaleFactor: 4,
    theme: 'light',
    reducedMotion: 'no-preference',
    documentScrollWidth: 320,
    documentClientWidth: 320,
    overflowingElements: [],
    clippingElements: [],
    overflow: false,
  };

  it('passes only when both the 320 px column and the zoom record are clean', () => {
    const report = composeReport(inputs(cleanZoom));
    const check = report.checks.find((c) => c.id === 'reflow-matrix');
    expect(check?.status).toBe('pass');
    expect(check?.detail.join(' ')).toMatch(/400% zoom equivalence/);
  });

  it('is not-run when the zoom half was never measured, never pass', () => {
    const report = composeReport(inputs(null));
    const check = report.checks.find((c) => c.id === 'reflow-matrix');
    expect(check?.status).toBe('not-run');
    expect(check?.reason).toMatch(/400% zoom/);
    expect(report.summary.incomplete).toBe(true);
  });

  it('reports zoom overflow and clipping as measured findings at the zoom viewport', () => {
    const report = composeReport(
      inputs({
        ...cleanZoom,
        documentScrollWidth: 704,
        overflowingElements: ['table.records'],
        clippingElements: [{ selector: '.sticky-toolbar', overflow: 'hidden', overflowPx: 120 }],
        overflow: true,
      }),
    );
    expect(report.checks.find((c) => c.id === 'reflow-matrix')?.status).toBe('fail');
    const zoomFindings = report.findings.filter((f) => f.viewport === 'zoom-400');
    expect(zoomFindings.length).toBe(2);
    expect(zoomFindings.map((f) => f.observation.confidence)).toEqual(['measured', 'measured']);
    expect(zoomFindings.map((f) => f.observation.location)).toEqual([
      'table.records',
      '.sticky-toolbar',
    ]);
    expect(zoomFindings.map((f) => f.severity)).toEqual(['P1', 'P1']);
    // Measured findings now carry the numbers behind them, not just a verdict: a proposal
    // built from them can state observed vs expected instead of asserting an opinion.
    expect(zoomFindings[0]!.observation.observed).toEqual({
      value: 704,
      unit: 'CSS px document width',
    });
    expect(zoomFindings[0]!.observation.expected).toEqual({
      value: 320,
      unit: 'CSS px document width',
    });
    expect(zoomFindings[1]!.observation.observed).toEqual({
      value: 120,
      unit: 'CSS px clipped content',
    });
  });
});

describe('reports never land inside the audited tree', () => {
  it('refuses an --out equal to or inside the --path target', async () => {
    const target = mkdtempSync(join(tmpdir(), 'sus-out-guard-'));
    writeFileSync(join(target, 'index.html'), '<!doctype html><title>t</title><p>x</p>');
    await expect(
      runAudit({
        target,
        liveUrl: null,
        mode: 'quick',
        outDir: target,
        routes: null,
        authorizedHosts: [],
        fixPlan: false,
      }),
    ).rejects.toThrow(/refusing --out inside the audited target/);
    await expect(
      runAudit({
        target,
        liveUrl: null,
        mode: 'quick',
        outDir: join(target, 'report'),
        routes: null,
        authorizedHosts: [],
        fixPlan: false,
      }),
    ).rejects.toThrow(/refusing --out inside the audited target/);
    // A sibling directory is fine: the guard is about the tree under measurement.
    const out = mkdtempSync(join(tmpdir(), 'sus-out-ok-'));
    const run = await runAudit({
      target,
      liveUrl: null,
      mode: 'quick',
      outDir: out,
      routes: null,
      authorizedHosts: [],
      fixPlan: false,
    });
    expect(run.reportPath.startsWith(out)).toBe(true);
  }, 60000);
});
