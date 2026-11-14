/**
 * T0801 tests — multi-select + between-section insertion.
 *
 * The acceptance line is "insert-between produces ordered constraint set", so
 * the tests treat the constraint set as a proof obligation:
 *  - the set is ordered (`after A` then `before B`) and re-derives its own slot
 *    (`indexFromConstraints`), including after the section list changes;
 *  - "between A and B" is unambiguous only when adjacent — otherwise it
 *    returns candidates and refuses to apply until an index is explicitly
 *    confirmed (TASKS.json rollback: explicit index confirmation);
 *  - selection iterates in SELECTION order (deterministic spatial edits), and
 *    unknown ids are refused rather than ignored;
 *  - a multi-element move is atomic: one element leaving the viewport cancels
 *    the whole edit, never a partial move.
 */
import { describe, expect, it } from 'vitest';
import {
  InsertionModel,
  SelectionModel,
  computeSpatialEdit,
  indexFromConstraints,
  type SectionNode,
} from '../src/selection.js';

const SECTIONS: SectionNode[] = [
  { id: 'hero', top: 0, height: 600, title: 'Hero' },
  { id: 'features', top: 600, height: 400, title: 'Features' },
  { id: 'pricing', top: 1000, height: 500, title: 'Pricing' },
  { id: 'footer', top: 1500, height: 200, title: 'Footer' },
];

describe('T0801 — SelectionModel', () => {
  it('iterates in selection order, not universe order', () => {
    const selection = new SelectionModel(['a', 'b', 'c', 'd']);
    selection.add('c');
    selection.add('a');
    selection.add('d');
    expect(selection.ids()).toEqual(['c', 'a', 'd']);
  });

  it('refuses unknown ids and reports them from addMany', () => {
    const selection = new SelectionModel(['a', 'b']);
    expect(selection.add('zzz')).toBe(false);
    const result = selection.addMany(['a', 'zzz', 'b']);
    expect(result.added).toEqual(['a', 'b']);
    expect(result.refused).toEqual(['zzz']);
    expect(selection.ids()).toEqual(['a', 'b']);
  });

  it('toggles, removes, and never duplicates an id', () => {
    const selection = new SelectionModel(['a', 'b', 'c']);
    selection.add('a');
    selection.add('a');
    expect(selection.size()).toBe(1);
    selection.toggle('a');
    expect(selection.has('a')).toBe(false);
    selection.toggle('a');
    expect(selection.has('a')).toBe(true);
    expect(selection.remove('b')).toBe(false); // not selected
  });

  it('shift-range replaces the selection between anchor and target', () => {
    const selection = new SelectionModel(['a', 'b', 'c', 'd', 'e']);
    selection.add('b');
    selection.rangeTo('d');
    expect(selection.ids()).toEqual(['b', 'c', 'd']);
    selection.rangeTo('a'); // backwards range from the SAME anchor (b)
    expect(selection.ids()).toEqual(['a', 'b']);
    expect(selection.rangeTo('nope')).toBe(false);
    // repeated shift-clicks keep growing from the original anchor
    selection.add('b');
    selection.rangeTo('c');
    selection.rangeTo('d');
    expect(selection.ids()).toEqual(['b', 'c', 'd']);
  });

  it('selectAll / clear and constructor validation', () => {
    const selection = new SelectionModel(['a', 'b']);
    expect(selection.selectAll()).toEqual(['a', 'b']);
    selection.clear();
    expect(selection.isEmpty()).toBe(true);
    expect(() => new SelectionModel([])).toThrow(TypeError);
    expect(() => new SelectionModel(['a', 'a'])).toThrow(TypeError);
  });
});

