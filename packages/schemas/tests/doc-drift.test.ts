/**
 * T1026 (issue #17) — the drift gate must fail on the exact contradictions that shipped under a
 * green CI, and must not fail on a clean tree or on a document that says it is historical.
 *
 * Each negative fixture reproduces one of the five items from the issue using the pre-fix text, so
 * the test proves the checker catches the real thing rather than a synthetic variant of it.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script module without published types beyond the local .d.mts
import {
  HISTORICAL_DOCUMENTS,
  LIVE_DOCUMENTS,
  checkDocDrift,
} from '../../../scripts/lib/doc-drift.mjs';

const tasks = [
  { id: 'T1021', status: 'done', m: 'M11' },
  { id: 'T1024', status: 'done', m: 'M11' },
  { id: 'T1026', status: 'pending', m: 'M12' },
];

const compatibility = {
  rows: [
    {
      host: 'freepi',
      evidenceState: 'verified',
      evidence: { ref: 'evals/host-smoke/freepi-ab82c994d5fd.json (PASS)' },
    },
    {
      host: 'zcode',
      evidenceState: 'stale',
      evidence: { ref: 'evals/host-smoke/zcode-b061cc4.json' },
    },
  ],
};

/**
 * The pre-fix text of a document.
 *
 * CI checks out shallow (fetch-depth 1), so `git show <old revision>:<path>` is not available there.
 * The fallback is the verbatim pre-fix line rather than a paraphrase; the git lookup is used when the
 * history is present, which keeps the fixture honest on a full clone and runnable everywhere.
 */
function preFixTextFile(path: string, revision: string, fallback: string): string {
  try {
    return execFileSync('git', ['show', `${revision}:${path}`], { encoding: 'utf8' });
  } catch {
    return fallback;
  }
}

const PRE_FIX_BESTPRACTICE = `position \`/sus audit\` holds. The five measured example classes (T1024) remain \`pending\` in
\`TASKS.json\` as milestone **M11**.`;

const PRE_FIX_COVERAGE = `| FreePi CLI | experimental | smoke PASS 8/8 against the current artefact (\`evals/host-smoke/freepi-51ad458af6e0.json\`); Live Studio not exercised there |`;

function rules(findings: { rule: string }[]): string[] {
  return [...new Set(findings.map((finding) => finding.rule))].sort();
}

describe('live-document drift checks', () => {
  it('accepts the current repository documents', () => {
    // The real task document and the real compatibility record: a fixture here would pass while the
    // repository drifts, which is the failure mode this gate exists for.
    const files = Object.fromEntries(
      LIVE_DOCUMENTS.map((path) => [path, readFileSync(path, 'utf8')]),
    );
    for (const path of HISTORICAL_DOCUMENTS) files[path] = readFileSync(path, 'utf8');
    const findings = checkDocDrift({
      tasks: JSON.parse(readFileSync('TASKS.json', 'utf8')).tasks,
      files,
      compatibility: JSON.parse(readFileSync('docs/compatibility.json', 'utf8')),
      expectedBuildCompletePushed: true,
    });
    expect(findings).toEqual([]);
  });

  it('catches issue #17 item 1: the machine-readable build flag contradicting STATE.md', () => {
    const findings = checkDocDrift({
      tasks,
      files: { 'docs/EFFECTIVE_REQUIREMENTS.json': '{"build_complete_pushed": false}' },
      expectedBuildCompletePushed: true,
    });
    expect(rules(findings)).toEqual(['build-flag-contradiction']);
  });

  it('catches issue #17 item 2: a done task still called pending in active docs', () => {
    // The pre-fix line, taken from history rather than paraphrased.
    const old = preFixTextFile('docs/BESTPRACTICE_COMMAND.md', 'cef440b~1', PRE_FIX_BESTPRACTICE);
    expect(old).toMatch(/T1024/);
    const findings = checkDocDrift({
      tasks,
      files: { 'docs/BESTPRACTICE_COMMAND.md': old },
    });
    expect(rules(findings)).toContain('stale-task-claim');
  });

  it('catches issue #17 item 3: a host row citing superseded smoke evidence', () => {
    const old = preFixTextFile('docs/COVERAGE_MATRIX.md', 'cef440b~1', PRE_FIX_COVERAGE);
    expect(old).toContain('freepi-51ad458af6e0');
    const findings = checkDocDrift({
      tasks,
      files: { 'docs/COVERAGE_MATRIX.md': old },
      compatibility,
    });
    expect(rules(findings)).toContain('stale-host-evidence');
  });

  it('catches issue #17 item 4: a historical handoff presented as current status', () => {
    const findings = checkDocDrift({
      tasks,
      files: {
        'docs/BUILD_COMPLETION_HANDOFF.md': '# Build completion handoff\n\nStatus: complete.',
      },
    });
    expect(rules(findings)).toEqual(['historical-document-unmarked']);
  });

  it('leaves a document alone once it says it is historical', () => {
    const findings = checkDocDrift({
      tasks,
      files: {
        'docs/BUILD_COMPLETION_HANDOFF.md':
          '# Handoff\n\n> **Historical checkpoint.** T1024 is pending at this revision.\n',
      },
    });
    expect(findings).toEqual([]);
  });

  it('catches a hand-maintained count that no longer matches TASKS.json', () => {
    const findings = checkDocDrift({
      tasks,
      files: { 'docs/LIMITATIONS.md': 'Right now 116 of 118 tasks done.' },
    });
    expect(rules(findings)).toEqual(['stale-count-claim']);
  });

  it('catches a pending task described as done', () => {
    const findings = checkDocDrift({
      tasks,
      files: { 'docs/AUDIT_COMMAND.md': 'T1026 is complete and shipped.' },
    });
    expect(rules(findings)).toEqual(['premature-task-claim']);
  });
});
