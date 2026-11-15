#!/usr/bin/env node
/**
 * check-roadmap.mjs (T1009) — fail the build when ROADMAP.md's milestone table
 * disagrees with TASKS.json, which alone owns task status.
 *
 * Usage:
 *   node scripts/check-roadmap.mjs           # check (exit 1 on drift)
 *   node scripts/check-roadmap.mjs --write   # regenerate the table in place
 *
 * The table lives between the `roadmap:table start` / `end` markers, so
 * `--write` only touches that block: the narrative around it stays hand-written.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkRoadmap, withGeneratedTable } from './lib/roadmap.mjs';

const ROOT = process.cwd();
const ROADMAP = join(ROOT, 'ROADMAP.md');
const write = process.argv.includes('--write');

const tasksDoc = JSON.parse(readFileSync(join(ROOT, 'TASKS.json'), 'utf8'));
const roadmapText = readFileSync(ROADMAP, 'utf8');

if (write) {
  const next = withGeneratedTable(roadmapText, tasksDoc);
  if (next === roadmapText) {
    console.log('[INFO] roadmap table already current');
  } else {
    writeFileSync(ROADMAP, next);
    console.log('[PASS] roadmap table regenerated from TASKS.json');
  }
  process.exit(0);
}

const result = checkRoadmap({ tasksDoc, roadmapText });

console.log('SUS roadmap consistency');
console.log('============================================================');
if (result.ok) {
  console.log(
    `[PASS] ROADMAP.md agrees with TASKS.json — ${result.rows} milestone rows, ${result.milestones} milestones`,
  );
  console.log('============================================================');
  console.log('VERDICT: roadmap consistent.');
  process.exit(0);
}

for (const violation of result.violations) {
  console.log(`[FAIL] ${violation.code} — ${violation.detail}`);
}
console.log('============================================================');
console.log('VERDICT: roadmap drifted from the canonical task document.');
console.log('Fix: node scripts/check-roadmap.mjs --write (then review the diff).');
process.exit(1);
