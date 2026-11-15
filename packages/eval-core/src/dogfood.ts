/**
 * T0906 — the reference-implementation track (PRD amendment A10).
 *
 * Three dogfood sites built with SUS under the same rules as users. They are
 * fixtures first: the point is not that they look good, it is that a rule the
 * skill states can be *checked* on a real page, and that a failure is written
 * down the way a user report would be.
 *
 * Two decisions worth naming:
 *
 * 1. **A check that did not run is `not-run`, never `pass`.** The gate registry
 *    (DA-22) forbids reporting an unmeasured gate as satisfied, and a dogfood
 *    report that says "0 violations" because the browser never launched is the
 *    exact failure mode this track exists to catch.
 * 2. **The evidence bundle stays private.** Screenshots of real fixtures can
 *    contain anything; A10's acceptance requires separate consent, licensing and
 *    PII/secret checks before publication. So the runner writes the full bundle
 *    to a git-ignored directory and emits only a redacted summary that carries
 *    counts and rule ids — never absolute paths, ports, or page content.
 */
import type { GateStatus } from './harness/a11y-budgets.js';

export interface DogfoodCheck {
  /** Stable id used in the summary and in the failure write-up. */
  id: string;
  /** The SUS rule this check makes checkable (playbook rule id or gate id). */
  rule: string;
  /** What was measured, in one sentence, for the human reading the summary. */
  statement: string;
}

/**
 * The checks the runner performs. Each one is tied to a rule the skill states,
 * because a check with no rule behind it measures taste rather than compliance.
 */
export const DOGFOOD_CHECKS: DogfoodCheck[] = [
  {
    id: 'a11y-wcag-aa',
    rule: 'G4',
    statement: 'no serious or critical axe violations over the whole page (wcag2a/wcag2aa)',
  },
  {
    id: 'reflow-390',
    rule: 'search-filters.filters-continuity-across-layout',
    statement:
      'no horizontal document scroll at 390 CSS px, so row data reflows instead of scrolling',
  },
  {
    id: 'focus-visible',
    rule: 'tabs.tabs-roving-focus',
    statement:
      'the first keyboard focus stop paints a visible ring (outline or shadow) that is not none',
  },
  {
    id: 'reduced-motion-quiet',
    rule: 'accordion.accordion-reveal-height',
    statement:
      'with prefers-reduced-motion: reduce, no element declares a transition or animation longer than 0s',
  },
  {
    id: 'labelled-controls',
    rule: 'form-input-validation',
    statement: 'every input has an accessible name from a label, aria-label or aria-labelledby',
  },
];

export type CheckStatus = GateStatus | 'not-run';

export interface DogfoodObservation {
  checkId: string;
  status: CheckStatus;
  /** Measured value, for the summary. Never page content. */
  measured?: number | string | null;
  /** Violations or failing elements, already reduced to rule ids and counts. */
  failures?: string[];
}

export interface SiteReport {
  site: string;
  checks: {
    id: string;
    rule: string;
    status: CheckStatus;
    measured: number | string | null;
    failures: string[];
  }[];
  status: GateStatus;
}

export interface DogfoodSummary {
  generatedAt: string;
  sites: SiteReport[];
  status: GateStatus;
  /** Checks that never produced a measurement — surfaced, never hidden. */
  notRun: string[];
  /** Recorded findings, in the shape of a user report. */
  findings: string[];
}

/**
 * Evaluates one site. Fails closed: a check with no observation is `not-run`,
 * and a site with any `not-run` or failing check is not `pass`.
 */
export function evaluateSite(site: string, observations: DogfoodObservation[]): SiteReport {
  const byId = new Map(observations.map((o) => [o.checkId, o]));
  const checks = DOGFOOD_CHECKS.map((check) => {
    const observation = byId.get(check.id);
    return {
      id: check.id,
      rule: check.rule,
      status: observation?.status ?? ('not-run' as CheckStatus),
      measured: observation?.measured ?? null,
      failures: observation?.failures ?? [],
    };
  });
  const status: GateStatus = checks.every((c) => c.status === 'pass') ? 'pass' : 'fail';
  return { site, checks, status };
}

/** Turns failing checks into findings written the way a user report would be. */
export function findingsFor(report: SiteReport): string[] {
  const findings: string[] = [];
  for (const check of report.checks) {
    if (check.status === 'pass') continue;
    if (check.status === 'not-run') {
      findings.push(
        `${report.site}: '${check.id}' did not run — no measurement was produced, so the rule '${check.rule}' is unverified here (reported as not-run, not as pass).`,
      );
      continue;
    }
    const detail = check.failures.length > 0 ? check.failures.join('; ') : String(check.measured);
    findings.push(`${report.site}: '${check.id}' failed — ${detail}. Rule: ${check.rule}.`);
  }
  return findings;
}

export function summarise(reports: SiteReport[], generatedAt: string): DogfoodSummary {
  const findings = reports.flatMap(findingsFor);
  const notRun = reports.flatMap((report) =>
    report.checks.filter((c) => c.status === 'not-run').map((c) => `${report.site}/${c.id}`),
  );
  const status: GateStatus =
    reports.length > 0 && reports.every((report) => report.status === 'pass') ? 'pass' : 'fail';
  return { generatedAt, sites: reports, status, notRun, findings };
}

/**
 * The publishable form. Absolute paths, ports and page text never leave this
 * function; the summary is safe to commit while the bundle stays private until
 * the consent, licensing and PII checks happen.
 */
export function renderSummary(summary: DogfoodSummary): string {
  const lines: string[] = [
    '# Dogfood reference implementations — redacted summary (T0906)',
    '',
    `Generated: ${summary.generatedAt}`,
    `Overall: **${summary.status}**`,
    '',
    'The full evidence bundle (screenshots, page HTML, measurements) is private and',
    'git-ignored pending the artifact-level consent, licensing and PII/secret checks in',
    'T0906 acceptance. This file carries counts and rule ids only.',
    '',
    '| Site | Check | Rule | Status | Measured |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const report of summary.sites) {
    for (const check of report.checks) {
      const measured =
        check.measured === null || check.measured === undefined
          ? '—'
          : String(check.measured).replace(/\//g, '⁄');
      lines.push(
        `| ${report.site} | ${check.id} | \`${check.rule}\` | ${check.status} | ${measured} |`,
      );
    }
  }
  lines.push('', '## Findings', '');
  if (summary.findings.length === 0) {
    lines.push('None: every check ran and passed on this run.');
  } else {
    for (const finding of summary.findings) lines.push(`- ${finding}`);
  }
  if (summary.notRun.length > 0) {
    lines.push('', '## Not run', '');
    lines.push(
      'These produced no measurement. Following the gate registry rule, they are reported',
      'as `not-run` and never as `pass`:',
      '',
    );
    for (const item of summary.notRun) lines.push(`- ${item}`);
  }
  return `${lines.join('\n')}\n`;
}
