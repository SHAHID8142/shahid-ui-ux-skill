/**
 * T0807 — keyboard drawing path (F13, DA-34).
 *
 * Every drawing the overlay supports must be achievable WITHOUT a pointer,
 * and the keyboard path must produce the SAME instruction shape as the
 * pointer path — not a parallel, weaker one. This controller is that path:
 * it accumulates viewport-pixel geometry from key presses and, on
 * completion, emits the identical `AddInstruction` the pointer path emits
 * (carrying `keyboardPath` + `typedEquivalent`, which the landed
 * `@sus/schemas` annotation record requires per drawing op).
 *
 * It is DOM-free: the overlay shell forwards key events and renders the
 * snapshot's `announcement` into a polite live region. Every state transition
 * produces an announcement, because a drawing tool a screen-reader user
 * cannot follow is not a keyboard path — it is a keyboard-shaped dead end.
 */

import type { AddInstruction, AnnotationKind } from './annotations.js';

export type KeyboardDrawingKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Enter'
  | 'Escape'
  | 'Backspace'
  | 'Space'
  | 'Tab';

export interface Viewport {
  width: number;
  height: number;
}

export interface KeyboardDrawingOptions {
  viewport: Viewport;
  /** Semantic label for the annotation being drawn (required, 1..200). */
  label: string;
  /** Fine movement step in px (arrow key). Default 10. */
  step?: number;
  /** Coarse movement step in px (shift+arrow). Default 50. */
  coarseStep?: number;
  /** Starting cursor position in px. Default: viewport centre. */
  start?: { x: number; y: number };
  /** Wall clock for the emitted instruction (tests pin it). */
  at?: string;
}

export type DrawingState = 'idle' | 'placing';

export interface KeyboardDrawingSnapshot {
  kind: AnnotationKind | null;
  state: DrawingState;
  /** Points placed so far (viewport px). */
  points: Array<{ x: number; y: number }>;
  cursor: { x: number; y: number };
  /** Canonical, human-readable keyboard path accumulated so far. */
  path: string[];
  /** Polite live-region text describing this step. */
  announcement: string;
}

export type KeyboardDrawingResult =
  | {
      ok: true;
      done: false;
      aborted?: boolean;
      snapshot: KeyboardDrawingSnapshot;
    }
  | {
      ok: true;
      done: true;
      instruction: AddInstruction;
      snapshot: KeyboardDrawingSnapshot;
    }
  | { ok: false; reasons: string[]; snapshot: KeyboardDrawingSnapshot };

const DEFAULT_STEP = 10;
const DEFAULT_COARSE_STEP = 50;
/** Pen strokes need at least three points (mirrors the landed schema rule). */
const MIN_PEN_POINTS = 3;
/** Rectangle/arrow: exactly two points (mirrors the landed schema rule). */
const REQUIRED_POINTS: Record<'rectangle' | 'arrow', number> = {
  rectangle: 2,
  arrow: 2,
};

export class KeyboardDrawingController {
  private readonly viewport: Viewport;
  private readonly label: string;
  private readonly step: number;
  private readonly coarseStep: number;
  private readonly at?: string;

  private kind: AnnotationKind | null = null;
  private points: Array<{ x: number; y: number }> = [];
  private cursor: { x: number; y: number };
  private path: string[] = [];
  private announcement = 'Drawing canvas: press Enter to begin a rectangle.';

  constructor(options: KeyboardDrawingOptions) {
    const { viewport } = options;
    if (
      !Number.isFinite(viewport.width) ||
      !Number.isFinite(viewport.height) ||
      viewport.width <= 0 ||
      viewport.height <= 0
    ) {
      throw new TypeError('KeyboardDrawingController: viewport must be positive and finite');
    }
    if (typeof options.label !== 'string' || options.label.trim().length === 0) {
      throw new TypeError('KeyboardDrawingController: a non-empty label is required');
    }
    this.viewport = { width: viewport.width, height: viewport.height };
    this.label = options.label.trim();
    this.step = positiveOr(options.step, DEFAULT_STEP);
    this.coarseStep = positiveOr(options.coarseStep, DEFAULT_COARSE_STEP);
    this.at = options.at;
    this.cursor = options.start
      ? this.clamp(options.start)
      : {
          x: Math.round(viewport.width / 2),
          y: Math.round(viewport.height / 2),
        };
  }