describe('T0801 — InsertionModel markers', () => {
  it('produces n+1 labelled markers in document order', () => {
    const model = new InsertionModel(SECTIONS);
    const markers = model.markers();
    expect(markers).toHaveLength(5);
    expect(markers[0]!.label).toBe('Insert before Hero');
    expect(markers[2]!.label).toBe('Insert between Features and Pricing');
    expect(markers[4]!.label).toBe('Insert after Footer');
    expect(markers[2]!.beforeId).toBe('pricing');
    expect(markers[2]!.afterId).toBe('features');
  });

  it('rejects a section list whose order cannot be trusted', () => {
    expect(
      () =>
        new InsertionModel([
          { id: 'a', top: 10, height: 5 },
          { id: 'b', top: 10, height: 5 },
        ]),
    ).toThrow(/strictly ascending/);
    expect(
      () =>
        new InsertionModel([
          { id: 'a', top: 20, height: 5 },
          { id: 'b', top: 10, height: 5 },
        ]),
    ).toThrow(/strictly ascending/);
    expect(
      () =>
        new InsertionModel([
          { id: 'a', top: 0, height: 5 },
          { id: 'a', top: 10, height: 5 },
        ]),
    ).toThrow(/duplicate/);
    expect(() => new InsertionModel([])).toThrow(TypeError);
  });

  it('finds the nearest gap for a pointer position', () => {
    const model = new InsertionModel(SECTIONS);
    expect(model.markerNear(0)!.index).toBe(0);
    expect(model.markerNear(595)!.index).toBe(1); // just above features
    expect(model.markerNear(1700)!.index).toBe(4);
    expect(model.markerNear(Number.NaN)).toBeNull();
  });
});

describe('T0801 — ordered constraint sets', () => {
  it('emits "after previous, before next" in that order', () => {
    const plan = new InsertionModel(SECTIONS).resolve(2);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.index).toBe(2);
    expect(plan.plan.constraints).toEqual([
      { relation: 'after', anchorId: 'features' },
      { relation: 'before', anchorId: 'pricing' },
    ]);
    expect(plan.plan.confirmed).toBe(false);
  });

  it('emits a single constraint at the ends', () => {
    const model = new InsertionModel(SECTIONS);
    const first = model.resolve(0);
    const last = model.resolve(4);
    expect(first.ok && first.plan.constraints).toEqual([{ relation: 'before', anchorId: 'hero' }]);
    expect(last.ok && last.plan.constraints).toEqual([{ relation: 'after', anchorId: 'footer' }]);
  });

  it('round-trips every slot through indexFromConstraints', () => {
    const model = new InsertionModel(SECTIONS);
    for (let index = 0; index <= SECTIONS.length; index += 1) {
      const result = model.resolve(index);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const derived = indexFromConstraints(SECTIONS, result.plan.constraints);
      expect(derived).toEqual({ ok: true, index });
    }
  });

  it('refuses an out-of-range index', () => {
    const model = new InsertionModel(SECTIONS);
    expect(model.resolve(-1).ok).toBe(false);
    expect(model.resolve(5).ok).toBe(false);
    expect(model.resolve(1.5).ok).toBe(false);
  });
});

