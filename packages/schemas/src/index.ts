/**
 * @sus/schemas — Zod contracts + generated JSON Schema (ADR-005).
 * T0104: schema versioning pattern + compact task-record contract.
 * Future schemas register here with the same $id/version/migration pattern.
 */
export { applyMigrations, defineSusSchema, type Migration, type SusSchema } from './versioning.js';
export {
  SUS_SCHEMA_REGISTRY,
  SusTaskRecordV1,
  SusTaskRecordV2,
  TASK_PHASES,
  TASK_STATUSES,
  TaskId,
  TaskRecordCurrent,
  TaskRecordV1,
  TaskRecordV2,
  Lease,
  Milestone,
  migrateTaskRecordV1toV2,
} from './task-record.js';
export {
  AXIS_TIERS,
  JUDGED_AXES,
  RUBRIC_AXES,
  RUBRIC_TIERS,
  RubricScore,
  AxisScore,
  ScoreValue,
  ScoringVerdict,
  SusRubricScore,
  SusScoringVerdict,
  type AxisScoreData,
  type RubricScoreData,
  type ScoringVerdictData,
} from './rubric.js';
export {
  CaptureShot,
  EvidenceBundle,
  GateResultData,
  PageMetricsData,
  SusEvidenceBundle,
  ThemeName,
  ViewportName,
  evaluateG11,
  type EvidenceBundleData,
  type GateResult,
} from './evidence-bundle.js';
import { SusRubricScore } from './rubric.js';
import { SusEvidenceBundle } from './evidence-bundle.js';
import { SusTaskRecordV1, SusTaskRecordV2 } from './task-record.js';

/** All versioned SUS schemas; the JSON-Schema exporter consumes this. */
export const SUS_SCHEMA_REGISTRY_ALL = [
  SusTaskRecordV1,
  SusTaskRecordV2,
  SusRubricScore,
  SusEvidenceBundle,
] as const;
export { ACTIONS, MODULES, SURFACES, Intent, SusIntent, type IntentData } from './intent.js';
export {
  ProvenanceCatalog,
  ResearchClaim,
  ResearchPlan,
  Source,
  Strength,
  VerificationMethod,
  SusProvenanceCatalog,
  type ProvenanceCatalogData,
  type ResearchClaimData,
  type ResearchPlanData,
  type SourceData,
} from './research-evidence.js';
export { SusSlopTaxonomy, TAXONOMY, type SlopCategoryData } from './slop-taxonomy.js';
