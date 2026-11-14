#!/usr/bin/env node
/**
 * check-handoff.mjs (Issue #12) — fail the build when handoff metadata disagrees
 * with the canonical task document or with repository visibility.
 *
 * Checks, all structured (no grepping of narrative text):
 *  1. STATE.md's done/total count matches TASKS.json;
 *  2. `meta.note` does not claim "no product code exists" / "planning only";
 *  3. active guidance does not describe the repository as private when it is
 *     public (D34), while "not yet product-published" stays allowed;
 *  4. leases are structurally usable (owner + expiry) and absent on done tasks.
 *
 * Exit 0 = consistent, 1 = violations (printed with codes).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { activeVisibilityClaims, checkHandoff } from './lib/handoff.mjs';

const ROOT = process.cwd();
const read = (relative) => {
  try {
    return readFileSync(join(ROOT, relative), 'utf8');
  } catch {
    return '';
  }
};

const tasksDoc = JSON.parse(read('TASKS.json'));
const stateText = read('.sus-dev/STATE.md');

/**
 * The repository is public (owner decision D34, 2026-11-14). This constant is
 * the single place the build asserts it, so flipping it is a deliberate act.
 */
const REPO_PUBLIC = true;

// Files that must not contradict visibility. Each entry states what the file is
// for, so a failure points at a place a person can fix.
const POLICY_FILES = [
  { file: 'AGENTS.md', text: read('AGENTS.md') },
  { file: 'HANDOFF.md', text: read('HANDOFF.md') },
  { file: 'docs/AGENT_CONTINUE_PROTOCOL.md', text: read('docs/AGENT_CONTINUE_PROTOCOL.md') },
  { file: 'docs/EFFECTIVE_REQUIREMENTS.json', text: read('docs/EFFECTIVE_REQUIREMENTS.json') },
  { file: 'package.json', text: read('package.json') },
  { file: '.github/workflows/ci.yml', text: read('.github/workflows/ci.yml') },
];

// Historical wording is exempt where the line records a supersession, so the
// append-only decision history survives; live claims fail the build.
const stale = activeVisibilityClaims({
  files: POLICY_FILES,
  patterns: [
    /never public/i,
    /\b\(private\)/i,
    /Private; not published/i,
    /private dev-branch only/i,
  ],
});

const result = checkHandoff({
  tasksDoc: {
    ...tasksDoc,
    meta: { ...tasksDoc.meta, visibilityClaims: stale },
  },
  stateText,
  repoPublic: REPO_PUBLIC,
});

const lines = [];
lines.push('handoff consistency');
lines.push('='.repeat(60));
lines.push(
  `[INFO] TASKS.json: ${result.counts.done} done / ${result.counts.total} total` +
    (result.stateCount
      ? ` | STATE.md: ${result.stateCount.done} / ${result.stateCount.total}`
      : ' | STATE.md: no count'),
);
lines.push(
  `[INFO] repository visibility: ${REPO_PUBLIC ? 'public (D34), product unpublished' : 'private'}`,
);

if (result.ok) {
  lines.push('[PASS] handoff metadata agrees with the canonical task document');
} else {
  for (const violation of result.violations) {
    lines.push(`[FAIL] ${violation.code}: ${violation.detail}`);
  }
}

console.log(lines.join('\n'));
console.log('='.repeat(60));
if (!result.ok) {
  console.error('VERDICT: HANDOFF INCONSISTENT — reconcile before continuing.');
  process.exit(1);
}
console.log('VERDICT: handoff consistent.');
