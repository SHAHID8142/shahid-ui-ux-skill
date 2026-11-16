/**
 * G7 — reflow at 320 CSS px, and the 400% zoom equivalence it is often confused with.
 *
 * WCAG reflow (SC 1.4.10 / 1.4.4) has two halves. The first: at 320 CSS px wide,
 * content must reflow without two-dimensional scrolling — a harness visit at width
 * 320 writes `documentScrollWidth`, `documentClientWidth` and the overflowing
 * element selectors. The second: at 400% zoom the layout must behave as if the
 * viewport were 320 CSS px **and 1/4 of the window's height**. The repository
 * records that half as its own measurement (`zoom400`), because the two are not
 * interchangeable: the 320 px column is a tall phone viewport (568 px) and takes
 * no raster scaling, while 400% zoom on a 1280×1024 window is 320×256 CSS px at
 * device scale factor 4, where a fixed header or footer can eat the whole height
 * and leave content unreachable.
 *
 * What is still **not** measured is named rather than implied: the user-agent
 * zoom setting itself is never driven, so text-only zoom and the UA's own
 * behaviour stay `not-run`. Emulating the CSS px viewport zoom produces is a
 * measurement of layout, not of the browser's zoom control.
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

/**
 * The CSS px viewport a 400% zoom produces on a 1280×1024 window. A record that
 * declares different numbers is not this measurement, whatever it is labelled.
 */
export const ZOOM400_EQUIVALENCE = {
  width: 320,
  height: 256,
  deviceScaleFactor: 4,
  /** The window the equivalence is derived from, quoted so the arithmetic is checkable. */
  fromWindow: { width: 1280, height: 1024 },
};

/**
 * Evaluate the 400% zoom equivalence record from a harness visit.
 *
 * Fail-closed in every direction: no record is `not-run` (never a pass), a record
 * that declares the wrong viewport or raster scale is a `fail` because its numbers
 * cannot be read as this measurement, and a record missing the overflow or clipping
 * probes is a `fail` because an unprobed container is not a clean one.
 *
 * @param {{url?: string, width?: unknown, height?: unknown, deviceScaleFactor?: unknown, documentScrollWidth?: unknown, documentClientWidth?: unknown, overflowingElements?: unknown, clippingElements?: unknown} | undefined} record
 * @returns {{status: 'pass' | 'fail' | 'not-run', detail: string}}
 */
