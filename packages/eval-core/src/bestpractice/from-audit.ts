/**
 * T1023 — turn an audit report into proposal items, without inventing a second opinion.
 *
 * `/sus-bestpractice` is a *scoped* view of the audit, not another scanner. Every item here comes
 * from a finding the audit already measured (or explicitly judged), so the numbers in a proposal are
 * the numbers in `audit.json` and the two can never disagree about the same page.
 *
 * Two rules keep it honest:
 *  - only findings in the dimensions the scope is measuring become items; the rest are counted and
 *    reported as out of scope rather than silently dropped;
 *  - a finding whose confidence is not `measured` becomes a `heuristic`, and its severity is capped
 *    at P2 — the proposal contract forbids ranking an unmeasured recommendation as blocking.
 */
import { AUDIT_CHECKS } from '../audit/contract.js';
import type { AuditFinding, AuditReport } from '../audit/report.js';
import type { FocusDimension } from '../audit/scope.js';
import {
  PROPOSAL_SEVERITIES,
  proposalItemId,
  type ProposalItem,
  type ProposalSeverity,
} from './proposal.js';

const SEVERITY_ORDER: readonly ProposalSeverity[] = PROPOSAL_SEVERITIES;

/**
 * Which dimension a check belongs to. A check missing from this table is a programming error, not a
 * reason to guess: the build fails rather than filing a finding under an invented dimension.
 */
export const DIMENSION_BY_CHECK: Readonly<Record<string, FocusDimension>> = {
  'capture-matrix': 'responsive',
  'reflow-matrix': 'responsive',
  'keyboard-flow': 'a11y',
  'axe-a11y': 'a11y',
  'lighthouse-budgets': 'performance',
  'seo-structure': 'copy',
  'anti-slop': 'visual',
  'transition-oracle': 'motion',
  // Component states are what a control looks like when used: a visual property of the element.
  'component-states': 'visual',
  // The evidence bundle is packaging, not a finding source: it never maps to a dimension.
  'evidence-bundle': 'visual',
};

export function dimensionForCheck(check: string): FocusDimension | null {
  const known = DIMENSION_BY_CHECK[check];
  return known ?? null;
}

/**
 * A check can produce findings about different dimensions: `capture-matrix` measures horizontal
 * overflow (responsive) *and* target size (a11y, WCAG 2.5.8). Mapping by check alone would file a
 * 28 px CTA under "responsive" and drop it from an a11y scope, which is how the first example run
 * lost the very defect it was demonstrating.
 */
export function dimensionForFinding(finding: {
  readonly check: string;
  readonly title: string;
}): FocusDimension | null {
  if (finding.check === 'capture-matrix' && finding.title.startsWith('Tap target')) return 'a11y';
  return dimensionForCheck(finding.check);
}

/** What a change in each dimension could break. Concrete, because "risk: low" is not a risk. */
const RISK_BY_DIMENSION: Record<FocusDimension, string> = {
  responsive:
    'a layout change can regress another viewport: the reflow matrix must be re-run, not assumed',
  a11y: 'focus order and announcements can change even when the scan stays green',
  motion: 'reduced-motion parity must be re-checked; motion that ignores it is a regression',
  copy: 'wording changes can break translation keys and existing tests on visible text',
  performance: 'a budget can be met by removing content or deferring it out of sight',
  visual: 'visual changes need owner review; no measure substitutes for it',
};

const OUTCOME_BY_DIMENSION: Record<FocusDimension, string> = {
  responsive: 'the page holds its hierarchy at every measured width without sideways scrolling',
  a11y: 'the control can be reached and understood by keyboard and assistive technology',
  motion: 'the transition respects the user’s reduced-motion preference',
  copy: 'the text says what the interface means, in the project’s voice',
  performance: 'the measured budget is met without hiding content',
  visual: 'the hierarchy matches the design intent at a glance',
};

const SEVERITY_MEANING: Record<ProposalSeverity, string> = {
  P0: 'blocks the task or breaks accessibility',
  P1: 'degrades the task measurably',
  P2: 'friction worth fixing when nearby',
  P3: 'polish',
};

export interface ProposalInputSelection {
  /** Dimensions the scope measures; findings in others are counted, not proposed. */
  readonly dimensions: readonly FocusDimension[];
  /**
   * Descriptors of the selected target(s). A finding is attributed only when its own location
   * matches one of them: the audit measures a page, and a finding about another element is not
   * evidence about this one. Omit to propose every finding in the selected dimensions.
   */
  readonly targets?: readonly string[];
  /**
   * Restrict to findings measured on one route. An HTML source file *is* the page it serves, so a
   * file scope for `about.html` attributes that page's findings without mapping any descriptor to a
   * source file (issue #21 R8): the file needs no mapping because it is the unit the audit measured.
   */
  readonly route?: string;
}

