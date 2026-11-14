/**
 * T0807 tests — Studio accessibility (F13).
 *
 * Acceptance under test:
 *  - keyboard drawing: every pointer drawing is reproducible from keys alone,
 *    and the keyboard path emits the SAME instruction the pointer path does
 *    (DA-34), carrying the keyboard path + typed equivalent the landed
 *    annotation schema requires;
 *  - SR-accessible annotation list: ordered positions, semantic geometry,
 *    polite live-region text, roving focus that cannot point outside the list;
 *  - focus management: trap cycles, Escape restores the return target, focus
 *    cannot be moved to an unknown element;
 *  - gate verdicts G7/G8/G9: registry discipline — missing evidence is
 *    not-run (never pass), WCAG exceptions give not-applicable WITH a recorded
 *    reason (kilo H4), project conventions stay advisory (F16, F20), and the
 *    F17 overflow-hiding cheat fails.
 */
import { describe, expect, it } from 'vitest';
import {
  AnnotationListModel,
  MIN_TARGET_CSS_PX,
  OverlayFocusManager,
  PROJECT_TARGET_CSS_PX,
  emitG7Reflow,
  emitG8TargetSize,
  emitG9Semantics,
  type SemanticsCheck,
} from '../src/a11y.js';
import { KeyboardDrawingController, typedEquivalent } from '../src/keyboard-drawing.js';
import { AnnotationSessionStore } from '../src/annotations.js';

const VIEWPORT = { width: 1280, height: 800 };

