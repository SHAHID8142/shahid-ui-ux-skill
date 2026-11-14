/**
 * Render-time anchor stamping + source owner resolution (T0700w-a).
 *
 * T0700 proved static mapping is NO-GO: the anchors that matter most are
 * *map instances* (`id={f.id}`, `id={p.id}`), invisible to source parsing. The
 * recorded fallback ladder therefore requires the framework plugin to stamp a
 * per-instance `data-sus-id` at render time. This module is that stamp, plus
 * the index that turns a stamped anchor back into the single file that owns it.
 *
 * Stamping is a byte-minimal splice on the source: an element that already has
 * `data-sus-id` is left alone, and nothing outside the opening tag changes.
 * For Next/TSX the TypeScript compiler decides what is an element; for Astro a
 * small template scanner does (frontmatter is skipped, quotes and `{}` nesting
 * are respected), because an Astro file is not TypeScript.
 *
 * Owner resolution refuses rather than guesses:
 *  - an anchor declared in two files      → `ambiguous-owner`
 *  - an anchor nothing declares           → `unknown-owner`
 *  - a map-instance anchor whose data literal is not in the same file
 *    (computed data)                      → `unknown-owner` (not resolved by regex luck)
 */
import ts from 'typescript';

export type AnchorSource = 'literal' | 'map-instance';

export interface AnchorEntry {
  anchor: string;
  file: string;
  line: number;
  tagName: string;
  source: AnchorSource;
  /** For map instances: the expression that produced the anchor (`p.id`). */
  expression?: string;
}

export type ResolveResult =
  | { ok: true; owner: AnchorEntry }
  | {
      ok: false;
      reason: 'unknown-owner' | 'ambiguous-owner';
      detail: string;
      candidates: AnchorEntry[];
    };

export interface StyleOwnerResult {
  ok: boolean;
  file: string | null;
  reason?: 'unknown-owner' | 'ambiguous-owner';
  candidates: string[];
}

const SUS_ATTRIBUTE = 'data-sus-id';

// ---------------------------------------------------------------------------
// TSX/JSX stamping
// ---------------------------------------------------------------------------

function lineOf(source: ts.SourceFile, position: number): number {
  return source.getLineAndCharacterOfPosition(position).line + 1;
}

/** Attribute text to add for a JSX opening element, or null when already stamped. */
function stampFor(
  opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): { position: number; text: string } | null {
  let idAttribute: ts.JsxAttribute | null = null;
  for (const property of opening.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    const name = property.name.getText();
    if (name === SUS_ATTRIBUTE) return null; // already stamped
    if (name === 'id') idAttribute = property;
  }
  if (!idAttribute) return null;
  const initializer = idAttribute.initializer;
  if (!initializer) return null;
  // {expression} → mirror the expression; "literal" → mirror the literal
  // a string literal mirrors its own quoting; an expression must stay braced
  const valueText = ts.isStringLiteral(initializer)
    ? initializer.getText()
    : ts.isJsxExpression(initializer) && initializer.expression
      ? `{${initializer.expression.getText()}}`
      : null;
  if (valueText === null) return null;
  return { position: idAttribute.getEnd(), text: ` ${SUS_ATTRIBUTE}=${valueText}` };
}

