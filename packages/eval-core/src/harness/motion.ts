/**
 * T1036 (issue #21 R7) — the motion dimension can actually be measured.
 *
 * The transition oracles (`transition-oracle.ts`) evaluate *recorded* traces by design, and nothing in
 * the audit produced one: `--mode deep` had no interaction script, so motion was `not-run` on every
 * target forever and the reduced-motion guard shipped unmeasured.
 *
 * This module is the missing small piece: it drives one disclosure widget — an element that declares
 * `aria-expanded`, or a native `details > summary` when the page has none — in three ways — pointer,
 * keyboard, and pointer again under
 * `prefers-reduced-motion: reduce` — records what the user would see in each, and hands the traces to
 * the oracles. It does not invent a scenario for a page it cannot drive: no disclosure means
 * `not-run` with that reason, which is the honest answer and stays distinguishable from a pass.
 *
 * Information parity, not CSS parity (kilo M2): what must match between default and reduced motion is
 * the *information* the user gets — state and readable text — not whether a duration changed.
 */
import { launchGuardedBrowser, guardNavigations } from './net-guard.js';
import {
  evaluateTransitionOracles,
  type Observation,
  type OracleCase,
} from './transition-oracle.js';

export interface MotionProbeResult {
  readonly url: string;
  readonly status: 'measured' | 'not-run';
  readonly reason: string | null;
  /** Descriptor of the element that was driven, when one was found. */
  readonly trigger: string | null;
  /** Longest transition duration observed on trigger/panel, in ms. 0 means "no motion declared". */
  readonly transitionsMs: number;
  readonly verdict: { readonly status: 'pass' | 'fail'; readonly detail: string[] } | null;
}

/**
 * The two disclosure shapes this probe can drive. A hand-rolled widget exposes its state in
 * `aria-expanded`; a native one keeps it in the `open` property of `<details>`, and clicking the
 * `<summary>` is what a user does. Driving both means a page is not "not-run" merely because it used
 * the platform control (T1040).
 */
type DisclosureKind = 'aria-expanded' | 'details';

interface Disclosure {
  readonly kind: DisclosureKind;
  /** Selector that a click lands on and that can take focus. */
  readonly selector: string;
}

interface Snap {
  readonly state: string;
  /** Readable text of the controlled element, empty when it is not rendered (see below). */
  readonly text: string;
  readonly visible: boolean;
}

/** Read the disclosure state and the readable text of what it controls. Descriptors, not page text
 *  beyond the controlled element — a report must not quote unrelated content. */
async function snap(
  page: import('playwright').Page,
  selector: string,
  kind: DisclosureKind,
): Promise<Snap> {
  return page.evaluate(
    (input: { selector: string; kind: DisclosureKind }) => {
      const trigger = document.querySelector(input.selector);
      if (trigger === null) return { state: 'missing', text: '', visible: false };
      if (input.kind === 'details') {
        const details = trigger.closest('details');
        if (details === null) return { state: 'missing', text: '', visible: false };
        const visible = details.checkVisibility();
        const text = visible ? details.innerText.trim() : '';
        return { state: details.open ? 'open' : 'closed', text: text.slice(0, 400), visible };
      }
      const controls = trigger.getAttribute('aria-controls');
      const panel = controls === null ? null : document.getElementById(controls);
      const state = trigger.getAttribute('aria-expanded') ?? 'none';
      const target = panel ?? trigger.parentElement;
      // `innerText` on a non-rendered element falls back to textContent, which would make a panel that
      // reduced motion hides look identical to one it shows. Visibility is therefore read explicitly.
      const visible = target !== null && (target as HTMLElement).checkVisibility();
      const text = target === null || !visible ? '' : (target as HTMLElement).innerText.trim();
      return { state, text: text.slice(0, 400), visible };
    },
    { selector, kind },
  );
}

