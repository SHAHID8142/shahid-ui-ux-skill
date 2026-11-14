/**
 * Astro source editing for the safe-write path (T0700wc).
 *
 * The JSX editor cannot read `.astro` — it is a different language — so the
 * Astro stack had no edit path at all and T0700wb recorded that as a blocker
 * instead of shipping a write it could not verify. This module closes it with
 * the same contract as the JSX editor: locate the element by its stable anchor,
 * splice bytes only inside/around it, and refuse rather than write when any
 * post-condition fails.
 *
 * Non-negotiables, mirroring `editor.ts`:
 *  - nothing outside the target element's byte range changes;
 *  - the frontmatter (`---` block) and `<script>` bodies are never edited;
 *  - inserted code is re-indented to the target, so it matches the file;
 *  - the target anchor must survive (except for a delete), and an insert may
 *    not duplicate an anchor;
 *  - a map-instance anchor (`id={p.id}`) is refused: one instance cannot be
 *    edited without deciding what happens to the others, and guessing would be
 *    exactly the wrong-owner write the feasibility experiment measures.
 */
import type {
  AstEdit,
  EditOperation,
  EditRefusalReason,
  EditResult,
  LocatedElement,
} from './editor.js';

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

interface Token {
  kind: 'open' | 'close' | 'self' | 'other';
  tagName: string;
  start: number;
  end: number;
  /** Attribute text between the tag name and the closing `>`. */
  attributes: string;
}

function splitFrontmatter(text: string): { start: number; end: number } {
  if (!text.startsWith('---')) return { start: 0, end: 0 };
  const close = text.indexOf('\n---', 3);
  if (close === -1) return { start: 0, end: 0 };
  const after = text.indexOf('\n', close + 4);
  return { start: 0, end: after === -1 ? text.length : after };
}

/** Tokenizes template tags while respecting quotes and `{}` nesting. */
function tokenize(text: string, from: number): Token[] {
  const tokens: Token[] = [];
  let index = from;
  while (index < text.length) {
    if (text[index] !== '<') {
      index += 1;
      continue;
    }
    if (text.startsWith('<!--', index)) {
      const end = text.indexOf('-->', index);
      index = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<!', index) || text.startsWith('<?', index)) {
      const end = text.indexOf('>', index);
      index = end === -1 ? text.length : end + 1;
      continue;
    }
    const closing = text[index + 1] === '/';
    const nameMatch = /^<(\/?)([A-Za-z][\w.:-]*)/.exec(text.slice(index));
    if (!nameMatch) {
      index += 1;
      continue;
    }
    const tagName = nameMatch[2]!;
    let cursor = index + nameMatch[0].length;
    let quote: string | null = null;
    let braces = 0;
    while (cursor < text.length) {
      const char = text[cursor]!;
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '{') {
        braces += 1;
      } else if (char === '}') {
        braces -= 1;
      } else if (char === '>' && braces === 0) {
        break;
      }
      cursor += 1;
    }
    const end = cursor + 1;
    const selfClosing = !closing && /\/\s*>$/.test(text.slice(index, end));
    tokens.push({
      kind: closing ? 'close' : selfClosing ? 'self' : 'open',
      tagName,
      start: index,
      end,
      attributes: text.slice(index + nameMatch[0].length, cursor),
    });
    index = end;
  }
  return tokens;
}

/** Byte range of an element including its matching close tag. */
function elementRange(tokens: Token[], at: number): { start: number; end: number } | null {
  const token = tokens[at]!;
  if (token.kind === 'self') return { start: token.start, end: token.end };
  let depth = 0;
  for (let cursor = at; cursor < tokens.length; cursor += 1) {
    const current = tokens[cursor]!;
    if (current.tagName !== token.tagName) continue;
    if (current.kind === 'open') depth += 1;
    if (current.kind === 'close') {
      depth -= 1;
      if (depth === 0) return { start: token.start, end: current.end };
    }
  }
  return null;
}

function indentAt(text: string, position: number): string {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart, position))![0];
}

/** True when every non-void element in the template is balanced. */
function templateBalanced(text: string, from: number): boolean {
  const stack: string[] = [];
  for (const token of tokenize(text, from)) {
    if (token.kind === 'self' || VOID_ELEMENTS.has(token.tagName.toLowerCase())) continue;
    if (token.kind === 'open') stack.push(token.tagName);
    if (token.kind === 'close') {
      if (stack.pop() !== token.tagName) return false;
    }
  }
  return stack.length === 0;
}

function reindent(content: string, indent: string, unit: string): string {
  return content
    .split('\n')
    .map((line, index) => {
      if (line.trim() === '') return line;
      if (index === 0) return indent + line.trimStart();
      const leading = /^[ \t]*/.exec(line)![0];
      const depth = Math.max(0, Math.round(leading.length / unit.length));
      return indent + unit.repeat(depth) + line.trimStart();
    })
    .join('\n');
}

function refuse(reason: EditRefusalReason, detail: string): EditResult {
  return { ok: false, reason, detail };
}

