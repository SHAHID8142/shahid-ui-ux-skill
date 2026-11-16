#!/usr/bin/env node
/**
 * review-index.mjs (T1029, issue #19) — an inventory of the open review pull requests.
 *
 * Seven `review/*` PRs have been open since 2026-11-13, and two of them edit `TASKS.json`,
 * `ROADMAP.md`, `HANDOFF.md` and `docs/OWNER_DECISIONS_LOG.md`. Merging one of those today would
 * overwrite canonical state with a snapshot of the planning baseline — that is the risk this index
 * exists to make visible. It never merges, closes or deletes anything: closing a review PR is an
 * owner/maintenance decision.
 *
 * The inventory is rendered from a committed snapshot (`evals/governance/review-prs.json`) so it is
 * reproducible offline and the doc cannot drift from the facts it claims; `--check` fails when they
 * disagree.
 *
 * Usage: node scripts/governance/review-index.mjs [--write|--check]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SNAPSHOT = join(ROOT, 'evals', 'governance', 'review-prs.json');
const DOC = join(ROOT, 'docs', 'RELEASE_REVIEW_INDEX.md');

/** Files whose changes would overwrite canonical project state rather than add a report. */
const CANONICAL_STATE = [
  'TASKS.json',
  'ROADMAP.md',
  'HANDOFF.md',
  'docs/OWNER_DECISIONS_LOG.md',
  'docs/EFFECTIVE_REQUIREMENTS.json',
];

export function classify(pull) {
  const stateFiles = pull.files.filter((path) => CANONICAL_STATE.includes(path));
  const reportFiles = pull.files.filter((path) => path.startsWith('reviews/'));
  const targetsReviewBranch = String(pull.base).startsWith('review/');
  if (stateFiles.length > 0) {
    return {
      kind: 'state-overwriting',
      stateFiles,
      action:
        'keep the report, do not merge: the PR rewrites canonical state from an old baseline; close it as superseded (owner/maintenance decision) or cherry-pick the report file only',
    };
  }
  if (targetsReviewBranch) {
    return {
      kind: 'targets-review-branch',
      stateFiles: [],
      action: 'retarget at `main` if the report is still wanted, otherwise close as superseded',
    };
  }
  if (reportFiles.length === pull.files.length) {
    return {
      kind: 'report-only',
      stateFiles: [],
      action:
        'safe to keep as an external record; its findings are already triaged in docs/DEEP_AUDIT_* and the issue backlog',
    };
  }
  return {
    kind: 'mixed',
    stateFiles: [],
    action:
      'read the diff before any merge; it is neither a pure report nor purely canonical state',
  };
}

export function renderIndex(snapshot) {
  const pulls = [...snapshot.pulls].sort((a, b) => a.number - b.number);
  const counts = pulls.reduce((acc, pull) => {
    const kind = classify(pull).kind;
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  }, {});
  const lines = [
    '# Release review index — open review pull requests',
    '',
    '> Generated from `evals/governance/review-prs.json` by `scripts/governance/review-index.mjs`.',
    '> Do not edit by hand; `pnpm review:index` fails when this page and the snapshot disagree.',
    `> Snapshot captured ${snapshot.capturedAt} with \`${snapshot.query}\`.`,
    '',
    'This page is an inventory, not an instruction. **Nothing here is merged, closed or deleted by an',
    'agent**: closing a review PR is an owner/maintenance decision (issue #19 item 1).',
    '',
    `**${pulls.length}** open review PRs — ` +
      Object.entries(counts)
        .map(([kind, count]) => `${count} ${kind}`)
        .join(', ') +
      '.',
    '',
    '| PR | Base | Head | Snapshot | Files | Classification | Recommended action |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const pull of pulls) {
    const verdict = classify(pull);
    lines.push(
      `| [#${pull.number}](https://github.com/${snapshot.repository}/pull/${pull.number}) | \`${pull.base}\` | \`${pull.head}\` | \`${pull.headSha.slice(0, 8)}\` (${pull.createdAt.slice(0, 10)}) | ${pull.files.length} | **${verdict.kind}**${verdict.stateFiles.length > 0 ? ` (touches ${verdict.stateFiles.map((path) => `\`${path}\``).join(', ')})` : ''} | ${verdict.action} |`,
    );
  }
  lines.push(
    '',
    '## Why "state-overwriting" is the dangerous class',
    '',
    'Those PRs were written against the planning baseline (`main` at `6ea7fb7`). Their',
    '`TASKS.json`/`ROADMAP.md`/`HANDOFF.md`/`OWNER_DECISIONS_LOG.md` edits describe a repository that',
    'no longer exists: 123 tasks and M11/M12 have happened since. Merging one would not "bring in a',
    'review", it would revert the canonical record to an older snapshot while keeping the code — the',
    'worst of both. The reports themselves stay reachable on their branches and in git history.',
    '',
    '## What the owner is being asked for',
    '',
    '- a decision to close the superseded PRs (individually or as a batch), and',
    '- a maintenance policy for `review/*` branches: keep, archive, or delete after the report is',
    '  copied into `reviews/independent/` on `main`.',
    '',
    'Until then the PRs stay open, which is a known, recorded state — not an accident.',
    '',
  );
  return lines.join('\n');
}

function main(argv) {
  const write = argv.includes('--write');
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  const markdown = renderIndex(snapshot);

  if (write) {
    writeFileSync(DOC, markdown);
    console.log(`[WROTE] docs/RELEASE_REVIEW_INDEX.md (${snapshot.pulls.length} review PRs)`);
    return 0;
  }
  const problems = [];
  if (!existsSync(DOC)) problems.push(`${DOC} is missing`);
  else if (readFileSync(DOC, 'utf8') !== markdown)
    problems.push('docs/RELEASE_REVIEW_INDEX.md drifted from the snapshot');
  if (problems.length > 0) {
    for (const problem of problems) console.log(`[FAIL] ${problem}`);
    console.log('Fix: node scripts/governance/review-index.mjs --write (then review the diff).');
    console.log('VERDICT: review index is inconsistent.');
    return 1;
  }
  console.log(
    `VERDICT: review index matches its snapshot (${snapshot.pulls.length} PRs, ${snapshot.pulls.filter((pull) => classify(pull).kind === 'state-overwriting').length} would overwrite canonical state).`,
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('review-index.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
