/**
 * T0704 tests — annotations: rectangle/pen/arrow + serialization.
 *
 * Acceptance under test:
 *  - schema validates: envelope contract, strict field checks
 *  - malformed/out-of-bounds rejected: every negative below names its reason
 *  - undo safe: empty-history no-ops, redo-branch truncation, id continuity,
 *    bounded history
 *  - non-drawing equivalent: pointer, keyboard and instruction paths are the
 *    SAME mutation entrypoint and produce byte-identical documents (DA-34)
 *  - serialization round trip: serialize -> parse -> serialize is byte-stable;
 *  - semantic geometry: documents carry viewport metadata + anchors, never
 *    raw pixels only (DA-34).
 */
import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_FORMAT,
  ANNOTATION_VERSION,
  MAX_ANNOTATIONS_PER_DOC,
  AnnotationStore,
  type AnnotationDocument,
  type MutationInstruction,
  type ViewportMetadata,
} from '../src/annotations.js';

const VIEWPORT: ViewportMetadata = {
  width: 1280,
  height: 800,
  dpr: 2,
  scrollX: 0,
  scrollY: 120,
  capturedAt: '2026-11-14T06:30:00.000Z',
};

function rectDoc(): AnnotationDocument {
  const store = new AnnotationStore(VIEWPORT);
  const r = store.apply({
    op: 'add-rectangle',
    provenance: 'pointer',
    geometry: { kind: 'rectangle', x: 10, y: 20, width: 300, height: 140 },
    anchor: { kind: 'id', value: 'hero', confidence: 1 },
    note: 'hero region',
  });
  if (!r.ok) throw new Error(`fixture broken: ${r.reasons.join('; ')}`);
  return r.document;
}

describe('T0704 annotations — schema validates', () => {
  it('valid document passes validation and carries viewport + anchor metadata', () => {
    const doc = rectDoc();
    expect(doc.viewport).toEqual(VIEWPORT);
    expect(doc.annotations).toHaveLength(1);
    const ann = doc.annotations[0]!;
    expect(ann.id).toBe('a-1');
    expect(ann.geometry).toEqual({ kind: 'rectangle', x: 10, y: 20, width: 300, height: 140 });
    expect(ann.anchor).toEqual({ kind: 'id', value: 'hero', confidence: 1 });
  });

  it('serialization envelope carries format OUTSIDE the strict record body', () => {
    const store = new AnnotationStore(VIEWPORT);
    store.apply({
      op: 'add-rectangle',
      provenance: 'instruction',
      geometry: { kind: 'rectangle', x: 0, y: 0, width: 5, height: 5 },
    });
    const envelope = JSON.parse(store.serialize()) as Record<string, unknown>;
    expect(envelope['format']).toBe(ANNOTATION_FORMAT);
    expect(envelope['version']).toBe(ANNOTATION_VERSION);
    expect(Object.keys(envelope['doc'] as object)).toEqual(['viewport', 'annotations']);
  });
});

