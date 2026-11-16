/**
 * G6 — motion parity: the reduced-motion experience must carry the same
 * information as the default one.
 *
 * Reduced motion means "less movement", never "less information". The failure
 * mode is quiet: an animation is the only thing that tells a person the save
 * landed, reduced motion is on, the animation is gone, and the person waits
 * forever for feedback that already happened. So the check is a set comparison
 * over the *words the interface shows*, taken from recorded observation traces.
 *
 * It is deliberately not a timing check. There are no sleeps here and no clock
 * reads: "identical after settling" is expressed by comparing token sets over
 * whole traces, which is deterministic for any recording. The companion
 * implementation lives in `packages/eval-core/src/harness/transition-oracle.ts`;
 * this module reads traces in the same shape (`{at, state, text, visualOnly}`)
 * so a fixture can be lifted from a real recording without translation.
 *
 * Two parities are measured per pair:
 *
 *  - **information parity** — the token set of the reduced trace equals the
 *    default token set (missing tokens are "lost", extra tokens are "added");
 *  - **non-visual conveyance** — a state change whose only channel is visual
 *    (`visualOnly: true` with no text) fails, because it cannot be reduced at all.
 *
 * Fail-closed: no pairs, an empty trace, or a trace out of chronological order
 * fails. An empty trace is the shape of "we never recorded it", not of "nothing
 * to report".
 */

/** Tokens are the words a person reads; splitting on punctuation keeps clauses apart. */
export function informationTokens(trace) {
  const tokens = new Set();
  for (const observation of trace ?? []) {
    for (const piece of String(observation?.text ?? '').split(/[.;|]/)) {
      const token = piece.trim();
      if (token.length > 0) tokens.add(token);
    }
  }
  return [...tokens].sort();
}

function isOrdered(trace) {
  for (let index = 1; index < trace.length; index += 1) {
    if (!(trace[index].at >= trace[index - 1].at)) return false;
  }
  return true;
}

/**
 * @param {{pairs?: {id?: string, default?: {trace?: unknown}, reducedMotion?: {trace?: unknown}}[]}} fixture
 * @returns {{status: 'pass' | 'fail', detail: string[]}}
 */
export function evaluateG6(fixture) {
  const pairs = fixture?.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return {
      status: 'fail',
      detail: ['no transition traces recorded — G6 fails closed without evidence'],
    };
  }
  const problems = [];
  let checked = 0;

  pairs.forEach((pair, index) => {
    const id = typeof pair?.id === 'string' && pair.id.length > 0 ? pair.id : `pair-${index + 1}`;
    const baseline = pair?.default?.trace;
    const reduced = pair?.reducedMotion?.trace;
    if (!Array.isArray(baseline) || baseline.length === 0) {
      problems.push(`${id}: no default-motion trace (fail-closed)`);
      return;
    }
    if (!Array.isArray(reduced) || reduced.length === 0) {
      problems.push(`${id}: no reduced-motion trace (fail-closed)`);
      return;
    }
    if (!isOrdered(baseline) || !isOrdered(reduced)) {
      problems.push(`${id}: trace observations are not in chronological order (fail-closed)`);
      return;
    }
    checked += 1;

    const before = informationTokens(baseline);
    const after = informationTokens(reduced);
    const beforeSet = new Set(before);
    const afterSet = new Set(after);
    const lost = before.filter((token) => !afterSet.has(token));
    const added = after.filter((token) => !beforeSet.has(token));
    if (lost.length > 0) {
      problems.push(`${id}: reduced-motion-information-lost — ${lost.join(' | ')}`);
    }
    if (added.length > 0) {
      problems.push(`${id}: reduced-motion-information-added — ${added.join(' | ')}`);
    }

    for (const [label, trace] of [
      ['default', baseline],
      ['reduced-motion', reduced],
    ]) {
      trace.forEach((observation, step) => {
        const visualOnly = observation?.visualOnly === true;
        const silent = String(observation?.text ?? '').trim().length === 0;
        if (visualOnly && silent) {
          problems.push(
            `${id}: state conveyed only visually in ${label} trace at step ${step + 1} (no text token)`,
          );
        }
      });
    }
  });

  if (problems.length > 0) return { status: 'fail', detail: problems };
  return {
    status: 'pass',
    detail: [
      `${checked} trace pair(s) carry identical information tokens with no visual-only state`,
    ],
  };
}