async function transitionMs(
  page: import('playwright').Page,
  selector: string,
  kind: DisclosureKind,
): Promise<number> {
  return page.evaluate(
    (input: { selector: string; kind: DisclosureKind }) => {
      const trigger = document.querySelector(input.selector);
      if (trigger === null) return 0;
      const controls = trigger.getAttribute('aria-controls');
      const panel =
        input.kind === 'details'
          ? trigger.closest('details')
          : controls === null
            ? null
            : document.getElementById(controls);
      const longest = (element: Element | null): number => {
        if (element === null) return 0;
        const style = getComputedStyle(element);
        const durations = style.transitionDuration.split(',').map((part) => parseFloat(part) || 0);
        const delays = style.transitionDelay.split(',').map((part) => parseFloat(part) || 0);
        const scale = style.transitionDuration.includes('ms') ? 1 : 1000;
        return Math.max(
          0,
          ...durations.map((duration, index) => duration * scale + (delays[index] ?? 0) * scale),
        );
      };
      return Math.max(longest(trigger), longest(panel));
    },
    { selector, kind },
  );
}

/** Pick the disclosure to drive: a hand-rolled one first, a native `details/summary` second. */
async function findDisclosure(page: import('playwright').Page): Promise<Disclosure | null> {
  const found = await page.evaluate(() => {
    const custom = document.querySelector('[aria-expanded]');
    if (custom !== null) {
      const id = custom.getAttribute('id');
      const selector =
        id !== null && id !== ''
          ? '[aria-expanded]#' + id
          : custom.getAttribute('aria-controls') !== null
            ? '[aria-controls="' + custom.getAttribute('aria-controls')! + '"]'
            : '[aria-expanded]';
      return { kind: 'aria-expanded' as const, selector, tag: custom.tagName.toLowerCase() };
    }
    const summary = document.querySelector('details > summary');
    if (summary !== null) {
      return { kind: 'details' as const, selector: 'details > summary', tag: 'summary' };
    }
    return null;
  });
  return found === null ? null : { kind: found.kind, selector: found.selector };
}

/**
 * Drive one disclosure and turn what happened into oracle cases. Exported for tests and so a caller can
 * see the traces without re-running a browser phase.
 */
export function motionCases(
  route: string,
  input: {
    trigger: string;
    pointer: { before: Snap; after: Snap };
    keyboard: { before: Snap; after: Snap };
    reduced: { before: Snap; after: Snap };
  },
): OracleCase[] {
  const trace = (before: Snap, after: Snap): Observation[] => [
    { at: 0, state: before.state, text: before.text, visualOnly: false },
    // The pointer/keyboard trace is recorded after the transition settled, so the changed text is
    // what a user actually gets: not a flash that came and went.
    { at: 400, state: after.state, text: after.text, visualOnly: false },
  ];
  const baseline = trace(input.pointer.before, input.pointer.after);
  return [
    {
      id: 'reduced-motion:' + route,
      scenario: 'reduced-motion',
      modality: 'pointer-hover',
      trace: trace(input.reduced.before, input.reduced.after),
      expectedFinalState: input.pointer.after.state,
      baselineTrace: baseline,
    },
    {
      id: 'modality:' + route,
      scenario: 'modality',
      modality: 'keyboard',
      trace: trace(input.keyboard.before, input.keyboard.after),
      expectedFinalState: input.pointer.after.state,
    },
  ];
}

/**
 * One probe, on a browser the caller owns. Kept separate from {@link probeMotion} so an audit can
 * launch once and probe every route: launching a guarded browser per route made a five-route deep audit
 * take twice as long as the measurement itself.
 */
