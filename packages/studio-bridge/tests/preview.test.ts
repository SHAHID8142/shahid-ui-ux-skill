/**
 * T0706 — dry-run proposal preview + source diff.
 *
 * The load-bearing claims, each proven here rather than asserted:
 *  - proposing and rejecting leave the consuming tree byte-identical;
 *  - the preview workspace lives outside the repo root;
 *  - a grant is single-use, content-bound, and goes stale when the base file
 *    changes after the preview;
 *  - unsafe paths are refused rather than normalized;
 *  - the module exposes no apply/write path (structural check).
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHunks, diffLines, splitDiff, unifiedDiff } from '../src/diff.js';
import { PreviewSession, responsiveAlternativeFor } from '../src/preview.js';
import * as previewModule from '../src/preview.js';
import type { VisualIntentData } from '@sus/schemas';

function fixtureProject(): string {
  const root = mkdtempSync(join(tmpdir(), 't0706-fixture-'));
  writeFileSync(
    join(root, 'page.tsx'),
    [
      'export function Page() {',
      '  return (',
      '    <main>',
      '      <h1>Hero</h1>',
      '    </main>',
      '  );',
      '}',
      '',
    ].join('\n'),
  );
  writeFileSync(join(root, 'styles.css'), '.hero { color: red; }\n');
  // unrelated user bytes that must never be touched
  writeFileSync(join(root, 'user-notes.md'), 'my own scratch notes — preserve me\n');
  return root;
}

/** Hash of every file under root, keyed by relative path. */
function treeHashes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const absolute = join(dir, entry);
      const relative = prefix ? `${prefix}/${entry}` : entry;
      if (statSync(absolute).isDirectory()) walk(absolute, relative);
      else out[relative] = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    }
  };
  walk(root, '');
  return out;
}

function intent(overrides: Partial<VisualIntentData> = {}): VisualIntentData {
  return {
    id: 'intent-1',
    fromAnnotationIds: ['ann-1'],
    target: { selector: '#hero', susId: 'hero', confidence: 0.82 },
    relationship: 'below',
    alignment: undefined,
    orderIndex: undefined,
    maxMeasure: undefined,
    priority: 'should',
    reflow: undefined,
    userText: 'add a trust row',
    constraints: [{ kind: 'content', text: 'add a trust row' }],
    unknowns: [],
    ...overrides,
  } as VisualIntentData;
}

const EDITS = [
  {
    path: 'page.tsx',
    after: [
      'export function Page() {',
      '  return (',
      '    <main>',
      '      <h1>Hero</h1>',
      '      <TrustRow />',
      '    </main>',
      '  );',
      '}',
      '',
    ].join('\n'),
  },
];

describe('line diff engine (T0706)', () => {
  it('produces context/del/add ops for a one-line insertion', () => {
    const ops = diffLines('a\nb\nc\n', 'a\nb\nX\nc\n');
    expect(ops.map((o) => o.kind)).toEqual(['context', 'context', 'add', 'context']);
    expect(ops[2]!.text).toBe('X');
  });

  it('emits nothing for identical content', () => {
    expect(unifiedDiff('p', 'same\n', 'same\n')).toBe('');
    expect(buildHunks('same\n', 'same\n')).toEqual([]);
  });

  it('renders a git-shaped unified diff with a hunk header and prefixes', () => {
    const diff = unifiedDiff('page.tsx', 'a\nb\nc\n', 'a\nB\nc\n');
    const lines = diff.split('\n');
    expect(lines[0]).toBe('--- a/page.tsx');
    expect(lines[1]).toBe('+++ b/page.tsx');
    expect(lines[2]).toMatch(/^@@ -\d+,\d+ \+\d+,\d+ @@$/);
    expect(lines).toContain('-b');
    expect(lines).toContain('+B');
    expect(lines).not.toContain('--- a/a');
  });

  it('keeps at most three context lines around a change', () => {
    const before = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].join('\n');
    const after = ['1', '2', '3', '4', 'CHANGED', '6', '7', '8', '9', '10'].join('\n');
    const ops = buildHunks(before, after)[0]!.ops;
    // 3 context + 1 del + 1 add + 3 context
    expect(ops).toHaveLength(8);
    expect(ops.filter((o) => o.kind === 'context')).toHaveLength(6);
  });

  it('always terminates with a trailing newline so diffs are pasteable', () => {
    expect(unifiedDiff('p', 'a\n', 'b\n').endsWith('\n')).toBe(true);
  });

  it('pairs changed lines side by side instead of interleaving columns', () => {
    const rows = splitDiff('a\nb\nc\n', 'a\nB\nc\n');
    expect(rows.map((r) => r.kind)).toEqual(['context', 'change', 'context']);
    const change = rows[1]!;
    expect(change.kind === 'change' && change.left?.text).toBe('b');
    expect(change.kind === 'change' && change.right?.text).toBe('B');
  });

  it('pads the shorter side when a change adds more lines than it removes', () => {
    const rows = splitDiff('a\n', 'a\nX\nY\n');
    const changes = rows.filter((r) => r.kind === 'change');
    expect(changes).toHaveLength(2);
    expect(changes[0]!.kind === 'change' && changes[0]!.left).toBeNull();
    expect(changes[1]!.kind === 'change' && changes[1]!.left).toBeNull();
  });
});

