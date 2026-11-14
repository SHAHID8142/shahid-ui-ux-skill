/**
 * T0807 — Studio accessibility (F13): focus management, the screen-reader
 * annotation list, and the G7/G8/G9 gate verdicts.
 *
 * Three things live here, and each has a rule that is easy to get wrong:
 *
 * 1. FOCUS (`OverlayFocusManager`) — the overlay is a trap while open and
 *    must give focus back to where it came from. A trap that forgets to
 *    restore strands keyboard users on `<body>`.
 * 2. THE LIST (`AnnotationListModel`) — a screen-reader user gets an ordered
 *    list with names, semantic geometry, and the keyboard path that
 *    re-creates each annotation, plus a polite live region for changes.
 *    Annotations are not "shapes on a canvas" to AT; they are a list.
 * 3. THE VERDICTS (`emitG7Reflow`, `emitG8TargetSize`, `emitG9Semantics`) —
 *    verdicts follow `docs/GATE_REGISTRY.md`: pass / fail / not-run /
 *    not-applicable. Missing evidence is **not-run**, never pass. A WCAG
 *    exception (data table scrolling in 2-D, spacing-based target size,
 *    inline links, essential controls) yields **not-applicable with the
 *    recorded reason** (kilo H4), never a silent pass and never a fail.
 *    Project conventions ("exactly one h1", 45–75 CPL, a stricter 44px
 *    target minimum) are recorded as advisory detail — they are policy with
 *    conditions, not definitions of WCAG compliance (F16, F20).
 */

/** Registry verdict `check_verdict` (docs/GATE_REGISTRY.md). */
export type GateStatus = 'pass' | 'fail' | 'not-run' | 'not-applicable';

export interface StudioGateVerdict {
  gate: 'G7' | 'G8' | 'G9';
  status: GateStatus;
  detail: string[];
  /** Required when status is `not-applicable` (kilo H4: recorded reason). */
  notApplicableReason?: string;
}

// ---------------------------------------------------------------------------
// G7 — Reflow (WCAG 1.4.10, with the standard's exceptions; F17 anti-cheat)
// ---------------------------------------------------------------------------

export type ReflowException =
  'data-table' | 'map' | 'game' | 'presentation' | 'toolbar' | 'essential-2d';

export interface ReflowMeasurement {
  url: string;
  /** 320 CSS-px-equivalent viewport width being tested. */
  viewportWidth: number;
  /** Document scrollWidth at that width. */
  scrollWidth: number;
  /** F17: `overflow: hidden` used to hide the problem instead of fixing it. */
  hidesOverflow: boolean;
  /** WCAG 1.4.10 exception covering 2-D scrolling for this content. */
  exception?: ReflowException;
  /** Content still available at 400% zoom (no clipping). */
  zoom400Available: boolean;
}

export function emitG7Reflow(measurements: readonly ReflowMeasurement[]): StudioGateVerdict {
  const detail: string[] = [];
  if (measurements.length === 0) {
    return {
      gate: 'G7',
      status: 'not-run',
      detail: ['no reflow measurements recorded — G7 is not-run without evidence'],
    };
  }
  const failing: string[] = [];
  const exceptions: string[] = [];
  for (const m of measurements) {
    const label = `${m.url} @${m.viewportWidth}px`;
    if (!Number.isFinite(m.viewportWidth) || m.viewportWidth <= 0) {
      failing.push(`${m.url}: invalid viewport width — invalid evidence`);
      continue;
    }
    if (m.hidesOverflow) {
      // F17: clipping overflow to look reflowed is a failure, not a pass.
      failing.push(`${label}: overflow is hidden to conceal horizontal scroll (F17)`);
      continue;
    }
    if (m.exception) {
      exceptions.push(`${label}: WCAG 1.4.10 exception "${m.exception}" permits 2-D scrolling`);
      continue;
    }
    if (m.scrollWidth > m.viewportWidth) {
      failing.push(
        `${label}: content scrolls horizontally (scrollWidth ${m.scrollWidth} > ${m.viewportWidth})`,
      );
    }
    if (!m.zoom400Available) {
      failing.push(`${label}: content is not available at 400% zoom`);
    }
    if (m.scrollWidth <= m.viewportWidth && m.zoom400Available) {
      detail.push(`${label}: reflows without 2-D scroll; available at 400% zoom`);
    }
  }
  if (failing.length > 0) {
    return { gate: 'G7', status: 'fail', detail: [...failing, ...detail] };
  }
  if (exceptions.length > 0 && detail.length === 0) {
    return {
      gate: 'G7',
      status: 'not-applicable',
      detail: exceptions,
      notApplicableReason: exceptions.join('; '),
    };
  }
  return { gate: 'G7', status: 'pass', detail: [...detail, ...exceptions] };
}

