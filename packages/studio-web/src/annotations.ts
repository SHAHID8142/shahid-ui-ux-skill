/**
 * T0704b — studio-web annotation session store (overlay side of the split
 * T0704 delivery).
 *
 * The annotation CONTRACT landed in the substrate (zcode-glm, pushed):
 *  - `@sus/schemas` SusAnnotation(S) v1 — normalized (0..1) semantic geometry,
 *    strict records, required `typedEquivalent` + `keyboardPath` per drawing
 *    op (DA-34 non-drawing equivalence is DATA, not convention),
 *  - `@sus/studio-bridge` buildAnnotation / normalizePoint / serializeSession /
 *    deserializeSession / undoLastAnnotation.
 *
 * This module adds only what the overlay itself needs: a DOM-free session
 * store with ONE mutation entrypoint (`apply` — pointer, keyboard and
 * automation paths share it structurally), bounded undo/redo, id allocation,
 * and result-objects instead of exceptions (the substrate throws; the UI
 * layer converts failures to `{ ok: false, reasons }` fail-closed results).
 *
 * This package deliberately does NOT re-declare geometry, validation,
 * envelopes or undo semantics — consuming the landed contract verbatim is the
 * point (D33 split delivery; a second copy would fork the schema).
 */

import {
  buildAnnotation,
  deserializeSession,
  serializeSession,
  undoLastAnnotation,
} from '@sus/studio-bridge';
import type { AnnotationData, AnnotationSessionData } from '@sus/schemas';

/** Store policy cap: an overlay session is minutes, not an archive. */
export const MAX_ANNOTATIONS_PER_SESSION = 500;
/** Bounded history depth (undo snapshots). */
export const MAX_HISTORY_DEPTH = 100;

export type AnnotationKind = 'rectangle' | 'pen' | 'arrow';
export type InstructionSource = 'pointer' | 'keyboard' | 'instruction';

/** Capture params in VIEWPORT PIXELS; the substrate normalizes to 0..1. */
export interface AddInstruction {
  op: 'add';
  kind: AnnotationKind;
  pixels: Array<{ x: number; y: number }>;
  /** Semantic label — what this marking MEANS (schema requires 1..200). */
  label: string;
  /** DA-34: the typed instruction that draws the identical marking. */
  typedEquivalent: string;
  /** DA-34: the keyboard path that creates it. */
  keyboardPath: string;
  /** Capture timestamp (ISO-8601); defaults to wall clock when omitted. */
  at?: string;
  /** Who drew it — recorded on the annotation, never used for behavior. */
  source?: InstructionSource;
}

export type MutationInstruction =
  | AddInstruction
  | { op: 'remove'; id: string; source?: InstructionSource }
  | { op: 'undo'; source?: InstructionSource }
  | { op: 'redo'; source?: InstructionSource };

export type StoreResult =
  { ok: true; session: AnnotationSessionData } | { ok: false; reasons: string[] };

interface UndoFrame {
  /** Content-frozen annotation list; ids are never re-allocated by undo. */
  annotations: AnnotationData[];
}

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
 * DOM-free session store over the landed annotation contract. The ONLY
 * mutation entrypoint is `apply`; pointer/keyboard/instruction inputs are the
 * same instruction type, so no drawing op exists that a non-drawing path
 * cannot express — and the annotation record itself must carry the typed
 * equivalent and keyboard path to be valid at all (DA-34, schema-enforced).
 */
export class AnnotationSessionStore {
  private session: AnnotationSessionData;
  private nextId = 1;
  private undoStack: UndoFrame[] = [];
  private redoStack: UndoFrame[] = [];
  private readonly author: string;