/** Locates an element by literal id anchor in an Astro template. */
export function locateAstroElement(
  file: string,
  text: string,
  anchor: string,
):
  | EditResult
  | {
      ok: true;
      token: Token;
      range: { start: number; end: number };
      located: LocatedElement;
      from: number;
    } {
  const { end: frontmatterEnd } = splitFrontmatter(text);
  if (!text.startsWith('---') && text.includes('---')) {
    return refuse('unparseable-source', `${file}: frontmatter is not delimited`);
  }
  const tokens = tokenize(text, frontmatterEnd);
  const literal = (attributes: string): string | null => {
    const match = /(^|\s)id\s*=\s*"([^"]*)"/.exec(attributes);
    return match ? match[2]! : null;
  };
  const expression = (attributes: string): boolean => /(^|\s)id\s*=\s*\{/.test(attributes);
  const matches = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.kind !== 'close' && literal(token.attributes) === anchor);
  if (matches.length === 0) {
    const hasExpressionAnchor = tokens.some(
      (token) => token.kind !== 'close' && expression(token.attributes),
    );
    return refuse(
      'target-not-found',
      hasExpressionAnchor
        ? `no literal id="${anchor}"; this file renders instance ids from an expression, and one instance cannot be edited without deciding the others`
        : `no element with id="${anchor}" in ${file}`,
    );
  }
  if (matches.length > 1) {
    return refuse('ambiguous-target', `id="${anchor}" appears ${matches.length} times in ${file}`);
  }
  const chosen = matches[0]!;
  const range = elementRange(tokens, chosen.index);
  if (!range)
    return refuse('unparseable-source', `${file}: <${chosen.token.tagName}> is not closed`);
  return {
    ok: true,
    token: chosen.token,
    range,
    from: frontmatterEnd,
    located: {
      start: range.start,
      end: chosen.token.end,
      tagName: chosen.token.tagName,
      selfClosing: chosen.token.kind === 'self',
      childrenStart: chosen.token.end,
      childrenEnd: range.end - (`</${chosen.token.tagName}>`.length || 0),
      indent: indentAt(text, chosen.token.start),
      confidence: 1,
    } satisfies LocatedElement,
  };
}

/** Applies one edit to an `.astro` source, refusing unless every check holds. */
export function editAstro(file: string, before: string, edit: AstEdit): EditResult {
  const located = locateAstroElement(file, before, edit.target.anchor);
  if ('ok' in located && located.ok === false) return located;
  const found = located as Exclude<typeof located, EditResult>;
  const unit = edit.indentUnit ?? '  ';
  const content = (edit.content ?? '').trim();
  const operations: EditOperation[] = [
    'insert-child',
    'insert-before',
    'insert-after',
    'replace-node',
    'delete-node',
  ];
  if (!operations.includes(edit.operation)) {
    return refuse('invalid-content', `unsupported operation ${edit.operation}`);
  }
  if (edit.operation !== 'delete-node' && content === '') {
    return refuse('empty-content', `${edit.operation} needs content`);
  }
  if (edit.operation === 'insert-child' && found.token.kind === 'self') {
    return refuse(
      'self-closing-insert',
      `<${found.token.tagName} /> is self-closing; insert-before/after or replace it instead`,
    );
  }
  if (edit.operation === 'delete-node' && /^(html|body)$/i.test(found.token.tagName)) {
    return refuse('invalid-content', `refusing to delete <${found.token.tagName}>`);
  }

  const { start, end } = found.range;
  const indent = indentAt(before, start);
  const block = reindent(content, indent, unit);
  let after: string;
  if (edit.operation === 'insert-child') {
    const closeStart = end - `</${found.token.tagName}>`.length;
    const lineStart = before.lastIndexOf('\n', closeStart - 1) + 1;
    const closingIndent = before.slice(lineStart, closeStart);
    if (/^[ \t]*$/.test(closingIndent)) {
      // already multiline: add one line at the target indent plus one unit
      const insertion = `${indent}${unit}${block.trimStart()}\n`;
      after = before.slice(0, lineStart) + insertion + before.slice(lineStart);
    } else {
      // inline content: put the closing tag on its own line so the new child
      // owns a line instead of being spliced mid-sentence
      const insertion = `\n${indent}${unit}${block.trimStart()}\n${indent}`;
      after = before.slice(0, closeStart) + insertion + before.slice(closeStart);
    }
  } else if (edit.operation === 'insert-before') {
    const lineStart = before.lastIndexOf('\n', start - 1) + 1;
    after = before.slice(0, lineStart) + block + '\n' + before.slice(lineStart);
  } else if (edit.operation === 'insert-after') {
    const lineEnd = before.indexOf('\n', end);
    const at = lineEnd === -1 ? before.length : lineEnd;
    after = before.slice(0, at) + '\n' + block + before.slice(at);
  } else if (edit.operation === 'replace-node') {
    after = before.slice(0, start) + block + before.slice(end);
  } else {
    const lineStart = before.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = before.indexOf('\n', end);
    const removeStart = /^[ \t]*$/.test(before.slice(lineStart, start)) ? lineStart : start;
    const removeEnd = lineEnd === -1 ? before.length : lineEnd + 1;
    after = before.slice(0, removeStart) + before.slice(removeEnd);
  }

  // post-conditions
  const anchorCount = (text: string): number =>
    tokenize(text, splitFrontmatter(text).end).filter(
      (token) =>
        token.kind !== 'close' &&
        new RegExp(`(^|\\s)id\\s*=\\s*"${edit.target.anchor}"`).test(token.attributes),
    ).length;
  if (edit.operation !== 'delete-node') {
    const remaining = anchorCount(after);
    if (remaining > 1) {
      return refuse(
        'would-duplicate-anchor',
        `the edit would leave ${remaining} elements with id="${edit.target.anchor}"`,
      );
    }
    if (remaining === 0) {
      return refuse(
        'post-edit-target-lost',
        `the edit would remove the only element with id="${edit.target.anchor}"`,
      );
    }
  }
  if (!templateBalanced(after, splitFrontmatter(after).end)) {
    return refuse('post-edit-parse-failure', 'the edit would leave the template unbalanced');
  }
  return { ok: true, before, after, located: found.located };
}
