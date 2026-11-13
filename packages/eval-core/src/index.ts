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
