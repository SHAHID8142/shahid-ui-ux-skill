/**
 * Approval-gated apply + rollback (T0707).
 *
 * This is the only code path in SUS that mutates a consuming project. Every
 * step is ordered so that a refusal happens BEFORE a byte is written:
 *
 *   receipt replay → approval grant → action boundary (provenance/capability)
 *   → section-owner resolution (AST) → conflict recheck → durable transaction
 *   → post-apply verification (typecheck/build) → accept, or auto-revert.
 *
 * Three properties the tests exist to prove:
 *  - **no write without a live, content-bound approval** and a single-use
 *    capability for this session/frame/proposal/fence;
 *  - **the user's uncommitted edits are never overwritten**: the current file
 *    hash must still equal the approved preimage, and a mismatch is a refusal
 *    (conflict), never a "best effort" merge;
 *  - **verification failure reverts exactly**: rollback restores the preimages
 *    byte for byte, and undo refuses if the file changed after apply instead of
 *    clobbering the user's subsequent work.
 *
 * There is no `git reset`, no stash, no checkout. Rollback is per-file restore
 * from the transaction's own durable preimages (T0805), which is why unrelated
 * dirty files survive untouched.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { ApprovalGrant, Proposal } from './preview.js';
import type { PreviewSession } from './preview.js';
import { Transaction, sha256 } from './transaction.js';
import { applyEditPlan, type AstEdit, type EditRefusalReason } from './editor.js';
import type {
  ActionBoundary,
  ActionRequest,
  CapabilityBinding,
  DenyReason,
  Provenance,
} from './security.js';

export type VerificationStatus = 'pass' | 'fail' | 'not-run';

export interface VerificationResult {
  status: 'pass' | 'fail';
  detail: string;
}

/** Runs the consuming project's own typecheck/build. Required, never optional. */
export type VerifyFn = (
  root: string,
  files: string[],
) => VerificationResult | Promise<VerificationResult>;

export type ApplyStatus = 'applied' | 'reverted' | 'refused' | 'conflict';

export type RefusalReason =
  | DenyReason
  | EditRefusalReason
  | 'stale-approval'
  | 'grant-mismatch'
  | 'plan-file-mismatch'
  | 'unfinished-transaction'
  | 'conflicting-user-edit'
  | 'transaction-verify-failed'
  | 'verification-failed'
  | 'nothing-to-apply'
  | 'not-applied'
  | 'undo-conflict';

export interface GitSnapshot {
  head: string | null;
  /** Number of paths with uncommitted changes at apply time (informational). */
  dirtyPaths: number;
}

export interface ApplyReceipt {
  operationId: string;
  transactionId: string | null;
  proposalId: string;
  intentId: string;
  status: ApplyStatus;
  reason: RefusalReason | null;
  detail: string;
  files: string[];
  verification: { status: VerificationStatus; detail: string };
  gitSnapshot: GitSnapshot | null;
  createdAt: string;
  appliedAt: string | null;
  revertedAt: string | null;
  /** True when this response is a replayed receipt, not a new operation. */
  duplicate?: boolean;
}

export interface ApplyRequest {
  session: Pick<PreviewSession, 'propose' | 'verifyGrant' | 'proposalSha256'>;
  grant: ApprovalGrant;
  /** Operation capability minted by the trusted surface for this action. */
  capabilityId: string;
  /** Everything the capability is bound to (must match what it was issued for). */
  binding: CapabilityBinding;
  /** Provenance of the instruction being executed. */
  provenance: Provenance | string;
  /** AST edits that produce exactly the approved postimages. */
  edits: Array<{ file: string; edit: AstEdit }>;
  /** Caller-supplied id makes retries idempotent; defaults to a fresh uuid. */
  operationId?: string;
}

export interface UndoResult {
  ok: boolean;
  status: 'reverted' | 'refused';
  reason: RefusalReason | null;
  detail: string;
  restored: string[];
}

const OPS_DIR = join('.sus', 'ops');
const TX_DIR = join('.sus', 'transactions');

function nowIso(): string {
  return new Date().toISOString();
}

