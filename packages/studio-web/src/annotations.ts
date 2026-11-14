/**
 * Annotations: rectangle/pen/arrow + serialization (T0704).
 *
 * Pure, DOM-free annotation core for the Live Studio overlay. Every mutation
 * goes through ONE entrypoint (`apply(instruction)`) so drawing and non-drawing
 * paths are structurally identical: the pointer handler, the keyboard path and
 * an automation client all emit the same typed instruction — no operation
 * exists that only a drawing gesture can perform (DA-34 non-drawing
 * equivalent).
 *
 * Geometry is stored as semantic vector intent in VIEWPORT space together
 * with the full viewport metadata (width/height/dpr/scroll) — never as raw
 * pixels only, never as bitmaps (DA-34). Anchors reuse the T0703 shape
 * (kind id/structural/text + confidence) so later stages can re-resolve the
 * annotated element instead of guessing from pixels.
 *
 * Undo/redo operates on in-memory snapshots of the annotation document only.
 * The store cannot touch the page DOM and cannot mutate source files: those
 * abilities do not exist in this module (structural no-mutation posture,
 * matching T0701's read-only server).
 *
 * Serialization envelope (ADR-005 pattern): the version travels OUTSIDE the
 * strict record body — `{ format, version, doc }` — so the document itself
 * never embeds a synthetic version key.
 */

export const ANNOTATION_FORMAT = 'sus.studio-annotation' as const;
export const ANNOTATION_VERSION = 1 as const;

/** History is bounded: an annotation session is minutes, not an archive. */
export const MAX_ANNOTATIONS_PER_DOC = 500;
export const MAX_PEN_POINTS = 2000;
export const MAX_NOTE_CHARS = 500;
export const MAX_HISTORY_DEPTH = 100;

export type AnnotationKind = 'rectangle' | 'pen' | 'arrow';
export type InstructionSource = 'pointer' | 'keyboard' | 'instruction';

