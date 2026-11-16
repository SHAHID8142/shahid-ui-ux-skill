#!/usr/bin/env node
/**
 * examples.mjs (T1024, issue #15) — five scoped proposals measured before and after a fix.
 *
 * The risk this script exists to avoid is a beautiful report with no instrument behind it.
 * Everything below comes from the audit engine both `/sus audit` and `sus-eval bestpractice`
 * run: one deep audit per stage, five scope resolutions in one page session per stage, and the
 * proposal conversion the command uses. Nothing is hand-typed into the report.
 *
 * Method:
 *   before/  a copy of `fixtures/bestpractice/examples` as committed
 *   after/   the same copy with the five fixes in FIXES applied (each replacement must match
 *            exactly once, or the script fails: a silently-missing fix would fake an improvement)
 *   stage    one deep audit + one browser session, then a proposal per example scope
 *
 * Each example records: the scope, the consulted dimensions and the ones deliberately not
 * consulted with reasons, the items the audit produced, and the instrument values before/after.
 * A dimension the audit did not measure is reported `not-run` with its reason — never `pass`.
 *
 * Usage:
 *   node scripts/bestpractice/examples.mjs            # measure, write evals/… and docs/…
 *   node scripts/bestpractice/examples.mjs --check     # re-render docs from the committed json
 *   node scripts/bestpractice/examples.mjs --out /tmp/x # measure into a directory instead
 *
 * Exit 0 = every example improved on its own instrument (or `--check` matched), 1 = it did not.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE = join(ROOT, 'fixtures', 'bestpractice', 'examples');
const JSON_PATH = join(ROOT, 'evals', 'bestpractice', 'examples.json');
const DOC_PATH = join(ROOT, 'docs', 'BESTPRACTICE_EXAMPLES.md');
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const OUT_ARG = args.indexOf('--out');
const OUT_DIR = OUT_ARG === -1 ? null : resolve(args[OUT_ARG + 1] ?? '');

/** The five classes issue #15 names, each with the selector a user would point at. */
const EXAMPLES = [
  {
    id: 'E1',
    klass: 'cta',
    label: 'Call to action',
    scope: '#cta',
    // What a fix is allowed to claim: the instrument that has to move.
    instrument: 'tap-target',
  },
  {
    id: 'E2',
    klass: 'navbar',
    label: 'Navigation bar',
    scope: '#site-nav',
    instrument: 'overflow-320',
  },
  {
    id: 'E3',
    klass: 'form',
    label: 'Form field and submit',
    scope: '#signup',
    instrument: 'tap-target',
  },
  {
    id: 'E4',
    klass: 'record-row',
    label: 'Mobile record row',
    scope: '#invoices',
    instrument: 'overflow-320',
  },
  {
    id: 'E5',
    klass: 'motion-keyboard',
    label: 'Motion and keyboard alternative',
    scope: '#panel-open',
    instrument: 'keyboard',
  },
];

/**
 * The fixes. Small, real edits a person would make; the script refuses to run if a replacement
 * does not match exactly once, so a stale fixture cannot produce a fake improvement.
 */
