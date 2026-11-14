/**
 * Dry-run proposal preview (T0706).
 *
 * The Studio must be able to show exactly what a change would do BEFORE any
 * consuming-project byte changes: files affected, before/after content, a
 * unified diff and a split view, the responsive alternative, and the
 * confidence of the mapping that produced it.
 *
 * Three invariants this module exists to enforce:
 *
 * 1. **Preview never writes the consuming project.** The proposed postimages
 *    are staged in a disposable temp workspace OUTSIDE the repo root. The only
 *    access to the root is `readFileSync` for preimages. Tests prove it by
 *    hashing every file in the fixture tree before and after propose/reject.
 * 2. **No write without an explicit, matching, fresh approval.** `approve()`
 *    turns an explicit out-of-page decision into a single-use grant bound to
 *    the proposal's content hash. `verifyGrant()` recomputes that hash from
 *    the CURRENT files: if the user edited a target file after the preview
 *    (or the grant is for another proposal, or expired), the grant is stale
 *    and T0707 must refuse. Approval therefore can never be implied by
 *    rendering the preview, and never by an in-page DOM event (peer finding
 *    mmwg0nchr: isolated worlds do not isolate DOM events).
 * 3. **Path escape is refused.** Proposal paths are repo-relative; absolute
 *    paths and `..` segments are rejected rather than normalized, because a
 *    silently-normalized path can point somewhere the user never saw.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, normalize, sep } from 'node:path';
import { tmpdir } from 'node:os';
import type { VisualIntentData } from '@sus/schemas';
import { diffStats, splitDiff, unifiedDiff, type SplitRow } from './diff.js';

export const PREVIEW_CONTEXT_LINES = 3;
const DEFAULT_NARROW_BREAKPOINT_PX = 640;

export interface ProposedEdit {
  /** Repo-relative path. Created files may be absent on disk. */
  path: string;
  /** Full intended file content after the change (already resolved by the caller). */
  after: string;
  /** Explicit delete (after must then be ''). */
  delete?: boolean;
}

export type ProposalOperation = 'modify' | 'create' | 'delete';

export interface ProposalFile {
  path: string;
  operation: ProposalOperation;
  beforeSha256: string | null;
  afterSha256: string | null;
  additions: number;
  deletions: number;
  unified: string;
  split: SplitRow[];
}

export interface ResponsiveAlternative {
  /** Where the alternative applies. */
  maxWidthPx: number;
  source: 'intent' | 'not-captured';
  description: string;
}

export interface ProposalSummary {
  filesTouched: number;
  filesCreated: number;
  filesDeleted: number;
  additions: number;
  deletions: number;
}

export interface Proposal {
  proposalId: string;
  intentId: string;
  /** confidence of the target/mapping resolution this proposal rests on. */
  confidence: number;
  createdAt: string;
  status: 'preview';
  files: ProposalFile[];
  summary: ProposalSummary;
  responsiveAlternative: ResponsiveAlternative;
  /** Intent unknowns carried forward: they are questions, not done work. */
  unknowns: string[];
  /** Always true and never settable to false: apply needs a grant, not this flag. */
  requiresApproval: true;
}

export interface ApprovalDecision {
  proposalId: string;
  /** Who approved, surfaced for the audit trail. Must be non-empty. */
  approvedBy: string;
  /** ISO timestamp; defaults to now. */
  approvedAt?: string;
  /** Free-text note from the approver (optional, kept for the record). */
  note?: string;
}

export interface ApprovalGrant {
  grantId: string;
  proposalId: string;
  intentId: string;
  /** Hash of the proposal content; the grant dies if the proposal changes. */
  proposalSha256: string;
  approvedBy: string;
  issuedAt: string;
  expiresAt: string;
  /** Grants are consumed by exactly one apply operation. */
  singleUse: true;
}

export type GrantCheck =
  | { ok: true; grant: ApprovalGrant }
  | {
      ok: false;
      reason: 'unknown-proposal' | 'rejected' | 'hash-mismatch' | 'stale-base' | 'expired';
      detail: string;
    };

const GRANT_TTL_MS = 10 * 60 * 1000;

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function refusePath(path: string): string | null {
  if (path.trim() === '') return 'empty path';
  if (isAbsolute(path)) return `absolute path refused: ${path}`;
  const normalized = normalize(path);
  if (normalized.split(sep).includes('..')) return `path escape refused: ${path}`;
  if (normalized !== path) return `non-canonical path refused: ${path}`;
  return null;
}

/**
 * Derives what the change means at a narrow viewport from the intent.
 * When the intent says nothing about reflow, this reports `not-captured`
 * instead of inventing a responsive claim — an unverified responsive promise
 * is exactly the kind of output this product exists to prevent.
 */