describe('T0801 — ambiguity requires explicit index confirmation', () => {
  it('resolves adjacent sections without ambiguity', () => {
    const result = new InsertionModel(SECTIONS).resolveBetween('hero', 'features');
    expect(result.ok && result.ambiguous).toBe(false);
    if (result.ok) expect(result.plan.index).toBe(1);
  });

  it('returns candidates instead of guessing when sections lie in between', () => {
    const result = new InsertionModel(SECTIONS).resolveBetween('hero', 'pricing');
    expect(result.ok).toBe(true);
    if (!result.ok || !result.ambiguous) return;
    expect(result.candidates).toEqual([1, 2]);
    expect(result.plan.confirmed).toBe(false);
  });

  it('refuses unknown ids and self-pairs', () => {
    const model = new InsertionModel(SECTIONS);
    expect(model.resolveBetween('hero', 'nope').ok).toBe(false);
    expect(model.resolveBetween('hero', 'hero').ok).toBe(false);
  });

  it('confirm promotes exactly the confirmed index, and only that one', () => {
    const model = new InsertionModel(SECTIONS);
    const draft = model.resolve(2);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const mismatched = model.confirm(draft.plan, 3);
    expect(mismatched.ok).toBe(false);

    const confirmed = model.confirm(draft.plan, 2);
    expect(confirmed.ok).toBe(true);
    if (confirmed.ok) {
      expect(confirmed.plan.confirmed).toBe(true);
      expect(confirmed.plan.index).toBe(2);
    }
  });

  it('detects a plan whose slot moved under it (stale confirmation)', () => {
    const model = new InsertionModel(SECTIONS);
    const draft = model.resolve(2);
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    // The section list changed: "pricing" was removed, so "before pricing" no
    // longer identifies the slot the user confirmed. Applied blindly, this is
    // a silent wrong-place insertion.
    const reordered: SectionNode[] = SECTIONS.filter((s) => s.id !== 'pricing');
    const derived = indexFromConstraints(reordered, draft.plan.constraints);
    expect(derived.ok).toBe(false);
    if (!derived.ok) expect(derived.reasons.join()).toContain('unknown anchor pricing');
  });

  it('rejects non-adjacent constraint sets', () => {
    const derived = indexFromConstraints(SECTIONS, [
      { relation: 'after', anchorId: 'hero' },
      { relation: 'before', anchorId: 'footer' },
    ]);
    expect(derived.ok).toBe(false);
    if (!derived.ok) expect(derived.reasons.join()).toContain('not adjacent');
  });

  it('rejects duplicate or malformed constraint sets', () => {
    expect(
      indexFromConstraints(SECTIONS, [
        { relation: 'before', anchorId: 'hero' },
        { relation: 'before', anchorId: 'features' },
      ]).ok,
    ).toBe(false);
    expect(indexFromConstraints(SECTIONS, []).ok).toBe(false);
    expect(
      indexFromConstraints(SECTIONS, [
        { relation: 'sideways' as unknown as 'before', anchorId: 'hero' },
      ]).ok,
    ).toBe(false);
  });
});

describe('T0801 — multi-element spatial edit', () => {
  const viewport = { width: 1000, height: 1000 };
  const selected = [
    {
      id: 'r1',
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 200 },
      ],
    },
    {
      id: 'r2',
      points: [
        { x: 400, y: 400 },
        { x: 600, y: 500 },
      ],
    },
  ];

  it('translates every selected element by the same delta', () => {
    const result = computeSpatialEdit(selected, { dx: 50, dy: 25 }, viewport);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moves).toEqual([
      {
        id: 'r1',
        points: [
          { x: 150, y: 125 },
          { x: 350, y: 225 },
        ],
      },
      {
        id: 'r2',
        points: [
          { x: 450, y: 425 },
          { x: 650, y: 525 },
        ],
      },
    ]);
  });

  it('is all-or-nothing when one element would leave the viewport', () => {
    const result = computeSpatialEdit(selected, { dx: 450, dy: 0 }, viewport);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.join()).toContain('r2');
      expect(result.reasons.join()).toContain('leave the viewport');
    }
  });

  it('refuses an empty selection and a non-finite delta', () => {
    expect(computeSpatialEdit([], { dx: 1, dy: 1 }, viewport).ok).toBe(false);
    expect(computeSpatialEdit(selected, { dx: Number.NaN, dy: 0 }, viewport).ok).toBe(false);
  });

  it('allows a move that lands exactly on the viewport edge', () => {
    const edge = [{ id: 'e', points: [{ x: 900, y: 900 }] }];
    expect(computeSpatialEdit(edge, { dx: 100, dy: 100 }, viewport).ok).toBe(true);
    expect(computeSpatialEdit(edge, { dx: 101, dy: 0 }, viewport).ok).toBe(false);
  });
});
