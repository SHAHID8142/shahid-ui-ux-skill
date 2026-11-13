/**
 * Progressive workflow contracts (T0502/T0503/T0504/T0506/T0508, 5A).
 *
 * Section lifecycle: draft → proposed → approved → applied → verified →
 * accepted (rejections and blocks recorded). G2 enforcement: section N+1
 * cannot be PROPOSED before section N is accepted (locks are derived from
 * recorded states, not remembered). Change plans carry diff + approval
 * requirements; approval receipts are VERSION-BOUND to the design contract;
 * decisions are append-only; exceptions carry expiry and can never turn a
 * gate failure into a pass. Predictions and lessons implement the
 * learner-not-believer epistemics (D17).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const SECTION_STATUSES = [
  'draft',
  'proposed',
  'approved',
  'applied',
  'verified',
  'accepted',
  'rejected',
  'blocked',
] as const;

export const SectionState = z
  .object({
    sectionId: z.string().min(1),
    status: z.enum(SECTION_STATUSES),
    /** The change plan this state came from (null in draft). */
    planId: z.string().nullable(),
    updatedAt: z.string().min(1),
    /** Required for rejected/blocked. */
    reason: z.string().optional(),
  })
  .strict();

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  draft: ['proposed', 'blocked'],
  proposed: ['approved', 'rejected', 'blocked'],
  approved: ['applied', 'rejected'],
  applied: ['verified', 'blocked'],
  verified: ['accepted', 'rejected'],
  accepted: [],
  rejected: ['draft'],
  blocked: ['draft'],
};

export function canTransition(from: string, to: string): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * G2 section locks: section N+1 cannot be PROPOSED before N is accepted.
 * Returns the failing section or null.
 */
export function sectionLockViolation(
  states: Array<{ sectionId: string; status: string }>,
  order: string[],
): string | null {
  const byId = new Map(states.map((s) => [s.sectionId, s.status]));
  for (let i = 0; i < order.length - 1; i += 1) {
    const next = order[i + 1]!;
    if (
      (byId.get(next) ?? 'draft') !== 'draft' &&
      (byId.get(order[i]!) ?? 'draft') !== 'accepted'
    ) {
      return next;
    }
  }
  return null;
}

export const ChangePlan = z
  .object({
    id: z.string().min(1),
    sectionId: z.string().min(1),
    /** What the change intends, derived from the brief (D15: no templates). */
    intent: z.string().min(1),
    /** Repo-relative files the plan would touch (bounded, explicit). */
    filesAffected: z.array(z.string().min(1)).min(1),
    /** Unified diff of the proposed change (before approval). */
    diff: z.string().min(1),
    /** Before/after evidence refs (screenshots/capture.json from T0152). */
    evidenceBefore: z.array(z.string()),
    evidenceAfter: z.array(z.string()),
    /** Approval requirement is structural: user approval event required. */
    approvalRequirement: z.literal('explicit-user-approval'),
    contractVersion: z.literal(1),
  })
  .strict();

export const ApprovalReceipt = z
  .object({
    planId: z.string().min(1),
    decision: z.enum(['approved', 'rejected']),
    decidedAt: z.string().min(1),
    approver: z.string().min(1),
    reason: z.string().min(1),
    /** Version-bound: receipt only validates against this contract version. */
    contractVersion: z.literal(1),
  })
  .strict();

export const DecisionEntry = z
  .object({
    at: z.string().min(1),
    kind: z.enum(['gate-relaxation', 'scope-note', 'exception', 'lesson']),
    /** What was decided and by whom (append-only log; GATE_REGISTRY rule). */
    text: z.string().min(1),
    by: z.string().min(1),
    expiry: z.string().optional(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.kind === 'gate-relaxation' || entry.kind === 'exception') {
      if (!entry.expiry) {
        ctx.addIssue({
          code: 'custom',
          message: `${entry.kind} requires an expiry date`,
          path: ['expiry'],
        });
      }
    }
  });

export const DecisionLog = z
  .object({
    version: z.literal(1),
    entries: z.array(DecisionEntry),
  })
  .strict();

export const Prediction = z
  .object({
    id: z.string().min(1),
    prediction: z.string().min(1),
    /** How the prediction will be checked (measurable). */
    checkMethod: z.string().min(1),
    status: z.enum(['open', 'checked-true', 'checked-false', 'void']),
    outcome: z.string().optional(),
  })
  .strict();

export const Lesson = z
  .object({
    id: z.string().min(1),
    /** Lessons derive from checked predictions (learner-not-believer, D17). */
    fromPredictionId: z.string().min(1),
    lesson: z.string().min(1),
    appliesTo: z.string().min(1),
  })
  .strict();

export const LearningLog = z
  .object({
    version: z.literal(1),
    predictions: z.array(Prediction),
    lessons: z.array(Lesson),
  })
  .strict()
  .superRefine((log, ctx) => {
    const predictionIds = new Set(log.predictions.map((p) => p.id));
    for (const lesson of log.lessons) {
      if (!predictionIds.has(lesson.fromPredictionId)) {
        ctx.addIssue({
          code: 'custom',
          message: `lesson ${lesson.id} references unknown prediction`,
          path: ['lessons'],
        });
      }
    }
    for (const lesson of log.lessons) {
      const pred = log.predictions.find((p) => p.id === lesson.fromPredictionId)!;
      if (pred.status === 'open') {
        ctx.addIssue({
          code: 'custom',
          message: `lesson ${lesson.id} derived from an un-checked prediction`,
          path: ['lessons'],
        });
      }
    }
  });

export const SusChangePlan = defineSusSchema('sus.change-plan', 1, ChangePlan);
export const SusApprovalReceipt = defineSusSchema('sus.approval-receipt', 1, ApprovalReceipt);
export const SusDecisionLog = defineSusSchema('sus.decision-log', 1, DecisionLog);
export const SusLearningLog = defineSusSchema('sus.learning-log', 1, LearningLog);

export type SectionStateData = z.infer<typeof SectionState>;
export type ChangePlanData = z.infer<typeof ChangePlan>;
export type ApprovalReceiptData = z.infer<typeof ApprovalReceipt>;
