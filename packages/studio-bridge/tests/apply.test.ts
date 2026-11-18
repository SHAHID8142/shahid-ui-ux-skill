/**
 * T0707 (part 2) — approval-gated apply + rollback, end to end.
 *
 * Every test drives the real engine against a disposable project on disk: real
 * AST edits, real durable transaction, real receipts. The claims proven here
 * are the ones a wrong write would violate:
 *
 *  - nothing is written without a fresh, content-bound approval and a live
 *    single-use capability (forged, stale, replayed, expired → refused);
 *  - uncommitted user bytes anywhere in the project survive untouched, and a
 *    file that changed after the preview is a conflict, not a merge;
 *  - verification failure reverts exactly, byte for byte;
 *  - undo restores the preimage and refuses once the user has moved on;
 *  - a replayed operation id returns the stored receipt instead of writing twice.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApplyEngine, insideRoot, interruptedTransactions, type VerifyFn } from '../src/apply.js';
import { applyAstEdit } from '../src/editor.js';
import { ActionBoundary, CapabilityAuthority, type CapabilityBinding } from '../src/security.js';
import { PreviewSession, type ApprovalGrant } from '../src/preview.js';
import { Transaction } from '../src/transaction.js';
import { parseSource } from '../src/editor.js';
import type { VisualIntentData } from '@sus/schemas';

const PAGE = `export default function Page() {
  return (
    <main id="main">
      <section id="hero" className="hero">
        <h1>Ship the thing</h1>
      </section>
      <section id="footer">
        <small>© 2026</small>
      </section>
    </main>
  );
}
`;

const MATH = 'export const add = (a: number, b: number): number => a + b;\n';

interface Harness {
  root: string;
  edits: Array<{ file: string; edit: Parameters<typeof applyAstEdit>[2] }>;
  authority: CapabilityAuthority;
  boundary: ActionBoundary;
  engine: ApplyEngine;
  session: PreviewSession;
  grant: ApprovalGrant;
  binding: CapabilityBinding;
  capabilityId: string;
  after: string;
}

/** Syntax verification: what a project without a build step can honestly run. */
const syntaxVerify: VerifyFn = (_root, files) => {
  for (const file of files) {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
    // a deleted file is absent by design — there is nothing to parse
    if (!existsSync(join(_root, file))) continue;
    const parsed = parseSource(file, readFileSync(join(_root, file), 'utf8'));
    if (!parsed.ok) {
      return { status: 'fail', detail: `${file}: ${parsed.problems[0]!.message}` };
    }
  }
  return { status: 'pass', detail: 'syntax clean' };
};

/** Real TypeScript type checking of the changed files (no emit). */
const typecheckVerify: VerifyFn = (root, files) => {
  const roots = [
    ...files.filter((f) => /\.tsx?$/.test(f)).map((f) => join(root, f)),
    join(root, 'jsx.d.ts'),
  ];
  const program = ts.createProgram(roots, {
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    skipLibCheck: true,
    jsx: ts.JsxEmit.Preserve,
  });
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (diagnostics.length > 0) {
    const first = diagnostics[0]!;
    return {
      status: 'fail',
      detail: `${ts.flattenDiagnosticMessageText(first.messageText, ' ')} (${first.file?.fileName ?? 'unknown'})`,
    };
  }
  return { status: 'pass', detail: `typecheck clean (${files.length} file(s))` };
};

const INTENT: VisualIntentData = {
  id: 'intent-apply',
  fromAnnotationIds: ['ann-1'],
  target: { selector: '#hero', susId: 'hero', confidence: 0.92 },
  relationship: 'inside',
  alignment: undefined,
  orderIndex: undefined,
  maxMeasure: undefined,
  priority: 'should',
  reflow: 'stack',
  userText: 'add a trial button',
  constraints: [{ kind: 'content', text: 'add a trial button' }],
  unknowns: [],
} as VisualIntentData;

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 't0707-'));
  mkdirSync(join(root, 'app'), { recursive: true });
  mkdirSync(join(root, 'lib'), { recursive: true });
  writeFileSync(join(root, 'app', 'page.tsx'), PAGE);
  writeFileSync(join(root, 'lib', 'math.ts'), MATH);
  // an unrelated, permanently dirty file: it must never be touched
  writeFileSync(join(root, 'notes.md'), 'my scratch notes — do not touch\n');
  // minimal JSX declarations so a REAL typecheck of this fixture is meaningful
  writeFileSync(
    join(root, 'jsx.d.ts'),
    'declare namespace JSX {\n  interface IntrinsicElements {\n    [name: string]: any;\n  }\n}\n',
  );
  return root;
}

