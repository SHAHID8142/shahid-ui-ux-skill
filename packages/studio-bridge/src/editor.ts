/**
 * AST-guided source editing for the Studio (T0707).
 *
 * Why this shape: a Studio that rewrites whole files through a printer
 * (`recast`, `ts-morph`'s in-memory emit) destroys review quality — the diff
 * fills with reformatting, the user's unrelated uncommitted edits get
 * normalised, and "what will be written" stops matching "what was approved".
 * So targeting is AST-precise but the write is a **byte-minimal splice**:
 * everything outside the target node's range is preserved exactly.
 *
 * The type checker is the judge, not the writer: an edit is only returned when
 *  - the source parses before the edit and after it,
 *  - the inserted/replaced content parses as JSX on its own,
 *  - the target still exists afterwards (post-condition, not a hope).
 * Anything else is refused with a reason. "Unknown syntax → refuse and report"
 * is the task's stated rollback, so refusal is the designed path, not a crash.
 */
import ts from 'typescript';

export type ParseProblem = { message: string; line: number; column: number };

export interface ParsedSource {
  ok: boolean;
  problems: ParseProblem[];
}

function scriptKindFor(file: string): ts.ScriptKind {
  if (/\.tsx$/.test(file)) return ts.ScriptKind.TSX;
  if (/\.jsx$/.test(file)) return ts.ScriptKind.JSX;
  if (/\.ts$/.test(file)) return ts.ScriptKind.TS;
  if (/\.js$/.test(file)) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

/** Parses and reports syntactic diagnostics only (no type resolution). */
export function parseSource(file: string, text: string): ParsedSource {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, scriptKindFor(file));
  const problems =
    (source as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return {
    ok: problems.length === 0,
    problems: problems.map((d) => {
      const position = d.start !== undefined ? source.getLineAndCharacterOfPosition(d.start) : null;
      return {
        message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
        line: position ? position.line + 1 : 0,
        column: position ? position.character + 1 : 0,
      };
    }),
  };
}

/** A target handle: the stable anchor the mapping layer resolved. */
export interface TargetRef {
  /** Stable id attribute (`id` or `data-sus-id`) of the target JSX element. */
  anchor: string;
  /** Which attribute carries it. Defaults to 'id'. */
  attribute?: 'id' | 'data-sus-id';
}

export interface LocatedElement {
  /** JSX element's source range (start of `<`, end after `>`). */
  start: number;
  end: number;
  tagName: string;
  selfClosing: boolean;
  /** Range between `>` and `</`: empty for self-closing elements. */
  childrenStart: number;
  childrenEnd: number;
  /** Line indentation of the opening tag, reused for inserted code. */
  indent: string;
  confidence: number;
}

export type LocateResult =
  | { ok: true; element: LocatedElement }
  | {
      ok: false;
      reason: 'target-not-found' | 'ambiguous-target' | 'unparseable-source';
      detail: string;
    };

function isJsxElement(node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node);
}

function attributeValue(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  attribute: string,
): string | null {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const attributes = opening.attributes.properties;
  for (const property of attributes) {
    if (!ts.isJsxAttribute(property)) continue;
    if (property.name.getText() !== attribute) continue;
    const initializer = property.initializer;
    if (!initializer) return null;
    if (ts.isStringLiteral(initializer)) return initializer.text;
    // {`...`} or {"..."} template/expression string constants only — anything
    // computed is unverifiable statically and therefore not a stable anchor.
    if (ts.isJsxExpression(initializer) && initializer.expression) {
      const expression = initializer.expression;
      if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
        return expression.text;
      }
    }
    return null;
  }
  return null;
}

function indentOf(text: string, position: number): string {
  const lineStart = text.lastIndexOf('\n', position - 1) + 1;
  const line = text.slice(lineStart, position);
  const match = /^[ \t]*/.exec(line);
  return match ? match[0] : '';
}

/**
 * Finds the JSX elements carrying the given stable anchor.
 * More than one match is AMBIGUOUS (the caller must refuse): picking the first
 * would be a silent guess about which section the user drew on.
 */
