/**
 * T1033 (issue #21 R4) — the Studio bridge can actually be started, and it still refuses what it
 * refused before.
 *
 * The risk in shipping a launcher is that it becomes a second, weaker entry into the bridge: a script
 * that opens a session for anyone, on any origin, without the guards. So this test starts the real
 * script, then tries the three things the guards exist for.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = join(process.cwd(), 'scripts/studio/bridge.mjs');

interface Ready {
  origin: string;
  sessionId: string;
  token: string;
  readOnly: boolean;
}

let child: ChildProcessWithoutNullStreams | null = null;

const start = async (args: string[] = []): Promise<Ready> =>
  new Promise((resolve, reject) => {
    child = spawn(process.execPath, [SCRIPT, '--json', ...args], { stdio: 'pipe' });
    let buffer = '';
    const timer = setTimeout(
      () => reject(new Error('bridge did not report ready: ' + buffer)),
      20_000,
    );
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const line = buffer.split('\n').find((entry) => entry.includes('"event":"ready"'));
      if (line === undefined) return;
      clearTimeout(timer);
      resolve(JSON.parse(line) as Ready);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('bridge exited with ' + String(code) + ': ' + buffer));
    });
  });

const post = (ready: Ready, body: unknown, headers: Record<string, string> = {}) =>
  fetch(ready.origin, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

afterEach(() => {
  child?.kill('SIGTERM');
  child = null;
});

describe('studio bridge launcher (issue #21 R4)', () => {
  it('starts on loopback, opens one session and accepts a ping with its token', async () => {
    const ready = await start();
    expect(ready.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(ready.sessionId).toHaveLength(32);
    expect(ready.token).toHaveLength(64);
    expect(ready.readOnly).toBe(true);

    const ok = await post(
      ready,
      { sessionId: ready.sessionId, kind: 'ping' },
      {
        authorization: 'Bearer ' + ready.token,
      },
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, kind: 'ping' });
  }, 60_000);

  it('still refuses a bad token and a foreign Origin', async () => {
    const ready = await start(['--origin', 'http://127.0.0.1:5173']);
    const denied = await post(
      ready,
      { sessionId: ready.sessionId, kind: 'ping' },
      {
        authorization: 'Bearer ' + '0'.repeat(64),
      },
    );
    expect(denied.status).toBe(401);

    const foreign = await post(
      ready,
      { sessionId: ready.sessionId, kind: 'ping' },
      {
        authorization: 'Bearer ' + ready.token,
        origin: 'http://evil.example',
      },
    );
    expect(foreign.status).toBe(403);

    // …and the allowlisted Origin is accepted, so the refusal above is about the value, not the header.
    const allowed = await post(
      ready,
      { sessionId: ready.sessionId, kind: 'ping' },
      {
        authorization: 'Bearer ' + ready.token,
        origin: 'http://127.0.0.1:5173',
      },
    );
    expect(allowed.status).toBe(200);
  }, 60_000);

  it('rejects a message that is not a valid envelope', async () => {
    const ready = await start();
    const invalid = await post(
      ready,
      { sessionId: ready.sessionId, kind: 'delete-everything' },
      {
        authorization: 'Bearer ' + ready.token,
      },
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ error: 'invalid-envelope' });
  }, 60_000);

  it('prints usage and exits 2 for a bad argument instead of starting', async () => {
    const bad = spawn(process.execPath, [SCRIPT, '--port', 'nope'], { stdio: 'pipe' });
    const code = await new Promise<number | null>((resolve) => bad.on('exit', resolve));
    expect(code).toBe(2);
  }, 30_000);
});

/**
 * R9: a demo run must not print git's complaints about the fixture not being a repository. The
 * snapshot still returns null (the same answer as before), it just stops writing to stderr.
 */
describe('git snapshot in a non-repository (issue #21 R9)', () => {
  it('answers "unknown" without printing to stderr', async () => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const outside = mkdtempSync(join(tmpdir(), 'sus-not-a-repo-'));
    const probe = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const m = await import('file://' + process.argv[1] + '/packages/studio-bridge/dist/index.js');" +
          'process.stdout.write(JSON.stringify(m.gitSnapshot(process.argv[2])));',
        process.cwd(),
        outside,
      ],
      { stdio: 'pipe' },
    );
    let stdout = '';
    let stderr = '';
    probe.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString('utf8')));
    probe.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString('utf8')));
    const code = await new Promise<number | null>((resolve) => probe.on('exit', resolve));
    expect(code).toBe(0);
    expect(stdout).toBe('null');
    expect(stderr).toBe('');
  }, 60_000);
});
