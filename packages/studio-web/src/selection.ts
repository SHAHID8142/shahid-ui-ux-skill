/**
 * T0801 — multi-select + between-section insertion.
 *
 * Two ordering problems live here, and the task's stated risk ("ordering
 * ambiguity") is both of them:
 *
 * 1. `SelectionModel` — a multi-element selection whose iteration order is the
 *    SELECTION order, not set order. Spatial edits applied to a selection must
 *    be deterministic and reproducible, so the model never iterates a Set.
 * 2. `InsertionModel` — "insert between A and B" is only unambiguous when A
 *    and B are adjacent. When sections sit between them the request resolves
 *    to a *range* of candidate indexes, and the caller must confirm one
 *    explicitly (`rollback: explicit index confirmation` in TASKS.json).
 *    A confirmed index becomes an ORDERED CONSTRAINT SET (`after A` then
 *    `before B`) that can be re-derived — `indexFromConstraints` proves the
 *    set still means the slot we confirmed.
 *
 * Everything is DOM-free and fail-closed: an unknown id is refused rather
 * than ignored, and an ambiguous insertion never silently picks a slot.
 */

export interface SectionNode {
  id: string;
  /** Vertical position (px, or normalized 0..1) — MUST be strictly ascending. */
  top: number;
  height: number;
  /** Optional label for screen-reader and UI text. */
  title?: string;
}

export type InsertionRelation = 'before' | 'after';

export interface InsertionConstraint {
  relation: InsertionRelation;
  anchorId: string;
}

export interface InsertionMarker {
  /** Slot index: 0 = before every section, `sections.length` = after the last. */
  index: number;
  beforeId: string | null;
  afterId: string | null;
  label: string;
}

export interface InsertionPlan {
  index: number;
  /** Ordered: the slot is "after the previous section, before the next". */
  constraints: InsertionConstraint[];
  /** True when the caller explicitly confirmed this index. */
  confirmed: boolean;
}

export type InsertionResult =
  | { ok: true; plan: InsertionPlan; ambiguous: false }
  | {
      ok: true;
      plan: InsertionPlan;
      ambiguous: true;
      /** Indexes the request could mean; caller must confirm one. */
      candidates: number[];
    }
  | { ok: false; reasons: string[] };

/** Ordered constraint set → deterministic iteration in `SelectionModel`. */
export class SelectionModel {
  private readonly universe: string[];
  private selected: string[] = [];
  private anchor: string | null = null;

  constructor(universe: readonly string[]) {
    if (!Array.isArray(universe) || universe.length === 0) {
      throw new TypeError('SelectionModel: a non-empty universe is required');
    }
    if (new Set(universe).size !== universe.length) {
      throw new TypeError('SelectionModel: universe contains duplicate ids');
    }
    this.universe = [...universe];
  }

  /** Selected ids in selection order (stable for spatial edits). */
  ids(): string[] {
    return [...this.selected];
  }

  size(): number {
    return this.selected.length;
  }

  isEmpty(): boolean {
    return this.selected.length === 0;
  }

  has(id: string): boolean {
    return this.selected.includes(id);
  }

  /** Adds an id; unknown ids are refused (fail-closed, never ignored). */
  add(id: string): boolean {
    if (!this.known(id)) return false;
    if (!this.selected.includes(id)) this.selected.push(id);
    this.anchor = id;
    return true;
  }

  /** Adds many, reporting what was refused instead of failing silently. */
  addMany(ids: readonly string[]): { added: string[]; refused: string[] } {
    const added: string[] = [];
    const refused: string[] = [];
    for (const id of ids) {
      if (this.add(id)) added.push(id);
      else refused.push(id);
    }
    return { added, refused };
  }

  remove(id: string): boolean {
    const at = this.selected.indexOf(id);
    if (at === -1) return false;
    this.selected.splice(at, 1);
    if (this.anchor === id) this.anchor = this.selected[this.selected.length - 1] ?? null;
    return true;
  }

  toggle(id: string): boolean {
    if (!this.known(id)) return false;
    if (this.selected.includes(id)) return this.remove(id);
    return this.add(id);
  }

  /**
   * Shift-range from the anchor to `id`, replacing the selection. The anchor
   * is deliberately NOT moved: repeated Shift-clicks keep growing the range
   * from the point where the selection started, which is the behaviour users
   * expect from list and file views.
   */
  rangeTo(id: string): boolean {
    if (!this.known(id)) return false;
    if (this.anchor === null) this.anchor = id;
    const from = this.universe.indexOf(this.anchor);
    const to = this.universe.indexOf(id);
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    this.selected = this.universe.slice(lo, hi + 1);
    return true;
  }

  selectAll(): string[] {
    this.selected = [...this.universe];
    this.anchor = this.universe[this.universe.length - 1] ?? null;
    return this.ids();
  }

