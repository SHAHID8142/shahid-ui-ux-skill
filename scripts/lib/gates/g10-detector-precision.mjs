/**
 * G10 — detector precision and recall against a labelled corpus.
 *
 * A content scanner that fires on legitimate copy is worse than no scanner: it
 * teaches the team to ignore it. So the rule that decides whether a scanner rule
 * may ship as *blocking* is a measurement, not an opinion — how many of its
 * findings are wrong (precision) and how many defects it misses (recall), on
 * text a human has labelled.
 *
 * The fixture is that labelling: every case carries what a human said
 * (`expected`) and what the detector said (`predicted`). The module does
 * arithmetic over the confusion matrix and nothing else — no corpus reading, no
 * regex, no scanner import. That keeps the gate honest: changing a rule must
 * change the corpus labels, and changing the labels must show up here.
 *
 * Targets are supplied per run and are recorded in `docs/GATE_REGISTRY.json`
 * (`precisionTarget` / `recallTarget`), because a target that lives only inside
 * the checker can be lowered by editing the checker. The checker compares against
 * the registry number; the registry number is the reviewed one.
 *
 * Fail-closed, in four ways: no cases, a malformed label, a target that is not a
 * number in (0, 1], and a degenerate corpus that makes a metric undefined (no
 * positives means recall cannot be measured, and "undefined" is not "perfect").
 */

const LABELS = new Set(['finding', 'clean']);

/**
 * @param {{cases?: {id?: string, expected?: unknown, predicted?: unknown, category?: string}[], precisionTarget?: unknown, recallTarget?: unknown}} fixture
 * @returns {{status: 'pass' | 'fail', detail: string[], metrics: {precision: number | null, recall: number | null, tp: number, fp: number, fn: number, tn: number}}}
 */
export function evaluateG10(fixture) {
  const emptyMetrics = { precision: null, recall: null, tp: 0, fp: 0, fn: 0, tn: 0 };
  const cases = fixture?.cases;
  const precisionTarget = fixture?.precisionTarget;
  const recallTarget = fixture?.recallTarget;

  const targetProblems = [];
  for (const [name, value] of [
    ['precisionTarget', precisionTarget],
    ['recallTarget', recallTarget],
  ]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1) {
      targetProblems.push(
        `${name} must be a number in (0, 1], got "${String(value)}" (fail-closed)`,
      );
    }
  }
  if (!Array.isArray(cases) || cases.length === 0) {
    return {
      status: 'fail',
      detail: [...targetProblems, 'no labelled cases — G10 fails closed without a corpus'],
      metrics: emptyMetrics,
    };
  }
  if (targetProblems.length > 0) {
    return { status: 'fail', detail: targetProblems, metrics: emptyMetrics };
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const problems = [];

  cases.forEach((testCase, index) => {
    const id =
      typeof testCase?.id === 'string' && testCase.id.length > 0
        ? testCase.id
        : `case-${index + 1}`;
    const expected = testCase?.expected;
    const predicted = testCase?.predicted;
    if (!LABELS.has(expected)) {
      problems.push(
        `${id}: expected label "${String(expected)}" is not finding|clean (fail-closed)`,
      );
      return;
    }
    if (!LABELS.has(predicted)) {
      problems.push(
        `${id}: predicted label "${String(predicted)}" is not finding|clean (fail-closed)`,
      );
      return;
    }
    if (expected === 'finding' && predicted === 'finding') tp += 1;
    else if (expected === 'clean' && predicted === 'finding') fp += 1;
    else if (expected === 'finding' && predicted === 'clean') fn += 1;
    else tn += 1;
  });

  if (problems.length > 0) {
    return {
      status: 'fail',
      detail: problems,
      metrics: { precision: null, recall: null, tp, fp, fn, tn },
    };
  }

  const detail = [];
  if (tp + fp === 0) {
    detail.push('precision undefined — the detector produced no findings at all (fail-closed)');
  }
  if (tp + fn === 0) {
    detail.push('recall undefined — the corpus contains no real defects (fail-closed)');
  }
  if (detail.length > 0) {
    return { status: 'fail', detail, metrics: { precision: null, recall: null, tp, fp, fn, tn } };
  }

  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const rounded = (value) => Math.round(value * 1000) / 1000;
  if (precision < precisionTarget) {
    detail.push(
      `precision ${rounded(precision)} below target ${precisionTarget} ` +
        `(${fp} false positive(s) of ${tp + fp} finding(s))`,
    );
  }
  if (recall < recallTarget) {
    detail.push(
      `recall ${rounded(recall)} below target ${recallTarget} ` +
        `(${fn} missed defect(s) of ${tp + fn})`,
    );
  }

  const metrics = { precision, recall, tp, fp, fn, tn };
  if (detail.length > 0) return { status: 'fail', detail, metrics };
  return {
    status: 'pass',
    detail: [
      `precision ${rounded(precision)} >= ${precisionTarget}, recall ${rounded(recall)} >= ` +
        `${recallTarget} over ${cases.length} labelled case(s) (${tp} tp, ${fp} fp, ${fn} fn, ${tn} tn)`,
    ],
    metrics,
  };
}
