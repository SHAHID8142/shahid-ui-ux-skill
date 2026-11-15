/**
 * T0603 — behavioural transition oracles (gate G6: motion parity).
 *
 * The playbooks declare transitions; this module asks whether a *recorded
 * interaction* behaved. The oracles therefore take observation traces, not the
 * state machine that generated them — an oracle built from the same generator
 * that produced the transitions would only ever agree with itself.
 *
 * What is checked, all on a deterministic virtual clock so the tests are not
 * timing-flaky (TASKS.json rollback: "deterministic virtual clock where
 * possible"):
 *
 *  - `flash-as-only-feedback` — a state that appeared for less than the settle
 *    window and was conveyed *only* visually (colour, shadow, pulse) without any
 *    text change. A 40 ms tint is not feedback; it is a flicker that the user
 *    cannot read and assistive technology never announces.
 *  - `state-diverged` — after the last input the UI did not converge on the
 *    expected state (including: it oscillated, or it stopped somewhere else).
 *  - `stale-async-applied` — an asynchronous result with an older sequence number
 *    was applied after a newer one. This is the out-of-order response that makes
 *    a search box show results for a query the user already replaced.
 *  - `unmount-left-interactive` — the component unmounted mid-animation but a
 *    control remained interactive in the trace.
 *  - `reduced-motion-information-lost` / `reduced-motion-information-added` — the
 *    reduced-motion trace must carry the same information tokens as the default
 *    trace. Parity is about information, not about a CSS branch (kilo M2).
 *  - `hover-only-modality` — a trace recorded with touch or keyboard relies on a
 *    state that only hover can reach, so that modality never sees it.
 *
 * Fail-closed: a case with no observations is a failure, not a skip.
 */

export type GateStatus = 'pass' | 'fail';

export interface GateVerdict {
  gate: 'G6';
  status: GateStatus;
  detail: string[];
  evidence: string[];
}

export type Modality = 'pointer-hover' | 'keyboard' | 'touch';

export interface Observation {
  /** Virtual milliseconds since the interaction began. */
  at: number;
  state: string;
  /** Text the user can actually read in this state (announced content included). */
  text: string;
  /** True when the change is carried only by colour/shadow/pulse. */
  visualOnly: boolean;
  /**
   * Sequence number of the asynchronous result this observation reflects, when
   * the state came from a request. Absent for synchronous states.
   */
  seq?: number;
  /** False once the component has unmounted (no further interaction is possible). */
  mounted?: boolean;
  /** True when the state is reachable only through hover. */
  hoverOnly?: boolean;
}

export type Scenario =
  | 'rapid-toggle'
  | 'interruption'
  | 'cancel'
  | 'stale-async'
  | 'unmount-mid-animation'
  | 'reduced-motion'
  | 'modality';

export interface OracleCase {
  id: string;
  scenario: Scenario;
  modality: Modality;
  /** Recorded observations, ordered by `at`. */
  trace: Observation[];
  /** The state the component must settle in. */
  expectedFinalState: string;
  /** For reduced-motion cases: the default-motion trace to compare against. */
  baselineTrace?: Observation[];
}

/** A state shorter than this is not perceivable as feedback. */
export const SETTLE_MS = 60;

/** Information a trace carried: the distinct non-empty texts, trimmed and ordered. */
export function informationTokens(trace: Observation[]): string[] {
  const tokens = new Set<string>();
  for (const observation of trace) {
    for (const part of observation.text.split(/[.;|]/)) {
      const token = part.trim();
      if (token) tokens.add(token);
    }
  }
  return [...tokens].sort();
}

function converges(trace: Observation[], expected: string): boolean {
  const last = trace[trace.length - 1];
  if (!last || last.state !== expected) return false;
  // stability: nothing after the final state may differ from it
  const lastIndex = trace.map((observation) => observation.state).lastIndexOf(expected);
  return trace.slice(lastIndex).every((observation) => observation.state === expected);
}

function flashOnlyFeedback(trace: Observation[]): Observation[] {
  const offenders: Observation[] = [];
  for (let index = 0; index < trace.length - 1; index += 1) {
    const current = trace[index] as Observation;
    const previous = index === 0 ? undefined : (trace[index - 1] as Observation);
    const next = trace[index + 1] as Observation;
    const duration = next.at - current.at;
    if (duration >= SETTLE_MS) continue;
    if (!current.visualOnly) continue;
    const textUnchanged = (previous?.text ?? '') === current.text && next.text === current.text;
    if (textUnchanged) offenders.push(current);
  }
  return offenders;
}

