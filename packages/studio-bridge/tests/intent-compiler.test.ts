/**
 * T0705: intent compiler — property tests (fast-check) + targeted cases.
 * Invariants: schema-valid output for ANY input; ambiguous target (<0.6)
 * always produces unknowns[] (never a guess); pixels never appear in the
 * intent; content text is preserved.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { VisualIntent, type AnnotationData } from '@sus/schemas';
import { compileIntent, deriveRelationship } from '../src/intent-compiler.js';

const annotationArb = fc.record({
  id: fc.string({ minLength: 3, maxLength: 12 }),
  kind: fc.constantFrom('rectangle', 'pen', 'arrow'),
  points: fc.array(
    fc.record({
      x: fc.double({ min: 0, max: 1, noNaN: true }),
      y: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
    { minLength: 2, maxLength: 6 },
  ),
  label: fc.string({ minLength: 5, maxLength: 40 }),
  typedEquivalent: fc.constant('typed equivalent instruction'),
  keyboardPath: fc.constant('keyboard path'),
  pageUrl: fc.constant('http://127.0.0.1:4341/'),
  createdAt: fc.constant('2026-11-14T00:00:00Z'),
  author: fc.constant('tester'),
});

const geometryArb = fc.array(
  fc.record({
    x: fc.double({ min: 0, max: 1, noNaN: true }),
    y: fc.double({ min: 0, max: 1, noNaN: true }),
  }),
  { maxLength: 8 },
);

const inputArb = fc.record({
  intentId: fc.string({ minLength: 3, maxLength: 12 }),
  annotations: fc.array(annotationArb, { minLength: 1, maxLength: 3 }),
  targetConfidence: fc.double({ min: 0, max: 1, noNaN: true }),
  targetValue: fc.constantFrom('#hero-title', 'main > p:nth-of-type(2)', 'text-signature-sample'),
  targetKind: fc.constantFrom('id', 'structural', 'text'),
  geometry: geometryArb,
  userText: fc.string({ maxLength: 120 }),
});

function toAnchor(kind: string, value: string, confidence: number) {
  return { kind: kind as 'id' | 'structural' | 'text', value, confidence };
}

describe('intent compiler properties (T0705, fast-check)', () => {
  it('output is ALWAYS schema-valid for any generated input', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const intent = compileIntent({
          intentId: input.intentId,
          annotations: input.annotations as AnnotationData[],
          target: toAnchor(input.targetKind, input.targetValue, input.targetConfidence),
          geometry: input.geometry,
          userText: input.userText,
          viewport: { width: 1440, height: 900 },
        });
        return VisualIntent.safeParse(intent).success;
      }),
      { numRuns: 300 },
    );
  });

  it('ambiguous target (<0.6) ALWAYS yields unknowns[] with a confirm question', () => {
    fc.assert(
      fc.property(
        inputArb.filter((i) => i.targetConfidence < 0.6),
        (input) => {
          const intent = compileIntent({
            intentId: input.intentId,
            annotations: input.annotations as AnnotationData[],
            target: toAnchor(input.targetKind, input.targetValue, input.targetConfidence),
            geometry: input.geometry,
            userText: input.userText,
            viewport: { width: 1440, height: 900 },
          });
          return intent.unknowns.length > 0 && intent.unknowns.some((u) => u.includes('confirm'));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('pixel coordinates NEVER reach the intent (normalized geometry only)', () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const intent = compileIntent({
          intentId: input.intentId,
          annotations: input.annotations as AnnotationData[],
          target: toAnchor(input.targetKind, input.targetValue, input.targetConfidence),
          geometry: input.geometry,
          userText: input.userText,
          viewport: { width: 1440, height: 900 },
        });
        const text = JSON.stringify(intent);
        // pixel values (0..1440/900 magnitudes) cannot appear as raw numbers
        return !/\b(1440|900)\b/.test(text.replace(/"width":1440|"height":900/g, ''));
      }),
      { numRuns: 200 },
    );
  });
});

describe('targeted compiler behavior (T0705)', () => {
  const ann: AnnotationData = {
    id: 'a-fix',
    kind: 'rectangle',
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.35 },
    ],
    label: 'move CTA above the fold',
    typedEquivalent: 'draw rectangle labelled move CTA',
    keyboardPath: 'r … enter',
    pageUrl: 'http://127.0.0.1:4341/',
    createdAt: '2026-11-14T00:00:00Z',
    author: 'shahid',
  };

  it('deriveRelationship: above / below / inside bands', () => {
    expect(deriveRelationship([{ x: 0.3, y: 0.2 }], { top: 0.4, bottom: 0.6 })).toBe('above');
    expect(deriveRelationship([{ x: 0.3, y: 0.7 }], { top: 0.4, bottom: 0.6 })).toBe('below');
    expect(deriveRelationship([{ x: 0.3, y: 0.5 }], { top: 0.4, bottom: 0.6 })).toBe('inside');
    expect(deriveRelationship([], { top: 0.4, bottom: 0.6 })).toBeUndefined();
  });

  it('clear target + content text compiles a constraint-carrying intent', () => {
    const intent = compileIntent({
      intentId: 'i-1',
      annotations: [ann],
      target: { kind: 'id', value: 'hero-title', confidence: 1 },
      geometry: [{ x: 0.3, y: 0.2 }],
      userText: 'Make the CTA text say "Start free"',
      viewport: { width: 1440, height: 900 },
    });
    expect(intent.target.susId).toBe('hero-title');
    expect(intent.relationship).toBe('above');
    expect(
      intent.constraints.some((c) => c.kind === 'content' && c.text?.includes('Start free')),
    ).toBe(true);
    expect(intent.unknowns).toHaveLength(0);
  });

  it('straddling geometry produces a focused clarification unknown', () => {
    const intent = compileIntent({
      intentId: 'i-2',
      annotations: [ann],
      target: { kind: 'id', value: 'hero-title', confidence: 1 },
      geometry: [
        { x: 0.3, y: 0.35 },
        { x: 0.3, y: 0.65 },
      ],
      userText: '',
      viewport: { width: 1440, height: 900 },
    });
    expect(intent.unknowns.some((u) => u.includes('clarify whether'))).toBe(true);
  });
});
