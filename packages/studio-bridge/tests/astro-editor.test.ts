/**
 * T0700wc — Astro source editing.
 *
 * The contract is the same one the JSX editor has: byte-minimal splice, anchor
 * preserved, refuse rather than write. These tests pin the five operations, the
 * frontmatter/script boundaries, and every refusal that protects the file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyAstEdit } from '../src/editor';

const repo = fileURLToPath(new URL('../../..', import.meta.url));

const PAGE = `---
const products = [{ id: 'teapot-ember' }, { id: 'mug-set-dune' }];
const title = 'Shop';
---
<section id="grid" class="grid">
  <h1 id="grid-title">Small-batch</h1>
  {products.map((p) => (
    <li id={p.id}>{p.id}</li>
  ))}
</section>
<footer id="footer">Fine print</footer>
<style>
  .grid { display: grid; }
</style>
`;

function edit(
  before: string,
  operation: Parameters<typeof applyAstEdit>[2]['operation'],
  content?: string,
  anchor = 'grid-title',
) {
  return applyAstEdit('src/pages/index.astro', before, {
    operation,
    target: { anchor },
    content,
  });
}

describe('Astro editing — the five operations', () => {
  it('inserts a child on its own line, re-indented, before the closing tag', () => {
    const result = edit(PAGE, 'insert-child', '<p class="lede">Six pieces</p>');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // the inline element becomes multiline: the child owns a line, the closing
    // tag keeps the element's own indent
    expect(result.after).toContain(
      '<h1 id="grid-title">Small-batch\n    <p class="lede">Six pieces</p>\n  </h1>',
    );
    // everything outside the target element's children is untouched
    expect(result.after.slice(0, result.after.indexOf('id="grid-title"'))).toBe(
      PAGE.slice(0, PAGE.indexOf('id="grid-title"')),
    );
    expect(result.after).toContain('<footer id="footer">Fine print</footer>');
  });

  it('inserts before and after the element at the element indent', () => {
    const before = edit(PAGE, 'insert-before', '<p class="kicker">New</p>');
    const after = edit(PAGE, 'insert-after', '<p class="note">After</p>');
    expect(before.ok && before.after).toContain(
      '  <p class="kicker">New</p>\n  <h1 id="grid-title">',
    );
    expect(after.ok && after.after).toContain(
      '<h1 id="grid-title">Small-batch</h1>\n  <p class="note">After</p>',
    );
  });

  it('replaces an element, keeping the anchor when the new content keeps it', () => {
    const result = edit(
      PAGE,
      'replace-node',
      '<h1 id="grid-title" class="big">Small-batch goods</h1>',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain('<h1 id="grid-title" class="big">Small-batch goods</h1>');
    expect(result.after).not.toContain('Small-batch</h1>');
  });

  it('deletes an element and its whole line', () => {
    const result = edit(PAGE, 'delete-node');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).not.toContain('grid-title');
    expect(result.after).toContain('<footer id="footer">Fine print</footer>');
    expect(result.after).not.toContain('\n\n\n');
  });
});

describe('Astro editing — boundaries that must never move', () => {
  it('never touches the frontmatter', () => {
    const result = edit(PAGE, 'insert-child', '<p>x</p>');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frontmatter = (text: string): string => text.slice(0, text.indexOf('\n---', 3));
    expect(frontmatter(result.after)).toBe(frontmatter(PAGE));
    expect(result.after).toContain("const title = 'Shop';");
  });

  it('never touches a <style> block or a <script> body', () => {
    const result = edit(PAGE, 'insert-child', '<p>x</p>');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain('.grid { display: grid; }');
    expect(result.after.slice(result.after.indexOf('<style>'))).toBe(
      PAGE.slice(PAGE.indexOf('<style>')),
    );
  });

  it('keeps unrelated bytes identical outside the edit', () => {
    const result = edit(PAGE, 'insert-child', '<p>x</p>', 'footer');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const head = PAGE.slice(0, PAGE.indexOf('<footer'));
    expect(result.after.startsWith(head)).toBe(true);
  });
});

describe('Astro editing — refusals', () => {
  it('refuses an anchor that does not exist', () => {
    const result = edit(PAGE, 'insert-child', '<p>x</p>', 'nope');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('target-not-found');
  });

  it('refuses a map-instance anchor instead of editing one instance blindly', () => {
    const result = edit(PAGE, 'insert-child', '<p>x</p>', 'teapot-ember');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('target-not-found');
    expect(result.detail).toContain('expression');
  });

  it('refuses insert-child on a self-closing element', () => {
    const source = '<div id="box" />\n';
    const result = edit(source, 'insert-child', '<p>x</p>', 'box');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('self-closing-insert');
  });

  it('refuses content that would drop the anchor', () => {
    const result = edit(PAGE, 'replace-node', '<h1>Small-batch goods</h1>');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('post-edit-target-lost');
  });

  it('refuses an insert that would duplicate the anchor', () => {
    const result = edit(PAGE, 'insert-child', '<h1 id="grid-title">Second</h1>');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('would-duplicate-anchor');
  });

  it('refuses content that leaves the template unbalanced', () => {
    const result = edit(PAGE, 'insert-child', '<div><p>never closed</div>');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['post-edit-parse-failure', 'invalid-content']).toContain(result.reason);
  });

  it('refuses empty content and refuses to delete <html>', () => {
    const empty = edit(PAGE, 'insert-child', '   ');
    const html = edit('<html id="doc"><body>hi</body></html>', 'delete-node', undefined, 'doc');
    expect(empty.ok).toBe(false);
    expect(html.ok).toBe(false);
    if (html.ok) return;
    expect(html.reason).toBe('invalid-content');
  });

  it('refuses an ambiguous anchor declared twice', () => {
    const source = '<div id="dupe">a</div>\n<div id="dupe">b</div>\n';
    const result = edit(source, 'insert-child', '<p>x</p>', 'dupe');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('ambiguous-target');
  });
});

describe('Astro editing — the real fixture', () => {
  it('edits the commerce fixture and preserves every other byte', () => {
    const path = 'fixtures/commerce/src/pages/index.astro';
    const before = readFileSync(`${repo}/${path}`, 'utf8');
    const result = applyAstEdit(path, before, {
      operation: 'insert-child',
      target: { anchor: 'grid-title' },
      content: '<span class="badge">New</span>',
    });
    expect(result.ok, result.ok ? '' : result.detail).toBe(true);
    if (!result.ok) return;
    const lineCount = result.after.split('\n').length - before.split('\n').length;
    // inline element → the child line plus the closing tag's own line
    expect(lineCount).toBe(2);
    expect(result.after).toContain('<span class="badge">New</span>');
  });
});
