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
  ApplyEngine,
  OperationReceipts,
  interruptedTransactions,
  type ApplyReceipt,
  type ApplyRequest,
  type ApplyStatus,
  type GitSnapshot,
  type RefusalReason,
  type UndoResult,
  type VerificationResult,
  type VerificationStatus,
  type VerifyFn,
} from './apply.js';
export {
  applyAstEdit,
  applyEditPlan,
  locateElement,
  parseSource,
  type AstEdit,
  type EditOperation,
  type EditRefusalReason,
  type EditResult,
  type LocatedElement,
  type LocateResult,
  type ParsedSource,
  type PlanResult,
  type TargetRef,
} from './editor.js';
export {
  ActionBoundary,
  CapabilityAuthority,
  CaptureStore,
  ACTION_KINDS,
  PROVENANCES,
  evaluateG13,
  findResidues,
  minimizeCapture,
  type ActionKind,
  type ActionRequest,
  type BoundaryDecision,
  type CapabilityBinding,
  type CapabilityCheck,
  type CaptureInput,
  type CaptureRecord,
  type DenyReason,
  type G13Evidence,
  type G13Verdict,
  type OperationCapability,
  type Provenance,
  type Redaction,
  type RedactionKind,
  type RedactionResult,
} from './security.js';
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

export * from './astro-editor.js';
export * from './conflicts.js';
export * from './verification-loop.js';