const FIXES = [
  {
    id: 'E1',
    file: 'index.html',
    why: 'pad the control to 44x44 instead of a 28x20 target',
    find: `      .cta {
        display: inline-block;
        padding: 0;
        font-size: 12px;
        line-height: 20px;
        width: 28px;`,
    replace: `      .cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 16px;
        min-width: 44px;
        min-height: 44px;
        font-size: 16px;
        line-height: 20px;`,
  },
  {
    id: 'E2',
    file: 'index.html',
    why: 'let the navigation wrap instead of holding a 720 px row',
    find: `      #site-nav {
        display: flex;
        width: 720px;
        gap: 16px;
        padding: 8px;
        border-bottom: 1px solid #ddd;
      }
      #site-nav a {
        color: var(--ink);
      }`,
    replace: `      #site-nav {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        max-width: 100%;
        padding: 8px;
        border-bottom: 1px solid #ddd;
      }

      #site-nav a {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 0 8px;
        color: var(--ink);
      }`,
  },
  {
    id: 'E3',
    file: 'index.html',
    why: 'give the input and the button 44 px targets and the input a real label',
    find: `      #signup input {
        width: 140px;
        height: 20px;
        padding: 0;
        font-size: 12px;
      }
      #signup button {
        width: 60px;
        height: 24px;
        padding: 0;
        font-size: 12px;
      }`,
    replace: `      #signup input {
        width: 220px;
        min-height: 44px;
        padding: 8px;
        font-size: 16px;
      }

      #signup button {
        min-width: 88px;
        min-height: 44px;
        padding: 8px 16px;
        font-size: 16px;
      }`,
  },
  {
    id: 'E3b',
    file: 'index.html',
    why: 'the placeholder was the only label; name the field',
    find: `        <input id="email" name="email" type="email" autocomplete="email" placeholder="Email" />`,
    replace: `        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" />`,
  },
  {
    id: 'E4',
    file: 'index.html',
    why: 'stack each invoice row into a card below 960 px, keeping the money columns aligned',
    find: `      #invoices th,
      #invoices td {
        border: 1px solid #ddd;
        padding: 6px;
        text-align: left;
        white-space: nowrap;
      }`,
    replace: `      #invoices th,
      #invoices td {
        border: 1px solid #ddd;
        padding: 6px;
        text-align: left;
        white-space: nowrap;
      }

      /* The genuine exception to the stacked card: the numeric pair stays a row so the
         figures line up, and only the label/value pairs stack. */
      #invoices .money {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        white-space: nowrap;
      }

      @media (max-width: 960px) {
        #invoices {
          display: block;
          min-width: 0;
          width: 100%;
          border-collapse: collapse;
        }

        #invoices thead {
          display: none;
        }

        #invoices tbody,
        #invoices tr,
        #invoices td {
          display: block;
          width: auto;
        }

        #invoices tr {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 12px;
        }

        #invoices td {
          border: 0;
          padding: 4px 0;
          white-space: normal;
        }

        #invoices td::before {
          content: attr(data-label) ': ';
          font-weight: 600;
        }

        #invoices td.money::before {
          content: none;
        }
      }`,
  },
  {
    id: 'E4b',
    file: 'index.html',
    why: 'a stacked card needs its column names next to the values',
    find: `          <tr id="invoice-row">
            <td>INV-1041</td>
            <td>Northwind Traders</td>
            <td>2026-10-01</td>
            <td>2026-10-31</td>
            <td>Unpaid</td>
            <td>1,200.00</td>
            <td>240.00</td>
            <td>1,440.00</td>
          </tr>`,
    replace: `          <tr id="invoice-row">
            <td data-label="Number">INV-1041</td>
            <td data-label="Client">Northwind Traders</td>
            <td data-label="Issued">2026-10-01</td>
            <td data-label="Due">2026-10-31</td>
            <td data-label="Status">Unpaid</td>
            <td data-label="Net">1,200.00</td>
            <td data-label="Tax">240.00</td>
            <td data-label="Total">1,440.00</td>
          </tr>`,
  },
  {
    id: 'E5',
    file: 'index.html',
    why: 'restore the focus indicator and honour prefers-reduced-motion',
    find: `      #panel {
        transition: transform 300ms ease-in-out;
        margin-top: 24px;
      }
      #panel-open {
        outline: none;
        color: var(--accent);
      }`,
    replace: `      #panel {
        transition: transform 300ms ease-in-out;
        margin-top: 24px;
      }

      @media (prefers-reduced-motion: reduce) {
        #panel {
          transition: none;
        }
      }

      #panel-open {
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        color: var(--accent);
      }

      #panel-open:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }`,
  },
];

function fail(message) {
  console.error('examples: ' + message);
  process.exit(1);
}

function requireBuild() {
  const dist = join(ROOT, 'packages', 'eval-core', 'dist', 'index.js');
  if (!existsSync(dist))
    fail('packages/eval-core/dist is missing: run `pnpm --filter @sus/eval-core build`');
}

async function measure(stageDir, outDir) {
  const { runAudit, resolveScope, selectScopedItems } = await import(
    join(ROOT, 'packages', 'eval-core', 'dist', 'index.js')
  );
  const audit = await runAudit({
    target: stageDir,
    liveUrl: null,
    mode: 'deep',
    routes: null,
    outDir,
    authorizedHosts: [],
    fixPlan: false,
  });

  // playwright is a dependency of @sus/eval-core, not of the root workspace: resolve it from
  // there instead of adding a second copy for one script.
  const { chromium } = createRequire(join(ROOT, 'packages', 'eval-core', 'package.json'))(
    'playwright',
  );
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const scopes = [];
  try {
    await page.goto(pathToFileURL(join(stageDir, 'index.html')).href, { waitUntil: 'networkidle' });
    for (const example of EXAMPLES) {
      const scope = await resolveScope(page, { kind: 'selector', value: example.scope });
      const selection = selectScopedItems(audit.report, scope);
      scopes.push({ example, scope, selection });
    }
  } finally {
    await browser.close();
  }
  return { audit, scopes };
}

/** The audit's own verdict for the check an example is judged on. */
const CHECK_BY_INSTRUMENT = {
  'tap-target': 'capture-matrix',
  'overflow-320': 'reflow-matrix',
  keyboard: 'keyboard-flow',
};

function checkStatus(report, example) {
  const id = CHECK_BY_INSTRUMENT[example.instrument];
  return report.checks.find((check) => check.id === id)?.status ?? 'absent';
}

