/**
 * T0502/T0503/T0504/T0505/T0506/T0508: progressive workflow — G2 locks,
 * version-bound receipts, append-only decisions with expiries, lesson
 * lifecycle, four-section enforcement.
 */
import { describe, expect, it } from 'vitest';
import {
  ApprovalReceipt,
  ChangePlan,
  DecisionEntry,
  LearningLog,
  SECTION_STATUSES,
  canTransition,
  sectionLockViolation,
  type ChangePlanData,
} from '@sus/schemas';

describe('section lifecycle + locks (T0502)', () => {
  it('legal transitions hold; illegal ones fail (accepted is terminal)', () => {
    expect(canTransition('draft', 'proposed')).toBe(true);
    expect(canTransition('proposed', 'approved')).toBe(true);
    expect(canTransition('verified', 'accepted')).toBe(true);
    expect(canTransition('accepted', 'proposed')).toBe(false);
    expect(canTransition('draft', 'accepted')).toBe(false);
    expect(SECTION_STATUSES).toContain('rejected');
  });

  it('G2: proposing N+1 before N accepted violates the lock', () => {
    const order = ['hero', 'features', 'pricing', 'footer'];
    const states = order.map((id) => ({ sectionId: id, status: 'draft' }));
    expect(sectionLockViolation(states, order)).toBeNull();
    states[1] = { sectionId: 'features', status: 'proposed', planId: 'p1', updatedAt: 't' };
    expect(sectionLockViolation(states, order)).toBe('features');
    states[0] = { sectionId: 'hero', status: 'accepted', planId: null, updatedAt: 't' };
    expect(sectionLockViolation(states, order)).toBeNull();
  });
});

describe('change plan + version-bound receipts (T0503/T0508)', () => {
  const plan: ChangePlanData = {
    id: 'plan-hero-1',
    sectionId: 'hero',
    intent: 'rewrite hero lede for evidence-based claim register',
    filesAffected: ['fixtures/marketing/app/page.tsx'],
    diff: '--- a/page.tsx\n+++ b/page.tsx\n@@ -1 +1 @@\n-old lede\n+new lede',
    evidenceBefore: ['evals/spikes/hero-before.png'],
    evidenceAfter: [],
    approvalRequirement: 'explicit-user-approval',
    contractVersion: 1,
  };
  it('plan validates; receipt must bind the same contract version', () => {
    expect(ChangePlan.safeParse(plan).success).toBe(true);
    const receipt = {
      planId: plan.id,
      decision: 'approved',
      decidedAt: '2026-11-14T04:30:00Z',
      approver: 'shahid',
      reason: 'diff matches brief',
      contractVersion: 1,
    };
    expect(ApprovalReceipt.safeParse(receipt).success).toBe(true);
    const wrongVersion = { ...receipt, contractVersion: 2 };
    // literal(1) means any other version fails validation — version-bound
    expect(ApprovalReceipt.safeParse(wrongVersion).success).toBe(false);
  });
});

describe('decision persistence + exceptions (T0504)', () => {
  it('gate relaxations/exceptions REQUIRE expiry (cannot silently persist)', () => {
    const noExpiry = {
      at: '2026-11-14T00:00:00Z',
      kind: 'exception',
      text: 'allow one px value',
      by: 'x',
    };
    expect(DecisionEntry.safeParse(noExpiry).success).toBe(false);
    const withExpiry = { ...noExpiry, expiry: '2026-12-14' };
    expect(DecisionEntry.safeParse(withExpiry).success).toBe(true);
  });
});

describe('prediction + lesson lifecycle (T0506)', () => {
  it('lessons derive only from CHECKED predictions', () => {
    const log = {
      version: 1 as const,
      predictions: [
        {
          id: 'p1',
          prediction: '200% zoom keeps layout intact',
          checkMethod: 'hardening matrix zoom cells',
          status: 'checked-true' as const,
          outcome: 'no overflow at DSF proxy',
        },
      ],
      lessons: [
        {
          id: 'l1',
          fromPredictionId: 'p1',
          lesson: 'rem-based type holds at zoom; keep it as convention',
          appliesTo: 'fixtures/*',
        },
      ],
    };
    expect(LearningLog.safeParse(log).success).toBe(true);
    const openPred = { ...log, predictions: [{ ...log.predictions[0]!, status: 'open' as const }] };
    expect(LearningLog.safeParse(openPred).success).toBe(false);
  });
});

describe('four-section enforcement (T0505)', () => {
  it('correct order passes; out-of-order proposal fails on the four-section contract', () => {
    const order = ['hero', 'features', 'social-proof', 'cta'];
    const byId = (id: string, status: string) => ({
      sectionId: id,
      status,
      planId: null,
      updatedAt: 't',
    });
    // propose section 3 while sections 1-2 are drafts → violation
    expect(
      sectionLockViolation(
        [
          byId('hero', 'draft'),
          byId('features', 'draft'),
          byId('social-proof', 'proposed'),
          byId('cta', 'draft'),
        ],
        order,
      ),
    ).toBe('social-proof');
    // accepted chain: 1 accepted, 2 proposed → ok
    expect(
      sectionLockViolation(
        [
          byId('hero', 'accepted'),
          byId('features', 'proposed'),
          byId('social-proof', 'draft'),
          byId('cta', 'draft'),
        ],
        order,
      ),
    ).toBeNull();
  });
});