// ---------------------------------------------------------------------------
// G8 — Target size (WCAG 2.2 SC 2.5.8, with its exceptions; F16 policy note)
// ---------------------------------------------------------------------------

export type TargetSizeException =
  'spacing' | 'equivalent-control' | 'inline' | 'user-agent' | 'essential';

export interface TargetMeasurement {
  selector: string;
  width: number;
  height: number;
  exception?: TargetSizeException;
}

/** WCAG 2.2 SC 2.5.8 minimum, in CSS px. */
export const MIN_TARGET_CSS_PX = 24;

/**
 * Project policy minimum (touch comfort). Recorded, never used as the gate
 * criterion: a stricter project minimum is policy, not the standard (F16).
 */
export const PROJECT_TARGET_CSS_PX = 44;

export function emitG8TargetSize(targets: readonly TargetMeasurement[]): StudioGateVerdict {
  if (targets.length === 0) {
    return {
      gate: 'G8',
      status: 'not-run',
      detail: ['no target measurements recorded — G8 is not-run without evidence'],
    };
  }
  const failing: string[] = [];
  const explained: string[] = [];
  const advisory: string[] = [];
  for (const t of targets) {
    if (!Number.isFinite(t.width) || !Number.isFinite(t.height) || t.width < 0 || t.height < 0) {
      failing.push(`${t.selector}: invalid dimensions — invalid evidence`);
      continue;
    }
    const under = t.width < MIN_TARGET_CSS_PX || t.height < MIN_TARGET_CSS_PX;
    if (under && !t.exception) {
      failing.push(
        `${t.selector}: ${t.width}×${t.height} below ${MIN_TARGET_CSS_PX}×${MIN_TARGET_CSS_PX}`,
      );
      continue;
    }
    if (under && t.exception) {
      explained.push(`${t.selector}: ${t.width}×${t.height} — SC 2.5.8 exception "${t.exception}"`);
      continue;
    }
    if (t.width < PROJECT_TARGET_CSS_PX || t.height < PROJECT_TARGET_CSS_PX) {
      advisory.push(
        `${t.selector}: ${t.width}×${t.height} meets WCAG 2.5.8 but is below the ${PROJECT_TARGET_CSS_PX}px project policy`,
      );
    }
  }
  if (failing.length > 0) {
    return { gate: 'G8', status: 'fail', detail: [...failing, ...explained, ...advisory] };
  }
  if (explained.length > 0 && advisory.length === 0 && failing.length === 0) {
    return {
      gate: 'G8',
      status: 'not-applicable',
      detail: [...explained, ...advisory],
      notApplicableReason: explained.join('; '),
    };
  }
  return { gate: 'G8', status: 'pass', detail: [...explained, ...advisory] };
}

// ---------------------------------------------------------------------------
// G9 — Semantics (headings, landmarks, focus-visible, no click-only controls)
// ---------------------------------------------------------------------------

export interface SemanticsCheck {
  url: string;
  /** Heading levels in document order, e.g. ['h1','h2','h3']. */
  headings: string[];
  /** Landmarks present, e.g. ['main','nav','complementary']. */
  landmarks: string[];
  /** A visible keyboard focus indicator exists. */
  focusVisible: boolean;
  /** Controls reachable only by pointer/click. */
  clickOnlyControls: number;
  /** Characters per line (project convention, advisory only — F20). */
  charactersPerLine?: number;
}

const CPL_MIN = 45;
const CPL_MAX = 75;

