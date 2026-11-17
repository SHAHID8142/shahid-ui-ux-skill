/**
 * Compose the audit report from observations (T1012/T1013, issue #13).
 *
 * Pure: no browser, no filesystem, no clock. It takes whatever the collectors
 * managed to measure plus the reason for anything they could not, and produces a
 * validated report. That split is what makes the adversarial cases testable — a
 * missing measurement is a plain input here, not an exception.
 *
 * Design rule: this is a composer, not a second audit engine. Every verdict comes
 * from an evaluator that already owns the gate (evaluateG4, evaluateG5,
 * evaluateG11, checkSeo, scanText). When an evaluator cannot be fed, the result is
 * not-run, never a synthesised pass.
 */
import type { EvidenceBundleData } from '@sus/schemas';
import { evaluateG11 } from '@sus/schemas';
import type { ScanResult } from '@sus/scanners';
import { checkSeo } from '@sus/scanners';
import type { AxeScanResult, LighthouseSummary } from '../harness/a11y-budgets.js';
import type { KeyboardScanResult } from '../harness/keyboard.js';
import { evaluateG4, evaluateG5 } from '../harness/a11y-budgets.js';
import type { CaptureResult } from '../harness/capture.js';
import type { HardeningResult } from '../hardening.js';
import type { AuditMode } from './contract.js';
import { AUDIT_CHECKS, AUDIT_VIEWPORTS } from './contract.js';
import type {
  AuditCheckResult,
  AuditFinding,
  AuditReport,
  AuditTarget,
  MetricValue,
} from './report.js';
import {
  AuditReport as AuditReportSchema,
  NEEDS_REVIEW_ITEMS,
  checkResult,
  finding,
  summariseFindings,
  sortFindings,
} from './report.js';

const TAP_TARGET_MIN = 44;

export interface RouteHtml {
  readonly route: string;
  readonly html: string | null;
  /** Why the HTML is missing (fetch failed, no build output, non-html response). */
  readonly reason?: string;
}

export interface LiveSample<T> {
  readonly route: string;
  readonly value: T;
}

/**
 * One live phase across every route. `skipped` is set when the whole phase could
 * not run (no browser, no URL); `failed` names the routes that produced no
 * measurement. Either one makes the phase incomplete, never passing.
 */
export interface LiveGroup<T> {
  readonly samples: readonly LiveSample<T>[];
  readonly failed: readonly { readonly route: string; readonly reason: string }[];
  readonly skipped: string | null;
}

export function emptyGroup<T>(skipped: string | null): LiveGroup<T> {
  return { samples: [], failed: [], skipped };
}

export interface SlopInput {
  /** One scan per file: findings stay attributable to the file that produced them. */
  readonly results: readonly ScanResult[];
  readonly reason: string | null;
}

/**
 * A recorded artefact a finding can point at: the path as it will appear in the
 * report directory, plus the sha256 the writer computed. Finding code never
 * hashes anything itself — the pipeline is the only layer that touches files.
 */
export interface ArtifactRef {
  readonly path: string;
  readonly hash: string;
}

export interface AuditInputs {
  readonly mode: AuditMode;
  readonly target: AuditTarget;
  readonly generatedAt: string;
  readonly provenance: AuditReport['provenance'];
  readonly html: readonly RouteHtml[];
  readonly slop: SlopInput;
  readonly capture: LiveGroup<CaptureResult>;
  readonly reflow: LiveGroup<HardeningResult>;
  readonly keyboard: LiveGroup<KeyboardScanResult>;
  readonly axe: LiveGroup<AxeScanResult>;
  readonly lighthouse: LiveGroup<LighthouseSummary>;
  /** axe runs confined to selected subtrees (issue #21 R2); empty when no scope was requested. */
  readonly scopedAxe?: LiveGroup<AxeScanResult>;
  /**
   * Recorded artefacts keyed by the route they belong to. Only the pipeline can
   * fill this: it is the layer that writes files and can therefore hash them.
   */
  readonly artifacts?: ReadonlyMap<string, ArtifactRef>;
}

function reasonFor<T>(group: LiveGroup<T>): string | null {
  if (group.skipped !== null) return group.skipped;
  if (group.failed.length === 0) return null;
  const parts = group.failed.map((f) => f.route + ': ' + f.reason);
  return 'no measurement for ' + parts.join('; ');
}

