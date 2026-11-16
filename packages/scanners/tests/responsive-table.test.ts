/**
 * T1016 — the responsive-table guard (issue #14).
 *
 * The checks are source-text heuristics, so these tests prove the two things a
 * heuristic can actually promise: the shipped `fixtures/admin` pair passes, and
 * each known-bad mutation of the same source is rejected by a *named* check. The
 * accessibility-tree claim itself is measured in a browser by
 * `packages/eval-core/tests/pilots.research.test.ts`; nothing here claims AT works.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkResponsiveTable } from '../src/responsive-table.js';

const ROOT = join(__dirname, '..', '..', '..');

const read = (...parts: string[]): string => readFileSync(join(ROOT, ...parts), 'utf8');

const fixtureCss = read('fixtures', 'admin', 'app', 'globals.css');
const fixtureMarkup = read('fixtures', 'admin', 'app', 'page.tsx');

const PILOT = ['evals', 'research', 'modern-web-guidance', 'pilots', 'responsive-table'];

/** The pilot pages are standalone documents; split the stylesheet from the body. */
const page = (name: string): { css: string; markup: string } => {
  const html = read(...PILOT, name);
  const css = /<style>([\s\S]*?)<\/style>/.exec(html)?.[1] ?? '';
  const markup = /<body>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? '';
  return { css, markup };
};

const statusOf = (result: ReturnType<typeof checkResponsiveTable>, id: string): string =>
  result.checks.find((check) => check.id === id)?.status ?? 'missing';

const CHECK_IDS = [
  'pseudo-label-pattern',
  'header-stays-in-a11y-tree',
  'overflow-not-concealed',
  'cell-labels-complete',
  'label-order-matches-header',
];

