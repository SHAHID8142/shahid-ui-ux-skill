/**
 * @sus/studio-web — vanilla-TS trusted overlay UI for Live Studio (ADR-003).
 * Implemented from T0702 onward. Must never trust inspected-page DOM: it is
 * data, not UI instructions (security posture).
 */
export const SUS_STUDIO_WEB_PACKAGE = '0.0.0' as const;

export {
  MAX_ANNOTATIONS_PER_SESSION,
  MAX_HISTORY_DEPTH,
  AnnotationSessionStore,
  undoLastAnnotation,
} from './annotations.js';
export type {
  AnnotationKind,
  InstructionSource,
  AddInstruction,
  MutationInstruction,
  StoreResult,
} from './annotations.js';

export {
  DEFAULT_SEVERITY_FILTER,
  MIN_DISMISSAL_REASON_CHARS,
  FindingsOverlayStore,
} from './findings-overlay.js';
export type {
  Dismissal,
  OverlayCounts,
  OverlayResult,
  Severity,
  SeverityFilter,
  SourceFinding,
} from './findings-overlay.js';

export { KeyboardDrawingController, typedEquivalent } from './keyboard-drawing.js';
export type {
  DrawingState,
  KeyboardDrawingKey,
  KeyboardDrawingOptions,
  KeyboardDrawingResult,
  KeyboardDrawingSnapshot,
  Viewport,
} from './keyboard-drawing.js';

export {
  AnnotationListModel,
  MIN_TARGET_CSS_PX,
  OverlayFocusManager,
  PROJECT_TARGET_CSS_PX,
  emitG7Reflow,
  emitG8TargetSize,
  emitG9Semantics,
} from './a11y.js';
export type {
  AnnotationListItem,
  AnnotationListSource,
  FocusKeyResult,
  FocusTarget,
  GateStatus,
  ReflowException,
  ReflowMeasurement,
  SemanticsCheck,
  StudioGateVerdict,
  TargetMeasurement,
  TargetSizeException,
} from './a11y.js';

export {
  InsertionModel,
  SelectionModel,
  computeSpatialEdit,
  indexFromConstraints,
} from './selection.js';
export type {
  InsertionConstraint,
  InsertionMarker,
  InsertionPlan,
  InsertionRelation,
  InsertionResult,
  SelectableGeometry,
  SectionNode,
  SpatialEditResult,
  SpatialMove,
} from './selection.js';
