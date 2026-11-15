/**
 * Roadmap consistency (T1009) — ROADMAP.md is a *view* of TASKS.json, never a
 * second authority.
 *
 * Why this exists: on 2026-11-15 the public repository's ROADMAP.md still called
 * M1 through M10 "pending" and said "T0101 next" while TASKS.json held 100 of 102
 * tasks done. A reader — or a resuming agent — would have concluded the build had
 * not started. Hand-written status tables always drift, so the table is generated
 * from the canonical document and the build fails when the two disagree.
 *
 * The checks live here as pure functions over structured inputs, with stable
 * codes, and `scripts/check-roadmap.mjs` is a thin wrapper (same shape as
 * `lib/handoff.mjs`, so the two checkers are read the same way).
 */

/**
 * Milestone scope descriptions. Only the *words* live here — status, task counts
 * and pending ids are always computed from TASKS.json, so this list cannot go
 * stale, only incomplete (and an unlisted milestone is a violation).
 */
export const MILESTONES = [
  { id: 'M0', scope: 'Discovery, gap analysis, ADRs, WBS' },
  { id: 'M1', scope: 'Repo skeleton, test runner, CI, schema versioning' },
  {
    id: 'M1.5',
    scope: '**Evaluation Spine** (rubric, harness, baselines, calibration, gate registry)',
  },
  { id: 'M2', scope: 'Portable skill core (SKILL.md, router, JIT loader, CLI)' },
  {
    id: 'M3',
    scope: 'Research honesty + anti-slop (evidence, taxonomy, scanner, corpus, trend loop)',
  },
  {
    id: 'M4',
    scope: 'Design intelligence (direction reasoning, tokens, foundations, launch playbooks)',
  },
  {
    id: 'M5',
    scope: 'Progressive workflow (contracts, state machine, locks, gates, learning loop)',
  },
  { id: 'M5.5', scope: 'Hardening matrix' },
  { id: 'M6', scope: 'Motion system (state-machine schema, tokens, tests)' },
  { id: 'M7', scope: 'Studio: dual-stack spike → slice → event contract → verification loop' },
  { id: 'M8', scope: 'Studio hardening + second-wave playbooks' },
  { id: 'M9', scope: 'Adapters + installer + support matrix + dogfood sites' },
  { id: 'M10', scope: 'Regression, benchmark, independent review, docs, release' },
];

/** Milestone ids in the order the roadmap lists them. */
export function milestoneIds() {
  return MILESTONES.map((milestone) => milestone.id);
}

const tasksOf = (tasksDoc) => (Array.isArray(tasksDoc?.tasks) ? tasksDoc.tasks : []);

const isDone = (task) => task?.status === 'done';

/**
 * Per-milestone progress computed from TASKS.json: `{ id, done, total, pending }`.
 * `pending` lists the task ids still open, so the roadmap can name them rather
 * than implying everything is finished.
 */
export function summariseMilestones(tasksDoc) {
  const tasks = tasksOf(tasksDoc);
  return MILESTONES.map(({ id }) => {
    const mine = tasks.filter((task) => task?.m === id);
    return {
      id,
      done: mine.filter(isDone).length,
      total: mine.length,
      pending: mine.filter((task) => !isDone(task)).map((task) => task?.id ?? '?'),
    };
  });
}

/** The status cell: done only when every planned task of that milestone is done. */
export function statusCell({ done, total, pending }) {
  if (total === 0) return '**no tasks planned yet**';
  if (done === total) return `**done** — ${done}/${total}`;
  return `**${done}/${total} done** — pending: ${pending.join(', ')}`;
}

/** `T0101–T0109 (9 tasks)` from the ids actually present, or a count when empty. */
export function tasksCell(tasksDoc) {
  const tasks = tasksOf(tasksDoc);
  return (id) => {
    const ids = tasks.filter((task) => task?.m === id).map((task) => task?.id ?? '');
    if (ids.length === 0) return '—';
    const sorted = [...ids].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return first === last ? `${first} (1 task)` : `${first}–${last} (${sorted.length} tasks)`;
  };
}

/** The whole table body, as markdown rows. */
export function renderRoadmapTable(tasksDoc) {
  const summaries = new Map(summariseMilestones(tasksDoc).map((row) => [row.id, row]));
  const cell = tasksCell(tasksDoc);
  return MILESTONES.map(({ id, scope }) => {
    const summary = summaries.get(id);
    return `| ${id} | ${scope} | ${cell(id)} | ${statusCell(summary)} |`;
  });
}

const TABLE_HEADER = ['| Milestone | Scope | Tasks | Status |', '|---|---|---|---|'];

export const TABLE_START =
  '<!-- roadmap:table start — generated from TASKS.json by `node scripts/check-roadmap.mjs --write` -->';
export const TABLE_END = '<!-- roadmap:table end -->';

/** Header + generated rows + markers, as the block that belongs in ROADMAP.md. */
export function renderRoadmapBlock(tasksDoc) {
  return [TABLE_START, ...TABLE_HEADER, ...renderRoadmapTable(tasksDoc), TABLE_END].join('\n');
}