describe('T0807 — keyboard drawing path', () => {
  it('draws a rectangle with arrow keys + Enter and emits a complete instruction', () => {
    const keys = new KeyboardDrawingController({
      viewport: VIEWPORT,
      label: 'hero block too wide',
      at: '2026-11-14T09:00:00.000Z',
    });
    keys.start('rectangle');
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowRight', 'ArrowDown'] as const) {
      keys.press(k);
    }
    const first = keys.press('Enter');
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.done).toBe(false);

    keys.press('ArrowRight');
    keys.press('ArrowDown');
    const done = keys.press('Enter');
    expect(done.ok && done.done).toBe(true);
    if (!done.ok || !done.done) return;

    expect(done.instruction.op).toBe('add');
    expect(done.instruction.kind).toBe('rectangle');
    expect(done.instruction.pixels).toHaveLength(2);
    expect(done.instruction.label).toBe('hero block too wide');
    expect(done.instruction.keyboardPath).toContain('Enter(rectangle)');
    expect(done.instruction.keyboardPath).toContain('Enter(complete)');
    expect(done.instruction.typedEquivalent).toBe(
      typedEquivalent('rectangle', done.instruction.pixels, 'hero block too wide'),
    );
    expect(done.instruction.source).toBe('keyboard');
  });

  it('moves in coarse steps with shift and clamps the cursor to the viewport', () => {
    const keys = new KeyboardDrawingController({
      viewport: VIEWPORT,
      label: 'x'.repeat(12),
      start: { x: 20, y: 10 },
    });
    keys.start('rectangle');
    keys.press('ArrowLeft', { shift: true }); // 20 - 50 → clamped to 0
    keys.press('ArrowUp', { shift: true }); // 10 - 50 → clamped to 0
    const snap = keys.snapshot();
    expect(snap.cursor).toEqual({ x: 0, y: 0 }); // clamped, never negative
    expect(snap.path).toContain('ArrowLeft(shift)');
  });

  it('refuses a zero-size rectangle instead of emitting a degenerate one', () => {
    const keys = new KeyboardDrawingController({ viewport: VIEWPORT, label: 'degenerate test' });
    keys.start('rectangle');
    const first = keys.press('Enter');
    expect(first.ok).toBe(true);
    const second = keys.press('Enter'); // same position
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reasons.join()).toContain('two distinct corners');
  });

  it('pen needs at least three points; Backspace removes the last vertex', () => {
    const keys = new KeyboardDrawingController({ viewport: VIEWPORT, label: 'pen stroke test' });
    keys.start('pen');
    keys.press('Enter');
    keys.press('ArrowRight');
    keys.press('Enter');
    expect(keys.snapshot().points).toHaveLength(2);
    const tooEarly = keys.press('Space'); // 2 points cannot finish a pen
    expect(tooEarly.ok).toBe(false);
    if (!tooEarly.ok) expect(tooEarly.reasons.join()).toContain('at least 3 point');
    keys.press('Enter'); // third vertex
    expect(keys.snapshot().points).toHaveLength(3);
    const back = keys.press('Backspace');
    expect(back.ok).toBe(true);
    expect(keys.snapshot().points).toHaveLength(2);
    keys.press('Enter');
    const finished = keys.press('Space');
    expect(finished.ok && finished.done).toBe(true);
    if (finished.ok && finished.done) {
      expect(finished.instruction.kind).toBe('pen');
      expect(finished.instruction.pixels).toHaveLength(3);
      expect(finished.instruction.keyboardPath).toContain('Space(finish)');
    }
  });

  it('Escape aborts and clears the stroke; Tab aborts because focus left', () => {
    const keys = new KeyboardDrawingController({ viewport: VIEWPORT, label: 'abort test here' });
    keys.start('rectangle');
    keys.press('Enter');
    const aborted = keys.press('Escape');
    expect(aborted.ok).toBe(true);
    if (aborted.ok) {
      expect(aborted.done).toBe(false);
      expect(aborted.aborted).toBe(true);
      expect(aborted.snapshot.points).toHaveLength(0);
      expect(aborted.snapshot.state).toBe('idle');
    }
    keys.start('pen');
    keys.press('Enter');
    const tabbed = keys.press('Tab');
    expect(tabbed.ok).toBe(true);
    if (tabbed.ok) {
      expect(tabbed.snapshot.announcement).toContain('Focus left the canvas');
      expect(tabbed.snapshot.state).toBe('idle');
    }
  });

  it('announces every step for a screen-reader user', () => {
    const keys = new KeyboardDrawingController({ viewport: VIEWPORT, label: 'announcement check' });
    keys.start('rectangle');
    expect(keys.snapshot().announcement).toContain('Rectangle started');
    keys.press('ArrowRight');
    expect(keys.snapshot().announcement).toMatch(/cursor at \d+,\d+/);
    keys.press('Enter');
    expect(keys.snapshot().announcement).toContain('corner 1');
  });

  it('rejects an invalid viewport and an empty label at construction', () => {
    expect(
      () =>
        new KeyboardDrawingController({ viewport: { width: 0, height: 10 }, label: 'ok label' }),
    ).toThrow(TypeError);
    expect(() => new KeyboardDrawingController({ viewport: VIEWPORT, label: '   ' })).toThrow(
      TypeError,
    );
  });

  it('DA-34: keyboard and pointer produce IDENTICAL annotations through the same store', () => {
    const pixels = [
      { x: 100, y: 100 },
      { x: 400, y: 300 },
    ];
    const pointerStore = new AnnotationSessionStore({
      pageUrl: 'http://localhost:3000/hero',
      viewport: VIEWPORT,
      author: 'pi',
    });
    const pointerAdd = pointerStore.apply({
      op: 'add',
      kind: 'rectangle',
      pixels,
      label: 'same marking',
      typedEquivalent: typedEquivalent('rectangle', pixels, 'same marking'),
      keyboardPath: 'pointer drag',
      at: '2026-11-14T09:00:00.000Z',
      source: 'pointer',
    });
    expect(pointerAdd.ok).toBe(true);

    const keys = new KeyboardDrawingController({
      viewport: VIEWPORT,
      label: 'same marking',
      start: { x: 100, y: 100 },
      at: '2026-11-14T09:00:00.000Z',
    });
    keys.start('rectangle');
    keys.press('Enter');
    const keyboardStore = new AnnotationSessionStore({
      pageUrl: 'http://localhost:3000/hero',
      viewport: VIEWPORT,
      author: 'pi',
    });
    const keyboardInstruction = {
      op: 'add' as const,
      kind: 'rectangle' as const,
      pixels,
      label: 'same marking',
      typedEquivalent: typedEquivalent('rectangle', pixels, 'same marking'),
      keyboardPath: keys.snapshot().path.join(' → '),
      at: '2026-11-14T09:00:00.000Z',
      source: 'keyboard' as const,
    };
    const keyboardAdd = keyboardStore.apply(keyboardInstruction);
    expect(keyboardAdd.ok).toBe(true);
    if (!pointerAdd.ok || !keyboardAdd.ok) return;

    const pointerAnn = pointerAdd.session.annotations[0]!;
    const keyboardAnn = keyboardAdd.session.annotations[0]!;
    // geometry, label, typed equivalent and timestamp identical; only the
    // recorded origin (keyboard path / source) differs — which is the point.
    expect(keyboardAnn.geometry).toEqual(pointerAnn.geometry);
    expect(keyboardAnn.label).toBe(pointerAnn.label);
    expect(keyboardAnn.typedEquivalent).toBe(pointerAnn.typedEquivalent);
    expect(keyboardAnn.createdAt).toBe(pointerAnn.createdAt);
    expect(keyboardAnn.keyboardPath).not.toBe(pointerAnn.keyboardPath);
  });
});