export interface ItemsFromReport {
  readonly items: ProposalItem[];
  /** Findings that existed but fell outside the selected dimensions. */
  readonly outOfScope: number;
  /** Dimension findings the audit attributes somewhere else: counted, not proposed. */
  readonly unattributed: number;
  /** Findings whose check has no dimension mapping: a build error, surfaced not guessed. */
  readonly unmapped: number;
}

/**
 * Attribution rule: the audit's own location descriptor equals the selected target, or the target
 * appears in the evidence the measurement recorded. Both are the audit's words about this element;
 * containment is not inferred from flat descriptor strings, because without a DOM that would
 * attribute another element's defect to this selection.
 */
/**
 * The defect a finding is about, without the viewport/theme it was seen in. Nine combinations of
 * viewport, theme and reduced-motion preference are one defect on one element; a proposal that
 * lists them nine times is a log, not a proposal.
 */
export function findingTopic(title: string): string {
  const zoom = title.indexOf(' at 400% zoom equivalence');
  if (zoom !== -1) return title.slice(0, zoom) + ' at 400% zoom equivalence';
  const at = title.lastIndexOf(' at ');
  return at === -1 ? title : title.slice(0, at);
}

/** The viewport/theme suffix a grouped item summarises. */
export function findingContext(title: string): string | null {
  const zoom = title.indexOf(' at 400% zoom equivalence');
  if (zoom !== -1) return '400% zoom';
  const at = title.lastIndexOf(' at ');
  return at === -1 ? null : title.slice(at + 4);
}

export function isAttributedTo(
  location: string | null,
  targets: readonly string[],
  evidence: readonly string[] = [],
): boolean {
  if (location !== null && targets.includes(location)) return true;
  return evidence.some((entry) => targets.includes(entry));
}

function severityOf(finding: AuditFinding, measured: boolean): ProposalSeverity {
  const severity = finding.severity;
  if (measured) return severity;
  // An unmeasured recommendation may not block: clamp P0/P1 to P2.
  return severity === 'P0' || severity === 'P1' ? 'P2' : severity;
}

/** One finding → one proposal item. Nothing is added that the finding did not contain. */
export function itemFromFinding(
  finding: AuditFinding,
  dimension: FocusDimension,
): ProposalItem | null {
  const measured = finding.observation.confidence === 'measured';
  const severity = severityOf(finding, measured);
  const location = finding.observation.location ?? finding.route ?? null;
  if (location === null) return null;
  const testPlan = measured
    ? [
        're-run `sus-eval audit --path <target> --mode deep` and require `' +
          finding.check +
          '` to pass',
        'assert ' +
          (finding.observation.expected === null
            ? 'the measurement is inside its threshold'
            : String(finding.observation.expected.value) +
              ' ' +
              finding.observation.expected.unit +
              ' is met at ' +
              (finding.viewport ?? 'the measured viewport')),
      ]
    : ['owner review of the changed element', 're-run the audit to confirm nothing moved'];
  return {
    id: proposalItemId({ dimension, location, title: finding.title }),
    dimension,
    severity,
    kind: measured ? 'fact' : 'heuristic',
    title: finding.title,
    location,
    evidence: [
      ...finding.evidence,
      ...(finding.observation.artifactHash === null
        ? []
        : [
            'artifact ' +
              finding.observation.artifact +
              ' #' +
              finding.observation.artifactHash.slice(0, 12),
          ]),
    ],
    observed: finding.observation.observed,
    expected: finding.observation.expected,
    why: finding.detail,
    remedy: finding.observation.remediation,
    rationale:
      SEVERITY_MEANING[severity] +
      '; measured by ' +
      finding.check +
      ' (' +
      finding.observation.evaluator +
      ') with confidence ' +
      finding.observation.confidence,
    uxOutcome: OUTCOME_BY_DIMENSION[dimension],
    risk: RISK_BY_DIMENSION[dimension],
    testPlan,
  };
}

function mergeGroup(group: {
  label: string;
  contexts: string[];
  items: ProposalItem[];
}): ProposalItem {
  const ordered = [...group.items].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  const worst = ordered[0] as ProposalItem;
  const numbers = group.items
    .map((item) => item.observed)
    .filter((observed): observed is NonNullable<ProposalItem['observed']> => observed !== null);
  // The worst measurement, in the unit's own direction: a wider document is worse, a smaller
  // target is worse.
  const observed =
    numbers.length === 0
      ? null
      : numbers.reduce((worstNumber, candidate) => {
          const wider = candidate.unit.includes('document width')
            ? candidate.value > worstNumber.value
            : candidate.value < worstNumber.value;
          return wider ? candidate : worstNumber;
        });
  // The expected value must stay the demand the worst combination failed: a 320 px viewport
  // failing at 916 px is a stricter claim than the same defect at 390 px.
  const expectancies = group.items
    .map((item) => item.expected)
    .filter((expected): expected is NonNullable<ProposalItem['expected']> => expected !== null);
  const expected =
    expectancies.length === 0
      ? worst.expected
      : expectancies.reduce((tightest, candidate) =>
          candidate.value < tightest.value ? candidate : tightest,
        );
  const contexts = group.contexts.slice(0, 6);
  const suffix =
    contexts.length === 0
      ? ''
      : ' (' + contexts.join(', ') + (group.contexts.length > contexts.length ? ', …' : '') + ')';
  // Two controls of the same kind are two items: without the element in the title a reader sees
  // four identical lines and cannot tell which control each one is about.
  const named = worst.location !== null && !group.label.includes(worst.location);
  const title = group.label + (named ? ' on ' + worst.location : '') + suffix;
  const merged = {
    ...worst,
    id: proposalItemId({ ...worst, title }),
    title,
    observed,
    expected,
    evidence: [...new Set(group.items.flatMap((item) => item.evidence))],
    testPlan: [...new Set(group.items.flatMap((item) => item.testPlan))],
  };
  return merged;
}

