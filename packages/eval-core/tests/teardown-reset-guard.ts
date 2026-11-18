/**
 * T1061 follow-up, tightened by the re-audit (finding F4): a teardown race between Chromium
 * closing and the in-process servers can deliver an ECONNRESET to a socket whose read was
 * pending when the peer went away. The reset arrives on a socket no project code can reach, so
 * it surfaces as an uncaught exception and fails a suite whose tests all passed.
 *
 * The guard swallows that signature ONLY while no test is executing (`getCurrentTest() ===
 * undefined`): a reset arriving mid-test is never teardown — it is printed and marks the worker's
 * exit code, keeping the run red. The classifier is exported so `teardown-reset-guard.test.ts`
 * can pin both directions without gymnastics with real sockets.
 */
import { getCurrentTest } from 'vitest';

const TEARDOWN_RESET = /^read (ECONNRESET|EPIPE)$/;

/** True for exactly the detached-socket teardown signature; false for everything else. */
export function isTeardownReset(error: unknown): boolean {
  return (
    error instanceof Error &&
    TEARDOWN_RESET.test(error.message) &&
    error.stack !== undefined &&
    error.stack.includes('TCP.onStreamRead') &&
    // A real project error carries project frames; the detached-socket signature does not.
    !error.stack.includes('packages/eval-core/src')
  );
}

process.on('uncaughtException', (error: unknown) => {
  // A reset arriving while a test is running is not teardown: it may have corrupted what the
  // test was about to assert, so it is never swallowed.
  if (getCurrentTest() === undefined && isTeardownReset(error)) {
    console.error(
      '[teardown-reset-guard] recorded a peer reset on a detached socket (teardown race); the run continues',
    );
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
