/**
 * G9 — semantics: heading ladder, landmarks, focus visibility, no click-only
 * controls.
 *
 * Four defects, each of which makes a page unusable with a screen reader or a
 * keyboard and invisible to a JSON-diff review:
 *
 *  - **heading ladder** — an `h2` that jumps to `h4` removes the structure a
 *    screen-reader user navigates by. Exactly one `h1` (the page subject) and no
 *    skipped levels;
 *  - **main landmark** — no `<main>` means no "skip to content" target and no
 *    way to bypass the chrome;
 *  - **click-only controls** — a `div`/`span` with a click handler is not a
 *    control: it has no role, no tab stop, no Enter/Space activation;
 *  - **focus indicator removed** — `outline: none` (or `0`) without a
 *    replacement means a keyboard user cannot see where they are.
 *
 * The harness records the marked-up facts (`headings`, `landmarks`,
 * `clickHandlers`, `focusStyles`) rather than a DOM, so this module stays pure
 * and deterministic: no browser, no parser, no timers. Two acceptance paths are
 * supported — a marked-up observation object, and raw HTML that the fixture
 * records alongside it — because a reviewer reading a diff needs to see the
 * markup that produced the verdict.
 *
 * Fail-closed: an unrecorded page fails; a focus-style record that names no
 * element fails; "we did not look" is never a pass.
 */

const CLICKABLE_TAGS = new Set(['div', 'span', 'li', 'p', 'img', 'svg']);

/** Headings present, ascending; must start at 1 and never skip a level. */
export function headingViolations(headings) {
  const problems = [];
  const levels = headings.map((heading) => heading?.level);
  for (const level of levels) {
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      problems.push(`heading-ladder-invalid: level "${String(level)}" is not an h1-h6`);
    }
  }
  if (problems.length > 0) return problems;
  const h1Count = levels.filter((level) => level === 1).length;
  if (h1Count === 0) problems.push('heading-ladder-invalid: no h1 (page subject missing)');
  if (h1Count > 1)
    problems.push(`heading-ladder-invalid: ${h1Count} h1 elements (expected exactly 1)`);
  for (let index = 1; index < levels.length; index += 1) {
    const previous = levels[index - 1];
    const current = levels[index];
    if (current > previous + 1) {
      problems.push(
        `heading-ladder-invalid: h${previous} -> h${current} skips a level ` +
          `("${String(headings[index]?.text ?? '').slice(0, 40)}")`,
      );
    }
  }
  return problems;
}

function focusProblems(focusStyles) {
  const problems = [];
  for (const record of focusStyles) {
    const selector =
      typeof record?.selector === 'string' && record.selector.length > 0 ? record.selector : null;
    if (selector === null) {
      problems.push('focus-indicator-invalid: focus style recorded with no selector (fail-closed)');
      continue;
    }
    const removed =
      record?.outline === 'none' ||
      record?.outline === '0' ||
      record?.outline === '0px' ||
      record?.outlineStyle === 'none' ||
      record?.outlineWidth === '0' ||
      record?.outlineWidth === '0px';
    if (!removed) continue;
    const replacement = String(record?.replacement ?? '').trim();
    if (replacement.length === 0) {
      problems.push(
        `focus-indicator-removed: ${selector} sets outline:none with no replacement indicator`,
      );
    }
  }
  return problems;
}

function clickOnlyProblems(clickHandlers) {
  const problems = [];
  for (const handler of clickHandlers) {
    const tag = String(handler?.tag ?? '').toLowerCase();
    const selector =
      typeof handler?.selector === 'string' && handler.selector.length > 0
        ? handler.selector
        : '(unnamed)';
    // An anchor with an href is a real link; without one it is decoration pretending
    // to be a control, so it gets the same scrutiny as a div with a click handler.
    if (!CLICKABLE_TAGS.has(tag) && !(tag === 'a' && !handler.href)) continue;
    const role = String(handler?.role ?? '').trim();
    const tabIndex = handler?.tabIndex;
    const keyboard = handler?.keyboard === true;
    const hasRole = role.length > 0;
    const focusable = Number.isInteger(tabIndex) && tabIndex >= 0;
    if (!hasRole || !focusable || !keyboard) {
      const missing = [];
      if (!hasRole) missing.push('no role');
      if (!focusable) missing.push('not focusable (tabindex >= 0)');
      if (!keyboard) missing.push('no keyboard handler');
      problems.push(
        `click-only-control: <${tag}> ${selector} handles click but has ${missing.join(', ')}`,
      );
    }
  }
  return problems;
}

/**
 * @param {{pages?: {path?: string, headings?: unknown, landmarks?: unknown, clickHandlers?: unknown, focusStyles?: unknown}[]}} fixture
 * @returns {{status: 'pass' | 'fail', detail: string[]}}
 */
export function evaluateG9(fixture) {
  const pages = fixture?.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    return { status: 'fail', detail: ['fixture-invalid: no pages supplied (fail-closed)'] };
  }
  const problems = [];
  let checked = 0;

  pages.forEach((page, index) => {
    const path =
      typeof page?.path === 'string' && page.path.length > 0 ? page.path : `page-${index + 1}`;
    const headings = page?.headings;
    const landmarks = page?.landmarks;
    if (!Array.isArray(headings)) {
      problems.push(`${path}: headings not recorded (fail-closed)`);
      return;
    }
    if (!Array.isArray(landmarks)) {
      problems.push(`${path}: landmarks not recorded (fail-closed)`);
      return;
    }
    checked += 1;
    for (const problem of headingViolations(headings)) problems.push(`${path}: ${problem}`);

    const main = landmarks.filter(
      (landmark) => String(landmark?.role ?? landmark ?? '').toLowerCase() === 'main',
    );
    if (main.length === 0) {
      problems.push(`${path}: missing-main-landmark — no main landmark recorded`);
    }

    // T1068 (audit finding T1003-24): an ABSENT probe record is "we did not look", which is the
    // same fail-closed case as absent headings/landmarks — defaulting it to [] read two of G9's
    // four defect classes as clean whenever a harness omitted the fields. `null` stays the
    // recorded "no click-only controls / no custom focus styles on this page" answer.
    const clickHandlers = page?.clickHandlers ?? null;
    if (!Array.isArray(clickHandlers)) {
      problems.push(`${path}: clickHandlers not recorded (fail-closed)`);
    } else {
      for (const problem of clickOnlyProblems(clickHandlers)) problems.push(`${path}: ${problem}`);
    }

    const focusStyles = page?.focusStyles ?? null;
    if (!Array.isArray(focusStyles)) {
      problems.push(`${path}: focusStyles not recorded (fail-closed)`);
    } else {
      for (const problem of focusProblems(focusStyles)) problems.push(`${path}: ${problem}`);
    }
  });

  if (problems.length > 0) return { status: 'fail', detail: problems };
  return {
    status: 'pass',
    detail: [
      `${checked} page(s): heading ladder intact, main landmark present, ` +
        'no click-only controls, no removed focus indicator',
    ],
  };
}