describe('T0704 annotations — malformed/out-of-bounds rejected (fail closed)', () => {
  const bad: Array<[string, MutationInstruction, string]> = [
    [
      'rectangle exceeds right edge',
      {
        op: 'add-rectangle',
        provenance: 'pointer',
        geometry: { kind: 'rectangle', x: 1200, y: 0, width: 200, height: 50 },
      },
      'x+width',
    ],
    [
      'rectangle below viewport top after scroll offset base 0',
      {
        op: 'add-rectangle',
        provenance: 'pointer',
        geometry: { kind: 'rectangle', x: 0, y: -5, width: 50, height: 50 },
      },
      'out of bounds',
    ],
    [
      'zero-area rectangle',
      {
        op: 'add-rectangle',
        provenance: 'keyboard',
        geometry: { kind: 'rectangle', x: 5, y: 5, width: 0, height: 50 },
      },
      'must be > 0',
    ],
    [
      'pen with a single point',
      { op: 'add-pen', provenance: 'pointer', geometry: { kind: 'pen', points: [{ x: 1, y: 1 }] } },
      '>= 2 points',
    ],
    [
      'pen point outside viewport',
      {
        op: 'add-pen',
        provenance: 'pointer',
        geometry: { kind: 'pen', points: [{ x: 1, y: 1 }, { x: 5000, y: 1 }] },
      },
      'points[1].x',
    ],
    [
      'arrow head and tail coincide',
      {
        op: 'add-arrow',
        provenance: 'pointer',
        geometry: { kind: 'arrow', from: { x: 10, y: 10 }, to: { x: 10, y: 10 } },
      },
      'coincide',
    ],
    [
      'NaN coordinate',
      {
        op: 'add-arrow',
        provenance: 'pointer',
        geometry: { kind: 'arrow', from: { x: Number.NaN, y: 10 }, to: { x: 20, y: 10 } },
      },
      'not a finite number',
    ],
  ];
  for (const [name, instruction, reasonPart] of bad) {
    it(`rejects: ${name}`, () => {
      const store = new AnnotationStore(VIEWPORT);
      const result = store.apply(instruction);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reasons.join(' | ')).toContain(reasonPart);
      }
      expect(store.document().annotations).toHaveLength(0); // rejected = no state change
    });
  }

  it('rejects oversized pen strokes beyond the point cap', () => {
    const store = new AnnotationStore(VIEWPORT);
    const points = Array.from({ length: 2001 }, (_, i) => ({ x: i % 1279, y: i % 799 }));
    const result = store.apply({ op: 'add-pen', provenance: 'pointer', geometry: { kind: 'pen', points } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons.join()).toContain('2000 point cap');
  });

  it('rejects removing an unknown id', () => {
    const store = new AnnotationStore(VIEWPORT);
    const result = store.apply({ op: 'remove', provenance: 'keyboard', id: 'a-99' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons.join()).toContain('no annotation with id a-99');
  });
});

describe('T0704 annotations — serialization round trip', () => {
  it('serialize -> parse -> serialize is byte-identical', () => {
    const store = new AnnotationStore(VIEWPORT);
    store.apply({
      op: 'add-rectangle',
      provenance: 'pointer',
      geometry: { kind: 'rectangle', x: 10, y: 20, width: 300, height: 140 },
      anchor: { kind: 'id', value: 'hero', confidence: 1 },
    });
    store.apply({
      op: 'add-pen',
      provenance: 'keyboard',
      geometry: { kind: 'pen', points: [{ x: 1.5, y: 2.5 }, { x: 3.5, y: 4.5 }, { x: 6.25, y: 8.125 }] },
      note: 'circle this',
    });
    store.apply({
      op: 'add-arrow',
      provenance: 'instruction',
      geometry: { kind: 'arrow', from: { x: 100, y: 100 }, to: { x: 200, y: 150 } },
    });
    const first = store.serialize();
    const parsed = AnnotationStore.parse(first);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.reasons.join('; '));
    const second = JSON.stringify({ format: ANNOTATION_FORMAT, version: ANNOTATION_VERSION, doc: parsed.document });
    expect(second).toBe(first);
    expect(JSON.stringify(parsed.document)).toBe(JSON.stringify(store.document()));
  });

  it('rejects invalid JSON, wrong format and wrong version with explicit reasons', () => {
    const noJson = AnnotationStore.parse('{not json');
    expect(noJson.ok).toBe(false);
    if (!noJson.ok) expect(noJson.reasons[0]).toContain('invalid JSON');

    const wrongFormat = AnnotationStore.parse(
      JSON.stringify({ format: 'sus.other', version: 1, doc: { viewport: VIEWPORT, annotations: [] } }),
    );
    expect(wrongFormat.ok).toBe(false);
    if (!wrongFormat.ok) expect(wrongFormat.reasons.join()).toContain('expected "sus.studio-annotation"');

    const wrongVersion = AnnotationStore.parse(
      JSON.stringify({ format: ANNOTATION_FORMAT, version: 2, doc: { viewport: VIEWPORT, annotations: [] } }),
    );
    expect(wrongVersion.ok).toBe(false);
    if (!wrongVersion.ok) expect(wrongVersion.reasons.join()).toContain('no migration chain exists');
  });

  it('rejects parsed annotations with malformed ids/provenance and bad geometry', () => {
    const cases: Array<[string, object, string]> = [
      [
        'bad id',
        { id: 'nope', kind: 'pen', geometry: { kind: 'pen', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }, provenance: 'pointer' },
        "expected monotonic id",
      ],
      [
        'bad provenance',
        { id: 'a-1', kind: 'pen', geometry: { kind: 'pen', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }, provenance: 'voice' },
        'provenance',
      ],
      [
        'unknown geometry kind',
        { id: 'a-1', kind: 'blob', geometry: { kind: 'blob' }, provenance: 'pointer' },
        "expected 'rectangle' | 'pen' | 'arrow'",
      ],
      [
        'anchor confidence out of range',
        {
          id: 'a-1',
          kind: 'rectangle',
          geometry: { kind: 'rectangle', x: 1, y: 1, width: 5, height: 5 },
          anchor: { kind: 'id', value: 'x', confidence: 1.5 },
          provenance: 'pointer',
        },
        'confidence',
      ],
    ];
    for (const [name, annotation, reasonPart] of cases) {
      const doc = { viewport: VIEWPORT, annotations: [annotation] };
      const result = AnnotationStore.parse(
        JSON.stringify({ format: ANNOTATION_FORMAT, version: ANNOTATION_VERSION, doc }),
      );
      expect(result.ok, name).toBe(false);
      if (!result.ok) expect(result.reasons.join(' | '), name).toContain(reasonPart);
    }
  });

  it('rejects a parsed document whose viewport is missing or invalid', () => {
    const noViewport = AnnotationStore.parse(
      JSON.stringify({ format: ANNOTATION_FORMAT, version: 1, doc: { annotations: [] } }),
    );
    expect(noViewport.ok).toBe(false);
    if (!noViewport.ok) expect(noViewport.reasons.join()).toContain('viewport');

    const badViewport = AnnotationStore.parse(
      JSON.stringify({
        format: ANNOTATION_FORMAT,
        version: 1,
        doc: { viewport: { ...VIEWPORT, dpr: 99 }, annotations: [] },
      }),
    );
    expect(badViewport.ok).toBe(false);
    if (!badViewport.ok) expect(badViewport.reasons.join()).toContain('dpr');
  });
});

