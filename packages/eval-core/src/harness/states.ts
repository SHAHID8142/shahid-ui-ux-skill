/**
 * T1038 (issue #21 R6) — component states are measured, where they can be driven.
 *
 * Issue #15's fifth box stayed "partly" because pressed/loading/disabled/success/error had no
 * instrument. Three of those five cannot be driven generically: `loading`, `success` and `error` are
 * application states, and inventing them (setting a `.is-loading` class we guessed) would measure our
 * guess rather than the product. So this probe drives the two that are real DOM states:
 *
 *  - **hover** — the pointer over the control;
 *  - **pressed** — a pointer press, compared with hover (so a press that only repeats hover is caught);
 *  - **disabled** — the control's own disabled/aria-disabled state;
 *  - **checked** — toggling a checkbox or radio, and only those.
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
  /** Pointer over the control, compared with idle. */
  readonly hover: StateDelta;
  /** Pointer press, compared with **hover** — so a press that only repeats hover is not a press. */
  readonly pressed: StateDelta;
  /** Why the press was not driven; null when it was. */
  readonly pressSkippedReason: string | null;
  readonly disabled: StateDelta;
  /** Only for a checkbox/radio with a custom appearance: toggling it, compared with idle. */
  readonly checked: StateDelta | null;
  /**
   * Why `checked` was not judged, when the control has a checked state but the browser draws it itself.
   * A native checkbox renders its tick outside computed style, so claiming "looks unchecked" from a
   * style delta would be false.
   */
  readonly checkedSkippedReason: string | null;
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
const SELECTOR =
  'button, [role="button"], a[href], input[type="submit"], input[type="button"], ' +
  'input[type="checkbox"], input[type="radio"], select, textarea';

