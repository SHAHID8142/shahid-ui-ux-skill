/**
 * T0707 (part 1) — AST-guided, byte-minimal source editing.
 *
 * These tests exist because "we used an AST" is a claim, not a proof: the
 * suite asserts the exact resulting source, that unrelated bytes are preserved
 * verbatim, that inserted code matches the file's indentation, and that every
 * refusal path refuses instead of writing something malformed.
 */
import { describe, expect, it } from 'vitest';
import { applyAstEdit, applyEditPlan, locateElement, parseSource } from '../src/editor.js';

const PAGE = `export default function Page() {
  return (
    <main id="main">
      <header id="navbar" className="navbar">
        <nav>
          <a href="#hero">Nimbus</a>
        </nav>
      </header>
      <section id="hero" className="hero">
        <h1>Ship the thing</h1>
        <p>Body copy stays untouched.</p>
      </section>
      <section id="footer">
        <small>© 2026</small>
      </section>
    </main>
  );
}
`;

describe('parsing (T0707)', () => {
  it('accepts valid TSX and reports nothing', () => {
    expect(parseSource('page.tsx', PAGE)).toEqual({ ok: true, problems: [] });
  });

  it('reports line and column for broken syntax instead of throwing', () => {
    const result = parseSource('page.tsx', 'const a = <div>;\n');
    expect(result.ok).toBe(false);
    expect(result.problems[0]!.line).toBeGreaterThan(0);
    expect(result.problems[0]!.message.length).toBeGreaterThan(0);
  });
});

describe('target resolution (T0707 — no silent guessing)', () => {
  it('finds a unique element by id with its tag, range and indentation', () => {
    const found = locateElement('page.tsx', PAGE, { anchor: 'hero' });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.element.tagName).toBe('section');
    expect(found.element.selfClosing).toBe(false);
    expect(found.element.indent).toBe('      ');
    expect(PAGE.slice(found.element.start, found.element.end)).toContain('<h1>Ship the thing</h1>');
  });

  it('finds an element by data-sus-id', () => {
    const source = PAGE.replace('id="hero"', 'data-sus-id="hero"');
    const found = locateElement('page.tsx', source, { anchor: 'hero', attribute: 'data-sus-id' });
    expect(found.ok).toBe(true);
  });

  it('reads string-literal expression ids but refuses computed ones', () => {
    const literal = PAGE.replace('id="hero"', 'id={"hero"}');
    expect(locateElement('page.tsx', literal, { anchor: 'hero' }).ok).toBe(true);
    const computed = PAGE.replace('id="hero"', 'id={dynamicId}');
    const result = locateElement('page.tsx', computed, { anchor: 'hero' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('target-not-found');
  });

  it('refuses to pick one when two elements share an anchor', () => {
    const duplicated = PAGE.replace('id="footer"', 'id="hero"');
    const result = locateElement('page.tsx', duplicated, { anchor: 'hero' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('ambiguous-target');
    expect(!result.ok && result.detail).toContain('2 elements');
  });

  it('reports a missing anchor and an unparseable file distinctly', () => {
    const missing = locateElement('page.tsx', PAGE, { anchor: 'pricing' });
    expect(!missing.ok && missing.reason).toBe('target-not-found');
    const broken = locateElement('page.tsx', 'export default () => <main id="x">;', {
      anchor: 'x',
    });
    expect(!broken.ok && broken.reason).toBe('unparseable-source');
  });
});

describe('insert-child (T0707)', () => {
  it('appends a child at the file’s own indentation and preserves every other byte', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '<button className="cta">Start free trial</button>',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const located = locateElement('page.tsx', PAGE, { anchor: 'hero' });
    expect(located.ok).toBe(true);
    if (!located.ok) return;

    // unrelated prefixes/suffixes are byte-identical (no printer reflow)
    expect(result.after.startsWith(PAGE.slice(0, located.element.childrenEnd))).toBe(true);
    expect(result.after.endsWith(PAGE.slice(located.element.childrenEnd))).toBe(true);
    expect(result.after).toContain(
      '\n        <button className="cta">Start free trial</button>\n      </section>',
    );
    // exactly one line added
    expect(result.after.split('\n').length).toBe(PAGE.split('\n').length + 1);
  });

  it('keeps multi-line content’s relative indentation', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '<div className="trust">\n  <span>4.9/5</span>\n</div>',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain(
      '        <div className="trust">\n          <span>4.9/5</span>\n        </div>',
    );
  });

  it('refuses to insert into a self-closing element instead of rewriting the tag', () => {
    const source = PAGE.replace(
      '      <section id="hero" className="hero">\n        <h1>Ship the thing</h1>\n        <p>Body copy stays untouched.</p>\n      </section>',
      '      <img id="hero" src="/hero.png" />',
    );
    const result = applyAstEdit('page.tsx', source, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '<span>caption</span>',
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe('self-closing-insert');
  });
});

describe('insert-before / insert-after / replace / delete (T0707)', () => {
  it('inserts a sibling before the target at the target’s indentation', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-before',
      target: { anchor: 'footer' },
      content: '<section id="social-proof"><h2>Stories</h2></section>',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain(
      '      <section id="social-proof"><h2>Stories</h2></section>\n      <section id="footer">',
    );
  });

  it('inserts a sibling after the target on its own line', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-after',
      target: { anchor: 'footer' },
      content: '<footer id="legal">Terms</footer>',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain(
      '      </section>\n      <footer id="legal">Terms</footer>\n    </main>',
    );
  });

  it('replaces the target element in place, keeping its anchor', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'replace-node',
      target: { anchor: 'hero' },
      content:
        '<section id="hero" className="hero hero--tight">\n  <h1>Ship it today</h1>\n</section>',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).toContain('      <section id="hero" className="hero hero--tight">');
    expect(result.after).toContain('<h1>Ship it today</h1>');
    expect(result.after).not.toContain('Body copy stays untouched');
  });

  it('removes the whole line when the target sits alone on it', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'delete-node',
      target: { anchor: 'footer' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.after).not.toContain('id="footer"');
    expect(result.after).not.toContain('© 2026');
    // the surrounding sections survive untouched
    expect(result.after).toContain('id="hero"');
    expect(result.after).toContain('id="navbar"');
  });
});