function captureFindings(samples: readonly LiveSample<CaptureResult>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    for (const combo of sample.value.combos) {
      // Capture still runs at 390/768/1440 only; 320 is measured by the reflow matrix.
      const critical = combo.viewport === 'mobile';
      if (combo.metrics.horizontalOverflow) {
        found.push(
          finding({
            check: 'capture-matrix',
            severity: critical ? 'P0' : 'P1',
            effort: 'structural',
            title:
              'Horizontal overflow at ' + captureViewportName(combo.viewport) + '/' + combo.theme,
            detail:
              'The document scrolls sideways at ' +
              captureViewportName(combo.viewport) +
              ' (' +
              combo.theme +
              '), so content is clipped or the layout scrolls instead of reflowing.',
            route: sample.route,
            viewport: captureViewportName(combo.viewport),
            evidence: combo.metrics.overflowingElements.slice(0, 5),
            expected: { value: combo.metrics.documentClientWidth, unit: 'CSS px document width' },
            observed: { value: combo.metrics.documentScrollWidth, unit: 'CSS px document width' },
            evaluator: 'captureMatrix + collectPageMetrics',
            location: combo.metrics.overflowingElements[0] ?? null,
            confidence: 'measured',
            remediation:
              'Measure with CSS instead of JavaScript where possible and let the content wrap: remove the fixed width or min-width on the offending element, allow text to break, and keep any deliberate scroller inside its own container.',
          }),
        );
      }
      if (combo.metrics.smallTapTargets.length > 0 && critical) {
        // One finding per control, not one per viewport: a scoped proposal has to be able to
        // attribute a defect to the element it is about (T1023), and a reader fixing the
        // navigation should not be handed an unrelated form field. Capped so a page with
        // hundreds of small controls still produces a readable report.
        for (const target of combo.metrics.smallTapTargets.slice(0, 10)) {
          found.push(
            finding({
              check: 'capture-matrix',
              severity: 'P2',
              effort: 'quick-win',
              title: 'Tap target below 44x44 css px at ' + captureViewportName(combo.viewport),
              detail:
                target.selector +
                ' measures ' +
                target.width +
                'x' +
                target.height +
                ' px at ' +
                captureViewportName(combo.viewport) +
                ', below the ' +
                TAP_TARGET_MIN +
                ' px minimum.',
              route: sample.route,
              viewport: captureViewportName(combo.viewport),
              evidence: [target.selector],
              evaluator: 'captureMatrix + collectPageMetrics',
              expected: { value: TAP_TARGET_MIN, unit: 'css px' },
              observed: { value: Math.min(target.width, target.height), unit: 'css px' },
              location: target.selector,
              confidence: 'measured',
              remediation:
                'Give the control at least 44 by 44 css px of tappable area with padding or a pseudo-element, and keep at least 8 px between neighbouring targets.',
            }),
          );
        }
      }
    }
  }
  return found;
}

