/**
 * Responsive-table accessibility checks (issue #14): deterministic text
 * heuristics over a stylesheet and, optionally, the markup it styles.
 *
 * Pattern under test: below a breakpoint the table reflows into stacked
 * records, the <thead> is hidden *visually only* (position:absolute + 1px +
 * clip + overflow:hidden, so header cells stay in the accessibility tree),
 * and each <td data-label="…"> paints its label with
 * `td::before { content: attr(data-label) }`. The anti-pattern hides the
 * header with `display: none`, dropping column association from the
 * accessibility tree.
 *
 * Limits: a source-text heuristic — it does not resolve the cascade,
 * evaluate media queries, or observe a browser. The browser-measured
 * accessibility-tree truth lives in the pilot harness (packages/eval-core);
 * a source-text "pass" never means assistive technology works.
 */
export interface ResponsiveTableSource {
  css: string;
  markup?: string;
}

export interface ResponsiveTableCheck {
  id: string;
  status: 'pass' | 'fail' | 'not-applicable';
  detail: string;
}

export interface ResponsiveTableResult {
  checks: ResponsiveTableCheck[];
  status: 'pass' | 'fail' | 'not-applicable';
}

type Decls = Record<string, string>;

interface Rule {
  selector: string;
  parts: string[];
  decls: Decls;
}

