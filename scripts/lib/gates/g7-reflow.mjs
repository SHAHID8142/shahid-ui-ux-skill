/**
 * G7 — reflow at 320 CSS px, and the part of this gate nobody can measure.
 *
 * WCAG reflow (SC 1.4.10 / 1.4.4) has two halves: at 320 CSS px wide, content
 * must reflow without two-dimensional scrolling, and at 400% zoom the layout
 * must behave as if the viewport were 320 px. The repository can record the
 * first half — a harness visit at width 320 writes `documentScrollWidth`,
 * `documentClientWidth` and the overflowing element selectors. It cannot record
 * the second: a headless page can be sized, but browser zoom is a user-agent
 * setting this project never drives, so any "zoom verified" claim would be
 * invented. That half is reported as **not-run**, out loud, on every run — the
 * 320 px measurement is not allowed to stand in for it.
 *
 * The second failure mode is the one that looks like a fix: `overflow: hidden`
 * on the container makes the overflow disappear from the measurement while the
 * content is still clipped and unreachable. Hiding is not reflowing, so any
 * clipping element fails the gate.
 *
 * Fail-closed: no 320 px record means the gate was not measured, which is
 * `not-run` — never a pass. Numbers that are not numbers fail.
 */

/** WCAG reflow width. Also the width a 400% zoom on a 1280 px display produces. */
export const REFLOW_WIDTH = 320;

/** The half of G7 this harness can never measure. Never converted into a pass. */
export const ZOOM_COMPONENT = {
  status: 'not-run',
  detail:
    '400%-zoom equivalence not-run — this harness does not drive browser zoom; ' +
    'the 320 CSS px measurement does not stand in for it',
};

/**
 * @param {{viewports?: {url?: string, width?: unknown, documentScrollWidth?: unknown, documentClientWidth?: unknown, overflowingElements?: unknown, clippingElements?: unknown}[]}} fixture
 * @returns {{status: 'pass' | 'fail' | 'not-run', detail: string[], zoom: {status: string, detail: string}}}
 */
export function evaluateG7(fixture) {
  const viewports = fixture?.viewports;
  if (!Array.isArray(viewports) || viewports.length === 0) {
    return {
      status: 'not-run',
      detail: ['no 320 CSS px viewport record — G7 not measured (never a pass)'],
      zoom: ZOOM_COMPONENT,
    };
  }
  const at320 = viewports.filter((viewport) => viewport?.width === REFLOW_WIDTH);
  if (at320.length === 0) {
    return {
      status: 'not-run',
      detail: [`no viewport at ${REFLOW_WIDTH} CSS px — G7 not measured (never a pass)`],
      zoom: ZOOM_COMPONENT,
    };
  }

  const problems = [];
  for (const viewport of at320) {
    const url =
      typeof viewport.url === 'string' && viewport.url.length > 0 ? viewport.url : '(unnamed)';
    const scrollWidth = viewport.documentScrollWidth;
    const clientWidth = viewport.documentClientWidth;
    if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth)) {
      problems.push(`${url}: no numeric document widths recorded (fail-closed)`);
      continue;
    }
    const overflowing = Array.isArray(viewport.overflowingElements)
      ? viewport.overflowingElements.filter((element) => typeof element === 'string' && element)
      : null;
    if (overflowing === null) {
      problems.push(`${url}: overflowingElements missing (fail-closed)`);
      continue;
    }
    if (scrollWidth > clientWidth || overflowing.length > 0) {
      const culprits = overflowing.length > 0 ? overflowing.join(', ') : 'document root';
      problems.push(
        `horizontal-overflow: ${url} at ${REFLOW_WIDTH}px scrollWidth ${scrollWidth} > ` +
          `clientWidth ${clientWidth} (${culprits})`,
      );
    }

    // The clipping probe is the only record of "hidden instead of reflowed". A
    // viewport that did not record it was not checked for it, and "not checked" is
    // not "clean": the gate fails rather than assuming the container is honest.
    const clipping = viewport.clippingElements;
    if (clipping === undefined || clipping === null) {
      problems.push(`${url}: clipping-container probe not recorded (fail-closed)`);
      continue;
    }
    if (!Array.isArray(clipping)) {
      problems.push(`${url}: clippingElements malformed (fail-closed)`);
      continue;
    }
    for (const element of clipping ?? []) {
      const selector = element?.selector;
      const overflow = element?.overflow;
      if (typeof selector !== 'string' || selector.length === 0) {
        problems.push(`${url}: clipping element without a selector (fail-closed)`);
        continue;
      }
      if (overflow !== 'hidden' && overflow !== 'clip') {
        problems.push(
          `${url}: clipping element "${selector}" reports overflow "${String(overflow)}" ` +
            '(expected hidden or clip) — fail-closed',
        );
        continue;
      }
      problems.push(
        `overflow-hidden-not-reflowed: ${url} "${selector}" uses overflow:${overflow} and ` +
          `clips its content at ${REFLOW_WIDTH}px — hiding is not reflowing`,
      );
    }
  }

  if (problems.length > 0) return { status: 'fail', detail: problems, zoom: ZOOM_COMPONENT };
  return {
    status: 'pass',
    detail: [
      `${at320.length} viewport(s) reflow at ${REFLOW_WIDTH} CSS px with no horizontal overflow ` +
        'and no content-clipping container',
    ],
    zoom: ZOOM_COMPONENT,
  };
}