export interface ViewportMetadata {
  /** CSS px viewport size at capture time (device-independent). */
  width: number;
  height: number;
  /** Device pixel ratio — recorded for faithful replay, never for pixel identity. */
  dpr: number;
  scrollX: number;
  scrollY: number;
  /** ISO-8601 capture timestamp; preserved verbatim by serialization. */
  capturedAt: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface RectangleGeometry {
  kind: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PenGeometry {
  kind: 'pen';
  points: Point[];
}

export interface ArrowGeometry {
  kind: 'arrow';
  from: Point;
  to: Point;
}

export type AnnotationGeometry = RectangleGeometry | PenGeometry | ArrowGeometry;

/** Same anchor shape as T0703 (`packages/studio-bridge/src/select.ts`). */
export interface AnnotationAnchor {
  kind: 'id' | 'structural' | 'text';
  value: string;
  /** T0703 tiers: 1.0 id, 0.8 structural, 0.7 text, 0.5 ambiguous. */
  confidence: number;
}

export interface Annotation {
  /** Monotonic id `a-<n>` assigned by the store; never caller-supplied. */
  id: string;
  kind: AnnotationKind;
  geometry: AnnotationGeometry;
  anchor?: AnnotationAnchor;
  note?: string;
  /** How the operation entered the store — pointer, keyboard, or instruction. */
  provenance: InstructionSource;
}

export interface AnnotationDocument {
  viewport: ViewportMetadata;
  annotations: Annotation[];
}

export type AddInstruction =
  | { op: 'add-rectangle'; provenance: InstructionSource; geometry: RectangleGeometry; anchor?: AnnotationAnchor; note?: string }
  | { op: 'add-pen'; provenance: InstructionSource; geometry: PenGeometry; anchor?: AnnotationAnchor; note?: string }
  | { op: 'add-arrow'; provenance: InstructionSource; geometry: ArrowGeometry; anchor?: AnnotationAnchor; note?: string };

export type MutationInstruction =
  | AddInstruction
  | { op: 'remove'; provenance: InstructionSource; id: string }
  | { op: 'undo'; provenance: InstructionSource }
  | { op: 'redo'; provenance: InstructionSource };

export type ApplyResult =
  | { ok: true; document: AnnotationDocument }
  | { ok: false; reasons: string[] };

interface ValidationContext {
  viewport: ViewportMetadata;
  /** When validating a parsed document, ids come from the file, not the store. */
  expectExplicitIds: boolean;
}

// ---------- low-level validators ----------

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function inBounds(v: number, max: number, path: string, reasons: string[]): boolean {
  if (v < 0 || v > max) {
    reasons.push(`${path}: out of bounds (0..${max})`);
    return false;
  }
  return true;
}

function pointInBounds(p: unknown, viewport: ViewportMetadata, path: string, reasons: string[]): boolean {
  if (typeof p !== 'object' || p === null) {
    reasons.push(`${path}: not an object`);
    return false;
  }
  const point = p as Record<string, unknown>;
  let ok = true;
  if (!isFiniteNumber(point['x'])) {
    reasons.push(`${path}.x: not a finite number`);
    ok = false;
  } else {
    ok = inBounds(point['x'], viewport.width, `${path}.x`, reasons) && ok;
  }
  if (!isFiniteNumber(point['y'])) {
    reasons.push(`${path}.y: not a finite number`);
    ok = false;
  } else {
    ok = inBounds(point['y'], viewport.height, `${path}.y`, reasons) && ok;
  }
  return ok;
}

function validateViewport(v: unknown, reasons: string[], path = 'viewport'): void {
  if (typeof v !== 'object' || v === null) {
    reasons.push(`${path}: not an object`);
    return;
  }
  const vp = v as Record<string, unknown>;
  if (!isFiniteNumber(vp['width']) || vp['width'] < 1 || vp['width'] > 100_000) {
    reasons.push(`${path}.width: expected finite number in 1..100000`);
  }
  if (!isFiniteNumber(vp['height']) || vp['height'] < 1 || vp['height'] > 100_000) {
    reasons.push(`${path}.height: expected finite number in 1..100000`);
  }
  if (!isFiniteNumber(vp['dpr']) || vp['dpr'] < 0.1 || vp['dpr'] > 10) {
    reasons.push(`${path}.dpr: expected finite number in 0.1..10`);
  }
  if (!isFiniteNumber(vp['scrollX']) || vp['scrollX'] < -1_000_000 || vp['scrollX'] > 1_000_000) {
    reasons.push(`${path}.scrollX: expected finite number in ±1000000`);
  }
  if (!isFiniteNumber(vp['scrollY']) || vp['scrollY'] < -1_000_000 || vp['scrollY'] > 1_000_000) {
    reasons.push(`${path}.scrollY: expected finite number in ±1000000`);
  }
  if (typeof vp['capturedAt'] !== 'string' || Number.isNaN(Date.parse(vp['capturedAt']))) {
    reasons.push(`${path}.capturedAt: expected ISO-8601 string`);
  }
}

function validateAnchor(a: unknown, reasons: string[], path: string): boolean {
  if (typeof a !== 'object' || a === null) {
    reasons.push(`${path}: not an object`);
    return false;
  }
  const anchor = a as Record<string, unknown>;
  let ok = true;
  if (
    anchor['kind'] !== 'id' &&
    anchor['kind'] !== 'structural' &&
    anchor['kind'] !== 'text'
  ) {
    reasons.push(`${path}.kind: expected 'id' | 'structural' | 'text'`);
    ok = false;
  }
  if (typeof anchor['value'] !== 'string' || anchor['value'].length === 0) {
    reasons.push(`${path}.value: expected non-empty string`);
    ok = false;
  }
  if (
    !isFiniteNumber(anchor['confidence']) ||
    anchor['confidence'] < 0 ||
    anchor['confidence'] > 1
  ) {
    reasons.push(`${path}.confidence: expected finite number in 0..1`);
    ok = false;
  }
  return ok;
}

function validateGeometry(
  g: unknown,
  viewport: ViewportMetadata,
  reasons: string[],
  path: string,
): void {
  if (typeof g !== 'object' || g === null) {
    reasons.push(`${path}: not an object`);
    return;
  }
  const geo = g as Record<string, unknown>;
  if (geo['kind'] === 'rectangle') {
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      if (!isFiniteNumber(geo[key])) {
        reasons.push(`${path}.${key}: not a finite number`);
      }
    }
    if (
      isFiniteNumber(geo['x']) &&
      isFiniteNumber(geo['y']) &&
      isFiniteNumber(geo['width']) &&
      isFiniteNumber(geo['height'])
    ) {
      if (geo['width'] <= 0 || geo['height'] <= 0) {
        reasons.push(`${path}: rectangle width/height must be > 0`);
      }
      inBounds(geo['x'] as number, viewport.width, `${path}.x`, reasons);
      inBounds(geo['y'] as number, viewport.height, `${path}.y`, reasons);
      if (isFiniteNumber(geo['x']) && isFiniteNumber(geo['width'])) {
        inBounds(geo['x'] + geo['width'], viewport.width, `${path}.x+width`, reasons);
      }
      if (isFiniteNumber(geo['y']) && isFiniteNumber(geo['height'])) {
        inBounds(geo['y'] + geo['height'], viewport.height, `${path}.y+height`, reasons);
      }
    }
    return;
  }
  if (geo['kind'] === 'pen') {
    const points = geo['points'];
    if (!Array.isArray(points)) {
      reasons.push(`${path}.points: expected array`);
      return;
    }
    if (points.length < 2) {
      reasons.push(`${path}.points: pen stroke needs >= 2 points`);
    }
    if (points.length > MAX_PEN_POINTS) {
      reasons.push(`${path}.points: exceeds ${MAX_PEN_POINTS} point cap`);
    }
    points.slice(0, MAX_PEN_POINTS).forEach((p, i) => {
      pointInBounds(p, viewport, `${path}.points[${i}]`, reasons);
    });
    return;
  }
  if (geo['kind'] === 'arrow') {
    const okFrom = pointInBounds(geo['from'], viewport, `${path}.from`, reasons);
    const okTo = pointInBounds(geo['to'], viewport, `${path}.to`, reasons);
    if (
      okFrom &&
      okTo &&
      typeof geo['from'] === 'object' &&
      geo['from'] !== null &&
      typeof geo['to'] === 'object' &&
      geo['to'] !== null
    ) {
      const from = geo['from'] as Record<string, unknown>;
      const to = geo['to'] as Record<string, unknown>;
      if (
        isFiniteNumber(from['x']) &&
        isFiniteNumber(from['y']) &&
        isFiniteNumber(to['x']) &&
        isFiniteNumber(to['y']) &&
        Math.hypot((to['x'] as number) - (from['x'] as number), (to['y'] as number) - (from['y'] as number)) <
          0.5
      ) {
        reasons.push(`${path}: arrow head and tail coincide`);
      }
    }
    return;
  }
  reasons.push(`${path}.kind: expected 'rectangle' | 'pen' | 'arrow'`);
}

/** Validates a full annotation document against a viewport + house caps. */
export function validateAnnotationDocument(
  doc: unknown,
  reasons: string[] = [],
): { ok: boolean; reasons: string[] } {
  if (typeof doc !== 'object' || doc === null) {
    reasons.push('document: not an object');
    return { ok: false, reasons };
  }
  const body = doc as Record<string, unknown>;
  validateViewport(body['viewport'], reasons);
  const viewport = body['viewport'] as ViewportMetadata | undefined;
  const annotations = body['annotations'];
  if (!Array.isArray(annotations)) {
    reasons.push('annotations: expected array');
    return { ok: false, reasons };
  }
  if (annotations.length > MAX_ANNOTATIONS_PER_DOC) {
    reasons.push(`annotations: exceeds ${MAX_ANNOTATIONS_PER_DOC} cap`);
  }
  if (!viewport || typeof viewport !== 'object') {
    return { ok: false, reasons }; // viewport problems already reported
  }
  const vp = viewport as ViewportMetadata;
  annotations.slice(0, MAX_ANNOTATIONS_PER_DOC).forEach((a, i) => {
    const path = `annotations[${i}]`;
    if (typeof a !== 'object' || a === null) {
      reasons.push(`${path}: not an object`);
      return;
    }
    const ann = a as Record<string, unknown>;
    if (typeof ann['id'] !== 'string' || !/^a-[1-9]\d*$/.test(ann['id'])) {
      reasons.push(`${path}.id: expected monotonic id 'a-<n>'`);
    }
    if (ann['provenance'] !== 'pointer' && ann['provenance'] !== 'keyboard' && ann['provenance'] !== 'instruction') {
      reasons.push(`${path}.provenance: expected 'pointer' | 'keyboard' | 'instruction'`);
    }
    if (ann['note'] !== undefined && (typeof ann['note'] !== 'string' || ann['note'].length > MAX_NOTE_CHARS)) {
      reasons.push(`${path}.note: expected string of <= ${MAX_NOTE_CHARS} chars`);
    }
    if (ann['anchor'] !== undefined) {
      validateAnchor(ann['anchor'], reasons, `${path}.anchor`);
    }
    validateGeometry(ann['geometry'], vp, reasons, `${path}.geometry`);
  });
  return { ok: reasons.length === 0, reasons };
}

/** Validates one geometry payload against the store's viewport (add path). */
function validateGeometryForAdd(g: unknown, viewport: ViewportMetadata): string[] {
  const reasons: string[] = [];
  validateGeometry(g, viewport, reasons, 'geometry');
  return reasons;
}

// ---------- store ----------

interface Snapshot {
  annotations: Annotation[];
  nextId: number;
}

/** Deep-freezes so store results and parsed documents are immutable views. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * In-memory annotation store. The ONLY mutation entrypoint is `apply`, which
 * every input path (pointer, keyboard, automation) shares — the non-drawing
 * equivalence is structural, not conventional.
 */
export class AnnotationStore {
  private annotations: Annotation[] = [];
  private nextId = 1;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  constructor(private readonly viewport: ViewportMetadata) {}