  clear(): void {
    this.selected = [];
    this.anchor = null;
  }

  private known(id: string): boolean {
    return this.universe.includes(id);
  }
}

export class InsertionModel {
  private readonly sections: SectionNode[];

  constructor(sections: readonly SectionNode[]) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new TypeError('InsertionModel: at least one section is required');
    }
    const ids = new Set<string>();
    let previousTop = Number.NEGATIVE_INFINITY;
    for (const section of sections) {
      if (ids.has(section.id)) {
        throw new TypeError(`InsertionModel: duplicate section id ${section.id}`);
      }
      if (!Number.isFinite(section.top) || !Number.isFinite(section.height) || section.height < 0) {
        throw new TypeError(`InsertionModel: invalid geometry for ${section.id}`);
      }
      if (section.top <= previousTop) {
        // Equal/descending tops make "between" ambiguous at the source: the
        // document order itself is not trustworthy.
        throw new TypeError(
          `InsertionModel: sections must have strictly ascending top (${section.id} at ${section.top})`,
        );
      }
      ids.add(section.id);
      previousTop = section.top;
    }
    this.sections = sections.map((s) => ({ ...s }));
  }

  list(): SectionNode[] {
    return this.sections.map((s) => ({ ...s }));
  }

  /** Every gap, in document order (n + 1 markers). */
  markers(): InsertionMarker[] {
    const out: InsertionMarker[] = [];
    for (let index = 0; index <= this.sections.length; index += 1) {
      out.push(this.markerAt(index));
    }
    return out;
  }

  /** Nearest gap to a vertical position (pointer hover / keyboard up-down). */
  markerNear(y: number): InsertionMarker | null {
    if (!Number.isFinite(y)) return null;
    let best: InsertionMarker | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const marker of this.markers()) {
      const gapY = this.gapY(marker.index);
      const distance = Math.abs(gapY - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = marker;
      }
    }
    return best;
  }

  /** Resolves an explicit index. The plan is unconfirmed until `confirm`. */
  resolve(index: number): InsertionResult {
    if (!Number.isInteger(index) || index < 0 || index > this.sections.length) {
      return {
        ok: false,
        reasons: [`resolve: index ${index} outside 0..${this.sections.length}`],
      };
    }
    return { ok: true, plan: this.planFor(index, false), ambiguous: false };
  }

  /**
   * "Insert between A and B". Adjacent sections are unambiguous; anything
   * else produces candidates and requires an explicit index confirmation.
   */
  resolveBetween(aId: string, bId: string): InsertionResult {
    const a = this.indexOf(aId);
    const b = this.indexOf(bId);
    if (a === -1) return { ok: false, reasons: [`resolveBetween: unknown section ${aId}`] };
    if (b === -1) return { ok: false, reasons: [`resolveBetween: unknown section ${bId}`] };
    if (a === b) {
      return { ok: false, reasons: ['resolveBetween: A and B are the same section'] };
    }
    if (b === a + 1) {
      return { ok: true, plan: this.planFor(b, false), ambiguous: false };
    }
    // Sections lie between them (or B precedes A): the slot is a choice.
    const [lo, hi] = a < b ? [a + 1, b] : [b, a];
    const candidates: number[] = [];
    for (let index = lo; index <= hi; index += 1) candidates.push(index);
    const suggested = b;
    return {
      ok: true,
      plan: this.planFor(suggested, false),
      ambiguous: true,
      candidates,
    };
  }

  /**
   * Explicit index confirmation (TASKS.json rollback: "explicit index
   * confirmation"). A confirmed plan is what the caller may apply.
   */
  confirm(plan: InsertionPlan, index: number): InsertionResult {
    if (!Number.isInteger(index) || index < 0 || index > this.sections.length) {
      return { ok: false, reasons: [`confirm: index ${index} outside 0..${this.sections.length}`] };
    }
    if (plan.index !== index) {
      // Confirming a different slot than the one proposed is a deliberate
      // change, but it must be re-derived, not silently accepted.
      return {
        ok: false,
        reasons: [`confirm: plan proposes index ${plan.index}, confirmation said ${index}`],
      };
    }
    const rederived = indexFromConstraints(this.sections, plan.constraints);
    if (rederived.ok && rederived.index !== index) {
      return {
        ok: false,
        reasons: [`confirm: constraints mean index ${rederived.index}, not ${index}`],
      };
    }
    return { ok: true, plan: this.planFor(index, true), ambiguous: false };
  }

  /** Ordered, satisfiable constraint set for a slot. */
  private planFor(index: number, confirmed: boolean): InsertionPlan {
    const constraints: InsertionConstraint[] = [];
    const previous = this.sections[index - 1];
    const next = this.sections[index];
    if (previous) constraints.push({ relation: 'after', anchorId: previous.id });
    if (next) constraints.push({ relation: 'before', anchorId: next.id });
    return { index, constraints, confirmed };
  }

  private markerAt(index: number): InsertionMarker {
    const before = this.sections[index] ?? null;
    const after = this.sections[index - 1] ?? null;
    const label =
      index === 0
        ? `Insert before ${before?.title ?? before?.id ?? 'first section'}`
        : index === this.sections.length
          ? `Insert after ${after?.title ?? after?.id ?? 'last section'}`
          : `Insert between ${after?.title ?? after?.id} and ${before?.title ?? before?.id}`;
    return { index, beforeId: before?.id ?? null, afterId: after?.id ?? null, label };
  }

  private gapY(index: number): number {
    const previous = this.sections[index - 1];
    const next = this.sections[index];
    if (previous && next) return (previous.top + previous.height + next.top) / 2;
    if (next) return next.top;
    if (previous) return previous.top + previous.height;
    return 0;
  }

  private indexOf(id: string): number {
    return this.sections.findIndex((s) => s.id === id);
  }
}