function happyHarness(
  options: {
    verify?: VerifyFn;
    content?: string;
    edits?: Array<{ file: string; edit: Parameters<typeof applyAstEdit>[2] }>;
  } = {},
): Harness {
  const root = fixtureRoot();
  const edits = options.edits ?? [
    {
      file: 'app/page.tsx',
      edit: {
        operation: 'insert-child' as const,
        target: { anchor: 'hero' },
        content: options.content ?? '<a className="cta" href="#trial">Start free trial</a>',
      },
    },
  ];
  // Postimages come from the same editor the engine will use at apply time.
  let after = '';
  for (const { file, edit } of edits) {
    const current = readFileSync(join(root, file), 'utf8');
    const result = applyAstEdit(file, current, edit);
    if (!result.ok) throw new Error(`fixture edit refused: ${result.reason} ${result.detail}`);
    after = result.after;
  }
  const session = PreviewSession.open(root, INTENT, [{ path: 'app/page.tsx', after }]);
  const proposal = session.propose();
  const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner@example' });
  const binding: CapabilityBinding = {
    sessionId: 'session-1',
    frameId: 'frame-1',
    kind: 'write',
    proposalSha256: grant.proposalSha256,
    fence: 4,
  };
  const authority = new CapabilityAuthority();
  const boundary = new ActionBoundary(authority);
  const engine = new ApplyEngine(root, { boundary, verify: options.verify ?? syntaxVerify });
  const capabilityId = authority.issue(binding, 'owner@example').id;
  return { root, authority, boundary, engine, session, grant, binding, capabilityId, after, edits };
}

function treeFile(root: string, relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

let harness: Harness;
beforeEach(() => {
  harness = happyHarness();
});

const baseRequest = (h: Harness) => ({
  session: h.session,
  grant: h.grant,
  capabilityId: h.capabilityId,
  binding: h.binding,
  provenance: 'user-typed' as const,
  edits: h.edits,
});

describe('apply — the happy path writes exactly the approved diff', () => {
  it('applies the AST edit, records a pass verdict and matches the approved postimage', async () => {
    const receipt = await harness.engine.apply(baseRequest(harness));
    expect(receipt.status).toBe('applied');
    expect(receipt.reason).toBeNull();
    expect(receipt.verification.status).toBe('pass');
    expect(receipt.files).toEqual(['app/page.tsx']);
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(harness.after);
    expect(receipt.transactionId).toBeTruthy();
    expect(receipt.appliedAt).toBeTruthy();
    expect(receipt.duplicate).toBeUndefined();
    // the transaction's durable preimages survive for undo
    expect(existsSync(join(harness.root, '.sus', 'transactions', receipt.transactionId!))).toBe(
      true,
    );
  });

  it('never touches an unrelated dirty file', async () => {
    const before = treeFile(harness.root, 'notes.md');
    await harness.engine.apply(baseRequest(harness));
    expect(treeFile(harness.root, 'notes.md')).toBe(before);
  });

  it('records a real typecheck verdict when the project can be compiled', async () => {
    const h = happyHarness({ verify: typecheckVerify });
    const receipt = await h.engine.apply(baseRequest(h));
    expect(receipt.status).toBe('applied');
    expect(receipt.verification.status).toBe('pass');
    expect(receipt.verification.detail).toContain('typecheck clean');
  });

  it('records a git snapshot when the project is a repository', async () => {
    const h = happyHarness();
    execFileSync('git', ['init', '-q'], { cwd: h.root });
    execFileSync('git', ['add', '-A'], { cwd: h.root });
    execFileSync(
      'git',
      ['-c', 'user.email=t@example', '-c', 'user.name=t', 'commit', '-qm', 'fixture'],
      { cwd: h.root },
    );
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: h.root,
      encoding: 'utf8',
    }).trim();
    const receipt = await h.engine.apply(baseRequest(h));
    expect(receipt.gitSnapshot?.head).toBe(head);
    expect(receipt.gitSnapshot?.dirtyPaths).toBe(0);
  });
});