  apply(instruction: MutationInstruction): ApplyResult {
    switch (instruction.op) {
      case 'undo':
        return this.undo();
      case 'redo':
        return this.redo();
      case 'remove':
        return this.remove(instruction.id);
      case 'add-rectangle':
      case 'add-pen':
      case 'add-arrow': {
        const reasons = validateGeometryForAdd(instruction.geometry, this.viewport);
        if (reasons.length > 0) return { ok: false, reasons };
        if (this.annotations.length >= MAX_ANNOTATIONS_PER_DOC) {
          return { ok: false, reasons: [`annotation cap reached (${MAX_ANNOTATIONS_PER_DOC})`] };
        }
        const kind: AnnotationKind =
          instruction.op === 'add-rectangle'
            ? 'rectangle'
            : instruction.op === 'add-pen'
              ? 'pen'
              : 'arrow';
        this.pushUndo();
        this.annotations.push({
          id: `a-${this.nextId}`,
          kind,
          geometry: structuredClone(instruction.geometry),
          ...(instruction.anchor !== undefined ? { anchor: structuredClone(instruction.anchor) } : {}),
          ...(instruction.note !== undefined ? { note: instruction.note } : {}),
          provenance: instruction.provenance,
        });
        this.nextId += 1;
        return { ok: true, document: this.document() };
      }
      default: {
        // exhaustive switch guard (noFallthrough + future instruction kinds)
        const exhaustive: never = instruction;
        return { ok: false, reasons: [`unknown instruction: ${JSON.stringify(exhaustive)}`] };
      }
    }
  }