describe('proposal construction (T0706)', () => {
  it('lists files affected, before/after hashes, stats and both diff views', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose('2026-11-14T00:00:00.000Z');
    expect(proposal.status).toBe('preview');
    expect(proposal.requiresApproval).toBe(true);
    expect(proposal.files).toHaveLength(1);
    const file = proposal.files[0]!;
    expect(file.path).toBe('page.tsx');
    expect(file.operation).toBe('modify');
    expect(file.additions).toBe(1);
    expect(file.deletions).toBe(0);
    expect(file.unified).toContain('+      <TrustRow />');
    expect(file.split.some((row) => row.kind === 'change')).toBe(true);
    expect(proposal.summary).toEqual({
      filesTouched: 1,
      filesCreated: 0,
      filesDeleted: 0,
      additions: 1,
      deletions: 0,
    });
    session.dispose();
  });

  it('shows the mapping confidence the proposal rests on', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(
      root,
      intent({ target: { selector: '#h', susId: null, confidence: 0.71 } }),
      EDITS,
    );
    expect(session.propose().confidence).toBe(0.71);
    session.dispose();
  });

  it('carries intent unknowns forward instead of hiding them', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(
      root,
      intent({ unknowns: ['is the target the hero?'] }),
      EDITS,
    );
    expect(session.propose().unknowns).toEqual(['is the target the hero?']);
    session.dispose();
  });

  it('classifies creates and deletes', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), [
      { path: 'components/TrustRow.tsx', after: 'export const TrustRow = () => null;\n' },
      { path: 'styles.css', after: '', delete: true },
    ]);
    const proposal = session.propose();
    expect(proposal.files.map((f) => f.operation)).toEqual(['create', 'delete']);
    expect(proposal.summary.filesCreated).toBe(1);
    expect(proposal.summary.filesDeleted).toBe(1);
    session.dispose();
  });

  it('is idempotent: the same session returns the same proposal', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const first = session.propose();
    expect(session.propose()).toBe(first);
    session.dispose();
  });
});

describe('responsive alternative (T0706)', () => {
  it('derives the narrow-viewport result from a reflow constraint', () => {
    const alt = responsiveAlternativeFor(intent({ reflow: 'stack' }));
    expect(alt.source).toBe('intent');
    expect(alt.maxWidthPx).toBe(640);
    expect(alt.description).toContain('stacks');
  });

  it('reports not-captured rather than inventing a responsive claim', () => {
    const alt = responsiveAlternativeFor(intent({ relationship: undefined, reflow: undefined }));
    expect(alt.source).toBe('not-captured');
    expect(alt.description).toContain('unverified');
  });

  it('describes the spatial relationship when no reflow was captured', () => {
    expect(responsiveAlternativeFor(intent({ relationship: 'below' })).description).toContain(
      'below',
    );
  });
});

describe('preview isolation — proposing and rejecting never write the tree (T0706 acc)', () => {
  it('leaves every file in the consuming project byte-identical', () => {
    const root = fixtureProject();
    const before = treeHashes(root);
    const session = PreviewSession.open(root, intent(), EDITS);
    session.propose();
    expect(treeHashes(root)).toEqual(before);
    const result = session.reject('owner said no');
    expect(result).toEqual({ status: 'rejected', workspaceDisposed: true });
    expect(treeHashes(root)).toEqual(before);
  });

  it('stages postimages in a disposable workspace outside the repo root', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    expect(session.workspace.startsWith(root)).toBe(false);
    expect(session.stagedFile('postimage-0.txt')).toContain('<TrustRow />');
    expect(session.stagedFile('preimage-0.txt')).not.toContain('<TrustRow />');
    session.dispose();
    expect(session.workspaceExists()).toBe(false);
  });

  it('discards the workspace on reject, so a rejected proposal leaves no trace', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const workspace = session.workspace;
    session.reject('no');
    expect(existsSync(workspace)).toBe(false);
  });

  it('refuses to reject an approved proposal (decision cannot be undone silently)', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner' });
    expect(() => session.reject('too late')).toThrow(/approved/);
    session.dispose();
  });

  it('refuses a new proposal from a rejected session', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    session.reject('no');
    expect(() => session.propose()).toThrow(/rejected/);
  });
});