function staleAsyncApplied(trace: Observation[]): Observation[] {
  const offenders: Observation[] = [];
  let highest = -Infinity;
  for (const observation of trace) {
    if (typeof observation.seq !== 'number') continue;
    if (observation.seq < highest) offenders.push(observation);
    else highest = observation.seq;
  }
  return offenders;
}

function unmountLeftInteractive(trace: Observation[]): Observation[] {
  const unmountedAt = trace.findIndex((observation) => observation.mounted === false);
  if (unmountedAt === -1) return [];
  return trace
    .slice(unmountedAt + 1)
    .filter((observation) => observation.visualOnly || observation.state !== 'unmounted');
}

function hoverOnlyReachable(trace: Observation[], modality: Modality): Observation[] {
  if (modality === 'pointer-hover') return [];
  return trace.filter(
    (observation) => observation.hoverOnly === true && observation.state === 'hover',
  );
}

/**
 * Evaluates recorded traces and emits the G6 verdict. Multiple failures are all
 * reported: a component that flashes *and* diverges needs both fixes.
 */
export function evaluateTransitionOracles(cases: OracleCase[]): GateVerdict {
  const detail: string[] = [];
  const evidence: string[] = [];

  if (cases.length === 0) {
    return {
      gate: 'G6',
      status: 'fail',
      detail: ['no transition traces recorded — G6 fails closed without evidence'],
      evidence: [],
    };
  }

  for (const oracleCase of cases) {
    evidence.push(oracleCase.id);
    if (oracleCase.trace.length === 0) {
      detail.push(`${oracleCase.id}: no observations recorded — fails closed`);
      continue;
    }

    const ordered = [...oracleCase.trace].sort((a, b) => a.at - b.at);
    const unsorted = oracleCase.trace.some((observation, index) => observation !== ordered[index]);
    if (unsorted) detail.push(`${oracleCase.id}: trace is not ordered by time — invalid evidence`);

    for (const offender of flashOnlyFeedback(ordered)) {
      detail.push(
        `${oracleCase.id}: flash-as-only-feedback at ${offender.at}ms — "${offender.state}" was visual-only for ${SETTLE_MS}ms or less with no text change`,
      );
    }
    for (const offender of staleAsyncApplied(ordered)) {
      detail.push(
        `${oracleCase.id}: stale-async-applied at ${offender.at}ms — sequence ${offender.seq} arrived after a newer result`,
      );
    }
    for (const offender of unmountLeftInteractive(ordered)) {
      detail.push(
        `${oracleCase.id}: unmount-left-interactive at ${offender.at}ms — a control stayed interactive after unmount`,
      );
    }
    for (const offender of hoverOnlyReachable(ordered, oracleCase.modality)) {
      detail.push(
        `${oracleCase.id}: hover-only-modality at ${offender.at}ms — ${oracleCase.modality} cannot reach a hover-only state`,
      );
    }

    if (!converges(ordered, oracleCase.expectedFinalState)) {
      const last = ordered[ordered.length - 1] as Observation;
      detail.push(
        `${oracleCase.id}: state-diverged — settled in "${last.state}" but "${oracleCase.expectedFinalState}" was expected (${oracleCase.scenario})`,
      );
    }

    if (oracleCase.scenario === 'reduced-motion' && oracleCase.baselineTrace) {
      const reduced = informationTokens(ordered);
      const baseline = informationTokens(oracleCase.baselineTrace);
      const lost = baseline.filter((token) => !reduced.includes(token));
      const added = reduced.filter((token) => !baseline.includes(token));
      if (lost.length > 0) {
        detail.push(
          `${oracleCase.id}: reduced-motion-information-lost — missing ${lost.map((token) => `"${token}"`).join(', ')}`,
        );
      }
      if (added.length > 0) {
        detail.push(
          `${oracleCase.id}: reduced-motion-information-added — only reduced motion shows ${added
            .map((token) => `"${token}"`)
            .join(', ')}`,
        );
      }
    }
  }

  return {
    gate: 'G6',
    status: detail.length === 0 ? 'pass' : 'fail',
    detail:
      detail.length === 0 ? [`${cases.length} transition trace(s) pass every oracle`] : detail,
    evidence,
  };
}
