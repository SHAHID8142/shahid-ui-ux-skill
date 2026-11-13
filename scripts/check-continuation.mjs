#!/usr/bin/env node
/**
 * SUS continuation/status checker (T0010).
 *
 * Diagnoses whether a fresh agent can resume this workspace safely.
 * It never mutates the repository. Exit codes:
 *   0 = safe to continue (state consistent, tree clean)
 *   1 = cannot resume safely (inconsistent state — read failures, fix or recover)
 *   2 = resume requires task-recovery review (dirty tree / unpushed divergence,
 *       expected mid-task; compare tracked changes with TASKS.json intention)
 *
 * Honesty contract: this checker reports facts about files and Git. It cannot
 * verify that a test was actually run; it only checks that recorded claims are
 * self-consistent and that referenced evidence exists. Recovery decisions stay
 * with the agent per docs/AGENT_CONTINUE_PROTOCOL.md §1.3.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const results = [];

function sh(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function check(name, ok, detail, severity) {
  // severity: 'fail' = inconsistency (exit 1), 'recover' = needs review (exit 2),
  // 'info' = informational only. The verdict is computed from results at the end.
  const mark = ok
    ? 'PASS'
    : severity === 'info'
      ? 'INFO'
      : severity === 'recover'
        ? 'REVIEW'
        : 'FAIL';
  results.push({ mark, name, detail: ok ? (detail ?? '') : (detail ?? 'condition not met') });
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
  } catch {
    return null;
  }
}

function readText(path) {
  try {
    return readFileSync(join(ROOT, path), 'utf8');
  } catch {
    return null;
  }
}

// ---------- 1. required continuation files ----------
const REQUIRED_FILES = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'HANDOFF.md',
  'TASKS.json',
  'ROADMAP.md',
  'docs/AGENT_CONTINUE_PROTOCOL.md',
  'docs/OWNER_DECISIONS_LOG.md',
  'docs/EFFECTIVE_REQUIREMENTS.json',
  'docs/TASK_RECORD_CONTRACT.md',
  'docs/REVIEW_RECONCILIATION.md',
  '.sus-dev/STATE.md',
  '.sus-dev/SESSION_LOG.md',
  '.sus-dev/BLOCKERS.md',
];
for (const f of REQUIRED_FILES) {
  check(`required file: ${f}`, existsSync(join(ROOT, f)), 'present', 'fail');
}

// ---------- 2. TASKS.json structure ----------
const tasksDoc = readJson('TASKS.json');
let tasks = [];
if (tasksDoc && Array.isArray(tasksDoc.tasks)) {
  tasks = tasksDoc.tasks;
  check('TASKS.json parses; tasks is an array', true, `${tasks.length} tasks`, 'fail');
  const meta = tasksDoc.meta ?? {};
  check(
    'TASKS.json meta has canonical fields',
    Boolean(meta.product && meta.version && meta.build_gate && meta.protocol),
    `version=${meta.version ?? 'missing'}`,
    'fail',
  );
} else {
  check('TASKS.json parses; tasks is an array', false, 'missing or malformed', 'fail');
}

// ---------- 3. task records: fields, unique IDs, status vocabulary ----------
const ID_RE = /^T\d{3,4}[a-z]{0,2}$/;
const STATUSES = new Set(['pending', 'review', 'done', 'blocked']);
const REQUIRED_FIELDS = [
  'm',
  'title',
  'obj',
  'deps',
  'files',
  'acc',
  'tests',
  'risk',
  'rollback',
  'status',
];
const ids = new Set();
if (tasks.length > 0) {
  for (const t of tasks) {
    if (!ID_RE.test(String(t.id))) {
      check(`task ID format: ${t.id}`, false, 'does not match T####[a-z] pattern', 'fail');
    }
    if (ids.has(t.id)) check(`task ID unique: ${t.id}`, false, 'duplicate ID', 'fail');
    ids.add(t.id);
    if (!STATUSES.has(t.status)) {
      check(`task status vocabulary: ${t.id}`, false, `unknown status "${t.status}"`, 'fail');
    }
    const missing = REQUIRED_FIELDS.filter((f) => t[f] === undefined || t[f] === null);
    if (missing.length > 0) {
      check(`task required fields: ${t.id}`, false, `missing: ${missing.join(', ')}`, 'fail');
    }
    if (t.status === 'blocked' && !String(t.approval ?? '') && !String(t.risk ?? '')) {
      // a blocked task must name its blocker somewhere; the record contract requires
      // an explicit blocker reference rather than an invented status
      check(`blocked task cites a blocker: ${t.id}`, false, 'no blocker reference found', 'fail');
    }
  }
  check('task ID uniqueness + ID format', sawNoDuplicate(ids, tasks), '', 'fail');
}

function sawNoDuplicate(ids, tasks) {
  const seen = new Set();
  for (const t of tasks) {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
  }
  return true;
}

// ---------- 4. dependency graph ----------
if (tasks.length > 0) {
  const dangling = [];
  for (const t of tasks) {
    for (const d of t.deps ?? []) {
      if (!ids.has(d)) dangling.push(`${t.id} -> ${d}`);
    }
  }
  check(
    'no dangling dependencies',
    dangling.length === 0,
    dangling.length === 0 ? '' : `dangling: ${dangling.join(', ')}`,
    'fail',
  );

  // acyclicity via Kahn's algorithm
  const indeg = new Map(tasks.map((t) => [t.id, 0]));
  const adj = new Map(tasks.map((t) => [t.id, []]));
  for (const t of tasks) {
    for (const d of t.deps ?? []) {
      if (adj.has(d)) {
        adj.get(d).push(t.id);
        indeg.set(t.id, indeg.get(t.id) + 1);
      }
    }
  }
  let queue = [...indeg.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.pop();
    visited += 1;
    for (const next of adj.get(id) ?? []) {
      indeg.set(next, indeg.get(next) - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  check(
    'dependency graph acyclic',
    visited === tasks.length,
    visited === tasks.length ? '' : `${tasks.length - visited} tasks in a cycle`,
    'fail',
  );
}

// ---------- 5. done tasks have existing, consistent evidence ----------
for (const t of tasks) {
  if (t.status !== 'done') continue;
  const ev = t.evidence ?? [];
  check(`done task ${t.id} records evidence`, ev.length > 0, 'evidence present', 'fail');
  for (const e of ev) {
    if (!existsSync(join(ROOT, e))) {
      check(`evidence exists: ${t.id} -> ${e}`, false, 'referenced artifact missing', 'fail');
    }
  }
  const receipts = ev.filter((e) => e.startsWith('.sus-dev/VERIFICATION/') && e.endsWith('.md'));
  for (const r of receipts) {
    const text = readText(r);
    if (text === null) continue; // already flagged above
    const namesTask = text.includes(t.id);
    check(`receipt ${r} names its task (${t.id})`, namesTask, '', 'fail');
    const failVerdict = /=\s*fail\b|verdict:\s*fail\b|=\s*not-run\b(?!\w)/i.test(text);
    check(
      `receipt ${r} records no bare fail/not-run verdict for done task ${t.id}`,
      !failVerdict,
      failVerdict ? 'done task receipt contains a failing verdict — investigate' : '',
      'fail',
    );
    check(
      `receipt ${r} records a pass verdict for done task ${t.id}`,
      /pass/i.test(text),
      '',
      'fail',
    );
  }
}

// ---------- 6. gate consistency ----------
const er = readJson('docs/EFFECTIVE_REQUIREMENTS.json');
if (er) {
  const perm = er.build_permission === true;
  const decisions = readText('docs/OWNER_DECISIONS_LOG.md') ?? '';
  const aperioRecorded = /APERIO/.test(decisions) && /BUILD_PERMISSION = true/.test(decisions);
  check(
    'EFFECTIVE_REQUIREMENTS.build_permission matches recorded APERIO decision',
    perm === aperioRecorded,
    perm === aperioRecorded ? '' : 'manifest and decisions log disagree about the build gate',
    'fail',
  );
  const meta = tasksDoc?.meta ?? {};
  const gateAgrees = perm
    ? /received/i.test(String(meta.build_gate ?? ''))
    : !/received/i.test(String(meta.build_gate ?? ''));
  check(
    'TASKS.json meta.build_gate agrees with build_permission',
    gateAgrees,
    gateAgreeDetail(perm, meta.build_gate),
    'fail',
  );
  const adopted = (er.proposals ?? []).every((p) => /adopted/i.test(String(p.status)));
  check(
    'ADR proposals carry recorded adoption (D29)',
    adopted,
    adopted ? '' : 'a proposal lacks an adopted status',
    'fail',
  );
}
function gateAgreeDetail(perm, gate) {
  return `build_permission=${perm}, meta.build_gate="${gate}"`;
}

// ---------- 7. Git state ----------
const gitOk = sh('git', ['rev-parse', '--is-inside-work-tree']) === 'true';
check('inside a git work tree', gitOk, '', 'fail');
if (gitOk) {
  const dirty = sh('git', ['status', '--porcelain=v1']) ?? '';
  const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  const conflicts = sh('git', ['diff', '--check']);
  check(
    'working tree clean',
    dirty === '',
    dirty === ''
      ? ''
      : `${dirty.split('\n').filter(Boolean).length} changed path(s) — resume needs task-recovery review`,
    'recover',
  );
  check(
    'no conflict markers staged/unstaged',
    conflicts === null || conflicts === '',
    conflicts ?? '',
    'fail',
  );

  const state = readText('.sus-dev/STATE.md') ?? '';
  const mBranch = state.match(/^Branch:\s*([^\s,.;]+)/m);
  if (mBranch) {
    check(
      'STATE.md branch matches actual branch',
      mBranch[1] === branch,
      mBranch[1] === branch ? '' : `STATE says "${mBranch[1]}", actual "${branch}"`,
      'info',
    );
  } else {
    check('STATE.md records a branch', false, 'no "Branch:" line found', 'fail');
  }

  // unpushed commits: normal during build (D26/D30) — informational, not a failure
  const upstream = sh('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (upstream) {
    const ahead = Number.parseInt(
      sh('git', ['rev-list', '--count', `${upstream}..HEAD`]) ?? '0',
      10,
    );
    check(
      'unpushed commits reported for checkpoint policy',
      true,
      ahead > 0
        ? `${ahead} local commit(s) ahead of ${upstream} — push checkpoint per D30`
        : 'in sync',
      'info',
    );
  } else {
    check(
      'branch has an upstream',
      true,
      `branch "${branch}" has no upstream — push -u per D30 if needed`,
      'info',
    );
  }

  // other worktrees: historical review worktrees are expected; dirty ones need review
  const wt = (sh('git', ['worktree', 'list', '--porcelain']) ?? '').split('\n').filter(Boolean);
  check(
    'git worktrees listed',
    true,
    `${wt.filter((l) => l.startsWith('worktree ')).length} worktree(s) — historical review worktrees are expected`,
    'info',
  );
}

// ---------- 8. tooling ----------
check(
  'node present',
  typeof process.versions.node === 'string',
  `node ${process.versions.node}`,
  'info',
);
const pnpm = sh('pnpm', ['--version']);
check(
  'pnpm present (workspace tasks)',
  pnpm !== null,
  pnpm ? `pnpm ${pnpm}` : 'pnpm not found — workspace tasks will fail',
  'info',
);

// ---------- 9. stale lease ----------
for (const t of tasks) {
  if (t.lease) {
    const state = readText('.sus-dev/STATE.md') ?? '';
    const session = String(t.lease.session ?? '');
    check(
      `lease on ${t.id} is recorded in STATE.md`,
      state.includes(session),
      state.includes(session)
        ? ''
        : `lease session "${session}" not found in STATE.md — stale lease, investigate before takeover`,
      'fail',
    );
  }
}

// ---------- report ----------
console.log('SUS continuation checker');
console.log('='.repeat(60));
for (const r of results) {
  const line = `[${r.mark}] ${r.name}`;
  console.log(line);
  if (r.detail) console.log(`       ${r.detail}`);
}
console.log('='.repeat(60));
const fails = results.filter((r) => r.mark === 'FAIL').length;
const reviews = results.filter((r) => r.mark === 'REVIEW').length;
if (fails > 0) {
  console.log(
    `VERDICT: CANNOT RESUME SAFELY — ${fails} inconsistency(ies). Fix recorded state or recover the affected task(s) per protocol §1.3. Do not blindly continue.`,
  );
  process.exit(1);
}
if (reviews > 0) {
  console.log(
    `VERDICT: RESUME REQUIRES TASK-RECOVERY REVIEW — working tree is not clean. Compare tracked changes with the recorded task intention; complete or revert only those changes.`,
  );
  process.exit(2);
}
console.log(
  'VERDICT: SAFE TO CONTINUE — read AGENTS.md, then STATE.md for the next eligible task.',
);
process.exit(0);
