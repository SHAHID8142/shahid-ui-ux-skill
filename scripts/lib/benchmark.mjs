/**
 * T1002 — benchmark protocol machinery (PRD Part 9).
 *
 * The rules a comparative claim has to satisfy are code here, not prose,
 * because the expensive failure is a sentence like "SUS beats X" assembled from
 * a partial run. Three pieces:
 *
 *  - **sealing**: held-out briefs are identified by hash, so the protocol can
 *    show they were never edited after being set aside;
 *  - **power**: the requested sample size is computed from stated assumptions,
 *    so "n ≥ 20" is a floor with an argument rather than a magic number;
 *  - **claim gate**: a comparative claim is permitted only when every arm has
 *    measured data and the human arm is complete.
 */
import { createHash } from 'node:crypto';

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Hashes of the held-out briefs. Content is never inlined into the report. */
export function sealBriefs(entries) {
  const seals = {};
  for (const entry of entries) seals[entry.name] = sha256(entry.content);
  return seals;
}

/** A seal that no longer matches means the held-out set was edited — fatal. */
export function checkSeals(seals, entries) {
  const drifted = [];
  const missing = [];
  for (const [name, seal] of Object.entries(seals ?? {})) {
    const entry = entries.find((candidate) => candidate.name === name);
    if (!entry) {
      missing.push(name);
      continue;
    }
    if (sha256(entry.content) !== seal) drifted.push(name);
  }
  return { drifted, missing, ok: drifted.length === 0 && missing.length === 0 };
}

/**
 * Two-sample sample size per arm for a mean difference (normal approximation,
 * two-sided). Returns the per-arm n, rounded up.
 *
 * Assumptions are inputs, not defaults hidden in the function: a protocol that
 * does not state its effect size and variance has not stated a sample size.
 */
export function sampleSizePerArm({ effect, sd, alpha = 0.05, power = 0.8 }) {
  if (!(effect > 0)) throw new Error('effect must be positive');
  if (!(sd > 0)) throw new Error('sd must be positive');
  const zAlpha = inverseNormal(1 - alpha / 2);
  const zBeta = inverseNormal(power);
  const n = (2 * (zAlpha + zBeta) ** 2 * sd ** 2) / effect ** 2;
  return Math.ceil(n);
}

/** Acklam's inverse normal CDF approximation — accurate enough for design work. */
export function inverseNormal(p) {
  if (!(p > 0 && p < 1)) throw new Error('p must be in (0,1)');
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;
  let q;
  let r;
  if (p < low) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > high) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  q = p - 0.5;
  r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

export const REQUIRED_ARMS = ['baseline', 'sus-assisted', 'human'];

/**
 * The claim gate. Every arm must have measured data; the human arm must be
 * complete; and the run must be reproducible. Anything less is `false`, and the
 * docs must then say exactly what was measured and what was not.
 */
export function comparativeClaimAllowed(status) {
  const arms = status?.arms ?? {};
  const reasons = [];
  for (const arm of REQUIRED_ARMS) {
    const state = arms[arm]?.status;
    if (state !== 'measured') reasons.push(`${arm}: ${state ?? 'absent'}`);
  }
  if (status?.heldOutInspected !== false) reasons.push('held-out set was inspected');
  if (status?.reproducibleBy !== 'pnpm benchmark')
    reasons.push('run is not reproducible by one command');
  return { allowed: reasons.length === 0, reasons };
}
