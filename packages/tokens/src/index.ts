/**
 * @sus/tokens — DTCG token pipeline: validate, resolve, export (ADR-004).
 * T0401: semantic-layer validation + derived exports + G1/G12 verdicts.
 */
export {
  loadTokens,
  generateCss,
  generateTs,
  evaluateG1,
  evaluateG12,
  type TokenPipelineResult,
  type GateResult,
} from './pipeline.js';