/** Stamps every id-bearing JSX element in a .tsx/.jsx source. */
export function stampJsx(file: string, text: string): string {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const insertions: Array<{ position: number; text: string }> = [];
  const walk = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const stamp = stampFor(node);
      if (stamp) insertions.push(stamp);
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  // apply right-to-left so earlier offsets stay valid
  let out = text;
  for (const insertion of insertions.sort((a, b) => b.position - a.position)) {
    out = out.slice(0, insertion.position) + insertion.text + out.slice(insertion.position);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Astro template stamping
// ---------------------------------------------------------------------------

/** Splits an .astro file into frontmatter and template. */
function splitAstro(text: string): { frontmatter: string; templateStart: number } {
  if (!text.startsWith('---')) return { frontmatter: '', templateStart: 0 };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: '', templateStart: 0 };
  const close = text.indexOf('\n', end + 4);
  return {
    frontmatter: text.slice(0, close === -1 ? text.length : close),
    templateStart: close === -1 ? text.length : close,
  };
}

interface TagScan {
  /** Index of `<`. */
  start: number;
  /** Index just past `>`. */
  end: number;
  tagName: string;
  idAttribute: { valueStart: number; valueEnd: number; value: string; expression: boolean } | null;
  hasSusAttribute: boolean;
}

/** Scans opening tags in the template, respecting quotes and `{}` nesting. */
function scanTags(template: string): TagScan[] {
  const tags: TagScan[] = [];
  let index = 0;
  while (index < template.length) {
    const char = template[index];
    if (char !== '<') {
      index += 1;
      continue;
    }
    const nameMatch = /^<([A-Za-z][\w.:-]*)/.exec(template.slice(index));
    if (!nameMatch) {
      index += 1;
      continue;
    }
    const tagName = nameMatch[1]!;
    let cursor = index + nameMatch[0].length;
    let depth = 0;
    let quote: string | null = null;
    while (cursor < template.length) {
      const c = template[cursor]!;
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '{') {
        depth += 1;
      } else if (c === '}') {
        depth -= 1;
      } else if (c === '>' && depth === 0) {
        break;
      }
      cursor += 1;
    }
    const end = cursor + 1;
    const attributes = template.slice(index + nameMatch[0].length, cursor);
    const idMatch = /(^|\s)id\s*=\s*("([^"]*)"|'([^']*)'|\{([^}]*)\})/.exec(attributes);
    tags.push({
      start: index,
      end,
      tagName,
      hasSusAttribute: new RegExp(`(^|\\s)${SUS_ATTRIBUTE}\\s*=`).test(attributes),
      idAttribute: idMatch
        ? {
            valueStart: index + nameMatch[0].length + idMatch.index + idMatch[0].length,
            valueEnd: index + nameMatch[0].length + idMatch.index + idMatch[0].length,
            value: idMatch[3] ?? idMatch[4] ?? idMatch[5] ?? '',
            // group 5 means `{...}` — an expression, not a literal id
            expression: idMatch[5] !== undefined,
          }
        : null,
    });
    index = end;
  }
  return tags;
}

/** Stamps every id-bearing element in an .astro template (frontmatter untouched). */
export function stampAstro(text: string): string {
  const { templateStart } = splitAstro(text);
  const template = text.slice(templateStart);
  const insertions: Array<{ position: number; text: string }> = [];
  for (const tag of scanTags(template)) {
    if (!tag.idAttribute || tag.hasSusAttribute) continue;
    // the attribute value text starts after `id=`; mirror it verbatim
    const idPattern = /(^|\s)id\s*=/;
    const attributes = template.slice(tag.start, tag.end);
    const match = idPattern.exec(attributes);
    if (!match) continue;
    const valueStart = tag.start + match.index + match[0].length;
    const valueMatch = /^("([^"]*)"|'([^']*)'|\{([^}]*)\})/.exec(template.slice(valueStart));
    if (!valueMatch) continue;
    insertions.push({
      position: valueStart + valueMatch[0].length,
      text: ` ${SUS_ATTRIBUTE}=${valueMatch[0]}`,
    });
  }
  let out = template;
  for (const insertion of insertions.sort((a, b) => b.position - a.position)) {
    out = out.slice(0, insertion.position) + insertion.text + out.slice(insertion.position);
  }
  return text.slice(0, templateStart) + out;
}

/** Stamps a file according to its extension; unknown extensions are refused. */
export function stampSource(
  file: string,
  text: string,
): { ok: true; text: string } | { ok: false; detail: string } {
  if (/\.(tsx|jsx)$/.test(file)) return { ok: true, text: stampJsx(file, text) };
  if (/\.astro$/.test(file)) return { ok: true, text: stampAstro(text) };
  return { ok: false, detail: `unsupported file type for stamping: ${file}` };
}

