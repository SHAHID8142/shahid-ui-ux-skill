/**
 * T0700w-a — render-time anchor stamping and source owner resolution.
 *
 * These tests run against the REAL fixtures on disk (Next.js marketing,
 * Astro commerce) rather than invented strings, because the whole point of
 * T0700's verdict was that the fixture shapes — literal section ids, map
 * instances, layout-level ids — decide whether mapping works at all.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { buildOwnerIndex, resolveOwner, resolveStyleOwner, stampSource } from '../src/owner-index';

const repo = fileURLToPath(new URL('../../..', import.meta.url));
const read = (path: string): string => readFileSync(`${repo}/${path}`, 'utf8');

const nextPagePath = 'fixtures/marketing/app/page.tsx';
const nextLayoutPath = 'fixtures/marketing/app/layout.tsx';
const astroPagePath = 'fixtures/commerce/src/pages/index.astro';
const astroLayoutPath = 'fixtures/commerce/src/layouts/Base.astro';

function diagnostics(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  return (
    source as unknown as { parseDiagnostics: Array<{ messageText: unknown }> }
  ).parseDiagnostics.map((diagnostic) => String(diagnostic.messageText));
}

describe('Next/TSX stamping', () => {
  const original = read(nextPagePath);
  const stamped = stampSource(nextPagePath, original);

  it('stamps literal ids and map-instance ids', () => {
    expect(stamped.ok).toBe(true);
    if (!stamped.ok) return;
    for (const anchor of ['main', 'navbar', 'hero', 'hero-title', 'features', 'social-proof']) {
      expect(stamped.text).toContain(`data-sus-id="${anchor}"`);
    }
    // the map loop renders one instance per feature; the stamp must mirror it
    expect(stamped.text).toContain('data-sus-id={f.id}');
  });

  it('leaves the stamped source parseable', () => {
    if (!stamped.ok) return;
    expect(diagnostics(nextPagePath, stamped.text)).toEqual([]);
  });

  it('changes only id-bearing opening tags — every other line survives verbatim', () => {
    if (!stamped.ok) return;
    const stampedLines = new Set(stamped.text.split('\n'));
    let stampedIdLines = 0;
    for (const line of original.split('\n')) {
      if (line.trim() === '') continue;
      const match = /(\sid=(?:"([^"]*)"|\{([^}]*)\}))/.exec(line);
      if (!match) {
        expect(stampedLines.has(line), `lost line: ${line}`).toBe(true);
        continue;
      }
      const inserted =
        match[2] !== undefined ? ` data-sus-id="${match[2]}"` : ` data-sus-id={${match[3]}}`;
      const expected = line.replace(match[0], `${match[0]}${inserted}`);
      expect(stampedLines.has(expected), `malformed stamped line: ${line}`).toBe(true);
      stampedIdLines += 1;
    }
    expect(stampedIdLines).toBeGreaterThan(8);
    expect(stamped.text.length).toBeGreaterThan(original.length);
  });

  it('is idempotent — re-stamping adds nothing', () => {
    if (!stamped.ok) return;
    const again = stampSource(nextPagePath, stamped.text);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.text).toBe(stamped.text);
    expect(again.text.match(/data-sus-id=/g)?.length).toBe(
      stamped.text.match(/data-sus-id=/g)?.length,
    );
  });

  it('leaves an id-less source byte-identical rather than inventing anchors', () => {
    const layout = read(nextLayoutPath);
    const result = stampSource(nextLayoutPath, layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe(layout);
    expect(diagnostics(nextLayoutPath, result.text)).toEqual([]);
  });
});

describe('Astro stamping', () => {
  const original = read(astroPagePath);
  const stamped = stampSource(astroPagePath, original);

  it('stamps literal and expression ids', () => {
    expect(stamped.ok).toBe(true);
    if (!stamped.ok) return;
    expect(stamped.text).toContain('data-sus-id="product-grid"');
    expect(stamped.text).toContain('data-sus-id="grid-title"');
    expect(stamped.text).toContain('data-sus-id={p.id}');
  });

  it('never touches the frontmatter', () => {
    if (!stamped.ok) return;
    const frontmatterOf = (text: string): string => text.slice(0, text.indexOf('\n---', 3));
    expect(frontmatterOf(stamped.text)).toBe(frontmatterOf(original));
  });

  it('is idempotent', () => {
    if (!stamped.ok) return;
    const again = stampSource(astroPagePath, stamped.text);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.text).toBe(stamped.text);
  });

  it('leaves an id-less Astro layout byte-identical', () => {
    const layout = read(astroLayoutPath);
    const result = stampSource(astroLayoutPath, layout);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toBe(layout);
  });

  it('does not stamp text that merely looks like a tag inside an expression', () => {
    const source = [
      '---',
      'const label = "id=\\"fake\\"";',
      '---',
      '<div id="real">{label}</div>',
    ].join('\n');
    const result = stampSource('x.astro', source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('<div id="real" data-sus-id="real">');
    expect(result.text).not.toContain('data-sus-id=\\"fake\\"');
  });
});

describe('stampSource refusals', () => {
  it('refuses unsupported file types instead of half-stamping them', () => {
    const result = stampSource('notes.md', '# id="hero"');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.detail).toContain('unsupported');
  });
});

describe('owner resolution over the real fixtures', () => {
  const files = [
    { path: nextPagePath, text: read(nextPagePath) },
    { path: nextLayoutPath, text: read(nextLayoutPath) },
    { path: astroPagePath, text: read(astroPagePath) },
    { path: astroLayoutPath, text: read(astroLayoutPath) },
    {
      path: 'fixtures/marketing/app/globals.css',
      text: read('fixtures/marketing/app/globals.css'),
    },
  ];
  const index = buildOwnerIndex(files);

  it('resolves a literal section anchor to its file', () => {
    const result = resolveOwner(index, 'hero');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.file).toBe(nextPagePath);
    expect(result.owner.source).toBe('literal');
    expect(result.owner.line).toBeGreaterThan(0);
  });

  it('resolves a map-instance anchor to the element that renders it', () => {
    // the T0700 NO-GO case: `id={p.id}` rendered per product
    const result = resolveOwner(index, 'teapot-ember');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.file).toBe(astroPagePath);
    expect(result.owner.source).toBe('map-instance');
    expect(result.owner.expression).toBe('p.id');
  });

  it('resolves a Next map-instance anchor with the same rule', () => {
    const page = read(nextPagePath);
    const featureId = /id="([a-z-]+)"/g;
    const ids = [...page.matchAll(featureId)].map((match) => match[1]!);
    // the feature array's first id is asserted from the fixture itself
    const firstFeature = /id: '([a-z-]+)'/.exec(page)?.[1];
    expect(firstFeature).toBeDefined();
    if (!firstFeature) return;
    expect(ids.length).toBeGreaterThan(3);
    const result = resolveOwner(index, firstFeature);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.source).toBe('map-instance');
    expect(result.owner.expression).toBe('f.id');
  });

  it('resolves a content heading anchor', () => {
    const result = resolveOwner(index, 'grid-title');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.tagName).toBe('h1');
  });

  it('refuses an unknown anchor instead of guessing', () => {
    const result = resolveOwner(index, 'section-that-does-not-exist');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown-owner');
    expect(result.detail).toContain('refusing to guess');
  });

  it('refuses an ambiguous anchor declared in two files', () => {
    const ambiguous = buildOwnerIndex([
      { path: 'a/one.tsx', text: '<nav id="shared"></nav>' },
      { path: 'b/two.tsx', text: '<nav id="shared"></nav>' },
    ]);
    const result = resolveOwner(ambiguous, 'shared');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('ambiguous-owner');
    expect(result.candidates.map((candidate) => candidate.file).sort()).toEqual([
      'a/one.tsx',
      'b/two.tsx',
    ]);
  });

  it('does not invent an owner for computed data', () => {
    const computed = buildOwnerIndex([
      {
        path: 'c/page.tsx',
        text: 'export default function P({ rows }: { rows: Row[] }) { return <ul>{rows.map((r) => <li id={r.id} />)}</ul>; }',
      },
    ]);
    // the instance value is unknowable from source — it is indexed as unresolved
    expect(computed.entries.some((entry) => entry.anchor === '?r.id')).toBe(true);
    const result = resolveOwner(computed, 'any-raw-value');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown-owner');
  });

  it('treats a shared component used by two pages as one owner', () => {
    const shared = buildOwnerIndex([
      { path: 'components/Hero.tsx', text: '<section id="hero">x</section>' },
      { path: 'app/a/page.tsx', text: 'export default () => <Hero />;' },
      { path: 'app/b/page.tsx', text: 'export default () => <Hero />;' },
    ]);
    const result = resolveOwner(shared, 'hero');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.owner.file).toBe('components/Hero.tsx');
  });
});

describe('style ownership', () => {
  const index = buildOwnerIndex([
    {
      path: 'fixtures/marketing/app/globals.css',
      text: read('fixtures/marketing/app/globals.css'),
    },
    { path: astroPagePath, text: read(astroPagePath) },
    { path: nextPagePath, text: read(nextPagePath) },
  ]);

  it('resolves a stylesheet class to exactly one file', () => {
    const result = resolveStyleOwner(index, 'feature-card');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file).toBe('fixtures/marketing/app/globals.css');
  });

  it('attributes an Astro scoped <style> class to the component that owns it', () => {
    const result = resolveStyleOwner(index, 'card');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file).toBe(astroPagePath);
  });

  it('refuses a class that a stylesheet and a scoped block both define', () => {
    const mixed = buildOwnerIndex([
      { path: 'app/globals.css', text: '.lede { color: #333 }' },
      { path: 'app/page.tsx', text: '<style>.lede { font-weight: 600 }</style>' },
    ]);
    const result = resolveStyleOwner(mixed, 'lede');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('ambiguous-owner');
  });

  it('refuses an unknown class', () => {
    const result = resolveStyleOwner(index, 'never-written-class');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown-owner');
  });

  it('refuses a class owned by two stylesheets', () => {
    const split = buildOwnerIndex([
      { path: 'a.css', text: '.dupe { color: red }' },
      { path: 'b.css', text: '.dupe { color: blue }' },
    ]);
    const result = resolveStyleOwner(split, 'dupe');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('ambiguous-owner');
    expect(result.candidates).toEqual(['a.css', 'b.css']);
  });
});
