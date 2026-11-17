/**
 * T1038 (issue #21 R6) — component states are measured, where they can be driven.
 *
 * Issue #15's fifth box stayed "partly" because pressed/loading/disabled/success/error had no
 * instrument. Three of those five cannot be driven generically: `loading`, `success` and `error` are
 * application states, and inventing them (setting a `.is-loading` class we guessed) would measure our
 * guess rather than the product. So this probe drives the two that are real DOM states:
 *
 *  - **pressed** — a pointer press on the control;
 *  - **disabled** — the control's own disabled/aria-disabled state.
 *
 * For each it records which computed properties changed, which is a number a report can carry. Zero
 * changed properties on a press means the control gives no perceptible feedback; zero on disabled means
 * a disabled control looks enabled. Both are measured facts, not opinions, and a route with no
 * drivable control is `not-run` with that reason instead of a silent pass.
 *
 * `loading`, `success` and `error` are reported as not driven, by name, in the check detail — the
 * honest answer is the one that says which three were skipped and why.
 */
import type { Browser, Page } from 'playwright';
import { guardNavigations, launchGuardedBrowser } from './net-guard.js';

export interface StateDelta {
  /** Computed properties whose value differs from the idle snapshot. */
  readonly changed: readonly string[];
  readonly styleCount: number;
}

export interface ControlStates {
  readonly descriptor: string;
  readonly pressed: StateDelta;
  readonly disabled: StateDelta;
}

export interface StatesProbeResult {
  readonly url: string;
  readonly status: 'measured' | 'not-run';
  readonly reason: string | null;
  readonly controls: readonly ControlStates[];
  /** States this probe does not drive, always named so they cannot be mistaken for passes. */
  readonly notDriven: readonly string[];
}

/** Computed properties that make a state visible. Deliberately small and readable. */
const STYLE_PROPERTIES = [
  'background-color',
  'background-image',
  'border-top-color',
  'box-shadow',
  'color',
  'filter',
  'opacity',
  'outline-color',
  'outline-style',
  'transform',
] as const;

const MAX_CONTROLS = 3;
const SELECTOR = 'button, [role="button"], input[type="submit"], input[type="button"], a[href]';

interface Snapshot {
  readonly descriptor: string;
  readonly style: Record<string, string>;
  readonly box: { x: number; y: number } | null;
}

function readSnapshot(page: Page, index: number): Promise<Snapshot | null> {
  return page.evaluate(
    (input: { index: number; properties: readonly string[]; selector: string }) => {
      const element = document.querySelectorAll(input.selector)[input.index];
      if (!(element instanceof HTMLElement)) return null;
      const style: Record<string, string> = {};
      const computed = getComputedStyle(element);
      for (const property of input.properties) {
        style[property] = computed.getPropertyValue(property);
      }
      const rect = element.getBoundingClientRect();
      const id = element.getAttribute('id');
      const classes = element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      const descriptor =
        element.tagName.toLowerCase() +
        (id ? '#' + id : classes.length ? '.' + classes.join('.') : '');
      return {
        descriptor,
        style,
        box:
          rect.width > 0 && rect.height > 0
            ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
            : null,
      };
    },
    { index, properties: STYLE_PROPERTIES as readonly string[], selector: SELECTOR },
  );
}

function delta(before: Record<string, string>, after: Record<string, string>): StateDelta {
  const changed = STYLE_PROPERTIES.filter((property) => before[property] !== after[property]);
  return { changed, styleCount: STYLE_PROPERTIES.length };
}

function readStyle(page: Page, index: number): Promise<Record<string, string> | null> {
  return page.evaluate(
    (input: { index: number; properties: readonly string[]; selector: string }) => {
      const element = document.querySelectorAll(input.selector)[input.index];
      if (!(element instanceof HTMLElement)) return null;
      const computed = getComputedStyle(element);
      const style: Record<string, string> = {};
      for (const property of input.properties)
        style[property] = computed.getPropertyValue(property);
      return style;
    },
    { index, properties: STYLE_PROPERTIES as readonly string[], selector: SELECTOR },
  );
}

export async function probeStatesWith(
  browser: Browser,
  url: string,
  authorizedHosts: readonly string[],
): Promise<StatesProbeResult> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const navigation = await guardNavigations(page, authorizedHosts);
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    navigation.assertOnAuthorizedPage(page);
    const count = await page.evaluate(
      (selector) => Math.min(document.querySelectorAll(selector).length, 3),
      SELECTOR,
    );
    if (count === 0) {
      return {
        url,
        status: 'not-run',
        reason:
          'no interactive control (button, link, submit input) on this route: nothing to drive',
        controls: [],
        notDriven: ['loading', 'success', 'error'],
      };
    }

    const controls: ControlStates[] = [];
    for (let index = 0; index < Math.min(count, MAX_CONTROLS); index += 1) {
      const idle = await readSnapshot(page, index);
      if (idle === null) continue;

      // Pressed: a real pointer press, not a class we set.
      let pressedChanged: readonly string[] = [];
      if (idle.box !== null) {
        await page.mouse.move(idle.box.x, idle.box.y);
        await page.mouse.down();
        const pressedStyle = await readStyle(page, index);
        await page.mouse.up();
        if (pressedStyle !== null) pressedChanged = [...delta(idle.style, pressedStyle).changed];
      }

      // Disabled: the control's own state, set and then restored on the page (never on the source).
      const disabledStyle = await page.evaluate(
        (input: { index: number; properties: readonly string[]; selector: string }) => {
          const element = document.querySelectorAll(input.selector)[input.index];
          if (!(element instanceof HTMLElement)) return null;
          const hadDisabled = element.hasAttribute('disabled');
          const hadAria = element.getAttribute('aria-disabled');
          if ('disabled' in element) (element as HTMLButtonElement).disabled = true;
          element.setAttribute('aria-disabled', 'true');
          const computed = getComputedStyle(element);
          const style: Record<string, string> = {};
          for (const property of input.properties)
            style[property] = computed.getPropertyValue(property);
          if (!hadDisabled) element.removeAttribute('disabled');
          if (hadAria === null) element.removeAttribute('aria-disabled');
          else element.setAttribute('aria-disabled', hadAria);
          return style;
        },
        { index, properties: STYLE_PROPERTIES as readonly string[], selector: SELECTOR },
      );

      controls.push({
        descriptor: idle.descriptor,
        pressed: { changed: pressedChanged, styleCount: STYLE_PROPS_COUNT },
        disabled: {
          changed: disabledStyle === null ? [] : delta(idle.style, disabledStyle).changed,
          styleCount: STYLE_PROPS_COUNT,
        },
      });
    }
    return {
      url,
      status: 'measured',
      reason: null,
      controls,
      notDriven: ['loading', 'success', 'error'],
    };
  } finally {
    await navigation.dispose();
    await context.close();
  }
}

const STYLE_PROPS_COUNT = STYLE_PROPERTIES.length;

export async function probeStates(
  url: string,
  authorizedHosts: readonly string[],
): Promise<StatesProbeResult> {
  const guarded = await launchGuardedBrowser(authorizedHosts);
  try {
    return await probeStatesWith(guarded.browser, url, authorizedHosts);
  } finally {
    await guarded.close();
  }
}
