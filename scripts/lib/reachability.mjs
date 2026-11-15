/**
 * T1001 — reachability (audit H6): every non-M10 task must be in the ancestry.
 *
 * The failure this prevents is quiet and expensive: a task marked `done` in
 * TASKS.json whose work exists only in a summary, or in a commit that was
 * rebased away. Then the "complete build" claim is a claim about a document.
 *
 * Reachability is deliberately *textual over the commit log*: a task id in an
 * ancestry commit message is the cheapest evidence that exists in git itself,
 * and it cannot be forged by editing TASKS.json. Milestone M10 tasks are exempt
 * because they are the wrap-up (regression, benchmark, docs, final push) whose
 * receipts are the deliverable.
 */

/** Canonical task id pattern (max two lowercase letters of suffix). */
export const TASK_ID = /\bT\d{3,4}[a-z]{0,2}\b/g;

export function extractTaskIds(text) {
  const found = String(text ?? '').match(TASK_ID) ?? [];
  return [...new Set(found)];
}

/**
 * Three legitimate kinds of backing, strongest first. A commit that names the
 * task is the cleanest; a receipt is a durable file in the tree; the task's own
 * delivered files are the work itself. What is *not* accepted is a TASKS.json
 * status with nothing behind it — that is the H6 failure.
 */
export function backingFor(task, inLog, exists) {
  const id = task?.id;
  if (typeof id !== 'string') return null;
  if (inLog.has(id)) return 'commit';
  if (exists(`.sus-dev/VERIFICATION/${id}.md`)) return 'receipt';
  const files = Array.isArray(task.files) ? task.files : [];
  if (files.some((file) => typeof file === 'string' && exists(file))) return 'files';
  // Read-only tasks (T0001 and friends) deliver no file of their own but record
  // evidence paths in the tree; that evidence existing is their backing.
  const evidence = Array.isArray(task.evidence) ? task.evidence : [];
  if (evidence.some((path) => typeof path === 'string' && exists(path))) return 'evidence';
  return null;
}

/**
 * @param {{tasks: object[], logText: string, exists?: (path: string) => boolean}} input
 * @returns {{reachable: object[], missing: string[], exempt: string[], checked: number, byBasis: Record<string, number>}}
 */
export function checkReachability({ tasks, logText, exists = () => false }) {
  const inLog = new Set(extractTaskIds(logText));
  const reachable = [];
  const missing = [];
  const exempt = [];
  const byBasis = { commit: 0, receipt: 0, files: 0, evidence: 0 };
  const list = Array.isArray(tasks) ? tasks : [];
  for (const task of list) {
    const id = task?.id;
    if (typeof id !== 'string') continue;
    if (task.m === 'M10') {
      exempt.push(id);
      continue;
    }
    const basis = backingFor(task, inLog, exists);
    if (basis) {
      reachable.push({ id, basis });
      byBasis[basis] += 1;
    } else {
      missing.push(id);
    }
  }
  return { reachable, missing, exempt, checked: reachable.length + missing.length, byBasis };
}

/**
 * Only tasks that claim to be finished need to be reachable; a pending or
 * blocked task legitimately has no commit. Kept as a separate filter so the
 * rule is visible rather than buried in the loop above.
 */
export function awaitableTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter(
    (task) => task?.status === 'done' && task?.m !== 'M10',
  );
}