export function emitG9Semantics(checks: readonly SemanticsCheck[]): StudioGateVerdict {
  if (checks.length === 0) {
    return {
      gate: 'G9',
      status: 'not-run',
      detail: ['no semantics checks recorded — G9 is not-run without evidence'],
    };
  }
  const failing: string[] = [];
  const advisory: string[] = [];
  for (const c of checks) {
    if (!Array.isArray(c.headings) || !Array.isArray(c.landmarks)) {
      failing.push(`${c.url}: malformed evidence (headings/landmarks not arrays)`);
      continue;
    }
    const h1Count = c.headings.filter((h) => h.toLowerCase() === 'h1').length;
    if (h1Count !== 1) {
      // Project convention with conditions (F20) — recorded, not a gate fail.
      advisory.push(`${c.url}: ${h1Count} h1 headings — project convention expects exactly 1`);
    }
    if (c.headings.some((h) => !/^h[1-6]$/i.test(h))) {
      advisory.push(`${c.url}: heading level outside h1–h6`);
    }
    if (!c.landmarks.some((l) => l.toLowerCase() === 'main')) {
      failing.push(`${c.url}: no main landmark`);
    }
    if (!c.focusVisible) {
      failing.push(`${c.url}: no visible keyboard focus indicator`);
    }
    if (c.clickOnlyControls > 0) {
      failing.push(`${c.url}: ${c.clickOnlyControls} click-only control(s) with no keyboard path`);
    }
    if (typeof c.charactersPerLine === 'number') {
      if (c.charactersPerLine < CPL_MIN || c.charactersPerLine > CPL_MAX) {
        advisory.push(
          `${c.url}: ${c.charactersPerLine} CPL outside the ${CPL_MIN}–${CPL_MAX} project convention`,
        );
      }
    }
  }
  if (failing.length > 0) {
    return { gate: 'G9', status: 'fail', detail: [...failing, ...advisory] };
  }
  return { gate: 'G9', status: 'pass', detail: [...advisory] };
}

// ---------------------------------------------------------------------------
// Screen-reader annotation list
// ---------------------------------------------------------------------------

export interface AnnotationListItem {
  id: string;
  /** 1-based position as announced ("2 of 5"). */
  position: number;
  /** Accessible name: kind + label. */
  name: string;
  /** Semantic description (normalized geometry, never raw pixels alone). */
  description: string;
  /** The keyboard path that re-creates this annotation (DA-34 honesty). */
  keyboardPath?: string;
}

export interface AnnotationListSource {
  id: string;
  kind: string;
  label: string;
  /** Normalized 0..1 points, as stored by the annotation contract. */
  points: ReadonlyArray<{ x: number; y: number }>;
  keyboardPath?: string;
}

/**
 * Ordered, screen-reader-facing model of the annotation session. The overlay
 * renders it as a real list (`role=list`, roving focus); AT users get
 * positions, semantic geometry and the keyboard path instead of a canvas.
 */
export class AnnotationListModel {
  private items: AnnotationListItem[] = [];
  private active: string | null = null;

  setAnnotations(annotations: readonly AnnotationListSource[]): AnnotationListItem[] {
    this.items = annotations.map((annotation, index) => ({
      id: annotation.id,
      position: index + 1,
      name: `${capitalize(annotation.kind)}: ${annotation.label}`,
      description: describeGeometry(annotation),
      ...(annotation.keyboardPath ? { keyboardPath: annotation.keyboardPath } : {}),
    }));
    if (this.active && !this.items.some((i) => i.id === this.active)) {
      this.active = null;
    }
    if (this.active === null && this.items.length > 0) {
      this.active = this.items[0]?.id ?? null;
    }
    return this.list();
  }

  list(): AnnotationListItem[] {
    return this.items.map((i) => ({ ...i }));
  }

  size(): number {
    return this.items.length;
  }

  activeId(): string | null {
    return this.active;
  }

  /** Roving focus: refuse to activate an id that is not in the list. */
  setActive(id: string): boolean {
    if (!this.items.some((i) => i.id === id)) return false;
    this.active = id;
    return true;
  }

  next(): AnnotationListItem | null {
    return this.step(1);
  }

  previous(): AnnotationListItem | null {
    return this.step(-1);
  }