/** Durable, append-only operation receipts (`.sus/ops/<opId>.json`). */
export class OperationReceipts {
  constructor(private readonly root: string) {}

  private path(operationId: string): string {
    return join(this.root, OPS_DIR, `${operationId}.json`);
  }

  load(operationId: string): ApplyReceipt | null {
    const path = this.path(operationId);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as ApplyReceipt;
    } catch {
      return null; // a corrupt receipt is "unknown", never "successful"
    }
  }

  save(receipt: ApplyReceipt): void {
    const dir = join(this.root, OPS_DIR);
    mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.${receipt.operationId}.${randomUUID()}.tmp`);
    writeFileSync(tmp, JSON.stringify(receipt, null, 2));
    renameSync(tmp, this.path(receipt.operationId));
  }

  list(): ApplyReceipt[] {
    const dir = join(this.root, OPS_DIR);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
      .map((name) => this.load(name.replace(/\.json$/, '')))
      .filter((receipt): receipt is ApplyReceipt => receipt !== null);
  }
}

/** Interrupted transactions left on disk by a crash (T0805 manifests). */
export function interruptedTransactions(
  root: string,
): Array<{ operationId: string; state: string }> {
  const dir = join(root, TX_DIR);
  if (!existsSync(dir)) return [];
  const out: Array<{ operationId: string; state: string }> = [];
  for (const name of readdirSync(dir)) {
    const manifestPath = join(dir, name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { state: string };
      if (manifest.state === 'prepared') out.push({ operationId: name, state: manifest.state });
    } catch {
      out.push({ operationId: name, state: 'corrupt' });
    }
  }
  return out;
}

function gitSnapshot(root: string): GitSnapshot | null {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
    const dirtyPaths = status.split('\n').filter((line) => line.trim() !== '').length;
    return { head, dirtyPaths };
  } catch {
    return null; // not a git repository, or git unavailable — recorded as unknown
  }
}

export class ApplyEngine {
  readonly receipts: OperationReceipts;

  constructor(
    private readonly root: string,
    private readonly options: { boundary: ActionBoundary; verify: VerifyFn },
  ) {
    if (typeof options.verify !== 'function') {
      // Fail closed at construction: an apply engine that cannot verify would
      // write changes it cannot vouch for.
      throw new Error('ApplyEngine requires a verify function (typecheck/build)');
    }
    this.receipts = new OperationReceipts(root);
  }

  /** Refuses to start while a previous transaction is unrecovered. */
  private unfinished(): Array<{ operationId: string; state: string }> {
    return interruptedTransactions(this.root);
  }

  async apply(request: ApplyRequest): Promise<ApplyReceipt> {
    const operationId = request.operationId ?? randomUUID();

    // 1. Idempotency: an existing receipt means this operation already ran.
    const existing = this.receipts.load(operationId);
    if (existing) return { ...existing, duplicate: true };

    const base: Omit<ApplyReceipt, 'status' | 'reason' | 'detail'> = {
      operationId,
      transactionId: null,
      proposalId: request.grant.proposalId,
      intentId: request.grant.intentId,
      files: [],
      verification: { status: 'not-run', detail: 'not reached' },
      gitSnapshot: gitSnapshot(this.root),
      createdAt: nowIso(),
      appliedAt: null,
      revertedAt: null,
    };
    const refuse = (reason: RefusalReason, detail: string, files: string[] = []): ApplyReceipt => {
      const receipt: ApplyReceipt = { ...base, files, status: 'refused', reason, detail };
      this.receipts.save(receipt);
      return receipt;
    };

    // 2. Unrecovered transaction from a crash → refuse until recovery.
    const unfinished = this.unfinished();
    if (unfinished.length > 0) {
      return refuse(
        'unfinished-transaction',
        `transaction ${unfinished[0]!.operationId} is ${unfinished[0]!.state}; run recovery before applying`,
      );
    }

    // 3. Approval: content-bound, fresh, for THIS proposal.
    const grantCheck = request.session.verifyGrant(request.grant);
    if (!grantCheck.ok) {
      return refuse(
        grantCheck.reason === 'stale-base' || grantCheck.reason === 'expired'
          ? 'stale-approval'
          : 'grant-mismatch',
        `approval rejected (${grantCheck.reason}): ${grantCheck.detail}`,
      );
    }

    // 4. The plan must describe exactly the approved proposal: every planned
    // file is approved, every approved file is covered (an AST edit, or a whole
    // -file deletion which needs no AST surgery), and no delete carries edits.
    const proposal: Proposal = request.session.propose();
    const proposalFiles = proposal.files.map((file) => file.path).sort();
    const planPaths = [...new Set(request.edits.map((edit) => edit.file))];
    const approvals = new Map(proposal.files.map((file) => [file.path, file]));
    const unapproved = planPaths.filter((path) => !approvals.has(path));
    if (unapproved.length > 0) {
      return refuse(
        'plan-file-mismatch',
        `plan touches unapproved file(s): ${unapproved.join(', ')}`,
        planPaths,
      );
    }
    const uncovered = proposal.files.filter(
      (file) => file.operation !== 'delete' && !planPaths.includes(file.path),
    );
    if (uncovered.length > 0) {
      return refuse(
        'plan-file-mismatch',
        `approved file(s) with no plan edit: ${uncovered.map((file) => file.path).join(', ')}`,
        planPaths,
      );
    }
    const deleteWithEdit = request.edits.filter(
      (edit) => approvals.get(edit.file)?.operation === 'delete',
    );
    if (deleteWithEdit.length > 0) {
      return refuse(
        'plan-file-mismatch',
        `whole-file deletion must not carry AST edits: ${deleteWithEdit.map((edit) => edit.file).join(', ')}`,
        planPaths,
      );
    }
    if (request.edits.length === 0 && proposal.files.every((file) => file.operation !== 'delete')) {
      return refuse('nothing-to-apply', 'no edits supplied', planPaths);
    }

    // 5. Action boundary: provenance + single-use capability for this binding.
    const action: ActionRequest = {
      kind: 'write',
      target: proposalFiles.join(','),
      provenance: request.provenance,
      capabilityId: request.capabilityId,
    };
    const decision = this.options.boundary.request(action, request.binding);
    if (!decision.allowed) return refuse(decision.reason, decision.detail, proposalFiles);

    // 6. Conflict recheck: the approved preimages must still be on disk. This
    // is defence in depth behind step 3 — the user may have edited between the
    // grant verification and here.
    const currentSources = new Map<string, string>();
    for (const file of proposal.files) {
      const absolute = join(this.root, file.path);
      if (!existsSync(absolute)) {
        return refuse(
          'conflicting-user-edit',
          `${file.path} was deleted after the preview; re-preview before applying`,
          proposalFiles,
        );
      }
      const current = readFileSync(absolute, 'utf8');
      if (sha256(current) !== file.beforeSha256) {
        return refuse(
          'conflicting-user-edit',
          `${file.path} changed after the preview; re-preview before applying`,
          proposalFiles,
        );
      }
      currentSources.set(file.path, current);
    }

    // 7. Section-owner resolution: AST edits are computed against the CURRENT
    // sources, so an ambiguous or missing anchor refuses before any write.
    const plan = applyEditPlan(currentSources, request.edits);
    if (!plan.ok) {
      return refuse(plan.reason, `${plan.file}: ${plan.detail}`, planPaths);
    }
    for (const file of proposal.files) {
      if (file.operation === 'delete') continue;
      const after = plan.files.get(file.path);
      if (after === undefined) continue;
      if (file.afterSha256 !== null && sha256(after) !== file.afterSha256) {
        return refuse(
          'plan-file-mismatch',
          `the plan no longer reproduces the approved content for ${file.path}`,
          proposalFiles,
        );
      }
    }

    // 8. Durable transaction: manifest + preimages land before the first write.
    const tx = Transaction.prepare(
      this.root,
      proposal.proposalId,
      1,
      proposal.files.map((file) =>
        file.operation === 'delete'
          ? { path: file.path, deletion: true as const }
          : { path: file.path, postimage: plan.files.get(file.path)! },
      ),
    );
    base.transactionId = tx.manifest.opId;

    tx.apply();
    if (!tx.verify()) {
      tx.rollback();
      const receipt: ApplyReceipt = {
        ...base,
        files: proposalFiles,
        status: 'conflict',
        reason: 'transaction-verify-failed',
        detail: 'post-apply hashes did not match the staged postimages; rolled back',
        revertedAt: nowIso(),
      };
      this.receipts.save(receipt);
      return receipt;
    }

    // 9. Verification decides acceptance. Failure reverts exactly.
    let verification: VerificationResult;
    try {
      verification = await this.options.verify(this.root, proposalFiles);
    } catch (error) {
      verification = { status: 'fail', detail: `verification threw: ${(error as Error).message}` };
    }
    if (verification.status !== 'pass') {
      const rolled = tx.rollback();
      const receipt: ApplyReceipt = {
        ...base,
        files: proposalFiles,
        status: 'reverted',
        reason: 'verification-failed',
        detail:
          rolled.status === 'conflict'
            ? `verification failed AND rollback hit a conflict: ${rolled.conflicts.join(', ')}`
            : `verification failed: ${verification.detail}`,
        verification,
        revertedAt: nowIso(),
      };
      this.receipts.save(receipt);
      return receipt;
    }

    const receipt: ApplyReceipt = {
      ...base,
      files: proposalFiles,
      status: 'applied',
      reason: null,
      detail: `applied ${proposalFiles.length} file(s)`,
      verification,
      appliedAt: nowIso(),
    };
    this.receipts.save(receipt);
    return receipt;
  }

  /**
   * Transaction-specific undo. Restores the transaction's own preimages and
   * refuses when the file changed after apply — the user's later work is never
   * clobbered by an undo of an older operation.
   */
  undo(operationId: string): UndoResult {
    const receipt = this.receipts.load(operationId);
    if (!receipt) {
      return {
        ok: false,
        status: 'refused',
        reason: 'not-applied',
        detail: 'no receipt',
        restored: [],
      };
    }
    if (receipt.status !== 'applied' || !receipt.transactionId) {
      return {
        ok: false,
        status: 'refused',
        reason: 'not-applied',
        detail: `operation is ${receipt.status}; nothing to undo`,
        restored: [],
      };
    }
    let tx: Transaction;
    try {
      tx = Transaction.recover(this.root, receipt.transactionId);
    } catch (error) {
      return {
        ok: false,
        status: 'refused',
        reason: 'not-applied',
        detail: `transaction unavailable: ${(error as Error).message}`,
        restored: [],
      };
    }
    const rolled = tx.rollback();
    if (rolled.status === 'conflict') {
      const failed: ApplyReceipt = {
        ...receipt,
        status: 'conflict',
        reason: 'undo-conflict',
        detail: `refused: ${rolled.conflicts.join(', ')} changed after apply`,
      };
      this.receipts.save(failed);
      return {
        ok: false,
        status: 'refused',
        reason: 'undo-conflict',
        detail: failed.detail,
        restored: [],
      };
    }
    const undone: ApplyReceipt = {
      ...receipt,
      status: 'reverted',
      reason: null,
      detail: `undone: ${receipt.files.length} file(s) restored`,
      revertedAt: nowIso(),
    };
    this.receipts.save(undone);
    return {
      ok: true,
      status: 'reverted',
      reason: null,
      detail: undone.detail,
      restored: receipt.files,
    };
  }

  /**
   * Crash recovery entry point: classifies every interrupted transaction and
   * rolls it forward or back exactly, or reports the conflict. Never guesses.
   */
  recoverInterrupted(mode: 'roll-forward' | 'roll-back' = 'roll-back'): Array<{
    operationId: string;
    status: 'recovered' | 'conflict';
    conflicts: string[];
  }> {
    return this.unfinished().map(({ operationId }) => {
      try {
        const tx = Transaction.recover(this.root, operationId);
        const result = tx.recover(mode);
        return { operationId, status: result.status, conflicts: result.conflicts };
      } catch (error) {
        return {
          operationId,
          status: 'conflict' as const,
          conflicts: [`unreadable transaction: ${(error as Error).message}`],
        };
      }
    });
  }
}