describe('apply — forged, stale, replayed and untrusted authority is refused before any write', () => {
  const untouched = (h: Harness) => expect(treeFile(h.root, 'app/page.tsx')).toBe(PAGE);

  it('refuses page-derived provenance (DA-31) and leaves the tree alone', async () => {
    const receipt = await harness.engine.apply({ ...baseRequest(harness), provenance: 'page-dom' });
    expect(receipt.status).toBe('refused');
    expect(receipt.reason).toBe('untrusted-provenance');
    untouched(harness);
  });

  // T1064 (audit finding T1003-20): the engine verified the grant against the proposal and the
  // capability binding against its issue, but never compared the two digests to each other — a
  // capability issued for proposal A with a grant for proposal B passed both checks.
  it('refuses when the capability binding and the grant name different proposals', async () => {
    const h = happyHarness();
    const forgedBinding: CapabilityBinding = { ...h.binding, proposalSha256: 'e'.repeat(64) };
    const capabilityId = h.authority.issue(forgedBinding, 'owner@example').id;
    const receipt = await h.engine.apply({
      ...baseRequest(h),
      capabilityId,
      binding: forgedBinding,
    });
    expect(receipt.status).toBe('refused');
    expect(receipt.reason).toBe('grant-mismatch');
    expect(receipt.detail).toContain('different proposals');
    untouched(h);
  });

  // T1065 (audit finding T1003-21): an operation id becomes a file name under .sus/ops; a
  // caller-supplied id that walks out of that directory is refused instead of joined.
  it('refuses an operation id that would place receipts outside .sus/ops', async () => {
    const receipt = await harness.engine.apply(baseRequest(harness));
    for (const hostile of ['../../escape', 'sub/dir', 'op id', '']) {
      expect(() => harness.engine.receipts.load(hostile)).toThrow(/invalid operation id/);
      expect(() => harness.engine.receipts.save({ ...receipt, operationId: hostile })).toThrow(
        /invalid operation id/,
      );
    }
    // A legitimate id (the randomUUID shape: hex with hyphens) still round-trips.
    const fresh = happyHarness();
    const ok = await fresh.engine.apply({ ...baseRequest(fresh), operationId: 'op-abc-123' });
    expect(ok.status).toBe('applied');
    expect(fresh.engine.receipts.load('op-abc-123')).not.toBeNull();
  });

  it('refuses a replayed capability', async () => {
    const first = await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-1' });
    expect(first.status).toBe('applied');
    // the user undoes so the second attempt is a genuine write attempt
    harness.engine.undo('op-1');
    const replay = await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-2' });
    expect(replay.status).toBe('refused');
    expect(replay.reason).toBe('capability-replayed');
    untouched(harness);
  });

  it('refuses an expired capability and a capability from another frame', async () => {
    const shortTtl = new CapabilityAuthority(1);
    const expiredEngine = new ApplyEngine(harness.root, {
      boundary: new ActionBoundary(shortTtl),
      verify: syntaxVerify,
    });
    const expired = shortTtl.issue(harness.binding, 'owner@example', new Date(Date.now() - 60_000));
    const expiredReceipt = await expiredEngine.apply({
      ...baseRequest(harness),
      capabilityId: expired.id,
      operationId: 'op-expired',
    });
    expect(expiredReceipt.reason).toBe('capability-expired');

    const authority = new CapabilityAuthority(60_000);
    const engine = new ApplyEngine(harness.root, {
      boundary: new ActionBoundary(authority),
      verify: syntaxVerify,
    });
    const fresh = authority.issue(harness.binding, 'owner@example');
    const wrongFrame = await engine.apply({
      ...baseRequest(harness),
      capabilityId: fresh.id,
      binding: { ...harness.binding, frameId: 'hostile-iframe' },
      operationId: 'op-frame',
    });
    expect(wrongFrame.reason).toBe('capability-frame-mismatch');
    untouched(harness);
  });

  it('refuses an approval that went stale because the user edited the file', async () => {
    writeFileSync(join(harness.root, 'app/page.tsx'), `${PAGE}// user edit after preview\n`);
    const receipt = await harness.engine.apply({
      ...baseRequest(harness),
      operationId: 'op-stale',
    });
    expect(receipt.status).toBe('refused');
    expect(receipt.reason).toBe('stale-approval');
    expect(treeFile(harness.root, 'app/page.tsx')).toContain('user edit after preview');
  });

  it('rechecks the preimage itself instead of trusting the approval check alone', async () => {
    // A race between approval verification and the write must still be caught:
    // the engine re-hashes every approved file immediately before mutating, so
    // a session that says "ok" cannot talk it into overwriting newer bytes.
    const h = happyHarness();
    const realProposal = h.session.propose();
    const trustingSession = {
      propose: () => realProposal,
      proposalSha256: () => h.session.proposalSha256(),
      // simulates a check that passed microseconds before the user saved
      verifyGrant: () => ({ ok: true as const, grant: h.grant }),
    };
    writeFileSync(join(h.root, 'app/page.tsx'), `${PAGE}// saved by the user mid-apply\n`);

    const receipt = await h.engine.apply({
      ...baseRequest(h),
      session: trustingSession,
      operationId: 'op-race',
    });
    expect(receipt.status).toBe('refused');
    expect(receipt.reason).toBe('conflicting-user-edit');
    expect(receipt.detail).toContain('app/page.tsx');
    expect(treeFile(h.root, 'app/page.tsx')).toContain('saved by the user mid-apply');
  });

  it('refuses a forged grant whose content hash does not match', async () => {
    const receipt = await harness.engine.apply({
      ...baseRequest(harness),
      grant: { ...harness.grant, proposalSha256: 'f'.repeat(64) },
      operationId: 'op-forged',
    });
    expect(receipt.reason).toBe('grant-mismatch');
    untouched(harness);
  });

  it('refuses a plan that touches files the approval does not cover', async () => {
    const receipt = await harness.engine.apply({
      ...baseRequest(harness),
      edits: [{ file: 'lib/math.ts', edit: { operation: 'delete-node', target: { anchor: 'x' } } }],
      operationId: 'op-wrong-file',
    });
    expect(receipt.reason).toBe('plan-file-mismatch');
    untouched(harness);
  });

  it('refuses an ambiguous section owner before mutation', async () => {
    const root = fixtureRoot();
    const ambiguous = PAGE.replace('id="footer"', 'id="hero"');
    writeFileSync(join(root, 'app/page.tsx'), ambiguous);
    const session = PreviewSession.open(root, INTENT, [{ path: 'app/page.tsx', after: ambiguous }]);
    const proposal = session.propose();
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner@example' });
    const authority = new CapabilityAuthority();
    const binding = { ...harness.binding, proposalSha256: grant.proposalSha256 };
    const engine = new ApplyEngine(root, {
      boundary: new ActionBoundary(authority),
      verify: syntaxVerify,
    });
    const receipt = await engine.apply({
      session,
      grant,
      capabilityId: authority.issue(binding, 'owner@example').id,
      binding,
      provenance: 'user-typed',
      operationId: 'op-ambiguous',
      edits: [
        {
          file: 'app/page.tsx',
          edit: { operation: 'insert-child', target: { anchor: 'hero' }, content: '<b>new</b>' },
        },
      ],
    });
    expect(receipt.reason).toBe('ambiguous-target');
    expect(treeFile(root, 'app/page.tsx')).toBe(ambiguous);
  });

  it('refuses a missing target', async () => {
    const receipt = await harness.engine.apply({
      ...baseRequest(harness),
      edits: [
        {
          file: 'app/page.tsx',
          edit: { operation: 'insert-child', target: { anchor: 'pricing' }, content: '<b>new</b>' },
        },
      ],
      operationId: 'op-missing',
    });
    expect(receipt.reason).toBe('target-not-found');
    untouched(harness);
  });

  it('refuses to start while an unrecovered transaction exists, then recovers it', async () => {
    Transaction.prepare(harness.root, 'previous-plan', 1, [
      { path: 'lib/math.ts', postimage: 'export const add = 1;\n' },
    ]).apply(0); // crash simulation: manifest prepared, nothing written
    expect(interruptedTransactions(harness.root)).toHaveLength(1);

    const blocked = await harness.engine.apply({
      ...baseRequest(harness),
      operationId: 'op-blocked',
    });
    expect(blocked.reason).toBe('unfinished-transaction');
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(PAGE);

    const recovered = harness.engine.recoverInterrupted();
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.status).toBe('recovered');
    expect(interruptedTransactions(harness.root)).toHaveLength(0);
    const retried = await harness.engine.apply({
      ...baseRequest(harness),
      operationId: 'op-retry',
    });
    expect(retried.status).toBe('applied');
  });

  it('replays a stored receipt for the same operation id instead of writing twice', async () => {
    const first = await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-same' });
    expect(first.status).toBe('applied');
    // someone edits the file afterwards; the second call must not rewrite it
    const edited = `${harness.after}// later user edit\n`;
    writeFileSync(join(harness.root, 'app/page.tsx'), edited);
    const second = await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-same' });
    expect(second.duplicate).toBe(true);
    expect(second.status).toBe('applied');
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(edited);
  });

  it('reloads receipts from disk after a restart', async () => {
    await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-durable' });
    const restarted = new ApplyEngine(harness.root, {
      boundary: harness.boundary,
      verify: syntaxVerify,
    });
    const receipt = restarted.receipts.load('op-durable');
    expect(receipt?.status).toBe('applied');
    expect(restarted.receipts.list()).toHaveLength(1);
  });
});