export function responsiveAlternativeFor(intent: VisualIntentData): ResponsiveAlternative {
  const reflow = intent.reflow ?? intent.constraints.find((c) => c.kind === 'reflow')?.reflow;
  if (reflow === 'stack') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description:
        'Below the narrow breakpoint the new element stacks under its target and takes the full content width (reflow: stack).',
    };
  }
  if (reflow === 'inline') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description:
        'Below the narrow breakpoint the new element stays inline with its target rather than taking a full row (reflow: inline).',
    };
  }
  if (reflow === 'hide-below') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description:
        'Below the narrow breakpoint the new element is hidden; verify the information it carries is reachable elsewhere (reflow: hide-below).',
    };
  }
  if (reflow === 'reorder') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description:
        'Below the narrow breakpoint the element moves in the DOM order to stay near its target (reflow: reorder).',
    };
  }
  const relationship = intent.relationship;
  if (relationship === 'above' || relationship === 'below') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description: `Below the narrow breakpoint the element keeps its ${relationship} relationship and stretches to the full content width.`,
    };
  }
  if (relationship === 'inside' || relationship === 'instead-of') {
    return {
      maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
      source: 'intent',
      description: `Below the narrow breakpoint the element stays ${relationship === 'inside' ? 'inside its container' : 'in place of the target'} and wraps at the content width.`,
    };
  }
  return {
    maxWidthPx: DEFAULT_NARROW_BREAKPOINT_PX,
    source: 'not-captured',
    description:
      'No reflow or spatial relationship was captured for this intent, so the narrow-viewport result is unverified: confirm it in the responsive preview before approving.',
  };
}

/**
 * A dry-run preview session. Holds a disposable workspace containing the
 * staged postimages; the consuming project is read-only for its whole life.
 */
export class PreviewSession {
  private readonly root: string;
  private readonly intent: VisualIntentData;
  private readonly edits: ProposedEdit[];
  readonly workspace: string;
  private state: 'open' | 'rejected' | 'approved' = 'open';
  private built: Proposal | null = null;
  private grant: ApprovalGrant | null = null;

  private constructor(root: string, intent: VisualIntentData, edits: ProposedEdit[]) {
    this.root = root;
    this.intent = intent;
    this.edits = edits;
    this.workspace = mkdtempSync(join(tmpdir(), 'sus-preview-'));
  }