/** The measured value behind an example's items: the smallest target, or the widest page. */
function primaryValue(items, example) {
  const values = items
    .map((item) => item.observed?.value)
    .filter((value) => typeof value === 'number');
  if (values.length === 0) return null;
  return example.instrument === 'tap-target' ? Math.min(...values) : Math.max(...values);
}

function toRecord(item) {
  return {
    severity: item.severity,
    kind: item.kind,
    dimension: item.dimension,
    title: item.title,
    location: item.location,
    observed: item.observed,
    expected: item.expected,
  };
}

function summarise(entry, report) {
  const example = entry.example;
  const items = entry.selection.items;
  return {
    scope: entry.scope,
    items,
    status: checkStatus(report, example),
    primary: primaryValue(items, example),
    consulted: [...entry.selection.dimensions],
    notConsulted: entry.selection.untested,
  };
}

function renderMarkdown(data) {
  const lines = [
    '# Best-practice examples, measured (T1024)',
    '',
    'Generated by `node scripts/bestpractice/examples.mjs`; do not edit by hand. Every number below',
    'comes from a deep audit of `fixtures/bestpractice/examples` (before) and of the same fixture with',
    'the fixes in `scripts/bestpractice/examples.mjs` applied (after) — the same instruments',
    '`/sus audit` and `sus-eval bestpractice` run, not a hand-written table.',
    '',
    `Fixture: \`${data.fixture}\` · audit mode \`deep\` · generated ${data.generatedAt}`,
    '',
    'A dimension the audit did not measure is listed as `not-run` with its reason. Nothing here is',
    '`pass` by default, and no example claims an improvement the instrument did not show.',
    '',
  ];
  for (const example of data.examples) {
    lines.push(`## ${example.id} — ${example.label}`, '');
    lines.push(`Scope: \`${example.scope}\` · class \`${example.klass}\``, '');
    lines.push('| | before | after |');
    lines.push('| --- | --- | --- |');
    for (const row of example.measurements) {
      lines.push(`| ${row.label} | ${row.before} | ${row.after} |`);
    }
    lines.push('');
    lines.push(
      '**Consulted:** ' +
        (example.consulted.length === 0
          ? '_none_'
          : example.consulted.map((c) => '`' + c + '`').join(', ')),
    );
    lines.push('');
    if (example.notConsulted.length > 0) {
      lines.push('**Deliberately not consulted:**');
      for (const entry of example.notConsulted)
        lines.push(`- \`${entry.dimension}\` — ${entry.reason}`);
      lines.push('');
    }
    lines.push(`**Proposal before the fix:** ${example.itemsBefore.length} item(s)`);
    if (example.itemsBefore.length === 0) lines.push('- _nothing measured inside this scope_');
    for (const item of example.itemsBefore) {
      lines.push(
        `- ${item.severity} · ${item.kind} · ${item.dimension} — ${item.title}` +
          (item.observed === null
            ? ''
            : ` (observed ${item.observed.value} ${item.observed.unit}, expected ${item.expected?.value} ${item.expected?.unit})`),
      );
    }
    lines.push('');
    lines.push(`**Proposal after the fix:** ${example.itemsAfter.length} item(s)`);
    if (example.itemsAfter.length === 0) lines.push('- _nothing left to propose in this scope_');
    for (const item of example.itemsAfter) {
      lines.push(`- ${item.severity} · ${item.kind} · ${item.dimension} — ${item.title}`);
    }
    lines.push('');
    lines.push('**Verdict:** ' + example.verdict);
    lines.push('');
  }
  lines.push('## What these examples do not claim', '');
  for (const line of data.notClaimed) lines.push('- ' + line);
  lines.push('');
  return lines.join('\n');
}

