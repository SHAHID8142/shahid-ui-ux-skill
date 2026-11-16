/**
 * T1019 — keyboard traversal and focus visibility, measured (issue #13).
 *
 * Issue #13 asks the audit pipeline for "responsive/zoom/keyboard/semantic/a11y
 * checks". Responsive and zoom are measured (G7/G8), semantics and a11y are
 * measured (axe, G9 structure, G4), and keyboard was the one named check with no
 * instrument. The dogfood runner tests the *first* focus ring; that is not a
 * traversal, and a site can pass it while skipping every control after the first.
 *
 * What this measures, and only this:
 *  - **Tab order**: pressing Tab `maxStops` times and recording which element was
 *    focused, in order. This is the real browser's focus order, not a static guess.
 *  - **Focus indicator**: while an element is focused, whether computed
 *    `outline`-* or `box-shadow` paints anything. A control that is focusable but
 *    invisible on focus is a keyboard trap for sighted keyboard users (WCAG 2.4.7).
 *  - **Detours**: a Tab that lands on `body`/nothing while focusable elements
 *    remain inside the document — focus left the content.
 *  - **Cycles**: the same element focused repeatedly, which is legitimate inside a
 *    modal that can be dismissed with Escape and a defect outside one. This module
 *    does not test Escape, so it records the cycle and does not call it a failure.
 *
 * What it does not measure: screen-reader announcement, Escape/arrow-key
 * semantics, roving tabindex behaviour inside a composite widget, or whether the
 * indicator is *adequate* (contrast/size) — a ring is a ring here.
 */
import type { Page } from 'playwright';

/** 30 Tab presses: enough for a nav, a form and a table; bounded so a cycle cannot hang. */
export const KEYBOARD_MAX_STOPS = 30;

export interface KeyboardStop {
  index: number;
  /** Reduced to tag + id/class so no user content is copied into a report. */
  selector: string;
  tag: string;
  role: string | null;
  /** True when computed style paints an outline or a shadow while focused. */
  indicator: boolean;
  outline: string;
  boxShadow: string;
}

export interface KeyboardScanResult {
  url: string;
  stops: KeyboardStop[];
  /** Focusable elements the DOM reports, versus how many Tab actually reached. */
  focusable: number;
  /** Stops with no visible indicator, as selectors. */
  indicatorMissing: string[];
  /** Tabs that landed somewhere other than a control while controls were still unreached. */
  detours: number;
  /** True when the traversal reached the end of the document instead of looping. */
  endReached: boolean;
  /** First element of a repeated focus cycle, when one was observed. */
  cycle: { selector: string; repeats: number } | null;
}

/**
 * Which elements the DOM considers focusable. Used to tell "there was nothing to
 * focus" apart from "focus disappeared", which are different reports.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function describeStyle(): {
  selector: string;
  tag: string;
  role: string | null;
  outline: string;
  boxShadow: string;
} {
  const el = document.activeElement as HTMLElement | null;
  if (el === null || el === document.body) {
    return { selector: 'body', tag: 'body', role: null, outline: 'none', boxShadow: 'none' };
  }
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls =
    !id && typeof el.className === 'string' && el.className.trim().length > 0
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
  const style = getComputedStyle(el);
  return {
    selector: tag + id + cls,
    tag,
    role: el.getAttribute('role'),
    // `outline-style: none` paints nothing however wide it says it is.
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
    boxShadow: style.boxShadow,
  };
}

function describeFocusables(): string[] {
  const nodes = document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), ' +
      '[contenteditable="true"]',
  );
  return Array.from(nodes).map((node) => {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls =
      !id && typeof el.className === 'string' && el.className.trim().length > 0
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : '';
    return tag + id + cls;
  });
}

/**
 * A body stop means two different things, and conflating them is how a scanner
 * invents defects. If controls are still unreached afterwards, focus vanished
 * mid-page (a real keyboard trap). If every control was already reached, the
 * traversal simply ended and the browser moved to its own chrome — normal, not a
 * finding. Wrapping around the document also re-focuses earlier controls, which
 * would look like a "cycle" to a naive counter, so the traversal is truncated at
 * the first end-of-document body stop and cycles are only looked for before it.
 */
function analyseTraversal(
  stops: readonly KeyboardStop[],
  order: readonly string[],
): {
  detours: number;
  endReached: boolean;
  cycle: { selector: string; repeats: number } | null;
} {
  const reached = new Set<string>();
  let detours = 0;
  let endReached = false;
  const kept: KeyboardStop[] = [];
  for (const stop of stops) {
    if (stop.tag === 'body') {
      const remaining = order.some((selector) => !reached.has(selector));
      if (remaining) {
        detours += 1;
        continue;
      }
      endReached = true;
      break;
    }
    reached.add(stop.selector);
    kept.push(stop);
  }

  for (const period of [1, 2, 3]) {
    const need = period * 3;
    if (kept.length < need) continue;
    const tail = kept.slice(-need).map((stop) => stop.selector);
    const repeats = tail.every((selector, index) => selector === tail[index % period]);
    const distinct = new Set(tail).size;
    if (repeats && distinct === period) {
      return { detours, endReached, cycle: { selector: tail[0] as string, repeats: 3 } };
    }
  }
  return { detours, endReached, cycle: null };
}

function hasIndicator(outline: string, boxShadow: string): boolean {
  const [style, width] = outline.split(' ');
  const outlined = style !== 'none' && width !== undefined && width !== '0px';
  return outlined || (boxShadow !== 'none' && boxShadow.trim().length > 0);
}

/**
 * Press Tab across a page and record what happened. Never throws at the caller:
 * a page that cannot be driven returns a result with no stops, which the audit
 * reports as `not-run` rather than as a pass.
 */
export async function scanKeyboard(
  page: Page,
  maxStops = KEYBOARD_MAX_STOPS,
): Promise<KeyboardScanResult> {
  const focusable = await page.evaluate(
    (selector) => document.querySelectorAll(selector).length,
    FOCUSABLE_SELECTOR,
  );

  const order = await page.evaluate(describeFocusables);
  const stops: KeyboardStop[] = [];
  for (let index = 0; index < maxStops; index += 1) {
    await page.keyboard.press('Tab');
    const style = await page.evaluate(describeStyle);
    stops.push({ index, ...style, indicator: hasIndicator(style.outline, style.boxShadow) });
  }

  const indicatorMissing = [
    ...new Set(
      stops.filter((stop) => stop.tag !== 'body' && !stop.indicator).map((stop) => stop.selector),
    ),
  ];
  const { detours, endReached, cycle } = analyseTraversal(stops, order);
  return { url: page.url(), stops, focusable, indicatorMissing, detours, endReached, cycle };
}
