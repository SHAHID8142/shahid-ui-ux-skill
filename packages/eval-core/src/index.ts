/**
 * @sus/eval-core — rubric runner, evidence bundles, calibration (M1.5).
 * T0151: scoring library + CLI. Harness pieces land with T0152/T0152b/T0154.
 */
export { scoreSection } from './scoring.js';
export { collectPageMetrics, type PageMetrics } from './harness/metrics.js';
export {
  COMPONENT_KINDS,
  FOCUS_DIMENSIONS,
  SCOPE_KINDS,
  SCOPE_LIMITS,
  classifyComponent,
  renderScope,
  resolveScope,
  selectFocus,
  type ComponentKind,
  type FocusDimension,
  type FocusSelection,
  type ScopeKind,
  type ScopeOutcome,
  type ScopePage,
  type ScopeReference,
  type ScopeResolution,
  type ScopeTarget,
} from './audit/scope.js';
export {
  KEYBOARD_MAX_STOPS,
  scanKeyboard,
  type KeyboardScanResult,
  type KeyboardStop,
} from './harness/keyboard.js';
export {
  captureMatrix,
  VIEWPORTS,
  THEMES,
  type CaptureResult,
  type CaptureCombo,
} from './harness/capture.js';
export { evaluateG11, type GateResult } from '@sus/schemas';
export {
  createJudgeSession,
  recordPass,
  computeAgreement,
  type JudgeSession,
  type JudgeSubmission,
  type JudgePass,
  type AgreementReport,
  type AxisAgreement,
} from './judge.js';
export {
  evaluateG4,
  evaluateG5,
  type GateVerdict,
  type AxeScanResult,
  type LighthouseSummary,
  type BudgetSpec,
  type GateStatus,
} from './harness/a11y-budgets.js';
export { runHardeningMatrix, type HardeningResult, type MatrixCell } from './hardening.js';
export {
  DOGFOOD_CHECKS,
  evaluateSite,
  findingsFor,
  summarise,
  renderSummary,
  type CheckStatus,
  type DogfoodCheck,
  type DogfoodSummary,
  type DogfoodObservation,
  type SiteReport,
} from './dogfood.js';

export {
  SETTLE_MS,
  evaluateTransitionOracles,
  informationTokens,
  type GateVerdict as TransitionGateVerdict,
  type Modality,
  type Observation,
  type OracleCase,
  type Scenario,
} from './harness/transition-oracle.js';

export {
  AUDIT_CHECK_STATUSES,
  AUDIT_CHECKS,
  AUDIT_COMMAND,
  AUDIT_EXIT_CODES,
  AUDIT_HELP,
  AUDIT_MODES,
  AUDIT_OUTPUT_FILES,
  AUDIT_REDUCED_MOTION,
  AUDIT_SEVERITIES,
  AUDIT_SEVERITY_MEANING,
  AUDIT_TARGET_KINDS,
  AUDIT_THEMES,
  AUDIT_VIEWPORTS,
  AUDIT_WILL_NOT,
  assertAuthorizedUrl,
  parseRoutes,
  renderContractMarkdown,
  viewportNames,
  type AuditCheckDescriptor,
  type AuditCheckStatus,
  type AuditEffort,
  type AuditMode,
  type AuditSeverity,
  type AuditTargetKind,
  type AuditViewport,
} from './audit/contract.js';
export {
  AuditCheckResult,
  AuditFinding,
  AuditReport,
  AuditSummary,
  AuditTarget,
  NEEDS_REVIEW_ITEMS,
  checkResult,
  exitCodeFor,
  finding,
  renderAuditMarkdown,
  requiredIn,
  sortFindings,
  stableFindingId,
  summariseFindings,
} from './audit/report.js';
export {
  buildEvidenceBundle,
  composeReport,
  emptyGroup,
  type AuditInputs,
  type LiveGroup,
  type LiveSample,
  type RouteHtml,
  type SlopInput,
} from './audit/compose.js';
export { runAudit, type AuditOptions, type AuditRun, type FixPlan } from './audit/pipeline.js';