  private remove(id: string): ApplyResult {
    const index = this.annotations.findIndex((a) => a.id === id);
    if (index === -1) {
      return { ok: false, reasons: [`remove: no annotation with id ${id}`] };
    }
    this.pushUndo();
    this.annotations.splice(index, 1);
    return { ok: true, document: this.document() };
  }

  private undo(): ApplyResult {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return { ok: false, reasons: ['undo: nothing to undo'] };
    this.redoStack.push(this.snapshot());
    this.annotations = snapshot.annotations;
    this.nextId = snapshot.nextId;
    return { ok: true, document: this.document() };
  }

  private redo(): ApplyResult {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return { ok: false, reasons: ['redo: nothing to redo'] };
    this.undoStack.push(this.snapshot());
    this.annotations = snapshot.annotations;
    this.nextId = snapshot.nextId;
    return { ok: true, document: this.document() };
  }

  /** A new mutation invalidates the redo branch (standard editor semantics). */
  private pushUndo(): void {
    this.undoStack.push(this.snapshot());
    this.redoStack = [];
    if (this.undoStack.length > MAX_HISTORY_DEPTH) {
      this.undoStack.shift();
    }
  }

  private snapshot(): Snapshot {
    return {
      annotations: structuredClone(this.annotations),
      nextId: this.nextId,
    };
  }

  /** Deep-frozen copy — callers cannot mutate store state through the result. */
  document(): AnnotationDocument {
    return deepFreeze({
      viewport: structuredClone(this.viewport),
      annotations: structuredClone(this.annotations),
    });
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ---------- serialization ----------

  serialize(): string {
    return JSON.stringify({ format: ANNOTATION_FORMAT, version: ANNOTATION_VERSION, doc: this.document() });
  }

  /**
   * Parses + validates a serialized document. Version mismatch is a hard
   * error naming the unsupported format — no silent migration, no guessed
   * defaults (ADR-005: migrations are explicit, additive chains).
   */
  static parse(text: string): ApplyResult {
    let envelope: unknown;
    try {
      envelope = JSON.parse(text);
    } catch {
      return { ok: false, reasons: ['parse: invalid JSON'] };
    }
    if (typeof envelope !== 'object' || envelope === null) {
      return { ok: false, reasons: ['envelope: not an object'] };
    }
    const env = envelope as Record<string, unknown>;
    if (env['format'] !== ANNOTATION_FORMAT) {
      return { ok: false, reasons: [`envelope.format: expected "${ANNOTATION_FORMAT}"`] };
    }
    if (env['version'] !== ANNOTATION_VERSION) {
      return {
        ok: false,
        reasons: [
          `envelope.version: expected ${ANNOTATION_VERSION}, got ${JSON.stringify(env['version'])} — no migration chain exists for other versions`,
        ],
      };
    }
    const reasons: string[] = [];
    const ok = validateAnnotationDocument(env['doc'], reasons);
    if (!ok) return { ok: false, reasons };
    return { ok: true, document: deepFreeze(structuredClone(env['doc'])) as AnnotationDocument };
  }
}