function reflowFindings(samples: readonly LiveSample<HardeningResult>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    for (const cell of sample.value.cells) {
      if (!cell.overflow) continue;
      const critical = cell.viewport === 'mobile-320' || cell.viewport === 'mobile-390';
      found.push(
        finding({
          check: 'reflow-matrix',
          severity: critical ? 'P0' : 'P1',
          effort: 'structural',
          title:
            'Horizontal overflow at ' + cell.viewport + '/' + cell.theme + '/' + cell.reducedMotion,
          detail:
            'The page keeps a horizontal scrollbar at ' +
            cell.viewport +
            ', which breaks the reflow requirement (G7).',
          route: sample.route,
          viewport: cell.viewport,
          evidence: cell.metrics.overflowingElements.slice(0, 5),
          expected: { value: cell.metrics.documentClientWidth, unit: 'CSS px document width' },
          observed: { value: cell.metrics.documentScrollWidth, unit: 'CSS px document width' },
          evaluator: 'runHardeningMatrix + collectPageMetrics',
          location: cell.metrics.overflowingElements[0] ?? null,
          confidence: 'measured',
          remediation:
            'Find the element wider than the 320 px viewport and let it shrink: max-width: 100%, wrapping flex or grid tracks, and break-word on long unbroken strings. Hiding the overflow is not a fix.',
        }),
      );
    }

    // The 400% zoom equivalence is its own measurement (G7's second half): a
    // fixed header that fits a 568 px phone viewport can eat a 256 px one, so a
    // clean mobile-320 cell does not cover it.
    const zoom = sample.value.zoom400;
    if (zoom?.overflow) {
      const culprits = zoom.overflowingElements.slice(0, 5);
      found.push(
        finding({
          check: 'reflow-matrix',
          severity: 'P1',
          effort: 'structural',
          title:
            'Horizontal overflow at 400% zoom equivalence (' +
            zoom.width +
            'x' +
            zoom.height +
            ' CSS px, dsf ' +
            zoom.deviceScaleFactor +
            ')',
          detail:
            'At the CSS px viewport a 400% zoom produces on a 1280x1024 window, the page needs ' +
            'two-dimensional scrolling, which breaks the reflow requirement (G7). The 320 px ' +
            'phone column does not cover this viewport: its height differs.',
          route: sample.route,
          viewport: 'zoom-400',
          evidence: culprits.length > 0 ? culprits : ['document root'],
          expected: { value: zoom.width, unit: 'CSS px document width' },
          observed: { value: zoom.documentScrollWidth, unit: 'CSS px document width' },
          evaluator: 'runHardeningMatrix zoom400 + collectPageMetrics',
          location: culprits[0] ?? null,
          confidence: 'measured',
          remediation:
            'Let the wide element shrink or wrap (max-width: 100%, wrapping flex/grid tracks, ' +
            'break-word) and keep fixed headers/footers from consuming the short viewport.',
        }),
      );
    }
    for (const clip of zoom?.clippingElements ?? []) {
      found.push(
        finding({
          check: 'reflow-matrix',
          severity: 'P1',
          effort: 'structural',
          title: 'Content clipped instead of reflowed at 400% zoom: ' + clip.selector,
          detail:
            'The container uses overflow:' +
            clip.overflow +
            ' and still has content overflowing it at the 400% zoom equivalence viewport. ' +
            'Hiding the overflow is not reflowing: the content stays unreachable.',
          route: sample.route,
          viewport: 'zoom-400',
          evidence: [clip.selector],
          expected: { value: 0, unit: 'CSS px clipped content' },
          observed: { value: clip.overflowPx, unit: 'CSS px clipped content' },
          evaluator: 'runHardeningMatrix zoom400 clipping probe',
          location: clip.selector,
          confidence: 'measured',
          remediation:
            'Remove the clipping and let the container reflow, or make the region a deliberate ' +
            'scroll container with a visible cue and keyboard access.',
        }),
      );
    }
  }
  return found;
}

/**
 * Keyboard findings. Severity is deliberately conservative: a missing indicator is
 * P1 (WCAG 2.4.7 — a sighted keyboard user cannot see where they are), a detour is
 * P1 (focus left the page), and a cycle is P2 because a modal's intentional trap is
 * legal and this check does not press Escape.
 */
function keyboardFindings(samples: readonly LiveSample<KeyboardScanResult>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    const result = sample.value;
    for (const selector of result.indicatorMissing) {
      found.push(
        finding({
          check: 'keyboard-flow',
          severity: 'P1',
          effort: 'quick-win',
          title: 'Focusable element paints no visible focus indicator: ' + selector,
          detail:
            'While focused by keyboard, this element reports no outline and no box-shadow. A ' +
            'keyboard user cannot see where focus is, which is WCAG 2.4.7 (Focus Visible).',
          route: sample.route,
          viewport: null,
          evidence: [selector],
          evaluator: 'scanKeyboard (Tab traversal, computed style while focused)',
          location: selector,
          confidence: 'measured',
          remediation:
            'Style :focus-visible with an outline, or a ring drawn with box-shadow, that survives ' +
            "the component's own background; never remove the UA outline without a replacement.",
        }),
      );
    }
    if (result.detours > 0 && result.focusable > 0) {
      found.push(
        finding({
          check: 'keyboard-flow',
          severity: 'P1',
          effort: 'structural',
          title: 'Tab order leaves the document ' + result.detours + ' time(s)',
          detail:
            'Focus moved to the document body while ' +
            result.focusable +
            ' focusable element(s) are present, so a keyboard user is dropped out of the page ' +
            'instead of moving to the next control.',
          route: sample.route,
          viewport: null,
          evidence: ['body'],
          evaluator: 'scanKeyboard (Tab traversal)',
          expected: { value: 0, unit: 'detours' },
          observed: { value: result.detours, unit: 'detours' },
          location: null,
          confidence: 'measured',
          remediation:
            'Remove positive tabindex values and hidden-but-focusable elements (use display: none ' +
            'or visibility: hidden rather than opacity/offscreen), so the sequence stays inside the page.',
        }),
      );
    }
    if (result.cycle !== null) {
      found.push(
        finding({
          check: 'keyboard-flow',
          severity: 'P2',
          effort: 'quick-win',
          title: 'Focus cycles through ' + result.cycle.selector,
          detail:
            'The same element received focus ' +
            result.cycle.repeats +
            ' times within the traversal. Inside a modal this is intended and needs a dismissal ' +
            'path (Escape); outside one it traps keyboard focus. This check does not press Escape, ' +
            'so it reports what was observed, not which case it is.',
          route: sample.route,
          viewport: null,
          evidence: [result.cycle.selector],
          evaluator: 'scanKeyboard (Tab traversal)',
          location: result.cycle.selector,
          confidence: 'measured',
          remediation:
            'If this is a dialog, keep the trap and verify Escape closes it; otherwise remove the ' +
            'handler that returns focus to the same control.',
        }),
      );
    }
  }
  return found;
}