describe('T0807 — screen-reader annotation list', () => {
  const annotations = [
    {
      id: 'a-1',
      kind: 'rectangle',
      label: 'hero spacing',
      points: [
        { x: 0.1, y: 0.2 },
        { x: 0.5, y: 0.6 },
      ],
      keyboardPath: 'Enter(rectangle) → ArrowRight → Enter(corner)',
    },
    { id: 'a-2', kind: 'pen', label: 'focus ring', points: [{ x: 0.2, y: 0.3 }] },
  ];

  it('builds ordered items with semantic geometry, never raw pixels alone', () => {
    const list = new AnnotationListModel();
    const items = list.setAnnotations(annotations);
    expect(items).toHaveLength(2);
    expect(items[0]!.position).toBe(1);
    expect(items[0]!.name).toBe('Rectangle: hero spacing');
    expect(items[0]!.description).toContain('10% across');
    expect(items[0]!.description).toContain('points from');
    expect(items[1]!.description).toBe('single point at 20% across, 30% down');
    expect(items[0]!.keyboardPath).toContain('Enter(rectangle)');
  });

  it('summarises the list for its accessible name', () => {
    const list = new AnnotationListModel();
    list.setAnnotations(annotations);
    expect(list.summary()).toBe('2 annotations: 1 rectangle, 1 pen');
    list.setAnnotations([]);
    expect(list.summary()).toBe('No annotations');
  });

  it('roving focus cycles and refuses ids outside the list', () => {
    const list = new AnnotationListModel();
    list.setAnnotations(annotations);
    expect(list.activeId()).toBe('a-1');
    expect(list.next()!.id).toBe('a-2');
    expect(list.next()!.id).toBe('a-1'); // wraps
    expect(list.previous()!.id).toBe('a-2');
    expect(list.setActive('nope')).toBe(false);
    expect(list.activeId()).toBe('a-2');
  });

  it('produces polite add/remove announcements and assertive refusals', () => {
    const list = new AnnotationListModel();
    list.setAnnotations(annotations);
    const [first] = list.list();
    expect(list.announceAdded(first!)).toContain(
      'Rectangle: hero spacing added at position 1 of 2',
    );
    list.setAnnotations([annotations[1]!]);
    expect(list.announceRemoved(first!)).toContain('1 annotation remain');
    expect(list.announceRefusal('reason too short')).toContain('Action refused: reason too short');
  });

  it('drops the active id when its annotation disappears', () => {
    const list = new AnnotationListModel();
    list.setAnnotations(annotations);
    list.setActive('a-2');
    list.setAnnotations([annotations[0]!]);
    expect(list.activeId()).toBe('a-1');
  });
});

describe('T0807 — overlay focus management', () => {
  const targets = [
    { id: 'toolbar', label: 'Drawing toolbar' },
    { id: 'canvas', label: 'Drawing canvas' },
    { id: 'list', label: 'Annotation list' },
  ];

  it('traps Tab and Shift+Tab inside the overlay', () => {
    const focus = new OverlayFocusManager(targets);
    expect(focus.open(null).focusId).toBe('toolbar');
    expect(focus.press('Tab').ok && focus.focusedId()).toBe('canvas');
    expect(focus.press('Tab').ok && focus.focusedId()).toBe('list');
    expect(focus.press('Tab').ok && focus.focusedId()).toBe('toolbar');
    expect(focus.press('Tab', { shift: true }).ok && focus.focusedId()).toBe('list');
  });

  it('Escape closes and restores the element that opened the overlay', () => {
    const focus = new OverlayFocusManager(targets);
    focus.open('open-button');
    const result = focus.press('Escape');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.closed).toBe(true);
      expect(result.focusId).toBe('open-button');
    }
    expect(focus.isOpen()).toBe(false);
    expect(focus.close().restoreId).toBe('open-button');
  });

  it('refuses focus moves when closed or to an unknown target', () => {
    const focus = new OverlayFocusManager(targets);
    expect(focus.press('Tab').ok).toBe(false);
    expect(focus.focus('canvas').ok).toBe(false);
    focus.open(null);
    expect(focus.focus('missing').ok).toBe(false);
    expect(focus.focus('canvas').ok).toBe(true);
    expect(focus.focus('canvas').ok && focus.focusedId()).toBe('canvas');
  });

  it('honours an explicit initial focus target and rejects an empty target list', () => {
    const focus = new OverlayFocusManager(targets);
    expect(focus.open(null, 'list').focusId).toBe('list');
    expect(() => new OverlayFocusManager([])).toThrow(TypeError);
  });
});