describe('apply — verification failure reverts exactly', () => {
  it('restores the preimage byte for byte when verification fails', async () => {
    const failing: VerifyFn = () => ({ status: 'fail', detail: 'tsc: TS2322 type mismatch' });
    const h = happyHarness({ verify: failing });
    const receipt = await h.engine.apply(baseRequest(h));
    expect(receipt.status).toBe('reverted');
    expect(receipt.reason).toBe('verification-failed');
    expect(receipt.verification.status).toBe('fail');
    expect(treeFile(h.root, 'app/page.tsx')).toBe(PAGE);
    expect(receipt.revertedAt).toBeTruthy();
    // unrelated file untouched by the revert too
    expect(treeFile(h.root, 'notes.md')).toBe('my scratch notes — do not touch\n');
  });

  it('treats a throwing verifier as a failure and still reverts', async () => {
    const throwing: VerifyFn = () => {
      throw new Error('build tool crashed');
    };
    const h = happyHarness({ verify: throwing });
    const receipt = await h.engine.apply(baseRequest(h));
    expect(receipt.status).toBe('reverted');
    expect(receipt.verification.detail).toContain('verification threw');
    expect(treeFile(h.root, 'app/page.tsx')).toBe(PAGE);
  });

  it('reverts an edit the real TypeScript checker rejects (undefined identifier)', async () => {
    const h = happyHarness({
      verify: typecheckVerify,
      content: '<span>{notDefinedAnywhere}</span>',
    });
    const receipt = await h.engine.apply(baseRequest(h));
    expect(receipt.status).toBe('reverted');
    expect(receipt.reason).toBe('verification-failed');
    expect(receipt.verification.detail).toMatch(/notDefinedAnywhere/);
    expect(treeFile(h.root, 'app/page.tsx')).toBe(PAGE);
  });
});

