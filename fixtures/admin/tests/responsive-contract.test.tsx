/**
 * T1007 / issue #10 — the markup and stylesheet contract behind the reflow.
 *
 * These are the static half of the responsive work: the browser test in
 * `packages/eval-core/tests/admin-responsive.test.ts` measures what Chromium
 * actually renders, and this one makes sure the two ingredients a future edit
 * could quietly delete are still there — the per-cell `data-label` that the
 * narrow layout prints, and the stylesheet rules that do the reflow without
 * hiding overflow.
 */
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminPage from '../app/page';

const html = renderToStaticMarkup(<AdminPage />);
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
// Comments explain why; only real declarations are asserted. The narrow-layout
// comment quotes both `overflow-x: hidden` and the old colour, and a comment
// must not be able to satisfy or trip a rule.
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('fixture C responsive contract (issue #10)', () => {
  it('labels every body cell with its column name, in header order', () => {
    const section = /<section id="content-queue"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    const headers = Array.from(section.matchAll(/<th scope="col">([^<]+)<\/th>/g)).map((m) => m[1]);
    expect(headers).toEqual(['Entry', 'Status', 'Editor', 'Updated', 'Actions']);
    const labels = Array.from(section.matchAll(/<td data-label="([^"]+)"/g)).map((m) => m[1]);
    expect(labels.length).toBe(4 * headers.length);
    expect(labels.slice(0, headers.length)).toEqual(headers);
  });

  it('names the table for assistive technology instead of relying on a visual heading', () => {
    expect(html).toMatch(/<caption[^>]*>Content queue/);
  });

  it('reflows below a single stated threshold and never hides overflow', () => {
    expect(css).toMatch(/@media \(width <= 40rem\)/);
    expect(css).toContain('content: attr(data-label)');
    expect(rules).not.toMatch(/overflow-x:\s*(hidden|clip)/);
    expect(rules).not.toMatch(/#content-queue thead\s*\{[^}]*display:\s*none/);
  });

  it('keeps the grid track shrinkable, which is what stopped the 343px overflow', () => {
    expect(css).toMatch(/grid-template-columns:\s*14rem minmax\(0, 1fr\)/);
  });

  it('uses a muted token that clears AA on both surfaces, not the 4.46:1 literal', () => {
    expect(css).toMatch(/--muted:\s*#5f6775/);
    expect(rules).not.toContain('#6a7284');
    expect(css).toContain('color: var(--muted)');
  });
});
