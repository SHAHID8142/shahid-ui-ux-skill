/**
 * T1029 (issue #19) — the review index must classify pulls by what they would do, not by their title.
 *
 * The concrete risk: two of the seven open review PRs edit `TASKS.json`, `ROADMAP.md`, `HANDOFF.md`
 * and the owner log. A classification that says "review report, harmless" for those would be the
 * mistake that lets a stale baseline overwrite canonical state.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script module without published types.
import { classify, renderIndex } from '../../../scripts/governance/review-index.mjs';

const pull = (overrides: Record<string, unknown> = {}) => ({
  number: 1,
  title: 'Independent review',
  base: 'main',
  head: 'review/x-2026-11-13',
  headSha: 'a'.repeat(40),
  createdAt: '2026-11-13T15:52:48Z',
  files: ['reviews/independent/x.md'],
  ...overrides,
});

const snapshot = {
  repository: 'SHAHID8142/shahid-ui-ux-skill',
  capturedAt: '2026-11-17',
  query: 'gh pr list',
  pulls: [],
};

describe('review pull-request classification', () => {
  it('calls a report-only PR report-only', () => {
    expect(classify(pull()).kind).toBe('report-only');
  });

  it('flags a PR that would overwrite canonical state, whatever its title says', () => {
    const verdict = classify(
      pull({ title: 'Independent review (harmless)', files: ['reviews/x.md', 'TASKS.json'] }),
    );
    expect(verdict.kind).toBe('state-overwriting');
    expect(verdict.stateFiles).toEqual(['TASKS.json']);
    expect(verdict.action).toMatch(/do not merge/);
  });

  it('flags a PR whose base is another review branch', () => {
    expect(classify(pull({ base: 'review/antigravity-opus-2026-11-13' })).kind).toBe(
      'targets-review-branch',
    );
  });

  it('does not treat a mixed PR as safe', () => {
    expect(classify(pull({ files: ['reviews/x.md', 'packages/eval-core/src/cli.ts'] })).kind).toBe(
      'mixed',
    );
  });

  it('renders the real snapshot with every PR classified and links to full URLs', () => {
    const real = JSON.parse(readFileSync('evals/governance/review-prs.json', 'utf8'));
    const markdown = renderIndex(real);
    for (const entry of real.pulls) {
      expect(markdown).toContain(`https://github.com/${real.repository}/pull/${entry.number}`);
      expect(markdown).toContain(entry.headSha.slice(0, 8));
    }
    expect(markdown).toContain('Nothing here is merged, closed or deleted');
  });

  it('renders the dangerous class explicitly when present', () => {
    const markdown = renderIndex({
      ...snapshot,
      pulls: [pull({ number: 2, files: ['TASKS.json', 'ROADMAP.md'] })],
    });
    expect(markdown).toContain('**state-overwriting**');
    expect(markdown).toContain('do not merge');
  });
});