  snapshot(): KeyboardDrawingSnapshot {
    return {
      kind: this.kind,
      state: this.kind ? 'placing' : 'idle',
      points: this.points.map((p) => ({ ...p })),
      cursor: { ...this.cursor },
      path: [...this.path],
      announcement: this.announcement,
    };
  }

  /** Begins a drawing of `kind` (Enter on the canvas toolbar). */
  start(kind: AnnotationKind): KeyboardDrawingResult {
    this.kind = kind;
    this.points = [];
    this.path = [`Enter(${kind})`];
    this.announcement =
      kind === 'pen'
        ? 'Pen started. Arrow keys move the cursor; Enter adds a point; Backspace removes the last point; Space finishes the stroke (three points minimum); Escape cancels.'
        : `${capitalize(kind)} started. Arrow keys move the cursor; Enter places a corner; Escape cancels.`;
    return { ok: true, done: false, snapshot: this.snapshot() };
  }

  /**
   * Handles one key. Shift makes arrow movement coarse (matches the pointer
   * concept of a larger drag without inventing a second gesture).
   */
  press(key: KeyboardDrawingKey, options: { shift?: boolean } = {}): KeyboardDrawingResult {
    if (this.kind === null) {
      if (key === 'Enter') {
        return this.start('rectangle');
      }
      return {
        ok: false,
        reasons: [`press: no drawing in progress (got ${key})`],
        snapshot: this.snapshot(),
      };
    }
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        return this.move(key, options.shift === true);
      case 'Enter':
        return this.place();
      case 'Backspace':
        return this.removeLastPoint();
      case 'Space':
        return this.finishBySpace();
      case 'Escape':
        return this.abort();
      case 'Tab':
        return this.abortBecauseFocusLeft();
      default:
        return {
          ok: false,
          reasons: [`press: unsupported key ${String(key)}`],
          snapshot: this.snapshot(),
        };
    }
  }

  private move(
    key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
    coarse: boolean,
  ): KeyboardDrawingResult {
    const delta = coarse ? this.coarseStep : this.step;
    const next = { ...this.cursor };
    if (key === 'ArrowUp') next.y -= delta;
    if (key === 'ArrowDown') next.y += delta;
    if (key === 'ArrowLeft') next.x -= delta;
    if (key === 'ArrowRight') next.x += delta;
    const clamped = this.clamp(next);
    this.cursor = clamped;
    this.path.push(`${key}${coarse ? '(shift)' : ''}`);
    this.announcement = `${capitalize(this.kind ?? 'drawing')} cursor at ${clamped.x},${clamped.y}. Press Enter to place a point.`;
    return { ok: true, done: false, snapshot: this.snapshot() };
  }

  private place(): KeyboardDrawingResult {
    const kind = this.kind;
    if (kind === null) {
      return { ok: false, reasons: ['place: no drawing in progress'], snapshot: this.snapshot() };
    }
    if (kind === 'pen') {
      // Enter always adds a vertex: a stroke must be able to keep growing.
      // Space finishes it (>= MIN_PEN_POINTS) — announced at start.
      this.points.push({ ...this.cursor });
      this.path.push('Enter(vertex)');
      const remaining = MIN_PEN_POINTS - this.points.length;
      this.announcement = `Pen point ${this.points.length} at ${this.cursor.x},${this.cursor.y}. ${
        remaining > 0
          ? `Add at least ${remaining} more point(s), then press Space to finish.`
          : 'Press Space to finish, or keep adding points.'
      }`;
      return { ok: true, done: false, snapshot: this.snapshot() };
    }

    const required = REQUIRED_POINTS[kind];
    if (this.points.length + 1 < required) {
      this.points.push({ ...this.cursor });
      this.path.push('Enter(corner)');
      this.announcement = `${capitalize(kind)} corner ${this.points.length} at ${this.cursor.x},${this.cursor.y}. Move to the opposite corner and press Enter.`;
      return { ok: true, done: false, snapshot: this.snapshot() };
    }
    const first = this.points[0];
    if (first && first.x === this.cursor.x && first.y === this.cursor.y) {
      return {
        ok: false,
        reasons: [`place: ${kind} needs two distinct corners`],
        snapshot: this.snapshot(),
      };
    }
    this.points.push({ ...this.cursor });
    this.path.push('Enter(complete)');
    return this.finish();
  }

  private removeLastPoint(): KeyboardDrawingResult {
    if (this.points.length === 0) {
      return { ok: false, reasons: ['backspace: no point to remove'], snapshot: this.snapshot() };
    }
    this.points.pop();
    this.path.push('Backspace(remove point)');
    this.announcement = `Removed last point. ${this.points.length} point(s) remain.`;
    return { ok: true, done: false, snapshot: this.snapshot() };
  }

  private abort(): KeyboardDrawingResult {
    const kind = this.kind;
    this.kind = null;
    this.points = [];
    this.path = kind ? [...this.path, 'Escape(cancel)'] : [];
    this.announcement = `Drawing cancelled. ${this.path.join(' → ')}`;
    return { ok: true, done: false, aborted: true, snapshot: this.snapshot() };
  }

  private abortBecauseFocusLeft(): KeyboardDrawingResult {
    this.abort();
    this.announcement = `Focus left the canvas; drawing cancelled.`;
    return { ok: true, done: false, aborted: true, snapshot: this.snapshot() };
  }

  /** Space finishes the current stroke when it has enough points. */
  private finishBySpace(): KeyboardDrawingResult {
    const kind = this.kind;
    if (kind === null) {
      return { ok: false, reasons: ['space: no drawing in progress'], snapshot: this.snapshot() };
    }
    const minimum = kind === 'pen' ? MIN_PEN_POINTS : REQUIRED_POINTS[kind];
    if (this.points.length < minimum) {
      return {
        ok: false,
        reasons: [
          `space: ${kind} needs at least ${minimum} point(s) to finish (has ${this.points.length})`,
        ],
        snapshot: this.snapshot(),
      };
    }
    this.path.push('Space(finish)');
    return this.finish();
  }

  private finish(): KeyboardDrawingResult {
    const kind = this.kind;
    if (kind === null) {
      return { ok: false, reasons: ['finish: no drawing in progress'], snapshot: this.snapshot() };
    }
    const points = this.points.map((p) => ({ ...p }));
    this.kind = null;
    this.points = [];
    const keyboardPath = [...this.path, 'Enter(finish)'].join(' → ');
    this.path = [];
    this.announcement = `${capitalize(kind)} completed with ${points.length} point(s).`;
    const instruction: AddInstruction = {
      op: 'add',
      kind,
      pixels: points,
      label: this.label,
      typedEquivalent: typedEquivalent(kind, points, this.label),
      keyboardPath,
      ...(this.at ? { at: this.at } : {}),
      source: 'keyboard',
    };
    return { ok: true, done: true, instruction, snapshot: this.snapshot() };
  }

  private clamp(point: { x: number; y: number }): { x: number; y: number } {
    const width = this.viewport.width;
    const height = this.viewport.height;
    return {
      x: Math.min(Math.max(point.x, 0), width),
      y: Math.min(Math.max(point.y, 0), height),
    };
  }
}

/**
 * Canonical textual form of a drawing (DA-34: the typed equivalent). This is
 * the same instruction grammar the overlay displays, so a user who prefers
 * typing can produce byte-identical annotations.
 */
export function typedEquivalent(
  kind: AnnotationKind,
  pixels: ReadonlyArray<{ x: number; y: number }>,
  label: string,
): string {
  const points = pixels.map((p) => `${p.x},${p.y}`).join(' ');
  return `sus-annotate ${kind} ${points} "${label}"`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function positiveOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