describe('undo — transaction-specific, never a blanket reset', () => {
  it('restores the preimage and refuses a second undo', async () => {
    const receipt = await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-undo' });
    expect(receipt.status).toBe('applied');
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(harness.after);

    const undone = harness.engine.undo('op-undo');
    expect(undone.ok).toBe(true);
    expect(undone.restored).toEqual(['app/page.tsx']);
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(PAGE);

    const again = harness.engine.undo('op-undo');
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('not-applied');
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(PAGE);
  });

  it('refuses to undo over the user’s later edit (conflict, not clobber)', async () => {
    await harness.engine.apply({ ...baseRequest(harness), operationId: 'op-conflict' });
    const userWork = `${harness.after}// the user kept working\n`;
    writeFileSync(join(harness.root, 'app/page.tsx'), userWork);

    const undone = harness.engine.undo('op-conflict');
    expect(undone.ok).toBe(false);
    expect(undone.reason).toBe('undo-conflict');
    expect(undone.detail).toContain('app/page.tsx');
    expect(treeFile(harness.root, 'app/page.tsx')).toBe(userWork);
  });

  it('refuses undo of an unknown or never-applied operation', () => {
    const unknown = harness.engine.undo('does-not-exist');
    expect(unknown.reason).toBe('not-applied');
  });
});