async function build() {
  requireBuild();
  const generatedAt = '2026-11-17';
  const root = mkdtempSync(join(tmpdir(), 'sus-bp-examples-'));
  const beforeDir = join(root, 'before');
  const afterDir = join(root, 'after');
  cpSync(FIXTURE, beforeDir, { recursive: true });
  cpSync(FIXTURE, afterDir, { recursive: true });

  // Apply the fixes, refusing a stale fixture: a replacement that does not match would leave the
  // "after" stage unfixed and the report would claim an improvement that never happened.
  for (const fix of FIXES) {
    const file = join(afterDir, fix.file);
    const text = readFileSync(file, 'utf8');
    const count = text.split(fix.find).length - 1;
    if (count !== 1)
      fail(`fix ${fix.id} matched ${count} times in ${fix.file}; the fixture drifted`);
    writeFileSync(file, text.replace(fix.find, fix.replace), 'utf8');
  }

  const before = await measure(beforeDir, join(root, 'audit-before'));
  const after = await measure(afterDir, join(root, 'audit-after'));

  const examples = [];
  for (const example of EXAMPLES) {
    const beforeEntry = before.scopes.find((s) => s.example.id === example.id);
    const afterEntry = after.scopes.find((s) => s.example.id === example.id);
    if (beforeEntry === undefined || afterEntry === undefined) {
      fail('example ' + example.id + ' was not resolved in both stages');
    }
    const b = summarise(beforeEntry, before.audit.report);
    const a = summarise(afterEntry, after.audit.report);

    const measurements = [
      { label: 'scope outcome', before: b.scope.outcome, after: a.scope.outcome },
      {
        label:
          example.instrument === 'tap-target'
            ? 'smallest target measured in scope (px)'
            : example.instrument === 'overflow-320'
              ? 'widest document measured in scope (CSS px)'
              : 'a11y items measured in scope',
        before: b.primary === null ? 'none measured' : String(b.primary),
        after: a.primary === null ? 'none measured' : String(a.primary),
      },
      {
        label: '`' + CHECK_BY_INSTRUMENT[example.instrument] + '` status',
        before: b.status,
        after: a.status,
      },
      {
        label: 'items proposed in scope',
        before: String(b.items.length),
        after: String(a.items.length),
      },
    ];

    // The verdict is the scope's own evidence, not the page's: an unrelated element that is still
    // broken after the fix must not turn this example into a failure, and an empty scope before the
    // fix must not turn it into a pass.
    const verdict =
      b.items.length > 0 && a.items.length === 0
        ? 'pass — the defects measured inside this scope are gone after the fix'
        : b.items.length === 0
          ? 'fail — nothing was measured inside this scope before the fix, so nothing is demonstrated'
          : 'fail — ' + a.items.length + ' item(s) remain in this scope after the fix';

    examples.push({
      id: example.id,
      klass: example.klass,
      label: example.label,
      scope: example.scope,
      instrument: example.instrument,
      measurements,
      consulted: b.consulted,
      notConsulted: b.notConsulted.map((entry) => ({
        dimension: entry.dimension,
        reason: entry.reason,
      })),
      itemsBefore: b.items.map(toRecord),
      itemsAfter: a.items.map(toRecord),
      verdict,
    });
  }

  const data = {
    schema: 'sus.bestpractice.examples/1',
    fixture: 'fixtures/bestpractice/examples',
    mode: 'deep',
    generatedAt,
    fixes: FIXES.map((fix) => ({ id: fix.id, file: fix.file, why: fix.why })),
    examples,
    notClaimed: [
      'Nothing was applied to the fixture in the repository: the fixes are applied to a temporary copy and measured there.',
      'No guideline text was read or copied; the proposals are the audit’s findings, not advice from an upstream guide.',
      'The motion arm stays `not-run`: `transition-oracle` needs a scripted interaction, and no example drives one. The reduced-motion guard is in the fix, but nothing here measures it.',
      'axe findings are located by rule id, so they are counted as attributed elsewhere rather than proposed for an element scope (documented in docs/BESTPRACTICE_COMMAND.md §6).',
    ],
  };

  const json = JSON.stringify(data, null, 2) + '\n';
  const markdown = renderMarkdown(data);
  if (OUT_DIR !== null) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, 'examples.json'), json, 'utf8');
    writeFileSync(join(OUT_DIR, 'examples.md'), markdown, 'utf8');
    console.log('wrote ' + join(OUT_DIR, 'examples.json'));
  } else {
    mkdirSync(dirname(JSON_PATH), { recursive: true });
    writeFileSync(JSON_PATH, json, 'utf8');
    writeFileSync(DOC_PATH, markdown, 'utf8');
    console.log('wrote ' + JSON_PATH);
    console.log('wrote ' + DOC_PATH);
  }
  const failed = examples.filter((example) => !example.verdict.startsWith('pass'));
  for (const example of examples) console.log(example.id + ' ' + example.verdict);
  if (failed.length > 0) fail(failed.length + ' example(s) did not improve');
}

function check() {
  if (!existsSync(JSON_PATH)) fail('no committed ' + JSON_PATH + ' to check');
  const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  const expected = renderMarkdown(data);
  const actual = readFileSync(DOC_PATH, 'utf8');
  if (expected !== actual)
    fail('docs/BESTPRACTICE_EXAMPLES.md does not match the committed json; re-run without --check');
  const failed = data.examples.filter((example) => !example.verdict.startsWith('pass'));
  if (failed.length > 0)
    fail('committed examples contain a non-passing verdict: ' + failed.map((e) => e.id).join(', '));
  console.log('examples: ' + data.examples.length + ' committed, doc matches, all verdicts pass');
}

if (CHECK) {
  check();
} else {
  await build();
  execFileSync('git', ['--no-pager', 'diff', '--stat', '--', JSON_PATH, DOC_PATH], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