export function locateElement(file: string, text: string, target: TargetRef): LocateResult {
  const parsed = parseSource(file, text);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: 'unparseable-source',
      detail: `${file}:${parsed.problems[0]!.line}:${parsed.problems[0]!.column} ${parsed.problems[0]!.message}`,
    };
  }
  const attribute = target.attribute ?? 'id';
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, scriptKindFor(file));
  const matches: Array<ts.JsxElement | ts.JsxSelfClosingElement> = [];
  const walk = (node: ts.Node): void => {
    if (isJsxElement(node) && attributeValue(node, attribute) === target.anchor) matches.push(node);
    ts.forEachChild(node, walk);
  };
  walk(source);

  if (matches.length === 0) {
    return {
      ok: false,
      reason: 'target-not-found',
      detail: `no JSX element with ${attribute}="${target.anchor}" in ${file}`,
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous-target',
      detail: `${matches.length} elements carry ${attribute}="${target.anchor}" in ${file} — refusing to guess the section`,
    };
  }

  const node = matches[0]!;
  const start = node.getStart(source);
  const end = node.getEnd();
  const selfClosing = ts.isJsxSelfClosingElement(node);
  const tagName = selfClosing ? node.tagName.getText() : node.openingElement.tagName.getText();
  const childrenStart = selfClosing ? end : node.openingElement.getEnd();
  const childrenEnd = selfClosing ? end : node.closingElement.getStart();

  return {
    ok: true,
    element: {
      start,
      end,
      tagName,
      selfClosing,
      childrenStart,
      childrenEnd,
      indent: indentOf(text, start),
      confidence: 1,
    },
  };
}

export type EditOperation =
  'insert-child' | 'insert-before' | 'insert-after' | 'replace-node' | 'delete-node';

export interface AstEdit {
  operation: EditOperation;
  target: TargetRef;
  /** JSX source for the new content (unused by delete-node). */
  content?: string;
  /**
   * Unit of indentation for inserted code. Defaults to two spaces; the target's
   * own indentation is always reused, so inserted code matches the file.
   */
  indentUnit?: string;
}

export type EditRefusalReason =
  | 'target-not-found'
  | 'ambiguous-target'
  | 'unparseable-source'
  | 'invalid-content'
  | 'self-closing-insert'
  | 'would-duplicate-anchor'
  | 'post-edit-parse-failure'
  | 'post-edit-target-lost'
  | 'empty-content';

export type EditResult =
  | { ok: true; before: string; after: string; located: LocatedElement }
  | { ok: false; reason: EditRefusalReason; detail: string };

/** Indents every line of `content` by `indent`, preserving relative depth. */
function reindent(content: string, indent: string, indentUnit: string): string {
  return content
    .split('\n')
    .map((line, index) => {
      if (index === 0) return indent + line.trimStart();
      if (line.trim() === '') return line;
      const leading = /^[ \t]*/.exec(line)![0];
      const depth = Math.max(
        0,
        Math.round(leading.replace(/\t/g, indentUnit).length / indentUnit.length),
      );
      return indent + indentUnit.repeat(depth) + line.trimStart();
    })
    .join('\n');
}

