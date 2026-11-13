/**
 * G4/G5 gate evaluation (T0152b).
 *
 * G4 (accessibility): zero serious/critical axe violations on scanned pages.
 * G5 (performance budgets): per-route budget table from Lighthouse.
 * The gate owns the verdict; a composite score can never compensate for it.
 * axe covers ~1/3 of WCAG — the manual assistive-tech protocol is a separate
 * deliverable and is NOT covered by a passing G4.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AxeScanResult {
  url: string;
  /** axe result object as produced by @axe-core/playwright. */
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
    nodes: number;
    help: string;
  }>;
  passes: number;
}

export interface BudgetSpec {
  /** Route or '*' for all. */
  route: string;
  lcpMs: number;
  cls: number;
  totalBlockingMs: number;
  /** Max total transfer weight (bytes) across all responses. */
  totalByteWeight: number;
}

export const FIXTURE_BUDGETS: BudgetSpec[] = [
  {
    route: '*',
    lcpMs: 2500,
    cls: 0.1,
    totalBlockingMs: 200,
    totalByteWeight: 500_000,
  },
];

export interface LighthouseSummary {
  url: string;
  /** null = metric absent from the report (fail-closed: never treated as 0). */
  lcpMs: number | null;
  cls: number | null;
  totalBlockingMs: number | null;
  totalByteWeight: number | null;
}

export type GateStatus = 'pass' | 'fail';

export interface GateVerdict {
  gate: 'G4' | 'G5';
  status: GateStatus;
  detail: string[];
  evidence: string[];
}

/**
 * G4: zero serious/critical violations anywhere.
 * FAILS CLOSED (issue #8): no scans, malformed scans, or non-finite node
 * counts fail the gate — missing measurement never satisfies a gate.
 */
export function evaluateG4(scans: AxeScanResult[], evidenceDir?: string): GateVerdict {
  const failing: string[] = [];
  if (scans.length === 0) {
    failing.push('no axe scans recorded — G4 fails closed without evidence');
  }
  for (const scan of scans) {
    if (!scan.url) failing.push('axe scan without a URL — invalid evidence');
    if (!Array.isArray(scan.violations)) {
      failing.push(`${scan.url ?? '(no url)'}: malformed violations array — invalid evidence`);
      continue;
    }
    for (const v of scan.violations) {
      if (
        (v.impact === 'serious' || v.impact === 'critical') &&
        Number.isFinite(v.nodes) &&
        v.nodes >= 0
      ) {
        failing.push(`${scan.url}: ${v.impact} ${v.id} on ${v.nodes} node(s) — ${v.help}`);
      } else if (
        v.impact !== null &&
        !['minor', 'moderate', 'serious', 'critical'].includes(v.impact)
      ) {
        failing.push(
          `${scan.url}: unknown impact "${String(v.impact)}" on ${v.id} — invalid evidence`,
        );
      } else if ((v.impact === 'serious' || v.impact === 'critical') && !Number.isFinite(v.nodes)) {
        failing.push(
          `${scan.url}: ${v.impact} ${v.id} with non-finite node count — invalid evidence`,
        );
      }
    }
  }
  const evidence: string[] = [];
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    for (const [i, scan] of scans.entries()) {
      const file = join(evidenceDir, `axe-${i}.json`);
      writeFileSync(file, `${JSON.stringify(scan, null, 2)}\n`);
      evidence.push(file);
    }
  }
  return {
    gate: 'G4',
    status: failing.length === 0 ? 'pass' : 'fail',
    detail:
      failing.length === 0
        ? ['zero serious/critical axe violations across recorded scans']
        : failing,
    evidence,
  };
}

/**
 * G5: per-route budgets vs Lighthouse summaries.
 * FAILS CLOSED (issue #8): no runs, no matching budget for a route, and
 * absent/non-finite metrics all fail the gate. Lighthouse reports null for
 * unmeasured metrics — nulls are invalid evidence, never zeroes.
 */
export function evaluateG5(
  lh: LighthouseSummary[],
  budgets: BudgetSpec[] = FIXTURE_BUDGETS,
  evidenceDir?: string,
): GateVerdict {
  const detail: string[] = [];
  let failed = false;
  if (lh.length === 0) {
    failed = true;
    detail.push('no Lighthouse runs recorded — G5 fails closed without evidence');
  }
  for (const run of lh) {
    const budget =
      budgets.find((b) => run.url.includes(b.route) && b.route !== '*') ??
      budgets.find((b) => b.route === '*');
    if (!budget) {
      failed = true;
      detail.push(`${run.url}: no matching budget — G5 fails closed`);
      continue;
    }
    const rows: Array<[string, number | null, number]> = [
      ['LCP ms', run.lcpMs, budget.lcpMs],
      ['CLS', run.cls, budget.cls],
      ['TBT ms', run.totalBlockingMs, budget.totalBlockingMs],
      ['totalBytes', run.totalByteWeight, budget.totalByteWeight],
    ];
    for (const [metric, actual, limit] of rows) {
      if (actual === null || !Number.isFinite(actual)) {
        failed = true;
        detail.push(
          `${run.url} ${metric}: MISSING/INVALID (got ${String(actual)}) / limit ${limit} — FAIL CLOSED`,
        );
        continue;
      }
      const ok = actual <= limit;
      if (!ok) failed = true;
      detail.push(`${run.url} ${metric}: ${actual} / limit ${limit} — ${ok ? 'ok' : 'EXCEEDED'}`);
    }
  }
  let evidence: string[] = [];
  if (evidenceDir) {
    mkdirSync(evidenceDir, { recursive: true });
    const file = join(evidenceDir, 'budget-table.json');
    writeFileSync(file, `${JSON.stringify({ budgets, runs: lh, detail }, null, 2)}\n`);
    evidence = [file];
  }
  return {
    gate: 'G5',
    status: failed ? 'fail' : 'pass',
    detail,
    evidence,
  };
}
