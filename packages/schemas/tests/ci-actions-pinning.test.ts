/**
 * Issue #14 deliverable 5 — supply chain: every third-party workflow action is
 * pinned to a reviewed commit SHA, with the tag it was resolved from written
 * beside it.
 *
 * Why this is a test rather than a comment: a floating "@v4" re-points whenever
 * the upstream maintainer moves the tag, so the code that runs on push is not
 * the code anyone reviewed. The SHAs below were resolved from the tags with
 * `gh api` on 2026-11-16 and are recorded here so a reviewer can re-resolve them
 * and see whether the tree moved. A comment cannot fail; this file can.
 *
 * The pins were added while closing issue #14 (T1016) and are a hygiene control
 * only: they change nothing about what CI runs, and they do not widen release
 * authority (T1005 stays owner-only, T1006 still verifies the checkpoint).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const WORKFLOW_PATH = '.github/workflows/ci.yml';
const WORKFLOW = readFileSync(WORKFLOW_PATH, 'utf8');

/** A reviewed commit SHA, spelled out — never a tag or a branch name. */
const COMMIT_SHA = /^[0-9a-f]{40}$/;

/**
 * The three actions this workflow uses, and the commit each tag resolved to on
 * 2026-11-16. Kept as data so re-resolution is a one-line comparison rather than
 * an archaeology exercise.
 */
const RESOLVED = [
  { action: 'actions/checkout', tag: 'v4.4.0', sha: '11d5960a326750d5838078e36cf38b85af677262' },
  { action: 'actions/setup-node', tag: 'v4.4.0', sha: '49933ea5288caeca8642d1e84afbd3f7d6820020' },
  { action: 'pnpm/action-setup', tag: 'v4.3.0', sha: 'b906affcce14559ad1aafd4ab0e942779e9f58b1' },
];

type UseLine = { line: number; uses: string; comment: string };

/** Every "uses:" step in the workflow, with its inline comment separated out. */
function useLines(text: string): UseLine[] {
  const out: UseLine[] = [];
  text.split('\n').forEach((raw, index) => {
    const match = /^\s*-(?:\s*)uses:\s*(.+)$/.exec(raw);
    if (match === null) return;
    const body = match[1] ?? '';
    const [ref, ...rest] = body.split('#');
    out.push({ line: index + 1, uses: (ref ?? '').trim(), comment: rest.join('#').trim() });
  });
  return out;
}

/** Splits "owner/repo@ref" into its two halves; null for local or docker steps. */
function parseRemote(uses: string): { action: string; ref: string } | null {
  if (uses.startsWith('./') || uses.startsWith('docker://')) return null;
  const at = uses.lastIndexOf('@');
  if (at === -1) return null;
  return { action: uses.slice(0, at), ref: uses.slice(at + 1) };
}

const USES = useLines(WORKFLOW);

describe('the workflow pins every third-party action to a commit', () => {
  it('finds the steps it is supposed to guard', () => {
    expect(USES.length).toBeGreaterThanOrEqual(12);
    expect(USES.map((u) => u.uses).join(' ')).toContain('actions/checkout@');
  });

  it('uses a full 40-character commit, never a movable tag or branch', () => {
    const floating = USES.filter((u) => {
      const parsed = parseRemote(u.uses);
      return parsed !== null && !COMMIT_SHA.test(parsed.ref);
    });
    // A tag like v4, a branch like main, or a short SHA all fail here.
    expect(floating.map((u) => u.line + ': ' + u.uses)).toEqual([]);
  });

  it('names the tag each commit was resolved from, so re-resolution is possible', () => {
    const unlabelled = USES.filter((u) => {
      const parsed = parseRemote(u.uses);
      if (parsed === null) return false;
      return !/^v\d+\.\d+\.\d+/.test(u.comment);
    });
    expect(unlabelled.map((u) => u.line + ': ' + u.uses)).toEqual([]);
  });

  it('pins to the same commit this repository recorded when it resolved the tags', () => {
    for (const expected of RESOLVED) {
      const matching = USES.filter((u) => (parseRemote(u.uses)?.action ?? '') === expected.action);
      expect(matching.length).toBeGreaterThan(0);
      for (const used of matching) {
        expect(parseRemote(used.uses)?.ref).toBe(expected.sha);
        // The comment names the tag, so a reader can check the pin upstream.
        expect(used.comment.startsWith(expected.tag)).toBe(true);
      }
    }
  });

  it('runs no mutable docker tag', () => {
    const docker = USES.filter((u) => u.uses.startsWith('docker://'));
    expect(docker.filter((u) => /:latest$|:main$|:master$/.test(u.uses))).toEqual([]);
  });
});

/**
 * T1048 (audit finding T1003-3): the host-smoke step is the only CI surface that exercises the
 * audit entry point end to end, and its own name promises "fails the build if any check fails".
 * Under GitHub's default run shell (`bash -e`, no pipefail) a `| tee` pipe reports tee's status,
 * so a failing smoke used to ship green — a vacuous check in exactly the failure mode this
 * repository treats as serious. A comment cannot fail; this file can.
 */
describe('the host-smoke step can actually fail the build (T1048)', () => {
  const smokeLine = (): { line: number; text: string } | null => {
    const lines = WORKFLOW.split('\n');
    const index = lines.findIndex((raw) => raw.includes('smoke-host.mjs'));
    return index === -1 ? null : { line: index + 1, text: lines[index] ?? '' };
  };

  it('runs the smoke by redirection, never piped into another command', () => {
    const step = smokeLine();
    expect(step).not.toBeNull();
    expect(step?.text).toMatch(/smoke-host\.mjs\s*>\s*\S+/);
    expect(step?.text).not.toContain('|');
  });

  it('still writes the JSON receipt the job documents', () => {
    expect(smokeLine()?.text).toContain('$RUNNER_TEMP/smoke.json');
  });
});

/** T1075 (audit finding T1003-31): the header comment may not claim more than the triggers do. */
describe('the workflow header matches its triggers (T1003-31)', () => {
  const header = WORKFLOW.split('\n').slice(0, 8).join('\n');

  it('scopes the main claim to the push trigger, since pull_request builds PR merge commits', () => {
    expect(header).toContain('push trigger ignores main');
    expect(header).not.toContain('main is never built here');
  });
});
