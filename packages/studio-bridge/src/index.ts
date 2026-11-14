/**
 * @sus/studio-bridge — localhost server, auth, allowlist, session state
 * (ADR-003). T0701: read-only session surface. NO consumer-source write
 * endpoints exist before the T0707/T0700w safety gates pass.
 */
export {
  BridgeServer,
  BridgeAudit,
  MessageEnvelope,
  MAX_PAYLOAD_BYTES,
  type BridgeOptions,
  type SessionState,
  type AuditEntry,
  type MessageEnvelopeData,
} from './server.js';
export { CdpOverlay, type AttachResult } from './cdp.js';
export {
  resolveSelection,
  type Anchor,
  type AnchorKind,
  type SelectionResult,
  type RankedCandidate,
} from './select.js';
export {
  buildAnnotation,
  normalizePoint,
  serializeSession,
  deserializeSession,
  undoLastAnnotation,
  type DrawnAnnotation,
} from './annotations.js';
export { compileIntent, deriveRelationship, type CompileInput } from './intent-compiler.js';
export {
  PreviewSession,
  responsiveAlternativeFor,
  PREVIEW_CONTEXT_LINES,
  type ApprovalDecision,
  type ApprovalGrant,
  type GrantCheck,
  type Proposal,
  type ProposalFile,
  type ProposalOperation,
  type ProposalSummary,
  type ProposedEdit,
  type ResponsiveAlternative,
} from './preview.js';
export {
  buildHunks,
  diffLines,
  diffStats,
  splitDiff,
  unifiedDiff,
  toLines,
  type DiffStats,
  type Hunk,
  type LineOp,
  type SplitRow,
} from './diff.js';
export {
  Transaction,
  sha256,
  type TransactionManifest,
  type TxFile,
  type TxState,
} from './transaction.js';