/**
 * The rows ROADMAP.md actually contains, parsed into `{ id, tasks, status }`.
 * Parsing keeps the checker honest about presentation: it compares what a reader
 * sees, not what a helper function would have printed.
 */
export function parseRoadmapTable(roadmapText) {
  const rows = [];
  for (const line of String(roadmapText ?? '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('| M')) continue;
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4) continue;
    // The header row also begins with "| M"; only a real milestone id counts.
    if (!/^M\d+(\.\d+)?$/.test(cells[0])) continue;
    rows.push({ id: cells[0], tasks: cells[2], status: cells[3] });
  }
  return rows;
}

/**
 * Violations the build must fail on. `codes` are stable so a negative fixture can
 * assert the *reason* a roadmap is rejected, not merely that it was.
 */
export function checkRoadmap({ tasksDoc, roadmapText, countClaimFiles = [] }) {
  const violations = [];
  const text = String(roadmapText ?? '');
  const rows = parseRoadmapTable(text);
  const byId = new Map(rows.map((row) => [row.id, row]));
  const summaries = summariseMilestones(tasksDoc);
  const cell = tasksCell(tasksDoc);

  if (!text.includes(TABLE_START) || !text.includes(TABLE_END)) {
    violations.push({
      code: 'roadmap-markers-missing',
      detail:
        'ROADMAP.md has no generated-table markers, so its status column cannot be kept in step with TASKS.json',
    });
  }

  // A milestone that exists in TASKS.json but not in the table (or vice versa) is
  // drift the counts would not reveal.
  for (const summary of summaries) {
    const row = byId.get(summary.id);
    if (!row) {
      violations.push({
        code: 'roadmap-milestone-missing',
        detail: `${summary.id} has ${summary.total} task(s) in TASKS.json but no row in ROADMAP.md`,
      });
      continue;
    }
    const expectedStatus = statusCell(summary);
    if (row.status !== expectedStatus) {
      violations.push({
        code: 'roadmap-status-stale',
        detail: `${summary.id} says "${row.status}" but TASKS.json gives "${expectedStatus}"`,
      });
    }
    const expectedTasks = cell(summary.id);
    if (row.tasks !== expectedTasks) {
      violations.push({
        code: 'roadmap-tasks-stale',
        detail: `${summary.id} lists "${row.tasks}" but TASKS.json gives "${expectedTasks}"`,
      });
    }
  }

  // Tasks assigned to a milestone nobody documents must not vanish silently.
  const documented = new Set(milestoneIds());
  const orphans = new Set();
  for (const task of tasksOf(tasksDoc)) {
    const milestone = task?.m;
    if (milestone && !documented.has(milestone)) orphans.add(milestone);
  }
  for (const milestone of orphans) {
    violations.push({
      code: 'roadmap-milestone-undocumented',
      detail: `TASKS.json assigns tasks to ${milestone}, which MILESTONES in scripts/lib/roadmap.mjs does not describe`,
    });
  }

  violations.push(...checkCountClaims({ tasksDoc, files: countClaimFiles }));

  return {
    ok: violations.length === 0,
    rows: rows.length,
    milestones: summaries.length,
    violations,
  };
}

/**
 * Documents that may state a "N of M done" figure. The count has drifted twice in
 * this repository (STATE.md, then docs/BUILD_COMPLETION_HANDOFF.md saying "97 of
 * 100"), and a public page that under-reports progress is what a reader acts on.
 * Documents that describe a past revision must not carry a live count at all —
 * that is why the fix there is to remove the number, not to update it.
 */
export const COUNT_CLAIM_FILES = [
  'README.md',
  'ROADMAP.md',
  'HANDOFF.md',
  'docs/BUILD_COMPLETION_HANDOFF.md',
];

const COUNT_CLAIM = /(\d+)\s+of\s+(\d+)\s+done/g;

/** Every `N of M done` claim in `text`, as `{ done, total }`. */
export function parseCountClaims(text) {
  return [...String(text ?? '').matchAll(COUNT_CLAIM)].map((match) => ({
    done: Number(match[1]),
    total: Number(match[2]),
  }));
}

/** Violations for a count claim that disagrees with TASKS.json. */
export function checkCountClaims({ tasksDoc, files }) {
  const violations = [];
  const tasks = tasksOf(tasksDoc);
  const done = tasks.filter(isDone).length;
  const total = tasks.length;
  for (const { file, text } of files ?? []) {
    for (const claim of parseCountClaims(text)) {
      if (claim.done === done && claim.total === total) continue;
      violations.push({
        code: 'count-claim-stale',
        detail: `${file} says "${claim.done} of ${claim.total} done" but TASKS.json has ${done} of ${total}`,
      });
    }
  }
  return violations;
}

/** ROADMAP.md with its generated table replaced. Used by `--write`. */
export function withGeneratedTable(roadmapText, tasksDoc) {
  const text = String(roadmapText ?? '');
  const block = renderRoadmapBlock(tasksDoc);
  const start = text.indexOf(TABLE_START);
  const end = text.indexOf(TABLE_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('ROADMAP.md has no generated-table markers to replace');
  }
  return `${text.slice(0, start)}${block}${text.slice(end + TABLE_END.length)}`;
}