describe('T0704 annotations — undo/redo safety', () => {
  it('undo on empty history is a no-op failure; redo without undo likewise', () => {
    const store = new AnnotationStore(VIEWPORT);
    const u = store.apply({ op: 'undo', provenance: 'keyboard' });
    const r = store.apply({ op: 'redo', provenance: 'keyboard' });
    expect(u.ok).toBe(false);
    expect(r.ok).toBe(false);
    if (!u.ok) expect(u.reasons.join()).toContain('nothing to undo');
    if (!r.ok) expect(r.reasons.join()).toContain('nothing to redo');
  });

  it('undo removes the annotation, redo restores it exactly', () => {
    const store = new AnnotationStore(VIEWPORT);
    store.apply({
      op: 'add-rectangle',
      provenance: 'pointer',
      geometry: { kind: 'rectangle', x: 1, y: 2, width: 3, height: 4 },
    });
    const before = store.document();
    const undone = store.apply({ op: 'undo', provenance: 'keyboard' });
    expect(undone.ok).toBe(true);
    expect(store.document().annotations).toHaveLength(0);
    const redone = store.apply({ op: 'redo', provenance: 'keyboard' });
    expect(redone.ok).toBe(true);
    expect(JSON.stringify(store.document())).toBe(JSON.stringify(before));
    expect(store.canUndo()).toBe(true);
    expect(store.canRedo()).toBe(false);
  });

  it('a new mutation truncates the redo branch (standard editor semantics)', () => {
    const store = new AnnotationStore(VIEWPORT);
    const add = (y: number) =>
      store.apply({
        op: 'add-rectangle',
        provenance: 'pointer',
        geometry: { kind: 'rectangle', x: 0, y, width: 10, height: 10 },
      });
    add(1);
    store.apply({ op: 'undo', provenance: 'keyboard' });
    expect(store.canRedo()).toBe(true);
    add(2); // new mutation — redo branch must die
    expect(store.canRedo()).toBe(false);
    expect(store.document().annotations.map((a) => a.id)).toEqual(['a-2']); // id monotonicity preserved
  });

  it('undo after remove restores the removed annotation in place', () => {
    const store = new AnnotationStore(VIEWPORT);
    store.apply({
      op: 'add-rectangle',
      provenance: 'instruction',
      geometry: { kind: 'rectangle', x: 1, y: 1, width: 2, height: 2 },
    });
    store.apply({ op: 'remove', provenance: 'keyboard', id: 'a-1' });
    expect(store.document().annotations).toHaveLength(0);
    const undone = store.apply({ op: 'undo', provenance: 'pointer' });
    expect(undone.ok).toBe(true);
    expect(store.document().annotations[0]!.id).toBe('a-1');
  });

  it('history is bounded at 100 snapshots', () => {
    const store = new AnnotationStore(VIEWPORT);
    for (let i = 0; i < 105; i += 1) {
      const y = (i % 79) + 1;
      store.apply({
        op: 'add-rectangle',
        provenance: 'instruction',
        geometry: { kind: 'rectangle', x: 0, y, width: 10, height: 10 },
      });
    }
    let undos = 0;
    while (store.canUndo() && undos <= 101) {
      store.apply({ op: 'undo', provenance: 'keyboard' });
      undos += 1;
    }
    expect(undos).toBe(100);
    // oldest snapshot was evicted: exactly the last 100 adds are undoable
    expect(store.document().annotations).toHaveLength(5);
  });
});

