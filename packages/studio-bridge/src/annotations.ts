/**
 * Overlay annotation drawing (T0704, DA-34). Injected into the ISOLATED
 * world (T0702 posture): pointer drawing captures normalized geometry,
 * every drawing operation has a typed-instruction + keyboard equivalent,
 * serialization emits sus.annotation-session (schema-validated), undo is
 * a pure list operation.
 */
import {
  AnnotationSession,
  type AnnotationData,
  type AnnotationSessionData,
} from '@sus/schemas';

export interface DrawnAnnotation {
  data: AnnotationData;
  /** SVG element ids created in the overlay (isolated-world DOM). */
  elementIds: string[];
}

/** Normalizes viewport pixel coords to 0..1 semantic space. */
export function normalizePoint(x: number, y: number, vw: number, vh: number): { x: number; y: number } {
  if (vw <= 0 || vh <= 0) throw new Error('viewport must be positive');
  return {
    x: Math.min(1, Math.max(0, Number((x / vw).toFixed(4)))),
    y: Math.min(1, Math.max(0, Number((y / vh).toFixed(4)))),
  };
}

/** Builds a validated annotation from capture params (throws on invalid). */
export function buildAnnotation(params: {
  id: string;
  kind: 'rectangle' | 'pen' | 'arrow';
  pixels: Array<{ x: number; y: number }>;
  viewport: { width: number; height: number };
  label: string;
  typedEquivalent: string;
  keyboardPath: string;
  pageUrl: string;
  author: string;
  at?: string;
}): AnnotationData {
  const points = params.pixels.map((p) => normalizePoint(p.x, p.y, params.viewport.width, params.viewport.height));
  const candidate: AnnotationData = {
    id: params.id,
    kind: params.kind,
    points,
    label: params.label,
    typedEquivalent: params.typedEquivalent,
    keyboardPath: params.keyboardPath,
    pageUrl: params.pageUrl,
    createdAt: params.at ?? new Date().toISOString(),
    author: params.author,
  };
  const parsed = AnnotationSession.shape.annotations.element.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`invalid annotation: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}

/** Session serialization: schema-validated, append-only list + undo helper. */
export function serializeSession(session: AnnotationSessionData): string {
  const parsed = AnnotationSession.safeParse(session);
  if (!parsed.success) throw new Error(`invalid session: ${parsed.error.issues.map(String).join('; ')}`);
  return JSON.stringify(parsed.data, null, 2);
}

export function deserializeSession(json: string): AnnotationSessionData {
  const parsed = AnnotationSession.safeParse(JSON.parse(json));
  if (!parsed.success) throw new Error(`invalid session JSON: ${parsed.error.issues.map(String).join('; ')}`);
  return parsed.data;
}

/** Undo: pure list operation (last annotation removed; safe on empty). */
export function undoLastAnnotation(session: AnnotationSessionData): AnnotationSessionData {
  return { ...session, annotations: session.annotations.slice(0, -1) };
}
