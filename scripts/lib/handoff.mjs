/**
 * Handoff consistency (Issue #12) — the pure checks behind `check-handoff.mjs`.
 *
 * A green CI badge is not evidence that cross-agent handoff metadata agrees with
 * reality: this repository once reported "63 of 97 done" in STATE.md while
 * TASKS.json said 67, described a public repository as "never public", and
 * declared "no product code exists" with 67 build tasks complete. Those are not
 * cosmetic — a mixed-host `continue` reads them as instructions.
 *
 * So the checks live here as pure functions over structured inputs, with codes a
 * test can assert on, and the CLI is a thin wrapper. Free-text regexes over
 * prose are avoided wherever a structured field exists.
 */

/** `TASKS.json (79 of 100 done)` → { done: 79, total: 100 }. */
export function parseStateDoneCount(stateText) {
  const match = /TASKS\.json \((\d+) of (\d+) done/.exec(String(stateText ?? ''));
  if (!match) return null;
  return { done: Number(match[1]), total: Number(match[2]) };
}

/** Counts task statuses from the canonical document. */
export function countTasks(tasksDoc) {
  const tasks = Array.isArray(tasksDoc?.tasks) ? tasksDoc.tasks : [];
  const counts = { done: 0, pending: 0, review: 0, blocked: 0, total: tasks.length };
  for (const task of tasks) {
    if (task?.status in counts) counts[task.status] += 1;
  }
  return counts;
}

/**
 * Violations the build must fail on. Each carries a stable `code` so a negative
 * fixture can assert the *reason*, not just "it failed".
 */
export function checkHandoff({ tasksDoc, stateText, repoPublic = true }) {
  const violations = [];
  const counts = countTasks(tasksDoc);
  const stateCount = parseStateDoneCount(stateText);

  // 1. Done-count drift between the canonical authority and the handoff view.
  if (!stateCount) {
    violations.push({
      code: 'state-count-missing',
      detail:
        'STATE.md does not state "TASKS.json (N of M done)"; a handoff without a count cannot be checked',
    });
  } else {
    if (stateCount.done !== counts.done) {
      violations.push({
        code: 'state-count-drift',
        detail: `STATE.md says ${stateCount.done} done, TASKS.json has ${counts.done}`,
      });
    }
    if (stateCount.total !== counts.total) {
      violations.push({
        code: 'state-total-drift',
        detail: `STATE.md says ${stateCount.total} tasks, TASKS.json has ${counts.total}`,
      });
    }
  }

  // 2. Metadata that contradicts the tree.
  const note = String(tasksDoc?.meta?.note ?? '');
  if (counts.done > 0 && /no product code exists/i.test(note)) {
    violations.push({
      code: 'meta-claims-no-code',
      detail: `meta.note says "no product code exists" while ${counts.done} build tasks are done`,
    });
  }
  if (counts.done > 0 && /planning progress only/i.test(note)) {
    violations.push({
      code: 'meta-planning-only',
      detail:
        'meta.note still describes statuses as "planning progress only" after build tasks completed',
    });
  }

  // 3. Visibility: a public repository must not be described as never-public in
  //    active guidance. "Not product-published" is a different fact and is fine.
  if (repoPublic) {
    for (const claim of tasksDoc?.meta?.visibilityClaims ?? []) {
      if (claim?.file && /never public|private only|not public/i.test(String(claim.text ?? ''))) {
        violations.push({
          code: 'stale-visibility',
          detail: `${claim.file}: "${claim.text}" contradicts public repository visibility (D34)`,
        });
      }
    }
  }

  // 4. Leases must be structurally usable: a lease without an owner or task, or
  //    a lease on a finished task, cannot be honoured by a resuming agent.
  for (const task of tasksDoc?.tasks ?? []) {
    const lease = task?.lease;
    if (!lease) continue;
    if (!lease.owner || !lease.expiresAt) {
      violations.push({
        code: 'invalid-lease',
        detail: `${task.id}: lease has no owner or no expiry`,
      });
    }
    if (task.status === 'done') {
      violations.push({
        code: 'lease-on-done-task',
        detail: `${task.id}: finished task still holds a lease`,
      });
    }
  }

  return { ok: violations.length === 0, counts, stateCount, violations };
}

/**
 * Parses the active-guidance claims a repository declares about itself, so the
 * checker reads structured data instead of grepping prose in CI.
 */
export function activeVisibilityClaims({
  files,
  patterns = [/never public|private only|not public/i],
}) {
  return files
    .flatMap(({ file, text }) =>
      String(text ?? '')
        .split('\n')
        .map((line) => {
          // A line that *records* an earlier decision ("supersedes D30's never
          // public") is history, not active guidance: the append-only decision
          // log must keep its wording. Only live claims fail the build.
          if (/supersed/i.test(line)) return null;
          const hit = patterns.map((pattern) => pattern.exec(line)).find(Boolean);
          return hit ? { file, text: hit[0] } : null;
        })
        .filter(Boolean),
    )
    .filter(Boolean);
}
