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
