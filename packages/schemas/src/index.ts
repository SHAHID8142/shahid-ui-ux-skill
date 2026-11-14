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
export {
  REQUIRED_SEMANTIC_ROLES,
  SusTokens,
  SusTokensFile,
  flattenTokens,
  missingSemanticRoles,
  type DtcgGroup,
  type DtcgToken,
  type DtcgTokenType,
} from './tokens.js';
export {
  ComponentStates,
  MotionDecision,
  SusStateMachine,
  Transition,
  type ComponentStateMachineData,
  type MotionDecisionData,
  type TransitionData,
  ComponentStateMachine,
} from './interaction.js';
export {
  Playbook,
  PlaybookRule,
  RuleKind,
  SusPlaybook,
  type PlaybookData,
  type PlaybookRuleData,
} from './playbook.js';
export {
  BehaviorKind,
  ClaimsRegister,
  ClaimsRegisterEntry,
  DomainBehavior,
  DomainBehaviorContract,
  REQUIRED_COMMERCE_BEHAVIORS,
  REQUIRED_OPERATE_BEHAVIORS,
  SusClaimsRegister,
  SusDomainBehaviorContract,
  type ClaimsRegisterEntryData,
  type DomainBehaviorData,
} from './copy-seo.js';
export {
  DesignContract,
  SectionBrief,
  SectionOrder,
  SusDesignContract,
  type DesignContractData,
  type SectionBriefData,
} from './section-brief.js';
export {
  ApprovalReceipt,
  ChangePlan,
  DecisionEntry,
  DecisionLog,
  LearningLog,
  Lesson,
  Prediction,
  SECTION_STATUSES,
  SectionState,
  SusApprovalReceipt,
  SusChangePlan,
  SusDecisionLog,
  SusLearningLog,
  canTransition,
  sectionLockViolation,
  type ApprovalReceiptData,
  type ChangePlanData,
  type SectionStateData,
} from './progressive.js';
export {
  MotionTokens,
  SusMotionTokens,
  SusTransitionSpec,
  TRANSITION_SPEC_FIELDS,
  TransitionSpec,
  type MotionTokensData,
  type TransitionSpecData,
} from './motion.js';
export {
  Annotation,
  AnnotationKind,
  AnnotationSession,
  SusAnnotation,
  SusAnnotationSession,
  undoLast,
  type AnnotationData,
  type AnnotationSessionData,
} from './annotations.js';
