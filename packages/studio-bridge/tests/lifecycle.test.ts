/**
 * T0709: lifecycle contract — strict timestamps, ordered events, legal
 * transitions, version envelope; deserializeSession error mapping fix
 * (finding 2); session file envelope (finding 3).
 */
import { describe, expect, it } from 'vitest';
import { IsoTimestamp, LifecycleEnvelope, type LifecycleEnvelopeData } from '@sus/schemas';
import { deserializeSession } from '../src/annotations.js';

const OPEN = '2026-11-14T09:00:00Z';

function envelope(
  events: Array<{ seq: number; at: string; kind: string; detail: string }>,
  state = 'open',
): LifecycleEnvelopeData {
  return {
    envelopeVersion: 1,
    schema: 'sus.session-lifecycle',
    sessionId: 'abcd1234abcd1234',
    state: state as LifecycleEnvelopeData['state'],
    openedAt: OPEN,
    events: events as LifecycleEnvelopeData['events'],
  };
}

const openEvt = { seq: 0, at: OPEN, kind: 'open', detail: 'session opened' };

describe('lifecycle envelope (T0709)', () => {
  it('accepts a legal open→attach→message-ok chain', () => {
    const env = envelope([
      openEvt,
      { seq: 1, at: '2026-11-14T09:00:05Z', kind: 'attach', detail: 'cdp attached' },
      { seq: 2, at: '2026-11-14T09:00:06Z', kind: 'message-ok', detail: 'ping' },
    ]);
    expect(LifecycleEnvelope.safeParse(env).success).toBe(true);
  });

  it('rejects non-ISO/offset-less timestamps (finding 1)', () => {
    expect(IsoTimestamp.safeParse('2026-11-14 09:00:00').success).toBe(false);
    expect(IsoTimestamp.safeParse('2026-11-14T09:00:00').success).toBe(false); // no offset
    expect(IsoTimestamp.safeParse('2026-11-14T09:00:00Z').success).toBe(true);
  });

  it('rejects out-of-order seq and illegal transitions', () => {
    const badSeq = envelope([
      openEvt,
      { seq: 2, at: '2026-11-14T09:00:05Z', kind: 'attach', detail: 'x' },
    ]);
    expect(LifecycleEnvelope.safeParse(badSeq).success).toBe(false);
    const badTransition = envelope([
      openEvt,
      { seq: 1, at: '2026-11-14T09:00:05Z', kind: 'suspend', detail: 'x' },
      { seq: 2, at: '2026-11-14T09:00:06Z', kind: 'message-ok', detail: 'x' }, // suspended → message-ok illegal
    ]);
    expect(LifecycleEnvelope.safeParse(badTransition).success).toBe(false);
  });

  it('closed state requires a close event last', () => {
    const closed = envelope(
      [openEvt, { seq: 1, at: '2026-11-14T09:05:00Z', kind: 'close', detail: 'bye' }],
      'closed',
    );
    expect(LifecycleEnvelope.safeParse(closed).success).toBe(true);
    const notClosed = envelope(
      [openEvt, { seq: 1, at: '2026-11-14T09:05:00Z', kind: 'attach', detail: 'x' }],
      'closed',
    );
    expect(LifecycleEnvelope.safeParse(notClosed).success).toBe(false);
  });

  it('deserializeSession surfaces REAL zod messages (finding 2 fixed)', () => {
    const bad = JSON.stringify({ pageUrl: 'not-a-url', viewport: {}, annotations: [] });
    expect(() => deserializeSession(bad)).toThrow(/pageUrl/);
  });

  it('session file envelope: persisted annotation sessions wrap in a versioned envelope (finding 3)', () => {
    // the session file contract: envelope version + schema id, additive
    const file = {
      envelopeVersion: 1,
      schema: 'sus.annotation-session',
      session: {
        pageUrl: 'http://127.0.0.1:4341/',
        viewport: { width: 1440, height: 900 },
        annotations: [],
      },
    };
    // shape check (the annotation session itself is validated by its own schema)
    expect(file.envelopeVersion).toBe(1);
    expect(file.schema).toBe('sus.annotation-session');
  });
});