interface Snapshot {
  readonly descriptor: string;
  /** True for a checkbox/radio: pressing it changes state, so a press delta would measure that change. */
  readonly toggle: boolean;
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
      const tag = element.tagName.toLowerCase();
      const asInput = element instanceof HTMLInputElement ? element : null;
      const label =
        id !== null && id !== ''
          ? '#' + id
          : classes.length
            ? '.' + classes.join('.')
            : asInput !== null
              ? '[type=' +
                asInput.type +
                (asInput.name === '' ? '' : '[name=' + asInput.name + ']') +
                ']'
              : '';
      const labelText = (element.closest('label')?.textContent ?? element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 32);
      const descriptor = tag + label + (labelText === '' ? '' : ' "' + labelText + '"');
      return {
        descriptor,
        toggle: asInput !== null && (asInput.type === 'checkbox' || asInput.type === 'radio'),
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
          'no interactive control (button, link, submit input, checkbox, select or textarea) on this route: nothing to drive',
        controls: [],
        notDriven: ['loading', 'success', 'error'],
      };
    }

    const controls: ControlStates[] = [];
    for (let index = 0; index < Math.min(count, MAX_CONTROLS); index += 1) {
      const idle = await readSnapshot(page, index);
      if (idle === null) continue;

      // Hover: the pointer arrives first. Its delta is measured against idle, and the press below is
      // measured against *hover*: a control that only repeats its hover style on press gives no press
      // feedback, and comparing press to idle would hide exactly that.
      let hoverChanged: readonly string[] = [];
      let hoverStyle: Record<string, string> | null = null;
      let pressedChanged: readonly string[] = [];
      let pressSkippedReason: string | null = null;
      if (idle.box !== null) {
        await page.mouse.move(idle.box.x, idle.box.y);
        hoverStyle = await readStyle(page, index);
        if (hoverStyle !== null) hoverChanged = [...delta(idle.style, hoverStyle).changed];
        if (idle.toggle) {
          // A press on a checkbox *is* a state change, and a click here reverted the state the checked
          // probe was about to measure. The checked probe drives that control instead.
          pressSkippedReason =
            'pressing a checkbox or radio toggles it, so a press delta would measure the state change, ' +
            'not press feedback';
        } else {
          await page.mouse.down();
          const pressedStyle = await readStyle(page, index);
          await page.mouse.up();
          if (pressedStyle !== null) {
            pressedChanged = [...delta(hoverStyle ?? idle.style, pressedStyle).changed];
          }
        }
      } else if (idle.toggle) {
        pressSkippedReason =
          'the control has no rendered box, so a pointer press on it would not land';
      }

      // Disabled: the control's own state, set on the loaded page and restored, never written to source.
      const disabledProbe = await page.evaluate(
        (input: { selector: string; index: number }) => {
          const element = document.querySelectorAll(input.selector)[input.index];
          if (!(element instanceof HTMLElement)) return { applicable: false };
          const hadDisabled = element.hasAttribute('disabled');
          const hadAria = element.getAttribute('aria-disabled');
          element.setAttribute('disabled', '');
          element.setAttribute('aria-disabled', 'true');
          return { applicable: true, hadDisabled, hadAria };
        },
        { selector: SELECTOR, index },
      );
      let disabledStyle: Record<string, string> | null = null;
      if (disabledProbe.applicable) {
        disabledStyle = await readStyle(page, index);
        await page.evaluate(
          (input: {
            selector: string;
            index: number;
            hadDisabled: boolean;
            hadAria: string | null;
          }) => {
            const element = document.querySelectorAll(input.selector)[input.index];
            if (!(element instanceof HTMLElement)) return;
            if (!input.hadDisabled) element.removeAttribute('disabled');
            if (input.hadAria === null) element.removeAttribute('aria-disabled');
            else element.setAttribute('aria-disabled', input.hadAria);
          },
          {
            selector: SELECTOR,
            index,
            hadDisabled: disabledProbe.hadDisabled === true,
            hadAria: disabledProbe.hadAria ?? null,
          },
        );
      }

      // Checked: `:checked` matching is refreshed on the next style recalc, not in the task that flips
      // the property, so the flip, a frame and the read are three steps. Reading in the same task
      // returned the old background and hid a real checked state.
      const checkedProbe = await page.evaluate(
        (input: { selector: string; index: number }) => {
          const element = document.querySelectorAll(input.selector)[input.index];
          if (!(element instanceof HTMLInputElement)) return { applicable: false, skipped: null };
          if (element.type !== 'checkbox' && element.type !== 'radio') {
            return { applicable: false, skipped: null };
          }
          const appearance = getComputedStyle(element).appearance;
          if (appearance === 'auto' || appearance === '') {
            return {
              applicable: false,
              skipped:
                'its appearance is native, so the browser draws the checked state outside computed style',
            };
          }
          element.dataset.susCheckedBefore = element.checked ? 'checked' : 'unchecked';
          element.checked = !element.checked;
          return { applicable: true, skipped: null };
        },
        { selector: SELECTOR, index },
      );
      let checkedStyle: Record<string, string> | null = null;
      if (checkedProbe.applicable) {
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
        );
        checkedStyle = await readStyle(page, index);
        await page.evaluate(
          (input: { selector: string; index: number }) => {
            const element = document.querySelectorAll(input.selector)[input.index];
            if (!(element instanceof HTMLInputElement)) return;
            element.checked = element.dataset.susCheckedBefore === 'checked';
            delete element.dataset.susCheckedBefore;
          },
          { selector: SELECTOR, index },
        );
      }

      controls.push({
        descriptor: idle.descriptor,
        hover: { changed: hoverChanged, styleCount: STYLE_PROPS_COUNT },
        pressed: { changed: pressedChanged, styleCount: STYLE_PROPS_COUNT },
        pressSkippedReason,
        disabled: {
          changed: disabledStyle === null ? [] : delta(idle.style, disabledStyle).changed,
          styleCount: STYLE_PROPS_COUNT,
        },
        checked:
          checkedStyle === null
            ? null
            : {
                changed: [...delta(idle.style, checkedStyle).changed],
                styleCount: STYLE_PROPS_COUNT,
              },
        checkedSkippedReason: checkedProbe.skipped,
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