  /** Summary for the list's accessible name: "5 annotations: 3 rectangle, 2 pen". */
  summary(): string {
    if (this.items.length === 0) return 'No annotations';
    const counts = new Map<string, number>();
    for (const item of this.items) {
      const kind = item.name.split(':')[0] ?? 'Annotation';
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    const parts = [...counts.entries()].map(([kind, n]) => `${n} ${kind.toLowerCase()}`).join(', ');
    return `${this.items.length} annotation${this.items.length === 1 ? '' : 's'}: ${parts}`;
  }

  /** Polite live-region text after an annotation is added. */
  announceAdded(item: AnnotationListItem): string {
    return `${item.name} added at position ${item.position} of ${this.items.length}. ${item.description}`;
  }

  /** Polite live-region text after an annotation is removed. */
  announceRemoved(item: AnnotationListItem): string {
    return `${item.name} removed. ${this.items.length} annotation${this.items.length === 1 ? '' : 's'} remain.`;
  }

  /** Assertive announcement for a refused action (suppression must be audible). */
  announceRefusal(reason: string): string {
    return `Action refused: ${reason}`;
  }

  private step(direction: 1 | -1): AnnotationListItem | null {
    if (this.items.length === 0) return null;
    const currentIndex = this.items.findIndex((i) => i.id === this.active);
    const base = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = (base + direction + this.items.length) % this.items.length;
    const item = this.items[nextIndex];
    if (!item) return null;
    this.active = item.id;
    return { ...item };
  }
}

// ---------------------------------------------------------------------------
// Focus management for the overlay (trap + restore)
// ---------------------------------------------------------------------------

export interface FocusTarget {
  id: string;
  label: string;
}

export type FocusKeyResult =
  { ok: true; focusId: string | null; closed?: boolean } | { ok: false; reasons: string[] };

export class OverlayFocusManager {
  private readonly targets: FocusTarget[];
  private index = 0;
  private returnFocus: string | null = null;
  private openState = false;

  constructor(targets: readonly FocusTarget[]) {
    if (targets.length === 0) {
      throw new TypeError('OverlayFocusManager: at least one focus target is required');
    }
    this.targets = targets.map((t) => ({ ...t }));
  }

  /** Opens the overlay and returns the element that must receive focus. */
  open(returnFocusId: string | null, initialId?: string): { focusId: string } {
    this.returnFocus = returnFocusId;
    this.openState = true;
    const initialIndex = initialId ? this.targets.findIndex((t) => t.id === initialId) : 0;
    this.index = initialIndex >= 0 ? initialIndex : 0;
    return { focusId: this.targets[this.index]!.id };
  }

  /** Closes the overlay and returns the id that must receive focus back. */
  close(): { restoreId: string | null } {
    this.openState = false;
    return { restoreId: this.returnFocus };
  }

  isOpen(): boolean {
    return this.openState;
  }

  focusedId(): string | null {
    return this.openState ? (this.targets[this.index]?.id ?? null) : null;
  }

  /** Tab / Shift+Tab cycle INSIDE the overlay; Escape closes and restores. */
  press(key: 'Tab' | 'Escape', options: { shift?: boolean } = {}): FocusKeyResult {
    if (!this.openState) {
      return { ok: false, reasons: ['focus: overlay is not open'] };
    }
    if (key === 'Escape') {
      const { restoreId } = this.close();
      return { ok: true, focusId: restoreId, closed: true };
    }
    const delta = options.shift ? -1 : 1;
    this.index = (this.index + delta + this.targets.length) % this.targets.length;
    return { ok: true, focusId: this.targets[this.index]!.id };
  }

  /** Direct focus move (clicking or programmatic) — unknown ids are refused. */
  focus(id: string): FocusKeyResult {
    if (!this.openState) {
      return { ok: false, reasons: ['focus: overlay is not open'] };
    }
    const nextIndex = this.targets.findIndex((t) => t.id === id);
    if (nextIndex === -1) {
      return { ok: false, reasons: [`focus: unknown focus target ${id}`] };
    }
    this.index = nextIndex;
    return { ok: true, focusId: id };
  }

  order(): string[] {
    return this.targets.map((t) => t.id);
  }
}

// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Semantic geometry description — percentages, never raw pixels alone. */
function describeGeometry(annotation: AnnotationListSource): string {
  const points = annotation.points;
  if (points.length === 0) return 'no points recorded';
  const first = points[0]!;
  const start = `${(first.x * 100).toFixed(0)}% across, ${(first.y * 100).toFixed(0)}% down`;
  if (points.length === 1) return `single point at ${start}`;
  const last = points[points.length - 1]!;
  const end = `${(last.x * 100).toFixed(0)}% across, ${(last.y * 100).toFixed(0)}% down`;
  return `${points.length} points from ${start} to ${end}`;
}