describe('T0704 annotations — non-drawing equivalence (DA-34)', () => {
  it('pointer, keyboard and instruction paths have identical EFFECTS', () => {
    const geometry = { kind: 'arrow', from: { x: 10, y: 10 }, to: { x: 60, y: 40 } } as const;
    const anchor = { kind: 'text', value: 'add to cart', confidence: 0.7 } as const;
    const pointer = new AnnotationStore(VIEWPORT);
    const keyboard = new AnnotationStore(VIEWPORT);
    const automation = new AnnotationStore(VIEWPORT);
    pointer.apply({ op: 'add-arrow', provenance: 'pointer', geometry: { ...geometry }, anchor: { ...anchor } });
    keyboard.apply({ op: 'add-arrow', provenance: 'keyboard', geometry: { ...geometry }, anchor: { ...anchor } });
    automation.apply({ op: 'add-arrow', provenance: 'instruction', geometry: { ...geometry }, anchor: { ...anchor } });
    // The EFFECT (geometry + anchor + id) is identical across all three paths;
    // only `provenance` faithfully records who performed it.
    const effects = [pointer, keyboard, automation].map((s) =>
      JSON.stringify({ ...s.document(), annotations: s.document().annotations.map(({ provenance: _p, ...rest }) => rest) }),
    );
    expect(effects[0]).toBe(effects[1]);
    expect(effects[1]).toBe(effects[2]);
    const provenances = [pointer, keyboard, automation].map(
      (s) => s.document().annotations[0]!.provenance,
    );
    expect(provenances).toEqual(['pointer', 'keyboard', 'instruction']);
  });

  it('document-level automation via serialize/parse matches live-store documents', () => {
    const live = new AnnotationStore(VIEWPORT);
    live.apply({
      op: 'add-pen',
      provenance: 'pointer',
      geometry: { kind: 'pen', points: [{ x: 5, y: 5 }, { x: 15, y: 25 }] },
    });
    const parsed = AnnotationStore.parse(live.serialize());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.reasons.join('; '));
    expect(JSON.stringify(parsed.document)).toBe(JSON.stringify(live.document()));
  });
});

describe('T0704 annotations — caps + immutability', () => {
  it('annotation count per document is capped', () => {
    const store = new AnnotationStore(VIEWPORT);
    for (let i = 0; i < MAX_ANNOTATIONS_PER_DOC; i += 1) {
      const y = (i % 79) + 1;
      const r = store.apply({
        op: 'add-rectangle',
        provenance: 'instruction',
        geometry: { kind: 'rectangle', x: 0, y, width: 10, height: 10 },
      });
      expect(r.ok).toBe(true);
    }
    const overflow = store.apply({
      op: 'add-rectangle',
      provenance: 'instruction',
      geometry: { kind: 'rectangle', x: 0, y: 1, width: 10, height: 10 },
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reasons.join()).toContain('cap reached');
  });

  it('document() returns an immutable view — external mutation cannot corrupt the store', () => {
    const store = new AnnotationStore(VIEWPORT);
    store.apply({
      op: 'add-rectangle',
      provenance: 'pointer',
      geometry: { kind: 'rectangle', x: 1, y: 1, width: 2, height: 2 },
    });
    const doc = store.document();
    expect(Object.isFrozen(doc)).toBe(true);
    expect(Object.isFrozen(doc.annotations)).toBe(true);
    const second = store.document();
    expect(JSON.stringify(second)).toBe(JSON.stringify(doc));
  });
});