describe('responsive-table guard: the shipped fixture passes', () => {
  const result = checkResponsiveTable({ css: fixtureCss, markup: fixtureMarkup });

  it('emits exactly the five documented checks', () => {
    expect(result.checks.map((check) => check.id)).toEqual(CHECK_IDS);
  });

  it('passes, because the fixture hides the header visually only', () => {
    expect(result.status).toBe('pass');
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('names the visually-hidden technique and the 5 label/header matches', () => {
    expect(result.checks[1]?.detail).toMatch(/visually hidden/);
    expect(result.checks[4]?.detail).toMatch(/^5 header cells match/);
  });
});

describe('responsive-table guard: CSS only degrades to not-applicable', () => {
  const result = checkResponsiveTable({ css: fixtureCss });

  it('still judges the stylesheet side', () => {
    expect(statusOf(result, 'pseudo-label-pattern')).toBe('pass');
    expect(statusOf(result, 'overflow-not-concealed')).toBe('pass');
  });

  it('cannot judge the markup side, and says so instead of passing', () => {
    expect(statusOf(result, 'header-stays-in-a11y-tree')).toBe('not-applicable');
    expect(statusOf(result, 'cell-labels-complete')).toBe('not-applicable');
    expect(statusOf(result, 'label-order-matches-header')).toBe('not-applicable');
  });

  it('is not a failure — a missing input is not a finding', () => {
    expect(result.status).toBe('pass');
  });
});

describe('responsive-table guard: the known-bad recipes are rejected', () => {
  // The anti-pattern from the pilot's before page and from the guides issue #14
  // lists: flatten the table and hide the header row from the layout entirely.
  const hiddenHeaders = checkResponsiveTable({
    css: fixtureCss.replace(
      /#content-queue thead,\n {2}#invoice-list thead \{[\s\S]*?\n {2}\}/,
      '#content-queue thead, #invoice-list thead { display: none; }',
    ),
    markup: fixtureMarkup,
  });

  it('fails "header-stays-in-a11y-tree" on thead { display: none }', () => {
    expect(hiddenHeaders.status).toBe('fail');
    expect(statusOf(hiddenHeaders, 'header-stays-in-a11y-tree')).toBe('fail');
    expect(hiddenHeaders.checks[1]?.detail).toMatch(/display: none/);
  });

  it('fails on visibility: hidden too', () => {
    const result = checkResponsiveTable({
      // only the header block, not the .visually-hidden utility at the top
      css: fixtureCss.replace(
        '    overflow: hidden;\n    clip-path: inset(50%);\n    white-space: nowrap;\n  }',
        '    overflow: hidden;\n    visibility: hidden;\n    white-space: nowrap;\n  }',
      ),
      markup: fixtureMarkup,
    });
    expect(statusOf(result, 'header-stays-in-a11y-tree')).toBe('fail');
    expect(result.checks[1]?.detail).toMatch(/visibility: hidden/);
  });

  it('fails "overflow-not-concealed" when the page hides horizontal overflow', () => {
    const result = checkResponsiveTable({
      css: `${fixtureCss}\nhtml { overflow-x: hidden; }\n`,
      markup: fixtureMarkup,
    });
    expect(statusOf(result, 'overflow-not-concealed')).toBe('fail');
    expect(result.checks[2]?.detail).toMatch(/overflow-x: hidden/);
  });

  it('fails "overflow-not-concealed" when a table sets overflow: clip', () => {
    const result = checkResponsiveTable({
      css: fixtureCss.replace(/border: 0;\n {2}\}/, 'border: 0;\n    overflow: clip;\n  }'),
      markup: fixtureMarkup,
    });
    expect(statusOf(result, 'overflow-not-concealed')).toBe('fail');
  });

  it('fails "cell-labels-complete" when a cell loses its data-label', () => {
    const result = checkResponsiveTable({
      css: fixtureCss,
      markup: fixtureMarkup.replace('<td data-label="Editor">', '<td>'),
    });
    expect(statusOf(result, 'cell-labels-complete')).toBe('fail');
    expect(result.checks[3]?.detail).toMatch(/1 of 5 <td> cells lack data-label/);
  });

  it('fails "label-order-matches-header" when labels are reordered', () => {
    const result = checkResponsiveTable({
      css: fixtureCss,
      markup: fixtureMarkup
        .replace('<td data-label="Status">', '<td data-label="TEMP">')
        .replace('<td data-label="Editor">', '<td data-label="Status">')
        .replace('<td data-label="TEMP">', '<td data-label="Editor">'),
    });
    expect(statusOf(result, 'label-order-matches-header')).toBe('fail');
    expect(result.checks[4]?.detail).toMatch(/headers \[/);
  });

  it('fails "cell-labels-complete" when the labels are never painted', () => {
    const result = checkResponsiveTable({
      css: fixtureCss.replace(/ {2}content: attr\(data-label\);/, '  content: none;'),
      markup: fixtureMarkup,
    });
    expect(statusOf(result, 'pseudo-label-pattern')).toBe('not-applicable');
    expect(statusOf(result, 'cell-labels-complete')).toBe('fail');
    expect(result.status).toBe('fail');
  });
});

describe('responsive-table guard: judges the measured pilot pair', () => {
  // These two pages are the ones the browser harness measures in
  // packages/eval-core/tests/pilots.research.test.ts. The heuristic must agree
  // with the measurement, or it is not a usable guard.
  const before = checkResponsiveTable(page('before.html'));
  const after = checkResponsiveTable(page('after.html'));

  it('rejects the before page on the header check', () => {
    expect(before.status).toBe('fail');
    expect(statusOf(before, 'header-stays-in-a11y-tree')).toBe('fail');
    expect(before.checks[1]?.detail).toMatch(/display: none/);
  });

  it('accepts the after page', () => {
    expect(after.status).toBe('pass');
    expect(after.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('agrees with the browser on every cell and header count it can see', () => {
    expect(after.checks[3]?.detail).toMatch(/all 16 <td> cells/);
    expect(after.checks[4]?.detail).toMatch(/^4 header cells match/);
  });

  it('does not care about the ": " decoration the before page adds', () => {
    expect(statusOf(before, 'pseudo-label-pattern')).toBe('pass');
  });
});

describe('responsive-table guard: inputs and honest limits', () => {
  it('empty input reports not-applicable, never pass-by-accident detail', () => {
    const result = checkResponsiveTable({ css: '' });
    expect(result.checks.map((check) => check.status)).toEqual([
      'not-applicable',
      'not-applicable',
      'not-applicable',
      'not-applicable',
      'not-applicable',
    ]);
    expect(result.status).toBe('not-applicable');
  });

  it('strips comments, so a commented-out recipe is not a finding', () => {
    const commented = `/* thead { display: none } */\n${fixtureCss}`;
    const result = checkResponsiveTable({ css: commented, markup: fixtureMarkup });
    expect(result.status).toBe('pass');
  });

  it('strips JSX and HTML comments, so a commented-out cell is not a finding', () => {
    const commented = fixtureMarkup.replace(
      '<td data-label="Editor">',
      '{/* <td data-label="Editor"> */}<td data-label="Editor">',
    );
    const result = checkResponsiveTable({ css: fixtureCss, markup: commented });
    expect(statusOf(result, 'cell-labels-complete')).toBe('pass');
  });

  it('reads @media-wrapped rules, which is where the whole recipe lives', () => {
    const result = checkResponsiveTable({
      css: '@media (width <= 40rem) { thead { display: none } td::before { content: attr(data-label) } }',
      markup:
        '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td data-label="A">1</td></tr></tbody></table>',
    });
    expect(statusOf(result, 'header-stays-in-a11y-tree')).toBe('fail');
    expect(result.checks[1]?.detail).toMatch(/@media \(width <= 40rem\) thead/);
  });

  it('a table with no generated labels is out of scope, not a failure', () => {
    const result = checkResponsiveTable({
      css: 'table { border-collapse: collapse }',
      markup: '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
    });
    expect(result.status).toBe('not-applicable');
  });
});