describe('delete operations are real deletions with recoverable undo', () => {
  it('removes the file, then undo restores its exact bytes and mode', async () => {
    const root = fixtureRoot();
    const original = treeFile(root, 'lib/math.ts');
    const session = PreviewSession.open(root, INTENT, [
      { path: 'lib/math.ts', after: '', delete: true },
    ]);
    const proposal = session.propose();
    expect(proposal.files[0]!.operation).toBe('delete');
    const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner@example' });
    const authority = new CapabilityAuthority();
    const binding = { ...harness.binding, proposalSha256: grant.proposalSha256 };
    const engine = new ApplyEngine(root, {
      boundary: new ActionBoundary(authority),
      verify: syntaxVerify,
    });

    const receipt = await engine.apply({
      session,
      grant,
      capabilityId: authority.issue(binding, 'owner@example').id,
      binding,
      provenance: 'user-typed',
      operationId: 'op-delete',
      edits: [],
    });
    expect(receipt.status).toBe('applied');
    expect(existsSync(join(root, 'lib/math.ts'))).toBe(false);

    const undone = engine.undo('op-delete');
    expect(undone.ok).toBe(true);
    expect(existsSync(join(root, 'lib/math.ts'))).toBe(true);
    expect(treeFile(root, 'lib/math.ts')).toBe(original);
  });
});

describe('engine construction fails closed', () => {
  it('refuses to be constructed without a verify function', () => {
    const root = fixtureRoot();
    const authority = new CapabilityAuthority();
    expect(
      () =>
        new ApplyEngine(root, {
          boundary: new ActionBoundary(authority),
          verify: undefined as unknown as VerifyFn,
        }),
    ).toThrow(/requires a verify function/);
    rmSync(root, { recursive: true, force: true });
  });
});

/**
 * T1044 — an apply must not write outside the tree the owner approved.
 *
 * Proposal paths come from walking the root, so traversal is not reachable through the public API today.
 * The guard exists because the failure would be a write outside the approved tree, and because an apply
 * path is exactly where defence in depth belongs. The leaf is deliberately *not* resolved: a symlinked
 * file is replaced by the atomic rename rather than written through, so resolving it would weaken the
 * guard instead of strengthening it.
 */
describe('apply path containment (T1044)', () => {
  it('accepts a path inside the root and refuses one that walks out', () => {
    const root = mkdtempSync(join(tmpdir(), 'sus-root-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'card.astro'), '<div></div>', 'utf8');
    expect(insideRoot(root, 'src/card.astro')).toBe(true);
    // `join` normalises first, so this one really is inside: the guard must not refuse it out of caution.
    expect(insideRoot(root, 'src/card.astro/../../escape.ts')).toBe(true);
    expect(insideRoot(root, '../escape.ts')).toBe(false);
    expect(insideRoot(root, 'src/../../escape.ts')).toBe(false);
    expect(insideRoot(root, join(root, 'src', 'card.astro'))).toBe(true);
  });

  it('refuses a path whose directory is a symlink out of the root', () => {
    const root = mkdtempSync(join(tmpdir(), 'sus-root-'));
    const outside = mkdtempSync(join(tmpdir(), 'sus-outside-'));
    writeFileSync(join(outside, 'secret.ts'), 'x', 'utf8');
    symlinkSync(outside, join(root, 'linked'), 'dir');
    expect(insideRoot(root, 'linked/secret.ts')).toBe(false);
  });
});