  constructor(params: {
    pageUrl: string;
    viewport: { width: number; height: number };
    author?: string;
  }) {
    const { pageUrl, viewport } = params;
    if (!Number.isInteger(viewport.width) || viewport.width <= 0) {
      throw new TypeError(`viewport.width: expected positive integer, got ${viewport.width}`);
    }
    if (!Number.isInteger(viewport.height) || viewport.height <= 0) {
      throw new TypeError(`viewport.height: expected positive integer, got ${viewport.height}`);
    }
    this.session = {
      pageUrl,
      viewport: { width: viewport.width, height: viewport.height },
      annotations: [],
    };
    this.author = params.author ?? 'studio-web';
  }

  apply(instruction: MutationInstruction): StoreResult {
    switch (instruction.op) {
      case 'add':
        return this.add(instruction);
      case 'remove':
        return this.remove(instruction.id);
      case 'undo':
        return this.undo();
      case 'redo':
        return this.redo();
    }
  }

  private add(instruction: AddInstruction): StoreResult {
    if (this.session.annotations.length >= MAX_ANNOTATIONS_PER_SESSION) {
      return {
        ok: false,
        reasons: [`session annotation cap reached (${MAX_ANNOTATIONS_PER_SESSION})`],
      };
    }
    let annotation: AnnotationData;
    try {
      // Substrate owns normalization + schema validation; failures are
      // converted to result objects here (UI layer stays exception-free).
      annotation = buildAnnotation({
        id: `a-${this.nextId}`,
        kind: instruction.kind,
        pixels: instruction.pixels,
        viewport: this.session.viewport,
        label: instruction.label,
        typedEquivalent: instruction.typedEquivalent,
        keyboardPath: instruction.keyboardPath,
        pageUrl: this.session.pageUrl,
        author: this.author,
        ...(instruction.at !== undefined ? { at: instruction.at } : {}),
      });
    } catch (error) {
      return { ok: false, reasons: [error instanceof Error ? error.message : String(error)] };
    }
    this.pushUndo();
    this.session.annotations.push(annotation);
    this.nextId += 1;
    return { ok: true, session: this.document() };
  }

  private remove(id: string): StoreResult {
    const index = this.session.annotations.findIndex((a) => a.id === id);
    if (index === -1) {
      return { ok: false, reasons: [`remove: no annotation with id ${id}`] };
    }
    this.pushUndo();
    this.session.annotations.splice(index, 1);
    return { ok: true, session: this.document() };
  }

  private undo(): StoreResult {
    const frame = this.undoStack.pop();
    if (!frame) return { ok: false, reasons: ['undo: nothing to undo'] };
    this.redoStack.push({ annotations: this.snapshot() });
    this.session.annotations = frame.annotations;
    return { ok: true, session: this.document() };
  }

  private redo(): StoreResult {
    const frame = this.redoStack.pop();
    if (!frame) return { ok: false, reasons: ['redo: nothing to redo'] };
    this.undoStack.push({ annotations: this.snapshot() });
    this.session.annotations = frame.annotations;
    return { ok: true, session: this.document() };
  }

  /** A new mutation truncates the redo branch (standard editor semantics). */
  private pushUndo(): void {
    this.undoStack.push({ annotations: this.snapshot() });
    this.redoStack = [];
    if (this.undoStack.length > MAX_HISTORY_DEPTH) this.undoStack.shift();
  }

  private snapshot(): AnnotationData[] {
    return structuredClone(this.session.annotations);
  }

  /** Deep-frozen copy — callers cannot corrupt store state via the result. */
  document(): AnnotationSessionData {
    return deepFreeze(structuredClone(this.session));
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Canonical serialization: the substrate's schema-validated serializer. */
  serialize(): string {
    return serializeSession(this.document());
  }

  /**
   * Parses + validates a stored session through the substrate's strict
   * deserializer. Unknown shapes, duplicate ids and out-of-range normalized
   * coordinates fail closed with explicit reasons.
   */
  static parse(text: string): StoreResult {
    try {
      return { ok: true, session: deepFreeze(deserializeSession(text)) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { ok: false, reasons: [reason] };
    }
  }
}

/** Convenience re-export: substrate pure-list undo (safe on empty). */
export { undoLastAnnotation };
