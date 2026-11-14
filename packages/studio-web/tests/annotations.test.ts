/**
 * T0704b tests — studio-web annotation session store over the LANDED
 * substrate contract (@sus/schemas SusAnnotation v1 + @sus/studio-bridge).
 *
 * Acceptance under test:
 *  - schema validates: session serialization round-trips through the
 *    substrate's schema-validated serializer/parser
 *  - malformed/out-of-bounds rejected: wrong point counts per kind, missing
 *    typed equivalents, out-of-range normalized coords, duplicate ids
 *  - undo safe: empty-history no-ops, redo-branch truncation, bounded history,
 *    remove+undo restore
 *  - non-drawing equivalence (DA-34): pointer/keyboard/instruction paths share
 *    ONE entrypoint and must carry typedEquivalent + keyboardPath — enforced
 *    by the schema itself, proven identical-output here
 *  - semantic geometry: viewport pixels normalize to 0..1, never raw pixels
 *    only (DA-34), clamped at capture, hard-rejected at the session boundary
 */
import { describe, expect, it } from 'vitest';
import {
  AnnotationSessionStore,
  MAX_ANNOTATIONS_PER_SESSION,
  MAX_HISTORY_DEPTH,
  type MutationInstruction,
} from '../src/annotations.js';

const PAGE_URL = 'https://example.com/product';
const VIEWPORT = { width: 1280, height: 800 };

function store(): AnnotationSessionStore {
  return new AnnotationSessionStore({ pageUrl: PAGE_URL, viewport: VIEWPORT });
}

function addRect(s: AnnotationSessionStore, label = 'hero region'): MutationInstruction {
  return {
    op: 'add',
    kind: 'rectangle',
    pixels: [
      { x: 10, y: 20 },
      { x: 310, y: 160 },
    ],
    label,
    typedEquivalent: `annotate rect "${label}"`,
    keyboardPath: 'Ctrl+Shift+R then drag-arrows',
    at: '2026-11-14T06:30:00.000Z',
    source: 'pointer',
  };
}

describe('T0704b — schema validates (via landed contract)', () => {
  it('stores viewport pixels as NORMALIZED semantic geometry', () => {
    const s = store();
    const r = s.apply(addRect(s));
    expect(r.ok).toBe(true);
    const a = s.document().annotations[0]!;
    // 10/1280 -> 0.0078, 20/800 -> 0.025 (4-dp normalization in substrate)
    expect(a.points[0]).toEqual({ x: 0.0078, y: 0.025 });
    expect(a.points[1]).toEqual({ x: 0.2422, y: 0.2 });
    expect(a.kind).toBe('rectangle');
    expect(a.pageUrl).toBe(PAGE_URL);
    expect(a.createdAt).toBe('2026-11-14T06:30:00.000Z');
    expect(a.author).toBe('studio-web');
  });

  it('every stored annotation carries required non-drawing equivalents', () => {
    const s = store();
    s.apply(addRect(s));
    const a = s.document().annotations[0]!;
    expect(a.typedEquivalent.length).toBeGreaterThan(0);
    expect(a.keyboardPath.length).toBeGreaterThan(0);
  });

  it('serialize -> parse -> serialize is byte-identical (substrate serializer)', () => {
    const s = store();
    s.apply(addRect(s));
    s.apply({
      op: 'add',
      kind: 'arrow',
      pixels: [
        { x: 100, y: 100 },
        { x: 320, y: 240 },
      ],
      label: 'points at CTA',
      typedEquivalent: 'annotate arrow "points at CTA"',
      keyboardPath: 'Ctrl+Shift+A then arrows',
    });
    s.apply({
      op: 'add',
      kind: 'pen',
      pixels: [
        { x: 0, y: 0 },
        { x: 640, y: 400 },
        { x: 1279, y: 799 },
      ],
      label: 'underline nav',
      typedEquivalent: 'annotate pen "underline nav"',
      keyboardPath: 'Ctrl+Shift+P then arrows',
    });
    const first = s.serialize();
    const parsed = AnnotationSessionStore.parse(first);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.reasons.join('; '));
    expect(JSON.stringify(parsed.session, null, 2)).toBe(first);
  });
});