function axeFindings(samples: readonly LiveSample<AxeScanResult>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    for (const violation of sample.value.violations) {
      const impact = violation.impact;
      if (impact !== 'serious' && impact !== 'critical') continue;
      found.push(
        finding({
          check: 'axe-a11y',
          severity: 'P0',
          effort: 'structural',
          title: violation.id + ' (' + impact + ')',
          detail:
            violation.help +
            ' Affects ' +
            violation.nodes +
            ' node(s). An accessibility barrier is a P0: it blocks real users.',
          route: sample.route,
          viewport: null,
          evidence: [violation.id],
          evaluator: 'scanA11y + evaluateG4',
          expected: { value: 0, unit: 'serious/critical violations' },
          observed: { value: violation.nodes, unit: 'affected nodes' },
          location: violation.id,
          confidence: 'measured',
          remediation:
            'Fix the underlying markup, not the axe rule: ' +
            violation.help +
            ' Re-run the scan to confirm the violation count reaches zero.',
        }),
      );
    }
  }
  return found;
}

/**
 * Findings from the scope-confined axe runs (issue #21 R2).
 *
 * These are the same violations the page-wide scan may also report, but seen from inside one
 * element: axe was told to include only that subtree, so `location` can honestly name the selection
 * instead of the rule id. They are kept separate from the page-wide findings so the G4 verdict keeps
 * describing the whole page.
 */
function scopedAxeFindings(samples: readonly LiveSample<AxeScanResult>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    const scope = sample.value.scope;
    if (scope === undefined) continue;
    for (const violation of sample.value.violations) {
      const impact = violation.impact;
      if (impact !== 'serious' && impact !== 'critical') continue;
      found.push(
        finding({
          check: 'axe-a11y',
          severity: 'P0',
          effort: 'structural',
          title: violation.id + ' (' + impact + ') within ' + scope,
          detail:
            violation.help +
            ' Affects ' +
            violation.nodes +
            ' node(s) inside the selected element. The scan was confined to that element, so this ' +
            'finding belongs to the selection rather than somewhere on the page.',
          route: sample.route,
          viewport: null,
          evidence: [violation.id],
          evaluator: 'scanA11y(include: scope)',
          expected: { value: 0, unit: 'serious/critical violations in scope' },
          observed: { value: violation.nodes, unit: 'affected nodes in scope' },
          location: scope,
          confidence: 'measured',
          remediation:
            'Fix the markup inside ' +
            scope +
            ': ' +
            violation.help +
            ' Re-run the scoped scan to confirm the count reaches zero.',
        }),
      );
    }
  }
  return found;
}

/**
 * One P1 per measured budget miss, per route. The G5 verdict detail lists every
 * metric it checked, including the ones that passed, so only lines that actually
 * failed become findings: a budget row inside its limit is never a defect.
 */
