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
  lcpMs: number;
  cls: number;
  totalBlockingMs: number;
  totalByteWeight: number;
}

export type GateStatus = 'pass' | 'fail';

export interface GateVerdict {
  gate: 'G4' | 'G5';
  status: GateStatus;
  detail: string[];
  evidence: string[];
}

/** G4: zero serious/critical violations anywhere. */
export function evaluateG4(scans: AxeScanResult[], evidenceDir?: string): GateVerdict {
  const failing: string[] = [];
  for (const scan of scans) {
    for (const v of scan.violations) {
      if (v.impact === 'serious' || v.impact === 'critical') {
        failing.push(`${scan.url}: ${v.impact} ${v.id} on ${v.nodes} node(s) — ${v.help}`);
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
    detail: failing.length === 0 ? ['zero serious/critical axe violations'] : failing,
    evidence,
  };
}

/** G5: per-route budgets vs Lighthouse summary. */
export function evaluateG5(
  lh: LighthouseSummary[],
  budgets: BudgetSpec[] = FIXTURE_BUDGETS,
  evidenceDir?: string,
): GateVerdict {
  const detail: string[] = [];
  let failed = false;
  for (const run of lh) {
    const budget =
      budgets.find((b) => run.url.includes(b.route) && b.route !== '*') ??
      budgets.find((b) => b.route === '*');
    if (!budget) continue;
    const rows: Array<[string, number, number]> = [
      ['LCP ms', run.lcpMs, budget.lcpMs],
      ['CLS', run.cls, budget.cls],
      ['TBT ms', run.totalBlockingMs, budget.totalBlockingMs],
      ['totalBytes', run.totalByteWeight, budget.totalByteWeight],
    ];
    for (const [metric, actual, limit] of rows) {
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