describe('T0704b — malformed/out-of-bounds rejected (fail closed)', () => {
  const bad: Array<[string, MutationInstruction, string]> = [
    [
      'rectangle with 3 corners',
      {
        op: 'add',
        kind: 'rectangle',
        pixels: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
          { x: 3, y: 3 },
        ],
        label: 'x',
        typedEquivalent: 't',
        keyboardPath: 'k',
      },
      'exactly 2 corner points',
    ],
    [
      'arrow with 1 point',
      {
        op: 'add',
        kind: 'arrow',
        pixels: [{ x: 1, y: 1 }],
        label: 'x',
        typedEquivalent: 't',
        keyboardPath: 'k',
      },
      'exactly 2 points',
    ],
    [
      'pen with 2 points (needs >= 3)',
      {
        op: 'add',
        kind: 'pen',
        pixels: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        label: 'x',
        typedEquivalent: 't',
        keyboardPath: 'k',
      },
      'pen stroke needs >= 3 points',
    ],
    [
      'missing typedEquivalent (DA-34)',
      {
        op: 'add',
        kind: 'rectangle',
        pixels: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        label: 'x',
        typedEquivalent: '',
        keyboardPath: 'k',
      },
      'invalid annotation',
    ],
    [
      'empty label',
      {
        op: 'add',
        kind: 'rectangle',
        pixels: [
          { x: 1, y: 1 },
          { x: 2, y: 2 },
        ],
        label: '',
        typedEquivalent: 't',
        keyboardPath: 'k',
      },
      'invalid annotation',
    ],
  ];
  for (const [name, instruction, reasonPart] of bad) {
    it(`rejects: ${name}`, () => {
      const s = store();
      const r = s.apply(instruction);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons.join(' | ')).toContain(reasonPart);
      expect(s.document().annotations).toHaveLength(0); // rejected = no state change
    });
  }

  it('rejects removing an unknown id', () => {
    const s = store();
    const r = s.apply({ op: 'remove', id: 'a-99' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toContain('no annotation with id a-99');
  });

  it('clamps out-of-viewport pixels at capture (documented normalization), but the session boundary hard-rejects out-of-range normalized coords', () => {
    const s = store();
    const r = s.apply({
      op: 'add',
      kind: 'rectangle',
      pixels: [
        { x: -50, y: -50 },
        { x: 5000, y: 9999 },
      ],
      label: 'clamped rect',
      typedEquivalent: 't',
      keyboardPath: 'k',
    });
    expect(r.ok).toBe(true);
    const a = s.document().annotations[0]!;
    expect(a.points[0]).toEqual({ x: 0, y: 0 }); // clamped into 0..1
    expect(a.points[1]).toEqual({ x: 1, y: 1 });

    // At the DATA boundary nothing clamps: a session with 1.5 coords is invalid.
    const forged = JSON.parse(s.serialize()) as {
      annotations: Array<{ points: Array<{ x: number }> }>;
    };
    forged.annotations[0]!.points[0]!.x = 1.5;
    const parsed = AnnotationSessionStore.parse(JSON.stringify(forged));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reasons.join()).toContain('invalid session');
  });

  it('rejects duplicate ids at the session boundary', () => {
    const s = store();
    s.apply(addRect(s));
    const forged = JSON.parse(s.serialize()) as { annotations: Array<object> };
    forged.annotations.push({ ...forged.annotations[0]! });
    const parsed = AnnotationSessionStore.parse(JSON.stringify(forged));
    // Fails closed regardless of how the substrate flattens its zod issues
    // (issue-detail loss is filed as a substrate finding, not a store defect).
    expect(parsed.ok).toBe(false);
  });

  it('rejects invalid JSON and unknown record shapes', () => {
    const badJson = AnnotationSessionStore.parse('{not json');
    expect(badJson.ok).toBe(false);
    if (!badJson.ok) expect(badJson.reasons.join()).toContain('JSON');

    const unknown = AnnotationSessionStore.parse(
      JSON.stringify({ pageUrl: PAGE_URL, viewport: VIEWPORT, annotations: [], extra: 1 }),
    );
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reasons.join()).toContain('invalid session');
  });
});

describe('T0704b — undo/redo safety', () => {
  it('undo on empty history is a no-op failure; redo without undo likewise', () => {
    const s = store();
    const u = s.apply({ op: 'undo' });
    const r = s.apply({ op: 'redo' });
    expect(u.ok).toBe(false);
    expect(r.ok).toBe(false);
    if (!u.ok) expect(u.reasons.join()).toContain('nothing to undo');
    if (!r.ok) expect(r.reasons.join()).toContain('nothing to redo');
    expect(s.canUndo()).toBe(false);
  });

  it('undo removes the last annotation; redo restores it exactly', () => {
    const s = store();
    s.apply(addRect(s));
    const before = s.document();
    expect(s.apply({ op: 'undo' }).ok).toBe(true);
    expect(s.document().annotations).toHaveLength(0);
    expect(s.apply({ op: 'redo' }).ok).toBe(true);
    expect(JSON.stringify(s.document())).toBe(JSON.stringify(before));
    expect(s.canUndo()).toBe(true);
    expect(s.canRedo()).toBe(false);
  });

  it('a new mutation truncates the redo branch; ids are never re-allocated', () => {
    const s = store();
    s.apply(addRect(s)); // a-1
    s.apply({ op: 'undo' });
    expect(s.canRedo()).toBe(true);
    s.apply({
      op: 'add',
      kind: 'pen',
      pixels: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ],
      label: 'new stroke',
      typedEquivalent: 't',
      keyboardPath: 'k',
    }); // new mutation — redo branch dies
    expect(s.canRedo()).toBe(false);
    // Content rewound but the id counter NEVER rewinds: this is a-2, not a-1.
    expect(s.document().annotations.map((a) => a.id)).toEqual(['a-2']);
  });

  it('undo after remove restores the removed annotation in place', () => {
    const s = store();
    s.apply(addRect(s));
    s.apply({ op: 'remove', id: 'a-1' });
    expect(s.document().annotations).toHaveLength(0);
    expect(s.apply({ op: 'undo' }).ok).toBe(true);
    expect(s.document().annotations[0]!.id).toBe('a-1');
  });

  it('history is bounded at 100 snapshots', () => {
    const s = store();
    for (let i = 0; i < MAX_HISTORY_DEPTH + 5; i += 1) {
      s.apply({
        op: 'add',
        kind: 'pen',
        pixels: [
          { x: i, y: i },
          { x: i + 10, y: i + 10 },
          { x: i + 20, y: i + 20 },
        ],
        label: `stroke ${i}`,
        typedEquivalent: `t${i}`,
        keyboardPath: 'k',
      });
    }
    let undos = 0;
    while (s.canUndo() && undos <= MAX_HISTORY_DEPTH + 1) {
      s.apply({ op: 'undo' });
      undos += 1;
    }
    expect(undos).toBe(MAX_HISTORY_DEPTH);
    // oldest snapshot was evicted: exactly the last 100 adds remain undoable
    expect(s.document().annotations).toHaveLength(5);
  });
});