// ---------------------------------------------------------------------------
// Anchor index + owner resolution
// ---------------------------------------------------------------------------

/** Literal ids declared in a map array literal (`{ id: 'teapot-ember' }`). */
function mapInstanceAnchors(source: ts.SourceFile, objectName: string, key: string): string[] {
  const found: string[] = [];
  const walk = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === objectName
    ) {
      const initializer = node.initializer;
      if (initializer && ts.isArrayLiteralExpression(initializer)) {
        for (const element of initializer.elements) {
          if (!ts.isObjectLiteralExpression(element)) continue;
          for (const property of element.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            if (property.name.getText() !== key) continue;
            const value = property.initializer;
            if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
              found.push(value.text);
            }
          }
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  return found;
}

/** Extracts anchors from JSX source, including resolvable map instances. */
function jsxAnchors(file: string, text: string): AnchorEntry[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const entries: AnchorEntry[] = [];
  const walk = (node: ts.Node): void => {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (opening) {
      for (const property of opening.attributes.properties) {
        if (!ts.isJsxAttribute(property) || property.name.getText() !== 'id') continue;
        const initializer = property.initializer;
        const tagName = opening.tagName.getText();
        const line = lineOf(source, property.getStart(source));
        if (initializer && ts.isStringLiteral(initializer)) {
          entries.push({ anchor: initializer.text, file, line, tagName, source: 'literal' });
        } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
          const expression = initializer.expression;
          // instance anchors: `X.id` inside a map over a same-file array literal
          if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'id') {
            const mapCall = (() => {
              let found: ts.CallExpression | null = null;
              let cursor: ts.Node | undefined = opening;
              while (cursor) {
                if (ts.isCallExpression(cursor)) {
                  found = cursor;
                  break;
                }
                cursor = cursor.parent;
              }
              return found;
            })();
            let resolvable = false;
            if (mapCall && ts.isPropertyAccessExpression(mapCall.expression)) {
              const arrayName = mapCall.expression.expression.getText();
              for (const anchor of mapInstanceAnchors(source, arrayName, expression.name.text)) {
                resolvedAnchors.push({
                  anchor,
                  file,
                  line,
                  tagName,
                  source: 'map-instance',
                  expression: expression.getText(),
                });
                resolvable = true;
              }
            }
            if (!resolvable) {
              // computed data: the anchor value is unknowable statically
              entries.push({
                anchor: `?${expression.getText()}`,
                file,
                line,
                tagName,
                source: 'map-instance',
                expression: expression.getText(),
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  const resolvedAnchors: AnchorEntry[] = [];
  walk(source);
  return [...entries, ...resolvedAnchors];
}

/** Extracts anchors from an Astro template, including map instances. */
function astroAnchors(file: string, text: string): AnchorEntry[] {
  const { frontmatter, templateStart } = splitAstro(text);
  const template = text.slice(templateStart);
  const entries: AnchorEntry[] = [];
  // array literals in the frontmatter provide map-instance anchor values,
  // reached through the callback parameter bound by `array.map((param) => ...)`
  const frontmatterIds = new Map<string, string[]>();
  const paramToArray = new Map<string, string>();
  for (const match of text.matchAll(/([A-Za-z_$][\w$]*)\.map\(\s*\(?\s*([A-Za-z_$][\w$]*)/g)) {
    paramToArray.set(match[2]!, match[1]!);
  }
  if (frontmatter.trim() !== '') {
    const probe = ts.createSourceFile(
      `${file}.frontmatter.ts`,
      frontmatter,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS,
    );
    const walk = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const initializer = node.initializer;
        if (ts.isArrayLiteralExpression(initializer)) {
          const ids: string[] = [];
          for (const element of initializer.elements) {
            if (!ts.isObjectLiteralExpression(element)) continue;
            for (const property of element.properties) {
              if (!ts.isPropertyAssignment(property) || property.name.getText() !== 'id') continue;
              const value = property.initializer;
              if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
                ids.push(value.text);
            }
          }
          if (ids.length > 0) frontmatterIds.set(node.name.text, ids);
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(probe);
  }
  for (const tag of scanTags(template)) {
    if (!tag.idAttribute) continue;
    const raw = tag.idAttribute.value;
    const line = text.slice(0, templateStart + tag.start).split('\n').length;
    if (tag.idAttribute.expression) {
      const inner = raw.trim();
      const match = /^([A-Za-z_$][\w$]*)\.id$/.exec(inner);
      const arrayName = match ? (paramToArray.get(match[1]!) ?? match[1]!) : undefined;
      const ids = arrayName ? frontmatterIds.get(arrayName) : undefined;
      if (ids) {
        for (const anchor of ids) {
          entries.push({
            anchor,
            file,
            line,
            tagName: tag.tagName,
            source: 'map-instance',
            expression: inner,
          });
        }
      } else {
        entries.push({
          anchor: `?${inner}`,
          file,
          line,
          tagName: tag.tagName,
          source: 'map-instance',
          expression: inner,
        });
      }
    } else {
      const literal = raw.replace(/^["']|["']$/g, '');
      if (literal !== '')
        entries.push({ anchor: literal, file, line, tagName: tag.tagName, source: 'literal' });
    }
  }
  return entries;
}

export interface OwnerIndex {
  entries: AnchorEntry[];
  styles: Map<string, string[]>;
}

/**
 * The CSS a file owns. Astro (and some frameworks) keep component styles inline
 * in a `<style>` block; that text belongs to the file that contains it, so a
 * scoped class has exactly one owner while a class in two stylesheets does not.
 */
function styleTexts(path: string, text: string): string[] {
  if (/\.css$/.test(path)) return [text];
  const blocks: string[] = [];
  for (const match of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    if (match[1]) blocks.push(match[1]);
  }
  return blocks;
}

/** Builds an owner index from labelled source files (TSX/JSX/Astro/CSS). */
export function buildOwnerIndex(files: Array<{ path: string; text: string }>): OwnerIndex {
  const entries: AnchorEntry[] = [];
  const styles = new Map<string, string[]>();
  for (const { path, text } of files) {
    if (/\.(tsx|jsx)$/.test(path)) entries.push(...jsxAnchors(path, text));
    else if (/\.astro$/.test(path)) entries.push(...astroAnchors(path, text));
    for (const css of styleTexts(path, text)) {
      for (const match of css.matchAll(/\.([A-Za-z][\w-]*)/g)) {
        const className = match[1]!;
        const owners = styles.get(className) ?? [];
        if (!owners.includes(path)) owners.push(path);
        styles.set(className, owners);
      }
    }
  }
  return { entries, styles };
}

/** Resolves a stamped anchor to its single source owner, refusing ambiguity. */
export function resolveOwner(index: OwnerIndex, anchor: string): ResolveResult {
  const matches = index.entries.filter((entry) => entry.anchor === anchor);
  if (matches.length === 0) {
    return {
      ok: false,
      reason: 'unknown-owner',
      detail: `no source element declares id/data-sus-id "${anchor}" — refusing to guess an owner`,
      candidates: [],
    };
  }
  const files = new Set(matches.map((match) => match.file));
  if (files.size > 1) {
    return {
      ok: false,
      reason: 'ambiguous-owner',
      detail: `"${anchor}" is declared in ${files.size} files (${[...files].join(', ')}) — refusing to pick one`,
      candidates: matches,
    };
  }
  return { ok: true, owner: matches[0]! };
}

/** Resolves a CSS class to the single stylesheet that owns it. */
export function resolveStyleOwner(index: OwnerIndex, className: string): StyleOwnerResult {
  const owners = index.styles.get(className) ?? [];
  if (owners.length === 0)
    return { ok: false, file: null, reason: 'unknown-owner', candidates: [] };
  if (owners.length > 1) {
    return { ok: false, file: null, reason: 'ambiguous-owner', candidates: owners };
  }
  return { ok: true, file: owners[0]!, candidates: owners };
}
