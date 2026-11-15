/**
 * @sus/eval-core — rubric runner, evidence bundles, calibration (M1.5).
 * T0151: scoring library + CLI. Harness pieces land with T0152/T0152b/T0154.
 */
export { scoreSection } from './scoring.js';
export { collectPageMetrics, type PageMetrics } from './harness/metrics.js';
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