describe('T0704b — non-drawing equivalence (DA-34)', () => {
  it('pointer, keyboard and instruction paths share one entrypoint with identical effects', () => {
    const effect = (s: AnnotationSessionStore) =>
      s.document().annotations.map((a) => ({
        id: a.id,
        kind: a.kind,
        points: a.points,
        label: a.label,
        typedEquivalent: a.typedEquivalent,
        keyboardPath: a.keyboardPath,
      }));
    const pointer = store();
    const keyboard = store();
    const automation = store();
    const instr: MutationInstruction = {
      op: 'add',
      kind: 'arrow',
      pixels: [
        { x: 10, y: 10 },
        { x: 60, y: 40 },
      ],
      label: 'add to cart',
      typedEquivalent: 'annotate arrow "add to cart"',
      keyboardPath: 'Ctrl+Shift+A then arrows',
      at: '2026-11-14T06:40:00.000Z',
    };
    // same instruction type through the single apply() entrypoint; only the
    // `source` tag differs (capture telemetry, never persisted to behavior)
    pointer.apply({ ...instr, source: 'pointer' });
    keyboard.apply({ ...instr, source: 'keyboard' });
    automation.apply({ ...instr, source: 'instruction' });
    expect(JSON.stringify(effect(pointer))).toBe(JSON.stringify(effect(keyboard)));
    expect(JSON.stringify(effect(keyboard))).toBe(JSON.stringify(effect(automation)));
    // the equivalence is DATA: without typed equivalents the record is invalid
    const s = store();
    const r = s.apply({ ...instr, typedEquivalent: '', keyboardPath: '' });
    expect(r.ok).toBe(false);
  });

  it('substrate pure-list undo is safe on an empty session', async () => {
    const { undoLastAnnotation } = await import('@sus/studio-bridge');
    const empty = { pageUrl: PAGE_URL, viewport: VIEWPORT, annotations: [] };
    expect(undoLastAnnotation(empty)).toEqual(empty);
  });
});

describe('T0704b — caps + immutability', () => {
  it('annotation count per session is capped', () => {
    const s = store();
    for (let i = 0; i < MAX_ANNOTATIONS_PER_SESSION; i += 1) {
      const r = s.apply({
        op: 'add',
        kind: 'pen',
        pixels: [
          { x: i % 100, y: i % 90 },
          { x: (i % 100) + 5, y: (i % 90) + 5 },
          { x: (i % 100) + 9, y: (i % 90) + 9 },
        ],
        label: `s${i}`,
        typedEquivalent: `t${i}`,
        keyboardPath: 'k',
      });
      expect(r.ok).toBe(true);
    }
    const overflow = s.apply({
      op: 'add',
      kind: 'pen',
      pixels: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ],
      label: 'overflow',
      typedEquivalent: 't',
      keyboardPath: 'k',
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reasons.join()).toContain('cap reached');
  });

  it('document() returns an immutable view — external mutation cannot corrupt the store', () => {
    const s = store();
    s.apply(addRect(s));
    const doc = s.document();
    expect(Object.isFrozen(doc)).toBe(true);
    expect(Object.isFrozen(doc.annotations)).toBe(true);
    expect(Object.isFrozen(doc.annotations[0])).toBe(true);
    expect(JSON.stringify(s.document())).toBe(JSON.stringify(doc));
  });

  it('constructor rejects non-positive or non-integer viewports (fail closed)', () => {
    expect(
      () => new AnnotationSessionStore({ pageUrl: PAGE_URL, viewport: { width: 0, height: 100 } }),
    ).toThrow(/viewport\.width/);
    expect(
      () =>
        new AnnotationSessionStore({ pageUrl: PAGE_URL, viewport: { width: 1.5, height: 100 } }),
    ).toThrow(/viewport\.width/);
  });
});
