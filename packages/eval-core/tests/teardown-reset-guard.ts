/**
 * T1061 follow-up: a teardown race between Chromium closing and the in-process servers (the
 * authorized proxy, serveLocal, fixture listeners) can deliver an ECONNRESET to a socket whose
 * read was pending when the peer went away. The reset arrives after the test that owned the
 * connection has completed, on a socket project code can no longer reach (an idle keep-alive in
 * the fetch pool or a driver-side socket), so it surfaces as an uncaught exception and fails a
 * suite whose tests all passed — 1–4 such errors per verify run across four different test
 * files, each time `Error: read ECONNRESET` at `TCP.onStreamRead`, each time after every test
 * in the file had already passed.
 *
 * This guard swallows ONLY that signature (ECONNRESET/EPIPE on a TCP read with no project frame
 * in the stack) and prints it, so the teardown race is recorded rather than fatal. Everything
 * else — an assertion, a thrown Error from project code (its stack carries project frames), a
 * socket error that is not a peer reset — is printed and marks the worker's exit code, keeping
 * the run red. It deliberately does not call process.exit: vitest's worker sandbox forbids it,
 * and an exit here would turn a recorded reset into a crashed worker.
 */
const TEARDOWN_RESET = /Error: read (ECONNRESET|EPIPE)/;

process.on('uncaughtException', (error: unknown) => {
  const isPeerResetOnRead =
    error instanceof Error &&
    TEARDOWN_RESET.test(error.message) &&
    error.stack !== undefined &&
    error.stack.includes('TCP.onStreamRead') &&
    // A real project error carries project frames; the detached-socket signature does not.
    !error.stack.includes('packages/eval-core/src');
  if (isPeerResetOnRead) {
    console.error(
      '[teardown-reset-guard] recorded a peer reset on a detached socket (teardown race); the run continues',
    );
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
