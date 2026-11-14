/**
 * Session/event/request lifecycle contract (T0709).
 *
 * Owns the 3 findings routed from T0704b peer review: (1) strict createdAt
 * format, (2) deserialize error mapping that surfaces real messages, (3) a
 * version envelope on persisted session files. Also the canonical lifecycle
 * states for bridge sessions (T0701) and annotation documents (T0704).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

/** ISO-8601 with explicit UTC offset — strict (finding 1). */
export const IsoTimestamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    'must be ISO-8601 with explicit UTC offset (e.g. 2026-11-14T09:30:00Z)',
  );

export const LifecycleState = z.enum(['opening', 'open', 'suspended', 'closing', 'closed']);

export const SessionEvent = z
  .object({
    seq: z.number().int().min(0),
    at: IsoTimestamp,
    kind: z.enum([
      'open',
      'attach',
      'message-ok',
      'message-rejected',
      'auth-denied',
      'origin-denied',
      'suspend',
      'resume',
      'close',
    ]),
    detail: z.string().max(500),
  })
  .strict();

export const LifecycleEnvelope = z
  .object({
    /** Version envelope (finding 3): every persisted session file carries it. */
    envelopeVersion: z.literal(1),
    schema: z.literal('sus.session-lifecycle'),
    sessionId: z.string().min(8),
    state: LifecycleState,
    openedAt: IsoTimestamp,
    events: z.array(SessionEvent).min(1),
  })
  .strict()
  .superRefine((env, ctx) => {
    // events strictly ordered by seq starting at 0
    for (const [i, e] of env.events.entries()) {
      if (e.seq !== i) {
        ctx.addIssue({
          code: 'custom',
          message: `event seq must be 0..n in order (got ${e.seq} at index ${i})`,
          path: ['events', i, 'seq'],
        });
      }
    }
    // state transitions follow the legal lifecycle
    const legal: Record<string, string[]> = {
      open: [
        'attach',
        'message-ok',
        'message-rejected',
        'auth-denied',
        'origin-denied',
        'suspend',
        'close',
      ],
      suspended: ['resume', 'close'],
    };
    for (const [i, e] of env.events.entries()) {
      if (i === 0) {
        if (e.kind !== 'open')
          ctx.addIssue({
            code: 'custom',
            message: 'first event must be open',
            path: ['events', 0, 'kind'],
          });
        continue;
      }
      const prev = env.events[i - 1]!;
      const allowed =
        legal[
          prev.kind === 'attach' || prev.kind === 'resume'
            ? 'open'
            : prev.kind === 'suspend'
              ? 'suspended'
              : prev.kind
        ] ?? [];
      if (!allowed.includes(e.kind)) {
        ctx.addIssue({
          code: 'custom',
          message: `illegal lifecycle transition ${prev.kind} -> ${e.kind}`,
          path: ['events', i, 'kind'],
        });
      }
    }
    // closed sessions end with close
    if (env.state === 'closed' && env.events[env.events.length - 1]?.kind !== 'close') {
      ctx.addIssue({
        code: 'custom',
        message: 'closed state requires a close event last',
        path: ['state'],
      });
    }
  });

export const SusLifecycleEnvelope = defineSusSchema('sus.session-lifecycle', 1, LifecycleEnvelope);
export type SessionEventData = z.infer<typeof SessionEvent>;
export type LifecycleEnvelopeData = z.infer<typeof LifecycleEnvelope>;