export async function probeMotionWith(
  browser: import('playwright').Browser,
  url: string,
  authorizedHosts: readonly string[],
): Promise<MotionProbeResult> {
  {
    const defaultContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await defaultContext.newPage();
    const navigation = await guardNavigations(page, authorizedHosts);
    await page.goto(url, { waitUntil: 'networkidle' });
    navigation.assertOnAuthorizedPage(page);

    const disclosure = await findDisclosure(page);
    if (disclosure === null) {
      await navigation.dispose();
      await defaultContext.close();
      return {
        url,
        status: 'not-run',
        reason:
          'no element declares aria-expanded and no details/summary disclosure exists, so there is no disclosure to drive: the audit does not invent an interaction',
        trigger: null,
        transitionsMs: 0,
        verdict: null,
      };
    }
    // A stable descriptor for the report: id, else name, else the tag with its text-free position.
    const trigger = await page.evaluate((input: { selector: string; kind: string }) => {
      const element = document.querySelector(input.selector);
      if (element === null) return 'unknown';
      const id = element.getAttribute('id');
      if (id !== null && id !== '') return element.tagName.toLowerCase() + '#' + id;
      if (input.kind === 'details') {
        const label = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return 'details > summary' + (label === '' ? '' : ' "' + label.slice(0, 40) + '"');
      }
      const label = element.getAttribute('aria-label') ?? element.getAttribute('name') ?? '';
      return element.tagName.toLowerCase() + (label === '' ? '' : '[' + label.slice(0, 40) + ']');
    }, disclosure);
    const transitionsMs = await transitionMs(page, disclosure.selector, disclosure.kind);

    const pointerBefore = await snap(page, disclosure.selector, disclosure.kind);
    await page.click(disclosure.selector);
    await page.waitForTimeout(400);
    const pointerAfter = await snap(page, disclosure.selector, disclosure.kind);

    // Keyboard: reload so the widget starts closed, then reach it the way a keyboard user does.
    await page.goto(url, { waitUntil: 'networkidle' });
    navigation.assertOnAuthorizedPage(page);
    await page.focus(disclosure.selector);
    const keyboardBefore = await snap(page, disclosure.selector, disclosure.kind);
    await page.keyboard.press(disclosure.kind === 'details' ? 'Space' : 'Enter');
    await page.waitForTimeout(400);
    const keyboardAfter = await snap(page, disclosure.selector, disclosure.kind);
    await navigation.dispose();
    await defaultContext.close();

    const reducedContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const reducedPage = await reducedContext.newPage();
    const reducedGuard = await guardNavigations(reducedPage, authorizedHosts);
    await reducedPage.goto(url, { waitUntil: 'networkidle' });
    reducedGuard.assertOnAuthorizedPage(reducedPage);
    const reducedBefore = await snap(reducedPage, disclosure.selector, disclosure.kind);
    await reducedPage.click(disclosure.selector);
    await reducedPage.waitForTimeout(400);
    const reducedAfter = await snap(reducedPage, disclosure.selector, disclosure.kind);
    await reducedGuard.dispose();
    await reducedContext.close();

    // Reports name routes, not the ephemeral port a local server happened to bind.
    const routeLabel = new URL(url).pathname;
    const cases = motionCases(routeLabel, {
      trigger,
      pointer: { before: pointerBefore, after: pointerAfter },
      keyboard: { before: keyboardBefore, after: keyboardAfter },
      reduced: { before: reducedBefore, after: reducedAfter },
    });
    const verdict = evaluateTransitionOracles(cases);
    const scrub = (line: string): string => line.split(url).join(routeLabel);
    const notes: string[] = [];
    if (pointerAfter.state === pointerBefore.state) {
      notes.push(
        'the disclosure did not change state on a pointer click, so nothing motion-related was measured',
      );
    }
    if (transitionsMs === 0) {
      notes.push('no transition duration is declared: the state change is instantaneous');
    }
    return {
      url,
      status: 'measured',
      reason: null,
      trigger,
      transitionsMs,
      verdict: { status: verdict.status, detail: [...verdict.detail.map(scrub), ...notes] },
    };
  }
}

/** Convenience wrapper for a single probe (tests, one-off callers). */
export async function probeMotion(
  url: string,
  authorizedHosts: readonly string[],
): Promise<MotionProbeResult> {
  const guarded = await launchGuardedBrowser(authorizedHosts);
  try {
    return await probeMotionWith(guarded.browser, url, authorizedHosts);
  } finally {
    await guarded.close();
  }
}