export function evaluateZoom400(record) {
  const expected = ZOOM400_EQUIVALENCE;
  if (record === undefined || record === null) {
    return {
      status: 'not-run',
      detail:
        `400%-zoom equivalence not-run — no zoom400 record (${expected.width}x${expected.height} CSS px ` +
        `at device scale factor ${expected.deviceScaleFactor}); the ${REFLOW_WIDTH} CSS px column does not stand in for it`,
    };
  }
  const url = typeof record.url === 'string' && record.url.length > 0 ? record.url : '(unnamed)';

  if (record.width !== expected.width || record.height !== expected.height) {
    return {
      status: 'fail',
      detail:
        `zoom-equivalence-mislabelled: ${url} reports ${String(record.width)}x${String(record.height)} ` +
        `CSS px, but 400% zoom on a ${expected.fromWindow.width}x${expected.fromWindow.height} window is ` +
        `${expected.width}x${expected.height}`,
    };
  }
  const dsf = record.deviceScaleFactor;
  if (!Number.isFinite(dsf) || dsf !== expected.deviceScaleFactor) {
    return {
      status: 'fail',
      detail:
        `zoom-equivalence-mislabelled: ${url} reports device scale factor ${String(dsf)}, ` +
        `but 400% zoom rasterises at ${expected.deviceScaleFactor} — an unscaled 320 px visit is not zoom`,
    };
  }

  const scrollWidth = record.documentScrollWidth;
  const clientWidth = record.documentClientWidth;
  if (!Number.isFinite(scrollWidth) || !Number.isFinite(clientWidth)) {
    return {
      status: 'fail',
      detail: `zoom400-horizontal-overflow: ${url} recorded no numeric document widths (fail-closed)`,
    };
  }
  const overflowing = record.overflowingElements;
  if (!Array.isArray(overflowing)) {
    return {
      status: 'fail',
      detail: `zoom400-horizontal-overflow: ${url} has no overflowingElements probe (fail-closed)`,
    };
  }
  const clipping = record.clippingElements;
  if (!Array.isArray(clipping)) {
    return {
      status: 'fail',
      detail: `zoom400-overflow-hidden: ${url} has no clippingElements probe (fail-closed)`,
    };
  }

  const problems = [];
  if (scrollWidth > clientWidth || overflowing.length > 0) {
    const culprits = overflowing.length > 0 ? overflowing.join(', ') : 'document root';
    problems.push(
      `zoom400-horizontal-overflow: ${url} at ${expected.width}x${expected.height} CSS px ` +
        `scrollWidth ${scrollWidth} > clientWidth ${clientWidth} (${culprits}) — two-dimensional ` +
        'scrolling under 400% zoom',
    );
  }
  for (const element of clipping) {
    const selector = element?.selector;
    const overflow = element?.overflow;
    if (typeof selector !== 'string' || selector.length === 0) {
      problems.push(`zoom400-overflow-hidden: ${url} clipping element without a selector`);
      continue;
    }
    if (overflow !== 'hidden' && overflow !== 'clip') {
      problems.push(
        `zoom400-overflow-hidden: ${url} "${selector}" reports overflow "${String(overflow)}" ` +
          '(expected hidden or clip) — fail-closed',
      );
      continue;
    }
    problems.push(
      `zoom400-overflow-hidden: ${url} "${selector}" clips its content at 400% zoom — ` +
        'hiding is not reflowing',
    );
  }
  if (problems.length > 0) return { status: 'fail', detail: problems.join('; ') };
  return {
    status: 'pass',
    detail:
      `400%-zoom equivalence measured as ${url} at ${expected.width}x${expected.height} CSS px, device ` +
      `scale factor ${expected.deviceScaleFactor}: no horizontal overflow and no content-clipping container`,
  };
}

/**
 * @param {{viewports?: {url?: string, width?: unknown, documentScrollWidth?: unknown, documentClientWidth?: unknown, overflowingElements?: unknown, clippingElements?: unknown}[], zoom400?: object}} fixture
 * @returns {{status: 'pass' | 'fail' | 'not-run', detail: string[], zoom: {status: string, detail: string}, zoom400: {status: string, detail: string}}}
 */
export function evaluateG7(fixture) {
  const zoom400 = evaluateZoom400(fixture?.zoom400);
  const viewports = fixture?.viewports;
  if (!Array.isArray(viewports) || viewports.length === 0) {
    return {
      status: 'not-run',
      detail: ['no 320 CSS px viewport record — G7 not measured (never a pass)'],
      zoom: zoom400,
      zoom400,
    };
  }
  const at320 = viewports.filter((viewport) => viewport?.width === REFLOW_WIDTH);
  if (at320.length === 0) {
    return {
      status: 'not-run',
      detail: [`no viewport at ${REFLOW_WIDTH} CSS px — G7 not measured (never a pass)`],
      zoom: zoom400,
      zoom400,
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

  const reflowHalf = [
    `${at320.length} viewport(s) reflow at ${REFLOW_WIDTH} CSS px with no horizontal overflow ` +
      'and no content-clipping container',
  ];
  if (problems.length > 0) return { status: 'fail', detail: problems, zoom: zoom400, zoom400 };
  // G7 has two halves, and the 320 px column does not stand in for zoom. A clean
  // 320 px result plus an unmeasured zoom half is not-run, not a pass.
  if (zoom400.status === 'not-run') {
    return { status: 'not-run', detail: [...reflowHalf, zoom400.detail], zoom: zoom400, zoom400 };
  }
  if (zoom400.status === 'fail') {
    return { status: 'fail', detail: [zoom400.detail, ...reflowHalf], zoom: zoom400, zoom400 };
  }
  return { status: 'pass', detail: [...reflowHalf, zoom400.detail], zoom: zoom400, zoom400 };
}
