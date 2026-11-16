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
  // The evidence bundle is packaging, not a finding source: it never maps to a dimension.
  'evidence-bundle': 'visual',
};

export function dimensionForCheck(check: string): FocusDimension | null {
  const known = DIMENSION_BY_CHECK[check];
  return known ?? null;
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
 * Attribution rule: exact descriptor match against the selected target(s). Descriptors are flat
 * strings (`div#c1`, `th`, `td.cell`), so containment cannot be inferred from them without a DOM —
 * pretending otherwise would attribute another element's defect to this selection.
 */
export function isAttributedTo(location: string | null, targets: readonly string[]): boolean {
  if (location === null) return false;
  return targets.includes(location);
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
  const items: ProposalItem[] = [];
  let outOfScope = 0;
  let unattributed = 0;
  let unmapped = 0;
  for (const finding of report.findings) {
    const dimension = dimensionForCheck(finding.check);
    if (dimension === null) {
      unmapped += 1;
      continue;
    }
    if (!wanted.has(dimension)) {
      outOfScope += 1;
      continue;
    }
    if (targets !== undefined && !isAttributedTo(finding.observation.location, targets)) {
      unattributed += 1;
      continue;
    }
    const item = itemFromFinding(finding, dimension);
    if (item === null) continue;
    // The audit reports the same defect once per viewport/theme; a proposal is about the
    // element, so identical items merge and keep the worst severity plus all evidence.
    const existing = items.findIndex((candidate) => candidate.id === item.id);
    if (existing === -1) {
      items.push(item);
      continue;
    }
    const previous = items[existing] as ProposalItem;
    items[existing] = {
      ...previous,
      severity:
        SEVERITY_ORDER.indexOf(item.severity) < SEVERITY_ORDER.indexOf(previous.severity)
          ? item.severity
          : previous.severity,
      evidence: [...new Set([...previous.evidence, ...item.evidence])],
      testPlan: [...new Set([...previous.testPlan, ...item.testPlan])],
    };
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
  return found;
}
