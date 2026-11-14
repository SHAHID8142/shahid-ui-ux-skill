/**
 * Intent compiler (T0705): annotation geometry + target anchors → Visual
 * Intent v1 (constraints, not pixels — §7.3). Deterministic; ambiguous
 * targets produce focused unknowns[] instead of guesses.
 */
import {
  VisualIntent,
  type VisualIntentData,
  type AnnotationData,
} from '@sus/schemas';
import type { Anchor } from './select.js';

export interface CompileInput {
  intentId: string;
  annotations: AnnotationData[];
  /** Resolved target anchors (from T0703 selection). */
  target: Anchor & { confidence: number };
  /** Drawn box the user expressed, normalized 0..1 (may be empty for text-only). */
  geometry: Array<{ x: number; y: number }>;
  userText: string;
  viewport: { width: number; height: number };
}

/**
 * Derives the dominant spatial relationship from normalized geometry.
 * A box placed above the target's band → 'above', below → 'below',
 * overlapping → 'inside'; no geometry → relationship undefined (clarify).
 */
export function deriveRelationship(
  geometry: Array<{ x: number; y: number }>,
  targetBand: { top: number; bottom: number },
): 'above' | 'below' | 'inside' | undefined {
  if (geometry.length === 0) return undefined;
  const ys = geometry.map((g) => g.y);
  const drawnTop = Math.min(...ys);
  const drawnBottom = Math.max(...ys);
  if (drawnBottom <= targetBand.top) return 'above';
  if (drawnTop >= targetBand.bottom) return 'below';
  if (drawnTop >= targetBand.top && drawnBottom <= targetBand.bottom) return 'inside';
  return undefined;
}

export function compileIntent(input: CompileInput): VisualIntentData {
  const unknowns: string[] = [];
  const constraints: VisualIntentData['constraints'] = [];

  // target confidence gate (T0703 ladder): below 0.6 → clarification, not a guess
  const ambiguous = input.target.confidence < 0.6;
  if (ambiguous) {
    unknowns.push(
      `target "${input.target.value}" resolved at confidence ${input.target.confidence.toFixed(2)} — confirm the intended element from ranked candidates`,
    );
  }

  // text constraint when the user supplied copy/content
  if (input.userText.trim().length > 0) {
    constraints.push({ kind: 'content', text: input.userText.trim().slice(0, 500) });
  }

  // spatial relationship from drawn geometry vs the target band
  const band = {
    top: input.geometry.length ? 0.4 : 0.35,
    bottom: input.geometry.length ? 0.6 : 0.65,
  };
  const relationship = deriveRelationship(input.geometry, band);
  if (relationship === undefined && input.geometry.length > 0) {
    unknowns.push('drawn box straddles the target band — clarify whether the new element goes above or below');
  } else if (relationship) {
    constraints.push({ kind: 'relationship', relationship });
  }

  // reflow intent for narrow-viewport requirements (issue #10 lineage)
  if (input.annotations.some((a) => a.label.toLowerCase().includes('stack'))) {
    constraints.push({ kind: 'reflow', reflow: 'stack' });
  }

  // no expressible constraint → honest unknown (schema permits
  // unknowns-only intents; a silent guess is never produced)
  if (constraints.length === 0 && relationship === undefined) {
    unknowns.push('no actionable spatial/content constraint captured — clarify the intended change');
  }

  const intent: VisualIntentData = {
    id: input.intentId,
    fromAnnotationIds: input.annotations.map((a) => a.id),
    target: {
      selector: input.target.kind === 'id' ? `#${input.target.value}` : input.target.value,
      susId: input.target.kind === 'id' ? input.target.value : null,
      confidence: input.target.confidence,
    },
    relationship,
    alignment: undefined,
    orderIndex: undefined,
    maxMeasure: undefined,
    priority: 'should',
    reflow: undefined,
    userText: input.userText.slice(0, 500),
    constraints,
    unknowns,
  };

  const parsed = VisualIntent.safeParse(intent);
  if (!parsed.success) {
    throw new Error(`compiled intent invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}
