#!/usr/bin/env node
/**
 * @sus/eval-core CLI (T0151). Zero-framework: plain node + parseArgs.
 *   sus-eval score --in <rubric-score.json> [--out <verdict.json>]
 *   sus-eval audit --path <dir> --out <dir> [--mode quick|deep]   (issue #13)
 * Judged axes are reported and flagged never-gates-CI; exit code never
 * depends on judged scores (tier rule).
 *
 * This file is both the `sus-eval` binary (package.json "bin") and a plain module:
 * the entry point is `main()`, executed only when this file IS argv[1]. Importing it
 * — a test, or a consumer of @sus/eval-core — must not parse the importer’s argv or
 * call process.exit on the importer’s behalf.
 */
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { RubricScore, ScoringVerdict } from '@sus/schemas';
import { scoreSection } from './scoring.js';

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(2);
}

/**
 * The whole command surface, as a function so that importing this module (a test, or
 * `dist/index.js` re-export) never runs it: the documented `sus-eval` binary only
 * works when the package declares `bin` and the import stays side-effect free, and a
 * side-effecting module could not be used as a library at all (issue #13).
 */
export async function main(argv: string[]): Promise<void> {
  const args = argv;
  const command = args[0];

  if (command === 'score') {
    const { values } = parseArgs({
      args: args.slice(1),
      options: { in: { type: 'string' }, out: { type: 'string' } },
    });
    if (!values.in) fail('score requires --in <rubric-score.json>');
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(values.in, 'utf8'));
    } catch (e) {
      fail(`cannot read ${values.in}: ${e instanceof Error ? e.message : e}`);
    }
    const parsedInput = RubricScore.safeParse(raw);
    if (!parsedInput.success) {
      fail(parsedInput.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    const verdict = scoreSection(parsedInput.data);
    const parsedOut = ScoringVerdict.safeParse(verdict);
    if (!parsedOut.success) fail('internal: verdict failed schema round-trip');
    const json = JSON.stringify(parsedOut.data, null, 2);
    if (values.out) {
      writeFileSync(values.out, `${json}\n`);
      console.log(`wrote ${values.out}`);
    } else {
      console.log(json);
    }
    process.exit(0);
  }

  if (command === 'capture') {
    const { values } = parseArgs({
      args: args.slice(1),
      options: { url: { type: 'string' }, out: { type: 'string' } },
    });
    if (!values.url || !values.out) fail('capture requires --url <url> --out <dir>');
    // playwright is a devDependency: imported lazily so `score` works without it
    const { captureMatrix } = await import('./harness/capture.js');
    const result = await captureMatrix(values.url, values.out);
    console.log(
      JSON.stringify(
        {
          url: result.url,
          combos: result.combos.map((c) => ({
            viewport: c.viewport,
            theme: c.theme,
            screenshot: c.screenshot,
            horizontalOverflow: c.metrics.horizontalOverflow,
            cls: c.metrics.cls,
            lcpMs: c.metrics.lcpMs,
            smallTapTargets: c.metrics.smallTapTargets.length,
          })),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (command === 'evidence') {
    const { values } = parseArgs({
      args: args.slice(1),
      options: { in: { type: 'string' }, out: { type: 'string' } },
    });
    if (!values.in) fail('evidence requires --in <bundle.json>');
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(values.in, 'utf8'));
    } catch (e) {
      fail(`cannot read ${values.in}: ${e instanceof Error ? e.message : e}`);
    }
    const { EvidenceBundle, evaluateG11 } = await import('@sus/schemas');
    const parsed = EvidenceBundle.safeParse(raw);
    if (!parsed.success) {
      fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    }
    const g11 = evaluateG11(parsed.data);
    const json = JSON.stringify({ bundle: values.in, g11 }, null, 2);
    if (values.out) {
      writeFileSync(values.out, `${json}\n`);
      console.log(`wrote ${values.out}`);
    } else {
      console.log(json);
    }
    process.exit(0);
  }

  if (command === 'budget') {
    const { values } = parseArgs({
      args: args.slice(1),
      options: { in: { type: 'string' }, budget: { type: 'string' } },
    });
    if (!values.in) fail('budget requires --in <usage.json> (items: [{id, tokens}])');
    const usage = JSON.parse(readFileSync(values.in, 'utf8')) as Array<{
      id: string;
      tokens: number;
    }>;
    if (!Array.isArray(usage) || usage.length === 0) fail('usage must be a non-empty array');
    const sorted = [...usage].map((u) => u.tokens).sort((a, b) => a - b);
    const p = (q: number): number =>
      sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
    const budget = values.budget ? Number.parseInt(values.budget, 10) : null;
    const flagged = budget === null ? [] : usage.filter((u) => u.tokens > budget).map((u) => u.id);
    console.log(
      JSON.stringify(
        {
          n: usage.length,
          p50: p(0.5),
          p95: p(0.95),
          budgetTarget: budget,
          budgetStatus:
            budget === null
              ? 'not-set — target must be proposed to the owner, never silently adopted'
              : 'advisory',
          flaggedOverBudget: flagged,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (command === 'audit') {
    const { AUDIT_HELP } = await import('./audit/contract.js');
    const { values } = parseArgs({
      args: args.slice(1),
      options: {
        path: { type: 'string' },
        url: { type: 'string' },
        out: { type: 'string' },
        mode: { type: 'string' },
        route: { type: 'string' },
        routes: { type: 'string' },
        authorize: { type: 'string', multiple: true },
        'fix-plan': { type: 'boolean' },
        json: { type: 'boolean' },
        help: { type: 'boolean' },
      },
      allowPositionals: false,
    });
    if (values.help === true) {
      console.log(AUDIT_HELP);
      process.exit(0);
    }
    const path = values.path;
    const url = values.url;
    if (path !== undefined && url !== undefined) {
      fail('audit accepts exactly one target: --path <dir> or --url <url>, not both');
    }
    if (path === undefined && url === undefined) {
      fail('audit requires a target: --path <dir> or --url <url> (see --help)');
    }
    const out = values.out;
    if (out === undefined)
      fail('audit requires --out <dir>: the report is never written into the target');
    const mode = values.mode ?? 'quick';
    if (mode !== 'quick' && mode !== 'deep') fail(`--mode must be quick or deep, got "${mode}"`);
    const route = values.route ?? values.routes ?? null;
    const authorizedHosts = values.authorize ?? [];
    const { runAudit } = await import('./audit/pipeline.js');
    let run;
    try {
      run = await runAudit({
        target: (path ?? url) as string,
        liveUrl: path !== undefined ? (url ?? null) : null,
        mode,
        routes: route,
        outDir: out,
        authorizedHosts,
        fixPlan: values['fix-plan'] === true,
      });
    } catch (e) {
      fail(e instanceof Error ? e.message : String(e));
    }
    console.log(
      values.json === true ? JSON.stringify(run.report, null, 2) : run.markdown.trimEnd(),
    );
    console.log('');
    console.log(`wrote ${run.reportPath}`);
    console.log(`wrote ${run.markdownPath}`);
    if (run.evidencePath !== null) console.log(`wrote ${run.evidencePath}`);
    if (run.fixPlanPath !== null) {
      console.log(`wrote ${run.fixPlanPath} (a proposal: nothing was applied)`);
    }
    process.exit(run.exitCode);
  }

  fail(
    `unknown command "${String(command)}" — usage: sus-eval score|capture|evidence|budget|audit`,
  );
}

// Only execute when this file IS the entry point: importing the module (a test, or a
// consumer of @sus/eval-core) must not parse the importer’s argv or call process.exit.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  await main(process.argv.slice(2));
}