  /**
   * Opens a preview. Refuses immediately on unsafe paths or a `delete` that
   * still carries content, so a malformed plan never reaches diff rendering.
   */
  static open(root: string, intent: VisualIntentData, edits: ProposedEdit[]): PreviewSession {
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      throw new Error(`preview root is not a directory: ${root}`);
    }
    if (edits.length === 0) throw new Error('a proposal needs at least one edit');
    const seen = new Set<string>();
    for (const edit of edits) {
      const problem = refusePath(edit.path);
      if (problem) throw new Error(problem);
      if (seen.has(edit.path)) throw new Error(`duplicate edit for ${edit.path}`);
      seen.add(edit.path);
      if (edit.delete && edit.after !== '') {
        throw new Error(`delete edit for ${edit.path} must carry empty content`);
      }
    }
    const session = new PreviewSession(root, intent, edits);
    session.stage();
    return session;
  }

  /** Copies preimages into the disposable workspace and writes postimages there. */
  private stage(): void {
    const staged = join(this.workspace, 'staged');
    mkdirSync(staged, { recursive: true });
    this.edits.forEach((edit, index) => {
      const absolute = join(this.root, edit.path);
      const before = existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
      writeFileSync(join(staged, `preimage-${index}.txt`), before);
      writeFileSync(join(staged, `postimage-${index}.txt`), edit.after);
    });
  }

  /** Builds the proposal (idempotent: the same call returns the same object). */
  propose(createdAt = new Date().toISOString()): Proposal {
    if (this.state === 'rejected') throw new Error('preview was rejected; open a new session');
    if (this.built) return this.built;

    const files: ProposalFile[] = this.edits.map((edit) => {
      const absolute = join(this.root, edit.path);
      const exists = existsSync(absolute);
      const before = exists ? readFileSync(absolute, 'utf8') : '';
      const stats = diffStats(before, edit.after);
      const operation: ProposalOperation = edit.delete ? 'delete' : exists ? 'modify' : 'create';
      return {
        path: edit.path,
        operation,
        beforeSha256: exists ? sha256(before) : null,
        afterSha256: edit.delete ? null : sha256(edit.after),
        additions: stats.additions,
        deletions: stats.deletions,
        unified: unifiedDiff(edit.path, before, edit.after, PREVIEW_CONTEXT_LINES),
        split: splitDiff(before, edit.after),
      };
    });

    const summary: ProposalSummary = {
      filesTouched: files.length,
      filesCreated: files.filter((f) => f.operation === 'create').length,
      filesDeleted: files.filter((f) => f.operation === 'delete').length,
      additions: files.reduce((sum, f) => sum + f.additions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    };

    this.built = {
      proposalId: randomUUID(),
      intentId: this.intent.id,
      confidence: this.intent.target.confidence,
      createdAt,
      status: 'preview',
      files,
      summary,
      responsiveAlternative: responsiveAlternativeFor(this.intent),
      unknowns: [...this.intent.unknowns],
      requiresApproval: true,
    };
    return this.built;
  }

  /** Hash over the proposal's decision-relevant content (grant binding). */
  proposalSha256(): string {
    const proposal = this.propose();
    const material = proposal.files
      .map((f) => `${f.path}\u0000${f.beforeSha256 ?? ''}\u0000${f.afterSha256 ?? ''}`)
      .sort()
      .join('\u0001');
    return sha256(`${proposal.proposalId}\u0002${proposal.intentId}\u0002${material}`);
  }

  /** Rejecting disposes the workspace; the consuming project was never written. */
  reject(_reason: string): { status: 'rejected'; workspaceDisposed: true } {
    if (this.state === 'approved') throw new Error('an approved proposal cannot be rejected');
    this.state = 'rejected';
    this.built = null;
    this.grant = null;
    this.dispose();
    return { status: 'rejected', workspaceDisposed: true };
  }

  /**
   * Explicit approval → single-use grant. Requires a non-empty approver and a
   * matching proposal id: an approval for anything else is not an approval.
   */
  approve(decision: ApprovalDecision, now = new Date()): ApprovalGrant {
    if (this.state === 'rejected') throw new Error('preview was rejected; open a new session');
    const proposal = this.propose();
    if (decision.proposalId !== proposal.proposalId) {
      throw new Error(
        `approval names ${decision.proposalId} but the open preview is ${proposal.proposalId}`,
      );
    }
    if (decision.approvedBy.trim() === '') throw new Error('approval needs a non-empty approver');
    const issuedAt = now.toISOString();
    this.grant = {
      grantId: randomUUID(),
      proposalId: proposal.proposalId,
      intentId: proposal.intentId,
      proposalSha256: this.proposalSha256(),
      approvedBy: decision.approvedBy.trim(),
      issuedAt,
      expiresAt: new Date(now.getTime() + GRANT_TTL_MS).toISOString(),
      singleUse: true,
    };
    this.state = 'approved';
    return this.grant;
  }

  /**
   * Re-checks a grant against the proposal as it stands NOW. T0707 calls this
   * immediately before its first mutation:
   *  - `stale-base`: a target file changed since the preview (the user edited
   *    it, or another tool did) — the approved diff no longer describes reality;
   *  - `hash-mismatch`: the grant belongs to a different proposal;
   *  - `expired`: approvals are fresh by construction, never standing.
   */
  verifyGrant(grant: ApprovalGrant, now = new Date()): GrantCheck {
    const proposal = this.built;
    if (!proposal) {
      return { ok: false, reason: 'unknown-proposal', detail: 'no proposal was built' };
    }
    if (this.state === 'rejected') {
      return { ok: false, reason: 'rejected', detail: 'the proposal was rejected' };
    }
    if (
      grant.proposalId !== proposal.proposalId ||
      grant.proposalSha256 !== this.proposalSha256()
    ) {
      return {
        ok: false,
        reason: 'hash-mismatch',
        detail: 'grant was issued for different proposal content',
      };
    }
    if (new Date(grant.expiresAt).getTime() <= now.getTime()) {
      return { ok: false, reason: 'expired', detail: `grant expired at ${grant.expiresAt}` };
    }
    for (const file of proposal.files) {
      const absolute = join(this.root, file.path);
      const current = existsSync(absolute) ? sha256(readFileSync(absolute, 'utf8')) : null;
      if (current !== file.beforeSha256) {
        return {
          ok: false,
          reason: 'stale-base',
          detail: `${file.path} changed after the preview; re-preview before applying`,
        };
      }
    }
    return { ok: true, grant };
  }

  /** Discards the disposable workspace. Safe to call repeatedly. */
  dispose(): void {
    rmSync(this.workspace, { recursive: true, force: true });
  }

  /** Test-only visibility into the staged workspace contents. */
  stagedFile(name: string): string {
    return readFileSync(join(this.workspace, 'staged', name), 'utf8');
  }

  /** Test-only: proves nothing lingered in the workspace after disposal. */
  workspaceExists(): boolean {
    return existsSync(this.workspace);
  }
}
