/**
 * Blind judge protocol machinery (T0155).
 *
 * Sessions anonymize submissions (secret A/B mapping, shuffled order), record
 * per-axis judge scores, and compute agreement between recorded passes.
 * Agreement target (proposed, calibration-dependent): per-axis exact-match
 * >= 0.8 OR mean abs diff <= 1.0; below-target axes are flagged, never
 * silently accepted. Judged scores never gate CI (tier rule).
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RUBRIC_AXES } from '@sus/schemas';

export interface JudgeSubmission {
  /** Public label used in evidence (e.g. a subject path). */
  label: string;
  /** The judge-facing material: structure + measured metrics summary. */
  material: string;
}

export interface JudgeSession {
  id: string;
  createdAt: string;
  /** SECRET until reveal: alias -> real label. */
  mapping: Record<string, string>;
  /** Presentation order for this session. */
  order: string[];
  axes: typeof RUBRIC_AXES;
}

export interface JudgePass {
  judgeId: string;
  passId: string;
  recordedAt: string;
  scores: Record<string, Record<string, number>>; // alias -> axis -> 1..5
}

export interface AxisAgreement {
  axis: string;
  exactMatchRate: number;
  meanAbsDiff: number;
  belowTarget: boolean;
}

export interface AgreementReport {
  session: string;
  pairsCompared: number;
  targetExact: number;
  targetMeanAbsDiff: number;
  axes: AxisAgreement[];
  belowTargetAxes: string[];
  method: string;
}

export function createJudgeSession(dir: string, submissions: JudgeSubmission[]): JudgeSession {
  if (submissions.length < 2) throw new Error('judge session needs >= 2 submissions');
  const aliases = submissions.map((_, i) => String.fromCharCode(65 + i)); // A, B, C...
  // shuffled presentation order (deterministic per session id draw)
  const order = [...aliases].sort(() => Math.random() - 0.5);
  const session: JudgeSession = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    mapping: Object.fromEntries(aliases.map((a, i) => [a, submissions[i]!.label])),
    order,
    axes: [...RUBRIC_AXES],
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'session.json'), `${JSON.stringify(session, null, 2)}\n`);
  // judge-facing material without the mapping
  writeFileSync(
    join(dir, 'materials.json'),
    `${JSON.stringify(Object.fromEntries(aliases.map((a, i) => [a, submissions[i]!.material])), null, 2)}\n`,
  );
  writeFileSync(join(dir, 'passes.jsonl'), '');
  return session;
}

export function recordPass(
  dir: string,
  judgeId: string,
  scores: Record<string, Record<string, number>>,
): JudgePass {
  const session = JSON.parse(readFileSync(join(dir, 'session.json'), 'utf8')) as JudgeSession;
  for (const [alias, axisScores] of Object.entries(scores)) {
    if (!(alias in session.mapping)) throw new Error(`unknown alias "${alias}"`);
    for (const axis of Object.keys(axisScores)) {
      if (!session.axes.includes(axis as never)) throw new Error(`unknown axis "${axis}"`);
      const v = axisScores[axis]!;
      if (!Number.isInteger(v) || v < 1 || v > 5)
        throw new Error(`score for ${alias}.${axis} out of 1..5`);
    }
    for (const axis of session.axes) {
      if (!(axis in axisScores)) throw new Error(`missing axis "${axis}" for ${alias}`);
    }
  }
  const pass: JudgePass = {
    judgeId,
    passId: randomUUID(),
    recordedAt: new Date().toISOString(),
    scores,
  };
  appendFileSync(join(dir, 'passes.jsonl'), `${JSON.stringify(pass)}\n`);
  return pass;
}

export function computeAgreement(
  dir: string,
  targetExact = 0.8,
  targetMeanAbsDiff = 1.0,
): AgreementReport {
  const lines = readFileSync(join(dir, 'passes.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as JudgePass);
  if (lines.length < 2) throw new Error('agreement needs >= 2 recorded passes');
  // compare consecutive passes pairwise (intra-judge when same judgeId)
  const axesAgreement: AxisAgreement[] = [];
  const aliases = Object.keys(
    JSON.parse(readFileSync(join(dir, 'session.json'), 'utf8')).mapping as Record<string, string>,
  );
  const pairs = lines.length - 1;
  for (const axis of RUBRIC_AXES) {
    let exact = 0;
    let total = 0;
    let diffSum = 0;
    for (let i = 0; i < pairs; i += 1) {
      for (const alias of aliases) {
        const a = lines[i]!.scores[alias]?.[axis];
        const b = lines[i + 1]!.scores[alias]?.[axis];
        if (a === undefined || b === undefined) continue;
        total += 1;
        if (a === b) exact += 1;
        diffSum += Math.abs(a - b);
      }
    }
    if (total === 0) throw new Error(`no comparable scores for axis ${axis}`);
    const exactMatchRate = exact / total;
    const meanAbsDiff = diffSum / total;
    axesAgreement.push({
      axis,
      exactMatchRate,
      meanAbsDiff,
      belowTarget: exactMatchRate < targetExact && meanAbsDiff > targetMeanAbsDiff,
    });
  }
  return {
    session: session0Id(dir),
    pairsCompared: pairs,
    targetExact,
    targetMeanAbsDiff,
    axes: axesAgreement,
    belowTargetAxes: axesAgreement.filter((a) => a.belowTarget).map((a) => a.axis),
    method:
      'consecutive-pass per-axis comparison (exact-match rate + mean abs diff); intra-judge self-consistency when one judgeId',
  };
}

function session0Id(dir: string): string {
  const s = JSON.parse(readFileSync(join(dir, 'session.json'), 'utf8')) as JudgeSession;
  return s.id;
}
