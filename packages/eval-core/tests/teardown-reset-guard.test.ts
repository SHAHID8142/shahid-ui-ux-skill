/**
 * Pins the teardown-reset classifier both ways (re-audit finding F4): the detached-socket
 * signature is recorded and the run continues; a project error or a reset carrying project
 * frames is refused and marks the run red.
 */
import { describe, expect, it } from 'vitest';
import { isTeardownReset } from './teardown-reset-guard.js';

const detachedReset = Object.assign(new Error('read ECONNRESET'), {
  stack:
    'Error: read ECONNRESET\n    at TCP.onStreamRead (node:internal/stream_base_commons:221:20)',
});
const projectReset = Object.assign(new Error('read ECONNRESET'), {
  stack:
    'Error: read ECONNRESET\n    at TCP.onStreamRead (node:internal/stream_base_commons:221:20)\n    at Proxy.<anonymous> (/Volumes/SSD/CODES/SUS/packages/eval-core/src/harness/authorized-proxy.ts:44:11)',
});
const assertionFailure = Object.assign(new Error('expect(received).toBe(expected)'), {
  stack:
    'Error: expect(received).toBe(expected)\n    at /Volumes/SSD/CODES/SUS/packages/eval-core/tests/x.test.ts:10:5',
});

describe('the teardown-reset classifier (re-audit finding F4)', () => {
  it('accepts exactly the detached-socket peer-reset signature', () => {
    expect(isTeardownReset(detachedReset)).toBe(true);
    expect(
      isTeardownReset(
        Object.assign(new Error('read EPIPE'), {
          stack: detachedReset.stack?.replace('ECONNRESET', 'EPIPE'),
        }),
      ),
    ).toBe(true);
  });

  it('refuses a reset that carries project frames (a real bug, not teardown)', () => {
    expect(isTeardownReset(projectReset)).toBe(false);
  });

  it('refuses anything that is not a socket peer reset', () => {
    expect(isTeardownReset(assertionFailure)).toBe(false);
    expect(isTeardownReset(new Error('read ECONNRESET'))).toBe(false); // no stack
    expect(isTeardownReset('read ECONNRESET')).toBe(false); // not an Error
  });
});
