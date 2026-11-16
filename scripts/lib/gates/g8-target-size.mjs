/**
 * G8 — target size: interactive controls are at least 24x24 CSS px.
 *
 * 24x24 is WCAG 2.2 SC 2.5.8 (Level AA) — the standard floor. This repository
 * also has a 44px comfort preference for its own components; that belongs to
 * design policy and is explicitly NOT the measurement here. Measuring against
 * 44 would fail every conforming control, and measuring against the project's
 * own convention while calling it "the standard" would be a false claim. The
 * gate reads the standard.
 *
 * SC 2.5.8 has real exceptions, and they are narrower than the excuses people
 * reach for:
 *
 *  - **inline** — a link inside a sentence or block of text (`inline: true`,
 *    optionally with the sentence); full justification is space, not an escape
 *    hatch;
 *  - **equivalent** — a conforming control performing the same action exists;
 *  - **user-agent** — size is set by the browser (e.g. default checkboxes);
 *  - **essential** — the presentation is essential to the information conveyed.
 *
 * Each exception must be *documented on the element*, not asserted for the page.
 * An undocumented small control fails; a fixture that documents an exception the
 * standard does not recognise fails too, so an exception can never be used as a
 * generic bypass.
 *
 * Fail-closed: no controls recorded means the gate was not measured.
 */

/** WCAG 2.2 SC 2.5.8 floor, in CSS pixels. */
export const TARGET_MIN_PX = 24;

/** The only exceptions SC 2.5.8 recognises. */
export const STANDARD_EXCEPTIONS = ['inline', 'equivalent', 'user-agent', 'essential'];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * @param {{controls?: {selector?: string, width?: unknown, height?: unknown, role?: string, text?: string, exception?: unknown, equivalentSelector?: string, justification?: string}[]}} fixture
 * @returns {{status: 'pass' | 'fail' | 'not-run', detail: string[]}}
 */
export function evaluateG8(fixture) {
  const controls = fixture?.controls;
  if (!Array.isArray(controls) || controls.length === 0) {
    return {
      status: 'not-run',
      detail: ['no interactive controls recorded — G8 not measured (never a pass)'],
    };
  }
  const problems = [];
  let measured = 0;
  let exempt = 0;

  controls.forEach((control, index) => {
    const selector =
      typeof control?.selector === 'string' && control.selector.length > 0
        ? control.selector
        : `control-${index + 1}`;
    const width = control?.width;
    const height = control?.height;
    if (!isFiniteNumber(width) || !isFiniteNumber(height)) {
      problems.push(`${selector}: size not measured (fail-closed)`);
      return;
    }
    measured += 1;
    const bigEnough = width >= TARGET_MIN_PX && height >= TARGET_MIN_PX;

    const exception = control?.exception;
    if (exception === undefined || exception === null) {
      if (!bigEnough) {
        problems.push(
          `target-too-small: ${selector} is ${width}x${height} CSS px, below the ` +
            `${TARGET_MIN_PX}x${TARGET_MIN_PX} standard floor, with no documented exception`,
        );
      }
      return;
    }

    if (typeof exception !== 'string' || !STANDARD_EXCEPTIONS.includes(exception)) {
      problems.push(
        `${selector}: exception "${String(exception)}" is not a standard SC 2.5.8 exception ` +
          `(allowed: ${STANDARD_EXCEPTIONS.join(', ')}) — fail-closed`,
      );
      return;
    }

    if (exception === 'inline') {
      const inline = control?.inline === true;
      const sentence = String(control?.text ?? '').trim();
      if (!inline) {
        problems.push(
          `${selector}: inline exception claimed without inline:true (not a link in a sentence)`,
        );
        return;
      }
      if (sentence.length === 0) {
        problems.push(`${selector}: inline exception claimed but no surrounding text recorded`);
        return;
      }
      exempt += 1;
      return;
    }

    if (exception === 'equivalent') {
      const equivalent = control?.equivalentSelector;
      if (typeof equivalent !== 'string' || equivalent.length === 0) {
        problems.push(`${selector}: equivalent exception needs an equivalentSelector`);
        return;
      }
      exempt += 1;
      return;
    }

    // user-agent and essential are self-describing but still need the reason written down.
    const justification = String(control?.justification ?? '').trim();
    if (justification.length === 0) {
      problems.push(`${selector}: "${exception}" exception needs a justification string`);
      return;
    }
    exempt += 1;
  });

  if (problems.length > 0) return { status: 'fail', detail: problems };
  return {
    status: 'pass',
    detail: [
      `${measured} control(s) measured against ${TARGET_MIN_PX}x${TARGET_MIN_PX}; ` +
        `${exempt} documented standard exception(s)`,
    ],
  };
}