function anchorsIn(sourceFile: ts.SourceFile, attribute: string): Map<string, number> {
  const counts = new Map<string, number>();
  const walk = (node: ts.Node): void => {
    if (isJsxElement(node)) {
      const value = attributeValue(node, attribute);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);
  return counts;
}

/**
 * Applies one edit and returns the ORIGINAL and PROPOSED source, refusing
 * unless every post-condition holds.
 *
 * Post-conditions (all enforced, none assumed):
 *  1. the content parses as JSX on its own,
 *  2. the edited file parses with no syntactic diagnostics,
 *  3. the target anchor still exists exactly once,
 *  4. an inserted element does not duplicate an existing anchor.
 */
export function applyAstEdit(file: string, before: string, edit: AstEdit): EditResult {
  const located = locateElement(file, before, edit.target);
  if (!located.ok) return { ok: false, reason: located.reason, detail: located.detail };
  const element = located.element;
  const indentUnit = edit.indentUnit ?? '  ';
  const content = (edit.content ?? '').trim();

  if (edit.operation !== 'delete-node' && edit.operation !== 'replace-node' && content === '') {
    return { ok: false, reason: 'empty-content', detail: `${edit.operation} needs content` };
  }
  if (edit.operation === 'insert-child' && element.selfClosing) {
    return {
      ok: false,
      reason: 'self-closing-insert',
      detail: `<${element.tagName} …/> has no children to insert into; inserting would require rewriting the tag`,
    };
  }
  if (content !== '') {
    const contentCheck = parseSource(`${file}.fragment.tsx`, `const __fragment = <>${content}</>;`);
    if (!contentCheck.ok) {
      return {
        ok: false,
        reason: 'invalid-content',
        detail: `new content is not valid JSX: ${contentCheck.problems[0]!.message} (line ${contentCheck.problems[0]!.line})`,
      };
    }
  }

  let after: string;
  if (edit.operation === 'insert-child') {
    const childIndent = element.indent + indentUnit;
    // Insert at the START of the closing tag's line when that line holds only
    // indentation — inserting at the tag itself would leave a blank line with
    // trailing whitespace behind.
    const closingLineStart = before.lastIndexOf('\n', element.childrenEnd - 1) + 1;
    const beforeClosing = before.slice(closingLineStart, element.childrenEnd);
    const insertAt = beforeClosing.trim() === '' ? closingLineStart : element.childrenEnd;
    const needsLeadingNewline = insertAt === element.childrenEnd;
    const insertion = `${needsLeadingNewline ? '\n' : ''}${reindent(content, childIndent, indentUnit)}\n`;
    after = before.slice(0, insertAt) + insertion + before.slice(insertAt);
  } else if (edit.operation === 'insert-before') {
    after =
      before.slice(0, element.start) +
      `${reindent(content, element.indent, indentUnit)}\n${element.indent}` +
      before.slice(element.start);
  } else if (edit.operation === 'insert-after') {
    const lineEnd = before.indexOf('\n', element.end);
    const insertAt = lineEnd === -1 ? before.length : lineEnd + 1;
    after =
      before.slice(0, insertAt) +
      `${reindent(content, element.indent, indentUnit)}\n` +
      before.slice(insertAt);
  } else if (edit.operation === 'replace-node') {
    after =
      before.slice(0, element.start) +
      reindent(content, element.indent, indentUnit).trimStart() +
      before.slice(element.end);
  } else {
    // delete-node: remove the whole line the element occupies when it is alone
    const lineStart = before.lastIndexOf('\n', element.start - 1) + 1;
    const lineEnd = before.indexOf('\n', element.end);
    const aloneOnLine =
      before.slice(lineStart, element.start).trim() === '' &&
      (lineEnd === -1 || before.slice(element.end, lineEnd).trim() === '');
    if (aloneOnLine && lineEnd !== -1) {
      after = before.slice(0, lineStart) + before.slice(lineEnd + 1);
    } else {
      after = before.slice(0, element.start) + before.slice(element.end);
    }
  }

  // Post-condition 2: the edited file still parses.
  const reparsed = parseSource(file, after);
  if (!reparsed.ok) {
    return {
      ok: false,
      reason: 'post-edit-parse-failure',
      detail: `${file}:${reparsed.problems[0]!.line} ${reparsed.problems[0]!.message}`,
    };
  }

  // Post-condition 3: the target survived (delete-node is the exception).
  const sourceAfter = ts.createSourceFile(
    file,
    after,
    ts.ScriptTarget.ES2022,
    true,
    scriptKindFor(file),
  );
  const attribute = edit.target.attribute ?? 'id';
  const survived = (anchorsIn(sourceAfter, attribute).get(edit.target.anchor) ?? 0) > 0;
  if (edit.operation !== 'delete-node' && !survived) {
    return {
      ok: false,
      reason: 'post-edit-target-lost',
      detail: `${attribute}="${edit.target.anchor}" is gone after the edit`,
    };
  }

  // Post-condition 4: the edit introduces no duplicate anchors. A duplicated
  // section anchor makes every later edit ambiguous, so it is refused at the
  // point it would be created rather than discovered by the next proposal.
  for (const attributeName of ['id', 'data-sus-id'] as const) {
    for (const [anchor, count] of anchorsIn(sourceAfter, attributeName)) {
      if (count > 1) {
        return {
          ok: false,
          reason: 'would-duplicate-anchor',
          detail: `${attributeName}="${anchor}" would appear ${count}× after the edit`,
        };
      }
    }
  }

  return { ok: true, before, after, located: element };
}

/** Applies edits sequentially, refusing on the first failure (all-or-nothing). */
export type PlanResult =
  | { ok: true; files: Map<string, string> }
  | { ok: false; reason: EditRefusalReason; detail: string; file: string };

export function applyEditPlan(
  sources: Map<string, string>,
  edits: Array<{ file: string; edit: AstEdit }>,
): PlanResult {
  const working = new Map(sources);
  for (const { file, edit } of edits) {
    const current = working.get(file);
    if (current === undefined) {
      return {
        ok: false,
        reason: 'target-not-found',
        detail: `no source supplied for ${file}`,
        file,
      };
    }
    const result = applyAstEdit(file, current, edit);
    if (!result.ok) return { ok: false, reason: result.reason, detail: result.detail, file };
    working.set(file, result.after);
  }
  return { ok: true, files: working };
}
