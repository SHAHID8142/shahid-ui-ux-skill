/**
 * T0704: annotations — schema rejects malformed/out-of-bounds; typed +
 * keyboard equivalents required (DA-34); serialization round-trips; undo is
 * a safe pure list operation; overlay drawing produces validated annotations
 * in the isolated world.
 */
import { describe, expect, it } from 'vitest';
import { AnnotationSession, SusAnnotation } from '@sus/schemas';
import {
  buildAnnotation,
  deserializeSession,
  normalizePoint,
  serializeSession,
  undoLastAnnotation,
} from '../src/annotations.js';

const base = {
  id: 'a-1',
  kind: 'rectangle' as const,
  pixels: [
    { x: 100, y: 50 },
    { x: 300, y: 200 },
  ],
  viewport: { width: 1440, height: 900 },
  label: 'move CTA above the fold',
  typedEquivalent: 'draw rectangle from 7% 6% to 21% 22% labelled "move CTA above the fold"',
  keyboardPath: 'press r, arrow keys to origin, enter, arrow keys to end, enter',
  pageUrl: 'http://127.0.0.1:4341/',
  author: 'shahid',
};

describe('annotation contract (T0704, DA-34)', () => {
  it('valid rectangle normalizes pixels to semantic 0..1 intent', () => {
    const a = buildAnnotation(base);
    expect(a.points[0]).toEqual({ x: 0.0694, y: 0.0556 });
    expect(a.points[1]!.x).toBeCloseTo(0.2083, 3);
    expect(SusAnnotation.schema.safeParse(a).success).toBe(true);
  });

  it('malformed: rectangle with 3 points rejected', () => {
    expect(() => buildAnnotation({ ...base, pixels: base.pixels.concat({ x: 1, y: 1 }) })).toThrow(/exactly 2/);
  });

  it('out-of-bounds pixel (beyond viewport) clamps to 1; negative viewport throws', () => {
    const clamped = buildAnnotation({ ...base, pixels: [{ x: 5000, y: -20 }, ...base.pixels.slice(1)] });
    expect(clamped.points[0]).toEqual({ x: 1, y: 0 });
    expect(() =>
      buildAnnotation({ ...base, viewport: { width: 0, height: 0 } }),
    ).toThrow(/viewport must be positive/);
  });

  it('missing typedEquivalent or keyboardPath is rejected (DA-34 non-drawing equivalents)', () => {
    expect(() => buildAnnotation({ ...base, typedEquivalent: '' })).toThrow(/typedEquivalent/);
    expect(() => buildAnnotation({ ...base, keyboardPath: '' })).toThrow(/keyboardPath/);
  });

  it('session rejects duplicate ids; serialization round-trips', () => {
    const a = buildAnnotation(base);
    const session = { pageUrl: a.pageUrl, viewport: { width: 1440, height: 900 }, annotations: [a] };
    expect(AnnotationSession.safeParse(session).success).toBe(true);
    const dup = { ...session, annotations: [a, { ...a, id: 'a-1' }] };
    expect(AnnotationSession.safeParse(dup).success).toBe(false);
    const round = deserializeSession(serializeSession(session));
    expect(round).toEqual(session);
  });

  it('undo is a pure list operation, safe on empty', () => {
    const a = buildAnnotation(base);
    const one = { pageUrl: a.pageUrl, viewport: { width: 1440, height: 900 }, annotations: [a] };
    const empty = undoLastAnnotation({ ...one, annotations: [] });
    expect(empty.annotations).toHaveLength(0);
    const after = undoLastAnnotation(one);
    expect(after.annotations).toHaveLength(0);
    expect(one.annotations).toHaveLength(1); // original untouched (pure)
  });
});

describe('normalized geometry semantics', () => {
  it('normalizePoint clamps and quantizes', () => {
    expect(normalizePoint(720, 450, 1440, 900)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizePoint(-10, 2000, 1440, 900)).toEqual({ x: 0, y: 1 });
  });
});