function lighthouseFindings(samples: readonly LiveSample<LighthouseSummary>[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const sample of samples) {
    const verdict = evaluateG5([sample.value]);
    if (verdict.status === 'pass') continue;
    const misses = verdict.detail.filter(
      (line) => line.includes('EXCEEDED') || line.includes('FAIL CLOSED'),
    );
    // A fail with no attributable row still has to surface: the gate failed, so the
    // audit cannot stay silent about it.
    const lines =
      misses.length > 0
        ? misses
        : ['G5 failed for this run without an attributable metric — the budget run is invalid'];
    for (const line of lines) {
      found.push(
        finding({
          check: 'lighthouse-budgets',
          severity: 'P1',
          effort: 'structural',
          title: 'Budget miss: ' + metricOf(line),
          detail: line,
          route: sample.route,
          viewport: 'desktop-1440',
          evidence: ['G5'],
          evaluator: 'runLighthouse + evaluateG5',
          ...budgetObservationOf(line),
          confidence: 'measured',
          location: null,
          remediation:
            'Reduce the cost behind this metric before changing the budget: ' +
            'image and font weight for transfer size, render-blocking work for LCP, ' +
            'long tasks for TBT, and reserved space for CLS.',
        }),
      );
    }
  }
  return found;
}

/** The metric label inside a G5 detail line, e.g. "LCP ms" from "<url> LCP ms: 900 / limit 2500". */
function metricOf(line: string): string {
  const match = / (LCP ms|CLS|TBT ms|totalBytes):/.exec(line);
  return match?.[1] ?? 'budget';
}

const METRIC_UNIT: Readonly<Record<string, string>> = {
  'LCP ms': 'ms',
  CLS: 'score',
  'TBT ms': 'ms',
  totalBytes: 'bytes',
};

/**
 * Expected and observed values from one G5 row. A fail-closed row has no reading,
 * so what was observed is the absence itself: the finding reports `not reported`
 * instead of pretending the metric was zero, and a reader can still check that
 * claim against the Lighthouse artifact.
 */
function budgetObservationOf(line: string): {
  expected: MetricValue;
  observed: MetricValue;
} {
  const unit = METRIC_UNIT[metricOf(line)] ?? 'unit';
  const limit = / \/ limit ([\d.]+)/.exec(line)?.[1];
  const read = /: ([\d.]+) \/ limit/.exec(line)?.[1];
  const expected: MetricValue =
    limit === undefined ? { value: 'within budget', unit } : { value: Number(limit), unit };
  return {
    expected,
    observed: read === undefined ? { value: 'not reported', unit } : { value: Number(read), unit },
  };
}

const SEO_SEVERITY: Readonly<Record<string, 'P1' | 'P2'>> = {
  'no-placeholders': 'P1',
};

function seoFindings(html: readonly RouteHtml[]): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const entry of html) {
    if (entry.html === null) continue;
    const result = checkSeo(entry.html);
    for (const check of result.checks) {
      if (check.status === 'pass') continue;
      const measured =
        check.observed === undefined || check.expected === undefined || check.unit === undefined
          ? null
          : {
              expected: { value: check.expected, unit: check.unit },
              observed: { value: check.observed, unit: check.unit },
            };
      found.push(
        finding({
          check: 'seo-structure',
          severity: SEO_SEVERITY[check.id] ?? 'P2',
          effort: 'quick-win',
          title: check.id,
          detail: check.detail,
          route: entry.route,
          viewport: null,
          evidence: [check.id],
          evaluator: 'checkSeo',
          location: entry.route,
          ...(measured === null ? {} : measured),
          confidence: 'measured',
          remediation: 'Correct the HTML this check inspects: ' + check.detail,
        }),
      );
    }
  }
  return found;
}

function slopFindings(input: SlopInput): AuditFinding[] {
  const found: AuditFinding[] = [];
  for (const result of input.results) {
    for (const entry of result.findings) {
      const blocking = entry.severity === 'blocking';
      found.push(
        finding({
          check: 'anti-slop',
          severity: blocking ? 'P2' : 'P3',
          effort: 'quick-win',
          title: entry.category,
          detail: result.file + ':' + entry.line + ' ' + entry.matched + ' — ' + entry.snippet,
          route: null,
          viewport: null,
          evidence: [result.file + ':' + entry.line],
          evaluator: 'scanText',
          location: result.file + ':' + entry.line,
          confidence: 'inferred',
          remediation:
            'Replace the placeholder with the real content, or delete the element. A pattern match cannot tell whether a specific line is deliberate, so confirm the context before editing.',
        }),
      );
    }
  }
  return found;
}

