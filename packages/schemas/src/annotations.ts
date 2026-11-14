/**
 * Annotation contract (T0704, DA-34).
 *
 * Geometry is stored as SEMANTIC intent — normalized (0..1) coordinates plus
 * a kind — never as raw pixels only, so annotations survive resize/zoom and
 * carry meaning to the intent compiler (T0705). Malformed and out-of-bounds
 * records are rejected. Undo safety: annotations are append-only in the
 * session; undo removes the LAST entry and is expressible as a pure list
 * operation (no partial mutations).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

/** Normalized coordinate: 0..1 relative to the captured viewport. */
const Coord = z.number().finite().min(0).max(1);

const Point = z.object({ x: Coord, y: Coord }).strict();

export const AnnotationKind = z.enum(['rectangle', 'pen', 'arrow']);

export const Annotation = z
  .object({
    id: z.string().min(1),
    kind: AnnotationKind,
    /** rectangle: two corners; arrow: tail→head (2); pen: >= 2 points. */
    points: z.array(Point).min(2).max(512),
    /** Semantic label from the annotator (what this marking MEANS). */
    label: z.string().min(1).max(200),
    /** Non-drawing equivalents: a typed instruction that produces the same
     * marking, and the keyboard path that creates it — required (DA-34). */
    typedEquivalent: z.string().min(1),
    keyboardPath: z.string().min(1),
    pageUrl: z.string().url(),
    createdAt: z.string().min(4),
    author: z.string().min(1),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.kind === 'rectangle' && a.points.length !== 2) {
      ctx.addIssue({ code: 'custom', message: 'rectangle needs exactly 2 corner points', path: ['points'] });
    }
    if (a.kind === 'arrow' && a.points.length !== 2) {
      ctx.addIssue({ code: 'custom', message: 'arrow needs exactly 2 points (tail, head)', path: ['points'] });
    }
    if (a.kind === 'pen' && a.points.length < 3) {
      ctx.addIssue({ code: 'custom', message: 'pen stroke needs >= 3 points', path: ['points'] });
    }
  });

export const AnnotationSession = z
  .object({
    pageUrl: z.string().url(),
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
    annotations: z.array(Annotation),
  })
  .strict()
  .superRefine((s, ctx) => {
    const ids = new Set(s.annotations.map((a) => a.id));
    if (ids.size !== s.annotations.length) {
      ctx.addIssue({ code: 'custom', message: 'duplicate annotation ids', path: ['annotations'] });
    }
  });

/** Undo: remove the last annotation; safe on empty (returns unchanged). */
export function undoLast(session: z.infer<typeof AnnotationSession>): z.infer<typeof AnnotationSession> {
  return { ...session, annotations: session.annotations.slice(0, -1) };
}

export const SusAnnotation = defineSusSchema('sus.annotation', 1, Annotation);
export const SusAnnotationSession = defineSusSchema('sus.annotation-session', 1, AnnotationSession);

export type AnnotationData = z.infer<typeof Annotation>;
export type AnnotationSessionData = z.infer<typeof AnnotationSession>;