const AT_STATEMENT = /@(?:import|charset|namespace|layer)\b[^;{}]*;/gi;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const JSX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const CELL = /<td\b([^>]*)>/gi;
const DATA_LABEL = /\bdata-label\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const HEADER = /(^|[\s>+~])(?:thead|th)(?=$|[\s>+~.#[:])/i;
const CONTAINER = /(^|[\s>+~])(?:html|body|table)(?=$|[\s>+~.#[:])/i;

const squash = (value: string): string => value.replace(/\s+/g, ' ').trim();
const valueOf = (raw: string): string => raw.toLowerCase().replace('!important', '').trim();

function declarations(body: string): Decls {
  const out: Decls = {};
  for (const chunk of body.split(';')) {
    const colon = chunk.indexOf(':');
    if (colon < 1) continue;
    out[chunk.slice(0, colon).trim().toLowerCase()] = chunk.slice(colon + 1).trim();
  }
  return out;
}

/** Parse CSS (comments stripped), recursing into @media/@supports/@layer. */
function walkCss(text: string, prefix: string, out: Rule[]): void {
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('{', index);
    if (open < 0) return;
    let depth = 0;
    let close = text.length - 1;
    for (let cursor = open; cursor < text.length; cursor += 1) {
      if (text[cursor] === '{') depth += 1;
      else if (text[cursor] === '}' && --depth === 0) {
        close = cursor;
        break;
      }
    }
    const head = text.slice(index, open).trim();
    const body = text.slice(open + 1, close);
    if (head.startsWith('@')) {
      walkCss(body, `${prefix}${head} `, out);
    } else if (head) {
      const parts = head
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      out.push({ selector: `${prefix}${parts.join(', ')}`, parts, decls: declarations(body) });
    }
    index = close + 1;
  }
}

function parseCss(css: string): Rule[] {
  const out: Rule[] = [];
  walkCss(css.replace(COMMENT, '').replace(AT_STATEMENT, ''), '', out);
  return out;
}

function visuallyHidden(rule: Rule): boolean {
  const { decls } = rule;
  const clip = decls['clip-path'] ?? decls.clip;
  const overflow = decls.overflow ?? decls['overflow-x'];
  const onePixel = ['inline-size', 'width', 'block-size', 'height'].some((prop) => {
    const value = decls[prop];
    return value !== undefined && valueOf(value) === '1px';
  });
  return (
    decls.position !== undefined &&
    valueOf(decls.position) === 'absolute' &&
    clip !== undefined &&
    (overflow !== undefined || onePixel)
  );
}

function concealment(rule: Rule): string | undefined {
  const prop = rule.decls['overflow-x'] !== undefined ? 'overflow-x' : 'overflow';
  const value = rule.decls[prop];
  if (value === undefined) return undefined;
  const first = valueOf(value).split(/\s+/)[0];
  return first === 'hidden' || first === 'clip' ? `${prop}: ${squash(value)}` : undefined;
}

function dataLabel(attributes: string): string | undefined {
  const match = DATA_LABEL.exec(attributes);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value === undefined ? undefined : squash(value);
}

function firstGroup(pattern: RegExp, text: string | undefined): string | undefined {
  return text === undefined ? undefined : pattern.exec(text)?.[1];
}

export function checkResponsiveTable(source: ResponsiveTableSource): ResponsiveTableResult {
  const rules = parseCss(source.css);
  const markup = source.markup?.replace(JSX_COMMENT, '').replace(HTML_COMMENT, '');
  const checks: ResponsiveTableCheck[] = [];
  const add = (id: string, status: ResponsiveTableCheck['status'], detail: string): void => {
    checks.push({ id, status, detail });
  };

  // Any rule that paints the label counts, including `content: attr(data-label) ': '`:
  // the anti-pattern's own decoration must not be able to opt out of the header check.
  const pseudoRule = rules.find((rule) => {
    const content = rule.decls.content;
    return content !== undefined && /attr\(\s*data-label\s*\)/i.test(content);
  });
  const pseudoApplies = pseudoRule !== undefined;
  add(
    'pseudo-label-pattern',
    pseudoApplies ? 'pass' : 'not-applicable',
    pseudoRule
      ? `generated cell labels via content: attr(data-label) on "${pseudoRule.selector}"`
      : 'no rule declares content: attr(data-label)',
  );

  const headerId = 'header-stays-in-a11y-tree';
  const headerApplies = pseudoApplies && markup !== undefined && /<thead\b/i.test(markup);
  let offending: { selector: string; text: string } | undefined;
  let technique: Rule | undefined;
  if (headerApplies) {
    for (const rule of rules) {
      if (!rule.parts.some((part) => HEADER.test(part))) continue;
      const display = rule.decls.display;
      const visibility = rule.decls.visibility;
      if (display !== undefined && valueOf(display) === 'none') {
        offending = { selector: rule.selector, text: `display: ${squash(display)}` };
      } else if (visibility !== undefined && valueOf(visibility) === 'hidden') {
        offending = { selector: rule.selector, text: 'visibility: hidden' };
      } else if (technique === undefined && visuallyHidden(rule)) {
        technique = rule;
      }
    }
  }
  if (!headerApplies) add(headerId, 'not-applicable', 'needs generated labels and a <thead>');
  else if (offending) {
    const detail = `"${offending.selector}" sets ${offending.text}; headers leave the a11y tree`;
    add(headerId, 'fail', detail);
  } else if (technique) {
    const detail = `visually hidden by "${technique.selector}" (position:absolute + clip + overflow:hidden)`;
    add(headerId, 'pass', detail);
  } else add(headerId, 'pass', 'no thead/th rule sets display: none or visibility: hidden');

  const overflowId = 'overflow-not-concealed';
  let overflowOffender: { selector: string; text: string } | undefined;
  for (const rule of source.css.trim() === '' ? [] : rules) {
    const concealed = concealment(rule);
    if (concealed === undefined) continue;
    const display = rule.decls.display;
    const container = rule.parts.some((part) => CONTAINER.test(part));
    const tableLayout =
      rule.decls['table-layout'] !== undefined ||
      (display !== undefined && /^table(-|$)/i.test(valueOf(display)));
    if (container || tableLayout) overflowOffender = { selector: rule.selector, text: concealed };
  }
  if (source.css.trim() === '') add(overflowId, 'not-applicable', 'no CSS supplied');
  else if (overflowOffender) {
    const detail = `"${overflowOffender.selector}" conceals overflow via ${overflowOffender.text}`;
    add(overflowId, 'fail', detail);
  } else add(overflowId, 'pass', 'no html/body/table rule hides overflow');

  const cellId = 'cell-labels-complete';
  const cells = markup === undefined ? [] : [...markup.matchAll(CELL)];
  const missing = cells.filter((cell) => !DATA_LABEL.test(cell[1] ?? '')).length;
  const labelled = cells.length - missing;
  if (markup === undefined) add(cellId, 'not-applicable', 'no markup supplied');
  else if (cells.length === 0) add(cellId, 'not-applicable', 'markup has no <td> cells');
  // A table that uses neither half of the pattern is simply not this guard's
  // subject; only a half-applied pattern is a finding.
  else if (labelled === 0 && !pseudoApplies) {
    add(cellId, 'not-applicable', 'no <td> carries data-label and no rule paints one');
  } else if (missing > 0) {
    add(cellId, 'fail', `${missing} of ${cells.length} <td> cells lack data-label`);
  } else if (!pseudoApplies) {
    add(cellId, 'fail', `${cells.length} <td> cells carry data-label but no rule paints it`);
  } else add(cellId, 'pass', `all ${cells.length} <td> cells carry data-label`);

  const orderId = 'label-order-matches-header';
  const thead = firstGroup(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i, markup);
  const headerRow = firstGroup(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i, thead);
  const headerCells =
    headerRow === undefined
      ? []
      : [...headerRow.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((match) =>
          squash((match[1] ?? '').replace(/<[^>]*>/g, ' ')),
        );
  const tbody = firstGroup(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i, markup);
  const bodyRow = firstGroup(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i, tbody);
  const labels =
    bodyRow === undefined
      ? []
      : [...bodyRow.matchAll(CELL)]
          .map((match) => dataLabel(match[1] ?? ''))
          .filter((label): label is string => label !== undefined);
  if (headerCells.length === 0 || labels.length === 0) {
    add(orderId, 'not-applicable', 'needs <thead> header cells and first-row data-label values');
  } else if (
    headerCells.length !== labels.length ||
    headerCells.some((cell, index) => valueOf(cell) !== valueOf(labels[index] ?? ''))
  ) {
    const detail = `headers [${headerCells.join(' | ')}] vs labels [${labels.join(' | ')}] differ`;
    add(orderId, 'fail', detail);
  } else {
    add(orderId, 'pass', `${headerCells.length} header cells match the first row's label order`);
  }

  const failed = checks.some((check) => check.status === 'fail');
  const bothGone = !pseudoApplies && checks[3]?.status === 'not-applicable';
  return { checks, status: failed ? 'fail' : bothGone ? 'not-applicable' : 'pass' };
}