export function buildEvidenceBundle(inputs: AuditInputs): EvidenceBundleData | null {
  const shots: EvidenceBundleData['shots'] = [];
  const metrics: EvidenceBundleData['metrics'] = [];
  const gates: EvidenceBundleData['gates'] = [];
  for (const sample of inputs.capture.samples) {
    for (const combo of sample.value.combos) {
      const viewport = combo.viewport === 'mobile' ? 'mobile' : combo.viewport;
      shots.push({
        viewport: viewport as 'mobile' | 'tablet' | 'desktop',
        theme: combo.theme,
        path: combo.screenshot,
      });
      metrics.push({
        url: combo.metrics.url,
        title: combo.metrics.title,
        horizontalOverflow: combo.metrics.horizontalOverflow,
        overflowingElements: combo.metrics.overflowingElements,
        cls: combo.metrics.cls,
        lcpMs: Math.max(0, combo.metrics.lcpMs),
        smallTapTargets: combo.metrics.smallTapTargets,
        landmarks: combo.metrics.landmarks,
        headings: combo.metrics.headings,
      });
    }
  }
  const axe = inputs.axe.samples.map((s) => s.value);
  if (axe.length > 0) {
    const verdict = evaluateG4(axe);
    gates.push({ gate: 'G4', status: verdict.status, detail: verdict.detail });
  }
  const lh = inputs.lighthouse.samples.map((s) => s.value);
  if (lh.length > 0) {
    const verdict = evaluateG5(lh);
    gates.push({ gate: 'G5', status: verdict.status, detail: verdict.detail });
  }
  if (shots.length === 0 || metrics.length === 0 || gates.length === 0) return null;
  return {
    subject: inputs.target.url ?? inputs.target.path ?? 'audit-target',
    provenance: 'sus-eval audit (' + inputs.mode + ')',
    generatedAt: inputs.generatedAt,
    shots,
    metrics,
    gates,
  };
}

/**
 * The viewport names the capture matrix photographs. The matrix shoots at
 * exactly these widths, so a finding can only cite a shot when its viewport name
 * appears here; `mobile-320` deliberately does not, because the reflow matrix
 * measures that column without taking a picture.
 */
const CAPTURE_VIEWPORT_NAME: Readonly<Record<string, string>> = {
  mobile: 'mobile-390',
  tablet: 'tablet-768',
  desktop: 'desktop-1440',
};

export function captureViewportName(viewport: string): string {
  return CAPTURE_VIEWPORT_NAME[viewport] ?? viewport;
}

/**
 * Point a finding at the artefact that records it, when one exists. A finding
 * with no artefact keeps `null` and says so: an invented hash would be worse than
 * an absent one, because it would look checkable and not be.
 */
function attachArtifacts(
  findings: readonly AuditFinding[],
  artifacts: ReadonlyMap<string, ArtifactRef> | undefined,
): AuditFinding[] {
  if (artifacts === undefined || artifacts.size === 0) return [...findings];
  return findings.map((item) => {
    if (item.route === null || item.observation.artifact !== null) return item;
    // The artefact must be the recording of the screen the finding names. A
    // tablet finding cites the tablet shot, never the mobile one; the route-level
    // fallback is only for findings that name no viewport at all (axe, SEO,
    // source scans). A width that was never photographed — the 320 px reflow
    // column — stays null rather than borrowing a nearby shot.
    const ref =
      (item.viewport === null ? undefined : artifacts.get(item.route + '|' + item.viewport)) ??
      (item.viewport === null ? artifacts.get(item.route + '|*') : undefined);
    if (ref === undefined) return item;
    return {
      ...item,
      observation: { ...item.observation, artifact: ref.path, artifactHash: ref.hash },
    };
  });
}

function seoCheck(html: readonly RouteHtml[]): AuditCheckResult {
  const evaluated = html.filter((e) => e.html !== null);
  if (evaluated.length === 0) {
    const reason =
      html.length === 0
        ? 'no route was supplied'
        : html.map((e) => e.route + ': ' + (e.reason ?? 'no HTML')).join('; ');
    return checkResult(
      'seo-structure',
      'SEO/structure checks on served or built HTML',
      'G3',
      'not-run',
      [],
      reason,
    );
  }
  const detail: string[] = [];
  let failed = false;
  for (const entry of evaluated) {
    const result = checkSeo(entry.html as string);
    if (result.g3.status === 'fail' || result.g9.status === 'fail') failed = true;
    for (const line of [...result.g3.detail, ...result.g9.detail]) {
      detail.push(entry.route + ': ' + line);
    }
  }
  const missing = html.filter((e) => e.html === null);
  if (missing.length > 0) {
    return checkResult(
      'seo-structure',
      'SEO/structure checks on served or built HTML',
      'G3',
      'not-run',
      detail,
      'no HTML for ' + missing.map((e) => e.route).join(', '),
    );
  }
  return checkResult(
    'seo-structure',
    'SEO/structure checks on served or built HTML',
    'G3',
    failed ? 'fail' : 'pass',
    detail,
  );
}

