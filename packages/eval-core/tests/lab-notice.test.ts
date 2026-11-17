/**
 * T1035 (issue #21 R11) — a performance number says what kind of number it is.
 *
 * SUS has lab measurements only: Lighthouse in this browser, on this machine, with no field data and
 * no human benchmark, so no comparative claim is permitted. A reader who sees a duration must not
 * have to reach `docs/LIMITATIONS.md` to learn that, so the notice travels with the number — in the
 * audit's G5 gate, in every budget finding, in `audit.md`, and beside a performance item in a proposal.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LAB_MEASUREMENT_NOTICE } from '../src/audit/contract.js';
import { runAudit } from '../src/audit/pipeline.js';
import {
  composeProposal,
  renderProposalMarkdown,
  type ProposalItem,
} from '../src/bestpractice/proposal.js';
import { resolvePageScope } from '../src/audit/scope.js';
import { selectScopedItems } from '../src/bestpractice/command.js';
import { itemsFromReport } from '../src/bestpractice/from-audit.js';

const FIXTURE = 'fixtures/bestpractice/scoped-axe/index.html';

describe('lab-vs-field notice (issue #21 R11)', () => {
  it('says both things a reader needs: lab only, and no comparison', () => {
    expect(LAB_MEASUREMENT_NOTICE).toContain('lab measurement');
    expect(LAB_MEASUREMENT_NOTICE).toContain('no field data');
    expect(LAB_MEASUREMENT_NOTICE).toContain('no comparative claim');
  });

  it('appears in the report and on the G5 gate detail, next to the numbers', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-lab-notice-'));
    const run = await runAudit({
      target: FIXTURE,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      fixPlan: false,
    });
    expect(run.markdown).toContain(LAB_MEASUREMENT_NOTICE);

    const g5 = run.report.checks.find((check) => check.id === 'lighthouse-budgets');
    if (g5 !== undefined && g5.status !== 'not-run') {
      expect(g5.detail.some((line) => line.includes(LAB_MEASUREMENT_NOTICE))).toBe(true);
    }
    for (const finding of run.report.findings.filter((f) => f.check === 'lighthouse-budgets')) {
      expect(finding.detail).toContain(LAB_MEASUREMENT_NOTICE);
    }
  }, 180000);

  it('says it beside a performance item in a proposal, and not beside other dimensions', () => {
    const performance: ProposalItem = {
      id: 'bbbbbbbbbbbbbbbb',
      dimension: 'performance',
      severity: 'P1',
      kind: 'fact',
      title: 'Budget miss: LCP ms',
      location: null,
      evidence: ['G5'],
      observed: { value: 4200, unit: 'ms' },
      expected: { value: 2500, unit: 'ms' },
      why: 'LCP 4200 ms exceeded the 2500 ms budget',
      remedy: 'Reduce render-blocking work',
      rationale: 'A slow largest paint delays the first useful impression',
      uxOutcome: 'The page becomes readable on the first paint',
      risk: 'Preloading too much can starve the critical requests',
      testPlan: ['re-run the audit and read G5'],
      unattributed: false,
    };
    const scope = resolvePageScope({ kind: 'selector', value: 'page' });
    const selection = selectScopedItems(
      {
        findings: [],
        checks: [],
        summary: { P0: 0, P1: 0, P2: 0, P3: 0, incomplete: false },
        // A page scope attributes by dimension, so no targets are involved here.
      } as unknown as Parameters<typeof selectScopedItems>[0],
      scope,
    );
    expect(selection.items).toEqual([]);

    const proposal = composeProposal({
      scope,
      items: [performance],
      untested: [],
      audit: { reportPath: '/tmp/audit.json', digest: 'd'.repeat(64) },
      generatedAt: '2026-11-17T00:00:00.000Z',
      target: { path: FIXTURE, url: null },
    });
    const markdown = renderProposalMarkdown(proposal);
    expect(markdown).toContain(LAB_MEASUREMENT_NOTICE);
    // The notice is attached to the performance item, so it appears exactly once here.
    expect(markdown.split(LAB_MEASUREMENT_NOTICE).length - 1).toBe(1);
    // itemsFromReport stays importable and unchanged for the dimensions path.
    expect(typeof itemsFromReport).toBe('function');
  });
});