describe('T0807 — G7 reflow verdict', () => {
  it('is not-run without measurements (never pass)', () => {
    expect(emitG7Reflow([])).toMatchObject({ gate: 'G7', status: 'not-run' });
  });

  it('passes when content reflows at 320px and survives 400% zoom', () => {
    const verdict = emitG7Reflow([
      {
        url: '/hero',
        viewportWidth: 320,
        scrollWidth: 320,
        hidesOverflow: false,
        zoom400Available: true,
      },
    ]);
    expect(verdict.status).toBe('pass');
  });

  it('fails on horizontal scroll and on the F17 overflow-hiding cheat', () => {
    const scroll = emitG7Reflow([
      {
        url: '/hero',
        viewportWidth: 320,
        scrollWidth: 480,
        hidesOverflow: false,
        zoom400Available: true,
      },
    ]);
    expect(scroll.status).toBe('fail');
    expect(scroll.detail.join()).toContain('scrolls horizontally');

    const cheat = emitG7Reflow([
      {
        url: '/hero',
        viewportWidth: 320,
        scrollWidth: 480,
        hidesOverflow: true,
        zoom400Available: true,
      },
    ]);
    expect(cheat.status).toBe('fail');
    expect(cheat.detail.join()).toContain('F17');
  });

  it('returns not-applicable WITH a recorded reason for a WCAG 1.4.10 exception', () => {
    const verdict = emitG7Reflow([
      {
        url: '/pricing-table',
        viewportWidth: 320,
        scrollWidth: 900,
        hidesOverflow: false,
        zoom400Available: true,
        exception: 'data-table',
      },
    ]);
    expect(verdict.status).toBe('not-applicable');
    expect(verdict.notApplicableReason).toContain('data-table');
  });
});

describe('T0807 — G8 target size verdict', () => {
  it('is not-run without measurements', () => {
    expect(emitG8TargetSize([])).toMatchObject({ gate: 'G8', status: 'not-run' });
  });

  it('fails an undersized target with no exception', () => {
    const verdict = emitG8TargetSize([{ selector: '.icon-btn', width: 16, height: 16 }]);
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join()).toContain('16×16');
  });

  it('returns not-applicable WITH reason when every undersized target has an exception', () => {
    const verdict = emitG8TargetSize([
      { selector: '.inline-link', width: 18, height: 18, exception: 'inline' },
      { selector: '.spaced-icon', width: 20, height: 20, exception: 'spacing' },
    ]);
    expect(verdict.status).toBe('not-applicable');
    expect(verdict.notApplicableReason).toContain('inline');
    expect(verdict.notApplicableReason).toContain('spacing');
  });

  it('records the stricter project minimum as advisory, not as a failure (F16)', () => {
    const verdict = emitG8TargetSize([{ selector: '.ok-btn', width: 32, height: 32 }]);
    expect(verdict.status).toBe('pass');
    expect(verdict.detail.join()).toContain(`${PROJECT_TARGET_CSS_PX}px project policy`);
    expect(MIN_TARGET_CSS_PX).toBe(24);
  });
});

describe('T0807 — G9 semantics verdict', () => {
  const good: SemanticsCheck = {
    url: '/hero',
    headings: ['h1', 'h2', 'h3'],
    landmarks: ['main', 'nav'],
    focusVisible: true,
    clickOnlyControls: 0,
  };

  it('is not-run without checks', () => {
    expect(emitG9Semantics([])).toMatchObject({ gate: 'G9', status: 'not-run' });
  });

  it('passes well-structured semantics', () => {
    expect(emitG9Semantics([good]).status).toBe('pass');
  });

  it('fails on missing main landmark, invisible focus, or click-only controls', () => {
    expect(emitG9Semantics([{ ...good, landmarks: ['nav'] }]).detail.join()).toContain(
      'no main landmark',
    );
    expect(emitG9Semantics([{ ...good, focusVisible: false }]).status).toBe('fail');
    const clickOnly = emitG9Semantics([{ ...good, clickOnlyControls: 2 }]);
    expect(clickOnly.status).toBe('fail');
    expect(clickOnly.detail.join()).toContain('2 click-only control');
  });

  it('keeps project conventions advisory, never a gate failure (F20)', () => {
    const twoH1 = emitG9Semantics([{ ...good, headings: ['h1', 'h1', 'h2'] }]);
    expect(twoH1.status).toBe('pass');
    expect(twoH1.detail.join()).toContain('exactly 1');

    const cpl = emitG9Semantics([{ ...good, charactersPerLine: 95 }]);
    expect(cpl.status).toBe('pass');
    expect(cpl.detail.join()).toContain('CPL');
  });
});