describe('refusals are the designed path (T0707 rollback rule: refuse on unknown syntax)', () => {
  it('refuses content that is not valid JSX', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '<button className=>broken</button>',
    });
    expect(!result.ok && result.reason).toBe('invalid-content');
  });

  it('refuses an edit that would duplicate a section anchor', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '<section id="hero">duplicate</section>',
    });
    expect(!result.ok && result.reason).toBe('would-duplicate-anchor');
    expect(!result.ok && result.detail).toContain('id="hero"');
  });

  it('refuses empty content for operations that need it', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'insert-child',
      target: { anchor: 'hero' },
      content: '   ',
    });
    expect(!result.ok && result.reason).toBe('empty-content');
  });

  it('refuses a replacement that drops the target anchor', () => {
    const result = applyAstEdit('page.tsx', PAGE, {
      operation: 'replace-node',
      target: { anchor: 'hero' },
      content: '<section className="hero"><h1>No id</h1></section>',
    });
    expect(!result.ok && result.reason).toBe('post-edit-target-lost');
  });
});

describe('edit plans are all-or-nothing (T0707)', () => {
  it('applies every edit when all of them resolve', () => {
    const plan = applyEditPlan(new Map([['page.tsx', PAGE]]), [
      {
        file: 'page.tsx',
        edit: {
          operation: 'insert-child',
          target: { anchor: 'hero' },
          content: '<span>badge</span>',
        },
      },
      {
        file: 'page.tsx',
        edit: {
          operation: 'insert-after',
          target: { anchor: 'footer' },
          content: '<p>fine print</p>',
        },
      },
    ]);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const after = plan.files.get('page.tsx')!;
    expect(after).toContain('<span>badge</span>');
    expect(after).toContain('<p>fine print</p>');
  });

  it('returns no partial result when the second edit fails', () => {
    const plan = applyEditPlan(new Map([['page.tsx', PAGE]]), [
      {
        file: 'page.tsx',
        edit: {
          operation: 'insert-child',
          target: { anchor: 'hero' },
          content: '<span>badge</span>',
        },
      },
      {
        file: 'page.tsx',
        edit: {
          operation: 'insert-child',
          target: { anchor: 'nope' },
          content: '<span>never</span>',
        },
      },
    ]);
    expect(plan.ok).toBe(false);
    expect(!plan.ok && plan.reason).toBe('target-not-found');
    expect(!plan.ok && plan.file).toBe('page.tsx');
  });

  it('refuses a file that was never supplied', () => {
    const plan = applyEditPlan(new Map(), [
      { file: 'missing.tsx', edit: { operation: 'delete-node', target: { anchor: 'x' } } },
    ]);
    expect(!plan.ok && plan.reason).toBe('target-not-found');
  });
});
