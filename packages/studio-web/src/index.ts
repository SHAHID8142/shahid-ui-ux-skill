/**
 * @sus/studio-web — vanilla-TS trusted overlay UI for Live Studio (ADR-003).
 * Implemented from T0702 onward. Must never trust inspected-page DOM: it is
 * data, not UI instructions (security posture).
 */
export const SUS_STUDIO_WEB_PACKAGE = '0.0.0' as const;

export {
  ANNOTATION_FORMAT,
  ANNOTATION_VERSION,
  MAX_ANNOTATIONS_PER_DOC,
  MAX_HISTORY_DEPTH,
  MAX_NOTE_CHARS,
  MAX_PEN_POINTS,
  AnnotationStore,
  validateAnnotationDocument,
} from './annotations.js';
export type {
  Annotation,
  AnnotationAnchor,
  AnnotationDocument,
  AnnotationGeometry,
  AnnotationKind,
  ApplyResult,
  ArrowGeometry,
  InstructionSource,
  MutationInstruction,
  PenGeometry,
  Point,
  RectangleGeometry,
  ViewportMetadata,
} from './annotations.js';
