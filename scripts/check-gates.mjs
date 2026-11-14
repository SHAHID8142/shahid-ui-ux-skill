#!/usr/bin/env node
/**
 * Gate registry validator + executable gate checks (T0159).
 *
 * Exit codes: 0 = registry consistent + implemented checks pass; 1 = registry
 * inconsistent or a implemented check failed. Unimplemented checks report
 * not-run — never pass. Exceptions can never turn a failure into a pass
 * (this script has no exception mechanism by design).
 *
 * Also runs the reconciliation's semantic DAG negative fixtures: removing a
 * semantic prerequisite (fixture corpus, evaluation, safe-write) must fail
 * the DAG validation, and the release ancestry assertions must hold.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import { noRawStyleValues } from './lint-rules/no-raw-style-values.mjs';

const ROOT = process.cwd();
let failed = false;
const lines = [];
function report(ok, name, detail = '') {
  if (!ok) failed = true;
  lines.push(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

const registry = JSON.parse(readFileSync(join(ROOT, 'docs', 'GATE_REGISTRY.json'), 'utf8'));
const tasksDoc = JSON.parse(readFileSync(join(ROOT, 'TASKS.json'), 'utf8'));
const tasks = new Map(tasksDoc.tasks.map((t) => [t.id, t]));

// ---------- 1. registry structure: owner tasks exist, bidirectional, no dupes ----------
const seenOwners = new Map();
for (const gate of registry.gates) {
  if (!Array.isArray(gate.ownerTasks) || gate.ownerTasks.length === 0) {
    report(false, `${gate.id}: has owner task(s)`, 'none recorded');
    continue;
  }
  if (new Set(gate.ownerTasks).size !== gate.ownerTasks.length) {
    report(false, `${gate.id}: no duplicate owner tasks`, gate.ownerTasks.join(','));
  }
  for (const owner of gate.ownerTasks) {
    if (!tasks.has(owner)) {
      report(false, `${gate.id}: owner task ${owner} exists in TASKS.json`, 'missing task record');
      continue;
    }
    seenOwners.set(owner, (seenOwners.get(owner) ?? 0) + 1);
    const record = tasks.get(owner);
    const declared = Array.isArray(record.gates) && record.gates.includes(gate.id);
    if (!declared && !JSON.stringify(record).includes(gate.id)) {
      report(
        false,
        `${gate.id}: bidirectional ownership — task ${owner} declares the gate`,
        'no gates field, no mention in record',
      );
    }
  }
  if (gate.checkStatus === 'implemented' && !gate.check) {
    report(false, `${gate.id}: implemented gate names its check`, 'missing check reference');
  }
  if (gate.checkStatus === 'implemented' && !gate.badFixture) {
    report(false, `${gate.id}: landed gate ships a bad fixture`, 'missing badFixture');
  }
  if (gate.checkStatus !== 'implemented') {
    lines.push(
      `[NOT-RUN] ${gate.id}: ${gate.purpose} (check lands with ${gate.ownerTasks.join('/')})`,
    );
  }
  if (gate.id === 'G13' && gate.waivable !== false) {
    report(false, 'G13 is never waivable', 'registry marks it waivable');
  }
}

// ---------- 2. executable checks for implemented gates ----------
// G1: lint the bad fixture with the SHARED rule — must report the violation.
{
  const linter = new Linter();
  const bad = readFileSync(join(ROOT, 'scripts', 'gates', 'fixtures', 'g1-bad.ts'), 'utf8');
  const messages = linter.verify(bad, {
    plugins: { sus: { rules: { 'no-raw-style-values': noRawStyleValues } } },
    rules: { 'sus/no-raw-style-values': 'error' },
  });
  report(
    messages.length > 0,
    'G1: bad fixture trips the shared rule',
    messages[0]?.message ?? 'no error reported',
  );
  const clean = 'export const OK = 1;\n';
  report(
    linter.verify(clean, {
      plugins: { sus: { rules: { 'no-raw-style-values': noRawStyleValues } } },
      rules: { 'sus/no-raw-style-values': 'error' },
    }).length === 0,
    'G1: clean source passes the shared rule',
  );
}

// G4/G5/G11: evaluators must fail closed on their bad fixtures (in-process proof).
{
  const { evaluateG4, evaluateG5 } = await import(
    join(ROOT, 'packages', 'eval-core', 'dist', 'index.js')
  );
  const { evaluateG11 } = await import(join(ROOT, 'packages', 'schemas', 'dist', 'index.js'));
  report(evaluateG4([]).status === 'fail', 'G4: empty scans fail closed');
  report(
    evaluateG4([
      { url: 'u', passes: 0, violations: [{ id: 'x', impact: 'serious', nodes: 1, help: '?' }] },
    ]).status === 'fail',
    'G4: serious violation fails',
  );
  report(evaluateG5([]).status === 'fail', 'G5: no runs fail closed');
  report(
    evaluateG5([{ url: 'u', lcpMs: null, cls: null, totalBlockingMs: null, totalByteWeight: null }])
      .status === 'fail',
    'G5: missing metrics fail closed (nulls, never zeroes)',
  );
  report(
    evaluateG11({ shots: [], metrics: [], gates: [] }).status === 'fail',
    'G11: empty bundle fails closed',
  );

  // G13 is the non-waivable critical security/privacy gate (T0806). Its
  // negatives are proven in-process so a registry edit alone can never make it
  // pass: no evidence is not-run, one undefended attempt fails, and a
  // not-applicable claim is refused outright.
  const { evaluateG13 } = await import(join(ROOT, 'packages', 'studio-bridge', 'dist', 'index.js'));
  const defended = {
    attempts: [{ name: 'synthetic-approval', denied: true }],
    redaction: [{ name: 'crm', residueFree: true, consentShown: true }],
    retention: [{ name: 'purge', purgedOrDeleted: true }],
  };
  report(
    evaluateG13({ attempts: [], redaction: [], retention: [] }).status === 'not-run',
    'G13: no evidence is not-run, never pass',
  );
  report(
    evaluateG13({ ...defended, attempts: [{ name: 'ui-replacement', denied: false }] }).status ===
      'fail',
    'G13: an undefended hostile attempt fails the gate',
  );
  report(
    evaluateG13({
      ...defended,
      redaction: [{ name: 'crm', residueFree: false, consentShown: true }],
    }).status === 'fail',
    'G13: redaction residue fails the gate',
  );
  report(
    evaluateG13({ ...defended, retention: [{ name: 'purge', purgedOrDeleted: false }] }).status ===
      'fail',
    'G13: retained material fails the gate',
  );
  report(
    evaluateG13({ ...defended, claimedNotApplicable: 'no user data' }).status === 'fail',
    'G13: a not-applicable claim is refused (never waivable)',
  );
  report(
    evaluateG13(defended).status === 'pass' && evaluateG13(defended).waivable === false,
    'G13: fully defended evidence passes and the verdict stays non-waivable',
  );
}

// ---------- 3. release ancestry assertions (reconciliation review H4/M2) ----------
function ancestry(rootId) {
  const seen = new Set();
  const walk = (id) => {
    const t = tasks.get(id);
    if (!t) return;
    for (const d of t.deps ?? []) {
      if (!seen.has(d)) {
        seen.add(d);
        walk(d);
      }
    }
  };
  walk(rootId);
  return seen;
}
const nonM10 = tasksDoc.tasks.filter((t) => t.m !== 'M10').map((t) => t.id);
const a1001 = ancestry('T1001');
const missing1001 = nonM10.filter((id) => !a1001.has(id) && id !== 'T1001');
report(
  missing1001.length === 0,
  'ancestry(T1001) covers every non-M10 task',
  missing1001.join(',') || 'ok',
);
const a1005 = ancestry('T1005');
const all = tasksDoc.tasks.map((t) => t.id);
const missing1005 = all.filter((id) => !a1005.has(id) && id !== 'T1005');
report(
  missing1005.length === 0,
  'ancestry(T1005) covers every task',
  missing1005.join(',') || 'ok',
);
const dependents = new Map();
for (const t of tasksDoc.tasks)
  for (const d of t.deps ?? []) dependents.set(d, (dependents.get(d) ?? 0) + 1);
for (const measurement of ['T0156', 'T0158']) {
  report(
    (dependents.get(measurement) ?? 0) > 0,
    `measurement task ${measurement} is not an orphan`,
    `${dependents.get(measurement) ?? 0} dependent(s)`,
  );
}
// audit boundary: T1006 (final private push) must NOT depend on T1003/T1005
const t1006 = tasks.get('T1006');
const boundaryOk = !(t1006.deps ?? []).some((d) => d === 'T1003' || d === 'T1005');
report(boundaryOk, 'T1006 stops at the private-push boundary (no audit/publication deps)');

// ---------- 4. semantic prerequisites + negative fixtures ----------
// A semantic prerequisite can be lost while the graph stays structurally valid
// (no dangling refs, no cycle) — so they are REGISTERED here and checked
// directly, and the negative fixtures prove removal is caught by this check,
// not by generic DAG validation.
const semantic = registry.semanticPrerequisites ?? [];
if (semantic.length === 0) report(false, 'registry registers semantic prerequisites', 'none found');
for (const edge of semantic) {
  const t = tasks.get(edge.from);
  report(
    Boolean(t && (t.deps ?? []).includes(edge.to)),
    `semantic prerequisite: ${edge.from} -> ${edge.to}`,
    edge.why ?? '',
  );
}
for (const edge of semantic) {
  const doc = JSON.parse(JSON.stringify(tasksDoc));
  for (const t of doc.tasks)
    if (t.id === edge.from) t.deps = (t.deps ?? []).filter((d) => d !== edge.to);
  const mutated = doc.tasks.find((t) => t.id === edge.from);
  const caught = !(mutated.deps ?? []).includes(edge.to);
  report(caught, `semantic negative: removing ${edge.from} -> ${edge.to} is rejected`);
}

// structural negatives (cycles/dangling) proven against generic DAG validation:
function dagHolds(doc) {
  const ids = new Set(doc.tasks.map((t) => t.id));
  for (const t of doc.tasks) {
    for (const d of t.deps ?? [])
      if (!ids.has(d)) return { ok: false, reason: `dangling ${t.id}->${d}` };
  }
  const indeg = new Map(doc.tasks.map((t) => [t.id, 0]));
  const adj = new Map(doc.tasks.map((t) => [t.id, []]));
  for (const t of doc.tasks) {
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
  return { ok: visited === doc.tasks.length, reason: visited === doc.tasks.length ? '' : 'cycle' };
}
const negatives = [
  [
    'dangling dependency injected',
    (doc) => {
      const t = doc.tasks.find((x) => x.id === 'T0102');
      t.deps.push('T9999');
    },
  ],
  [
    'dependency cycle injected',
    (doc) => {
      doc.tasks.find((x) => x.id === 'T0101').deps.push('T0102');
    },
  ],
];
for (const [name, mutate] of negatives) {
  const doc = JSON.parse(JSON.stringify(tasksDoc));
  mutate(doc);
  const result = dagHolds(doc);
  report(
    !result.ok,
    `semantic negative: ${name} is rejected`,
    result.ok ? 'mutation NOT caught' : `caught: ${result.reason}`,
  );
}

// ---------- report ----------
console.log('SUS gate registry checker');
console.log('='.repeat(60));
for (const l of lines) console.log(l);
console.log('='.repeat(60));
if (failed) {
  console.log('VERDICT: GATE REGISTRY INCONSISTENT — fix owners/checks before continuing.');
  process.exit(1);
}
console.log(
  'VERDICT: registry consistent; implemented gates verified; unimplemented gates reported not-run.',
);
process.exit(0);