/**
 * Re-derives an index from an ordered constraint set. This is the invariant
 * that keeps a confirmed plan honest: if the section list changes under a
 * pending plan, the constraints stop meaning the same slot and the caller
 * must re-resolve rather than apply at a stale index.
 */
export function indexFromConstraints(
  sections: readonly SectionNode[],
  constraints: readonly InsertionConstraint[],
): { ok: true; index: number } | { ok: false; reasons: string[] } {
  const ids = sections.map((s) => s.id);
  let beforeId: string | null = null;
  let afterId: string | null = null;
  for (const constraint of constraints) {
    if (!ids.includes(constraint.anchorId)) {
      return { ok: false, reasons: [`unknown anchor ${constraint.anchorId}`] };
    }
    if (constraint.relation === 'before') {
      if (beforeId !== null) return { ok: false, reasons: ['multiple "before" constraints'] };
      beforeId = constraint.anchorId;
    } else if (constraint.relation === 'after') {
      if (afterId !== null) return { ok: false, reasons: ['multiple "after" constraints'] };
      afterId = constraint.anchorId;
    } else {
      return { ok: false, reasons: [`unknown relation ${String(constraint.relation)}`] };
    }
  }
  if (beforeId === null && afterId === null) {
    return { ok: false, reasons: ['empty constraint set does not identify a slot'] };
  }
  const beforeIndex = beforeId === null ? ids.length : ids.indexOf(beforeId);
  const afterIndex = afterId === null ? -1 : ids.indexOf(afterId);
  if (afterIndex + 1 !== beforeIndex) {
    return {
      ok: false,
      reasons: [
        `constraints are not adjacent: "${afterId ?? 'start'}" followed by "${beforeId ?? 'end'}"`,
      ],
    };
  }
  return { ok: true, index: beforeIndex };
}

// ---------------------------------------------------------------------------
// Multi-element spatial edit (atomic, clamped, all-or-nothing)
// ---------------------------------------------------------------------------

export interface SelectableGeometry {
  id: string;
  points: ReadonlyArray<{ x: number; y: number }>;
}

export interface SpatialMove {
  id: string;
  points: Array<{ x: number; y: number }>;
}

export type SpatialEditResult =
  | { ok: true; delta: { dx: number; dy: number }; moves: SpatialMove[] }
  | { ok: false; reasons: string[] };

/**
 * Translates every selected element by the same delta. All-or-nothing: if any
 * point would leave the viewport, nothing moves. Partial application is how
 * multi-select edits corrupt geometry.
 */
export function computeSpatialEdit(
  selected: readonly SelectableGeometry[],
  delta: { dx: number; dy: number },
  viewport: { width: number; height: number },
): SpatialEditResult {
  if (selected.length === 0) {
    return { ok: false, reasons: ['spatial edit: nothing selected'] };
  }
  if (!Number.isFinite(delta.dx) || !Number.isFinite(delta.dy)) {
    return { ok: false, reasons: ['spatial edit: delta must be finite'] };
  }
  const offending: string[] = [];
  const moves: SpatialMove[] = [];
  for (const element of selected) {
    const points = element.points.map((p) => ({ x: p.x + delta.dx, y: p.y + delta.dy }));
    const outside = points.some(
      (p) => p.x < 0 || p.y < 0 || p.x > viewport.width || p.y > viewport.height,
    );
    if (outside) {
      offending.push(element.id);
      continue;
    }
    moves.push({ id: element.id, points });
  }
  if (offending.length > 0) {
    return {
      ok: false,
      reasons: [
        `spatial edit would leave the viewport for ${offending.length} element(s): ${offending.join(', ')}`,
      ],
    };
  }
  return { ok: true, delta: { ...delta }, moves };
}