function slopCheck(input: SlopInput): AuditCheckResult {
  if (input.results.length === 0) {
    return checkResult(
      'anti-slop',
      'Anti-slop source scan',
      null,
      'not-run',
      [],
      input.reason ?? 'no source could be scanned',
    );
  }
  let lines = 0;
  let blocked = 0;
  let advisory = 0;
  for (const result of input.results) {
    lines += result.stats.lines;
    blocked += result.stats.blocked;
    advisory += result.stats.advisory;
  }
  return checkResult('anti-slop', 'Anti-slop source scan', null, blocked > 0 ? 'fail' : 'pass', [
    input.results.length + ' file(s) scanned, ' + lines + ' line(s)',
    blocked + ' blocking, ' + advisory + ' advisory',
  ]);
}

/** Compose and validate. Throws when the report would be internally inconsistent. */
export function composeReport(inputs: AuditInputs): AuditReport {
  const checks: AuditCheckResult[] = [];
  const findings: AuditFinding[] = [];
  const needsReview: string[] = [...NEEDS_REVIEW_ITEMS];

  const captureReason = reasonFor(inputs.capture);
  const capturePass = inputs.capture.samples.length + inputs.capture.failed.length;
  const captureProblems = captureFindings(inputs.capture.samples);
  findings.push(...captureProblems);
  checks.push(
    captureReason === null
      ? checkResult(
          'capture-matrix',
          'Capture matrix per viewport and theme',
          'G8',
          captureProblems.length > 0 ? 'fail' : 'pass',
          [capturePass + ' viewport/theme combination(s) captured'],
        )
      : checkResult(
          'capture-matrix',
          'Capture matrix per viewport and theme',
          'G8',
          'not-run',
          [],
          captureReason,
        ),
  );

  const reflowReason = reasonFor(inputs.reflow);
  const reflowProblems = reflowFindings(inputs.reflow.samples);
  findings.push(...reflowProblems);
  const cellCount = inputs.reflow.samples.reduce((n, s) => n + s.value.cells.length, 0);
  // G7 has two halves. The 320 px column does not stand in for the 400% zoom
  // equivalence, so a run that produced cells but no zoom record is `not-run`
  // (report incomplete), never `pass`.
  const zoomMeasured = inputs.reflow.samples.filter((s) => s.value.zoom400 !== null).length;
  const zoomMissing =
    reflowReason === null && inputs.reflow.samples.length > 0 && zoomMeasured === 0;
  checks.push(
    reflowReason !== null
      ? checkResult(
          'reflow-matrix',
          'Reflow matrix at 320/390/1440 in both themes',
          'G7',
          'not-run',
          [],
          reflowReason,
        )
      : zoomMissing
        ? checkResult(
            'reflow-matrix',
            'Reflow matrix at 320/390/1440 in both themes',
            'G7',
            'not-run',
            [cellCount + ' cell(s) measured'],
            'the 400% zoom equivalence was not measured on any route, and the 320 px column does not stand in for it',
          )
        : checkResult(
            'reflow-matrix',
            'Reflow matrix at 320/390/1440 in both themes',
            'G7',
            reflowProblems.length > 0 ? 'fail' : 'pass',
            [
              cellCount + ' cell(s) measured',
              zoomMeasured +
                ' route(s) measured at the 400% zoom equivalence (320x256 CSS px, device scale factor 4)',
            ],
          ),
  );

  const keyboardReason = reasonFor(inputs.keyboard);
  const keyboardProblems = keyboardFindings(inputs.keyboard.samples);
  findings.push(...keyboardProblems);
  const keyboardStops = inputs.keyboard.samples.reduce((n, s) => n + s.value.stops.length, 0);
  checks.push(
    keyboardReason === null && inputs.keyboard.samples.length > 0
      ? checkResult(
          'keyboard-flow',
          'Keyboard traversal, focus indicator, detours and cycles',
          'G9',
          keyboardProblems.length > 0 ? 'fail' : 'pass',
          [
            keyboardStops +
              ' Tab stop(s) recorded across ' +
              inputs.keyboard.samples.length +
              ' route(s)',
          ],
        )
      : checkResult(
          'keyboard-flow',
          'Keyboard traversal, focus indicator, detours and cycles',
          'G9',
          'not-run',
          [],
          keyboardReason ?? 'no keyboard traversal was recorded',
        ),
  );

  const axeReason = reasonFor(inputs.axe);
  const axeSamples = inputs.axe.samples.map((s) => s.value);
  const axeProblems = axeFindings(inputs.axe.samples);
  findings.push(...axeProblems);
  const scopedProblems = scopedAxeFindings(inputs.scopedAxe?.samples ?? []);
  findings.push(...scopedProblems);
  if (axeReason === null && axeSamples.length > 0) {
    const verdict = evaluateG4(axeSamples);
    checks.push(
      checkResult('axe-a11y', 'axe accessibility scan', 'G4', verdict.status, verdict.detail),
    );
  } else {
    checks.push(
      checkResult(
        'axe-a11y',
        'axe accessibility scan',
        'G4',
        'not-run',
        [],
        axeReason ?? 'no axe scan was produced',
      ),
    );
  }

  const lhReason = reasonFor(inputs.lighthouse);
  const lhSamples = inputs.lighthouse.samples.map((s) => s.value);
  findings.push(...lighthouseFindings(inputs.lighthouse.samples));
  if (lhReason === null && lhSamples.length > 0) {
    const verdict = evaluateG5(lhSamples);
    checks.push(
      checkResult('lighthouse-budgets', 'Lighthouse budgets', 'G5', verdict.status, verdict.detail),
    );
  } else {
    checks.push(
      checkResult(
        'lighthouse-budgets',
        'Lighthouse budgets',
        'G5',
        'not-run',
        [],
        lhReason ?? 'no Lighthouse run was produced',
      ),
    );
  }

  findings.push(...seoFindings(inputs.html));
  checks.push(seoCheck(inputs.html));

  findings.push(...slopFindings(inputs.slop));
  checks.push(slopCheck(inputs.slop));

  checks.push(
    checkResult(
      'transition-oracle',
      'State-transition oracle cases',
      'G6',
      'not-run',
      [],
      'no transition cases were authored for this target: the oracle needs per-component scenarios and the audit does not invent them',
    ),
  );

  const bundle = buildEvidenceBundle(inputs);
  if (bundle === null) {
    checks.push(
      checkResult(
        'evidence-bundle',
        'Evidence bundle completeness (G11)',
        'G11',
        'not-run',
        [],
        'no complete evidence bundle: shots, metrics and gate verdicts are not all present',
      ),
    );
  } else {
    const verdict = evaluateG11(bundle);
    checks.push(
      checkResult(
        'evidence-bundle',
        'Evidence bundle completeness (G11)',
        'G11',
        verdict.status,
        verdict.detail,
      ),
    );
  }

  const ordered = AUDIT_CHECKS.filter((d) => d.modes.includes(inputs.mode)).map((d) => {
    const produced = checks.find((c) => c.id === d.id);
    return (
      produced ??
      checkResult(d.id, d.title, d.gate, 'not-run', [], 'the compositor did not produce this check')
    );
  });

  if (inputs.mode === 'quick') {
    needsReview.push(
      'browser phases were not requested (quick mode): accessibility, reflow and performance are unmeasured, not passed',
    );
  }
  if (captureReason !== null) {
    needsReview.push('capture-matrix did not run: ' + captureReason);
  }
  if (reflowReason !== null) {
    needsReview.push('reflow-matrix did not run: ' + reflowReason);
  }
  if (axeReason !== null) {
    needsReview.push('axe did not run: ' + axeReason);
  }
  if (lhReason !== null) {
    needsReview.push('Lighthouse did not run: ' + lhReason);
  }
  needsReview.push(
    'transition-oracle cases were not authored: G6 is unverified for this target, not passed',
  );

  const sorted = sortFindings(attachArtifacts(findings, inputs.artifacts));
  return AuditReportSchema.parse({
    schemaVersion: 1,
    command: 'sus-eval audit',
    generatedAt: inputs.generatedAt,
    mode: inputs.mode,
    target: inputs.target,
    viewports: AUDIT_VIEWPORTS.map((v) => v.name),
    checks: ordered,
    findings: sorted,
    summary: summariseFindings(sorted, ordered, inputs.mode),
    needsReview: [...new Set(needsReview)],
    provenance: inputs.provenance,
  });
}