/**
 * Select the findings that fall inside the scope's dimensions and convert them.
 * `null` dimensions (a check with no mapping) are reported, never filed under a guess.
 */
export function itemsFromReport(
  report: AuditReport,
  selection: ProposalInputSelection,
): ItemsFromReport {
  const wanted = new Set(selection.dimensions);
  const targets = selection.targets;
  const route = selection.route;
  const items: ProposalItem[] = [];
  const groups = new Map<string, { label: string; contexts: string[]; items: ProposalItem[] }>();
  let outOfScope = 0;
  let unattributed = 0;
  let unmapped = 0;
  for (const finding of report.findings) {
    const dimension = dimensionForFinding(finding);
    if (dimension === null) {
      unmapped += 1;
      continue;
    }
    if (!wanted.has(dimension)) {
      outOfScope += 1;
      continue;
    }
    if (route !== undefined && finding.route !== route) {
      // Measured, but on another page of the site: out of this file's scope, not unattributable.
      outOfScope += 1;
      continue;
    }
    if (
      targets !== undefined &&
      !isAttributedTo(finding.observation.location, targets, finding.evidence)
    ) {
      unattributed += 1;
      continue;
    }
    const item = itemFromFinding(finding, dimension);
    if (item === null) continue;
    // When the audit named the element in its evidence while the location points at a
    // sibling, the item is about the selected element: say so.
    const attributedTarget =
      targets === undefined
        ? null
        : (targets.find((target) => finding.evidence.includes(target)) ?? null);
    const placed = attributedTarget === null ? item : { ...item, location: attributedTarget };
    // One defect, one item: the same defect seen at nine viewport/theme combinations is grouped
    // under the element it belongs to and the combinations are listed once.
    const topic = findingTopic(finding.title);
    const context = findingContext(finding.title);
    const key = dimension + '|' + placed.location + '|' + topic;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, {
        label: topic,
        contexts: context === null ? [] : [context],
        items: [placed],
      });
    } else {
      group.items.push(placed);
      if (context !== null && !group.contexts.includes(context)) group.contexts.push(context);
    }
  }
  for (const group of groups.values()) {
    items.push(mergeGroup(group));
  }
  return { items, outOfScope, unattributed, unmapped };
}

/**
 * Checks that did not run are dimensions nothing rests on. Returning them separately is what lets
 * the proposal say "not measured" instead of implying a clean sweep.
 */
export function untestedFromReport(
  report: AuditReport,
  selection: ProposalInputSelection,
): { dimension: FocusDimension; reason: string }[] {
  const found: { dimension: FocusDimension; reason: string }[] = [];
  for (const check of report.checks) {
    if (check.status !== 'not-run') continue;
    const dimension = dimensionForCheck(check.id);
    if (dimension === null) continue;
    if (!selection.dimensions.includes(dimension)) continue;
    found.push({
      dimension,
      reason:
        'check `' +
        check.id +
        '` was not run for this scope' +
        (check.reason === undefined || check.reason === null ? '' : ': ' + check.reason),
    });
  }
  // T1053 (audit finding T1003-8): quick mode omits the browser checks from report.checks
  // entirely, so an empty not-run list used to read as "every dimension in scope was measured"
  // while a11y, reflow, motion and performance were never measured at all. A check the requested
  // mode does not carry is an unmeasured dimension too — say so instead of implying a full sweep.
  // A report without a mode reads as deep (the pipeline's default), which carries every check —
  // so the derivation below adds nothing and the not-run rows above stay the only source.
  const mode = report.mode ?? 'deep';
  for (const descriptor of AUDIT_CHECKS) {
    if (descriptor.modes.includes(mode)) continue;
    const dimension = dimensionForCheck(descriptor.id);
    if (dimension === null) continue;
    if (!selection.dimensions.includes(dimension)) continue;
    if (found.some((entry) => entry.dimension === dimension)) continue;
    found.push({
      dimension,
      reason:
        'check `' +
        descriptor.id +
        '` is not part of ' +
        mode +
        ' mode: the dimensions it measures were not measured, not passed',
    });
  }
  return found;
}