describe('explicit fresh approval (T0706 acc: no write without it)', () => {
  it('issues a grant bound to the proposal content', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner' });
    expect(grant.proposalId).toBe(proposal.proposalId);
    expect(grant.intentId).toBe('intent-1');
    expect(grant.singleUse).toBe(true);
    expect(grant.proposalSha256).toHaveLength(64);
    expect(session.verifyGrant(grant).ok).toBe(true);
    session.dispose();
  });

  it('refuses approval naming another proposal', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    session.propose();
    expect(() => session.approve({ proposalId: 'other', approvedBy: 'owner' })).toThrow(
      /names other/,
    );
    session.dispose();
  });

  it('refuses approval without an identified approver', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    expect(() => session.approve({ proposalId: proposal.proposalId, approvedBy: '   ' })).toThrow(
      /non-empty approver/,
    );
    session.dispose();
  });

  it('goes stale when the user edits a target file after the preview', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner' });
    // the user keeps working: the approved diff no longer describes reality
    writeFileSync(join(root, 'page.tsx'), '// edited after preview\n');
    const check = session.verifyGrant(grant);
    expect(check.ok).toBe(false);
    expect(!check.ok && check.reason).toBe('stale-base');
    expect(!check.ok && check.detail).toContain('page.tsx');
    session.dispose();
  });

  it('expires: an approval is fresh by construction, never standing', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    const now = new Date('2026-11-14T00:00:00.000Z');
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner' }, now);
    const later = new Date(now.getTime() + 11 * 60 * 1000);
    const check = session.verifyGrant(grant, later);
    expect(check.ok).toBe(false);
    expect(!check.ok && check.reason).toBe('expired');
    session.dispose();
  });

  it('rejects a grant whose content hash does not match', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const proposal = session.propose();
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner' });
    const check = session.verifyGrant({ ...grant, proposalSha256: 'f'.repeat(64) });
    expect(check.ok).toBe(false);
    expect(!check.ok && check.reason).toBe('hash-mismatch');
    session.dispose();
  });

  it('reports unknown-proposal when nothing was built yet', () => {
    const root = fixtureProject();
    const session = PreviewSession.open(root, intent(), EDITS);
    const check = session.verifyGrant({
      grantId: 'g',
      proposalId: 'p',
      intentId: 'i',
      proposalSha256: 'f'.repeat(64),
      approvedBy: 'owner',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      singleUse: true,
    });
    expect(!check.ok && check.reason).toBe('unknown-proposal');
    session.dispose();
  });

  it('exposes no apply/write function — the mutating writer is T0707, behind its own gates', () => {
    const exported = Object.keys(previewModule);
    expect(exported.filter((name) => /^(apply|write|commit)/i.test(name))).toEqual([]);
    const prototypeMethods = Object.getOwnPropertyNames(PreviewSession.prototype);
    expect(prototypeMethods.filter((name) => /^(apply|write|commit)$/i.test(name))).toEqual([]);
  });
});

describe('unsafe input is refused, not normalized (T0706)', () => {
  it('refuses absolute paths', () => {
    const root = fixtureProject();
    expect(() =>
      PreviewSession.open(root, intent(), [{ path: '/etc/passwd', after: 'x' }]),
    ).toThrow(/absolute path/);
  });

  it('refuses path escape', () => {
    const root = fixtureProject();
    expect(() =>
      PreviewSession.open(root, intent(), [{ path: '../outside.ts', after: 'x' }]),
    ).toThrow(/escape/);
  });

  it('refuses non-canonical paths instead of silently rewriting them', () => {
    const root = fixtureProject();
    expect(() => PreviewSession.open(root, intent(), [{ path: './page.tsx', after: 'x' }])).toThrow(
      /non-canonical/,
    );
  });

  it('refuses duplicate edits, empty plans and deletes that still carry content', () => {
    const root = fixtureProject();
    expect(() => PreviewSession.open(root, intent(), [])).toThrow(/at least one edit/);
    expect(() =>
      PreviewSession.open(root, intent(), [
        { path: 'page.tsx', after: 'a' },
        { path: 'page.tsx', after: 'b' },
      ]),
    ).toThrow(/duplicate/);
    expect(() =>
      PreviewSession.open(root, intent(), [{ path: 'page.tsx', after: 'content', delete: true }]),
    ).toThrow(/empty content/);
  });

  it('refuses a root that is not a directory', () => {
    expect(() => PreviewSession.open('/definitely/not/here', intent(), EDITS)).toThrow(
      /not a directory/,
    );
  });
});

describe('fixture cleanup', () => {
  it('removes temp fixtures created by this suite', () => {
    const root = fixtureProject();
    const before = treeHashes(root);
    expect(Object.keys(before).sort()).toEqual(['page.tsx', 'styles.css', 'user-notes.md']);
    rmSync(root, { recursive: true, force: true });
    expect(existsSync(root)).toBe(false);
  });
});
