/**
 * T1037 (issue #21 R8) and T1041 — how a file scope behaves.
 *
 * A finding names an element (`input#email`); a `component-path` scope names a source file. No rule in
 * this repository maps one to the other, and inventing one would attribute one element's defect to
 * whatever file the user picked.
 *
 * One attribution *is* honest without a map: a static HTML file **is** the page it serves, so the
 * findings the audit measured on that route are findings about that file (T1041). A component file
 * (`.tsx`, `.vue`, `.astro`) produces a fragment of many pages, so it stays unattributed and says so,
 * exiting **3** (nothing in scope was measured) rather than 0 (measured and clean).
 */
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { htmlScopeRoute, runBestPractice } from '../src/bestpractice/command.js';

const PAGE_HEAD =
  '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">';

const site = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sus-file-scope-'));
  writeFileSync(
    join(dir, 'index.html'),
    [
      PAGE_HEAD,
      '<title>Clean page</title>',
      '<meta name="description" content="' + 'A'.repeat(90) + '">',
      '</head><body><main><h1>Clean page</h1><p>Nothing to fix here.</p></main></body></html>',
    ].join(''),
    'utf8',
  );
  writeFileSync(
    join(dir, 'checkout.html'),
    [
      PAGE_HEAD,
      '<title>Checkout</title>',
      '<meta name="description" content="' + 'B'.repeat(90) + '">',
      '</head><body><main><h1>Checkout</h1>',
      // An image with no alt text: an axe finding the audit attributes to an element, on this route.
      '<img src="receipt.png" width="40" height="40">',
      '</main></body></html>',
    ].join(''),
    'utf8',
  );
  // A component file that exists: a real component scope is resolved, then has nothing to attribute to.
  writeFileSync(join(dir, 'Card.tsx'), 'export const Card = () => null;\n', 'utf8');
  return dir;
};

describe('file scopes and attribution (issue #21 R8, T1037, T1041)', () => {
  it('attributes an HTML file scope to the route that file serves', async () => {
    const dir = site();
    const out = mkdtempSync(join(tmpdir(), 'sus-file-out-'));
    const run = await runBestPractice({
      target: dir,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'component-path', value: join(dir, 'checkout.html') },
      focus: null,
    });
    expect(run.scope.outcome).toBe('resolved');
    expect(run.proposal).not.toBeNull();
    expect(run.proposal!.items.length).toBeGreaterThan(0);
    // The basis of the attribution travels with the proposal, not left implicit.
    expect(run.markdown).toContain('Attribution: this HTML file is the page it serves');
    expect(run.markdown).toContain('/checkout.html');
    expect(run.exitCode).not.toBe(3);
  }, 420000);

  it('keeps a component scope unattributed, with the remedy named and exit 3', async () => {
    const dir = site();
    const out = mkdtempSync(join(tmpdir(), 'sus-component-out-'));
    const run = await runBestPractice({
      target: dir,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'component-path', value: join(dir, 'Card.tsx') },
      focus: null,
    });
    expect(run.scope.outcome).toBe('resolved');
    expect(run.proposal).toBeNull();
    expect(run.exitCode).toBe(3);
    expect(run.message).toContain('cannot attribute');
    expect(run.markdown).toContain('none can be attributed to a file');
    // The remedy is named, not left to the reader to discover.
    expect(run.markdown).toContain('--scope page');
    expect(run.markdown).toContain("--scope '#email'");
    // And it is not phrased as a pass.
    expect(run.markdown).not.toContain('found nothing to change');
  }, 420000);

  it('still exits 0 when an HTML file scope genuinely measured nothing to change', async () => {
    const dir = site();
    const out = mkdtempSync(join(tmpdir(), 'sus-clean-out-'));
    const run = await runBestPractice({
      target: dir,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'component-path', value: join(dir, 'index.html') },
      focus: null,
    });
    expect(run.exitCode).toBe(0);
    expect(run.markdown).toContain('found nothing to change');
  }, 420000);

  it('derives the route the same way the audit does, index.html included', () => {
    const dir = site();
    // The file comes back canonical (symlinks resolved), so the route is what a reader can compare,
    // not the spelling the caller happened to use.
    expect(
      htmlScopeRoute({ kind: 'component-path', value: join(dir, 'index.html') }, dir, true),
    ).toMatchObject({ route: '/' });
    expect(
      htmlScopeRoute({ kind: 'component-path', value: join(dir, 'checkout.html') }, dir, true),
    ).toMatchObject({ route: '/checkout.html' });
    // Not an HTML file, not a route.
    expect(
      htmlScopeRoute({ kind: 'component-path', value: join(dir, 'Card.tsx') }, dir, true),
    ).toBeNull();
    // A selector scope never needs a route: it already names an element.
    expect(htmlScopeRoute({ kind: 'selector', value: '#email' }, dir, true)).toBeNull();
  });

  it('finds the route through a symlinked path, because the answer must not depend on spelling', () => {
    const dir = site();
    // A second name for the same tree, as macOS `/tmp` is a symlink to `/private/tmp`.
    const alias = join(mkdtempSync(join(tmpdir(), 'sus-alias-')), 'link');
    symlinkSync(dir, alias);
    const throughAlias = htmlScopeRoute(
      { kind: 'component-path', value: join(alias, 'checkout.html') },
      dir,
      true,
    );
    expect(throughAlias?.route).toBe('/checkout.html');
    // And the same file named directly must agree.
    const direct = htmlScopeRoute(
      { kind: 'component-path', value: join(dir, 'checkout.html') },
      dir,
      true,
    );
    expect(direct?.route).toBe(throughAlias?.route);
  });
});
