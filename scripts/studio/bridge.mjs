#!/usr/bin/env node
/**
 * T1033 (issue #21 R4) — a way to actually start the Studio bridge.
 *
 * What this starts is the *bridge*, not a Studio page: `@sus/studio-bridge` is the localhost session
 * surface (auth, Origin/Host allowlist, payload caps, append-only audit log) and `@sus/studio-web` is
 * a controller library, not a shipped bundle. So this prints what really exists — a session, a token
 * and a request you can send — instead of implying a UI that is not built.
 *
 * Binding posture is the bridge's own (ADR-003): 127.0.0.1 only, never 0.0.0.0.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const BRIDGE = join(ROOT, 'packages/studio-bridge/dist/index.js');

const USAGE =
  'usage: node scripts/studio/bridge.mjs [--port <n>] [--origin <url>] [--json]\n' +
  '\n' +
  'Starts the Live Studio bridge on 127.0.0.1, opens one session and prints a request you can send.\n' +
  'Ctrl-C closes the session and the server.\n' +
  '\n' +
  '  --port <n>        port to bind (default 0: the OS picks one, printed back)\n' +
  '  --origin <url>    allow this browser Origin (repeatable); no Origin is ever required for curl\n' +
  '  --json            print one machine-readable line instead of the human summary';

function fail(message) {
  process.stderr.write('error: ' + message + '\n\n' + USAGE + '\n');
  process.exitCode = 2;
}

function parse(argv) {
  const options = { port: 0, origins: [], json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(USAGE + '\n');
      process.exit(0);
    } else if (flag === '--json') {
      options.json = true;
    } else if (flag === '--port') {
      const value = Number(argv[index + 1]);
      index += 1;
      if (!Number.isInteger(value) || value < 0 || value > 65_535) {
        fail('--port must be an integer between 0 and 65535');
        return null;
      }
      options.port = value;
    } else if (flag === '--origin') {
      const value = argv[index + 1];
      index += 1;
      if (value === undefined || !/^https?:\/\//.test(value)) {
        fail('--origin must be an http(s) URL');
        return null;
      }
      options.origins.push(value);
    } else {
      fail('unknown option "' + flag + '"');
      return null;
    }
  }
  return options;
}

async function main() {
  const options = parse(process.argv.slice(2));
  if (options === null) return;
  if (!existsSync(BRIDGE)) {
    fail('@sus/studio-bridge is not built (' + BRIDGE + ')\nrun: pnpm build');
    return;
  }
  const { BridgeServer } = await import(BRIDGE);
  const server = new BridgeServer({
    port: options.port,
    allowedOrigins: options.origins,
    allowedHosts: ['127.0.0.1', 'localhost'],
  });
  const port = await server.start();
  const origin = 'http://127.0.0.1:' + port;
  const { sessionId, token } = server.openSession(origin);
  const ping =
    'curl -s -X POST ' +
    origin +
    ' -H "authorization: Bearer ' +
    token +
    '" -H "content-type: application/json" ' +
    '-d \'{"sessionId":"' +
    sessionId +
    '","kind":"ping"}\'';

  if (options.json) {
    process.stdout.write(
      JSON.stringify({
        event: 'ready',
        origin,
        sessionId,
        token,
        allowedOrigins: options.origins,
        readOnly: true,
      }) + '\n',
    );
  } else {
    process.stdout.write(
      [
        'SUS Live Studio bridge — read-only session surface (ADR-003)',
        '',
        '  endpoint   ' + origin,
        '  session    ' + sessionId,
        '  token      ' +
          token +
          '   (shown once; expires after 24h or 30min idle, whichever comes first)',
        '  allowlist  Origin ' +
          (options.origins.length === 0 ? '(none: same-origin only)' : options.origins.join(', ')),
        '             Host   127.0.0.1, localhost',
        '',
        'There is no Studio page to open: @sus/studio-web is a controller library, not a bundle.',
        'What the bridge accepts is a validated message envelope — try one:',
        '',
        '  ' + ping,
        '',
        'This surface is read-only: no write endpoint exists, so nothing here can change your source.',
        'Ctrl-C stops it.',
        '',
      ].join('\n'),
    );
  }

  const stop = async () => {
    server.closeSession(sessionId);
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // The human summary ends with a live server; in --json mode a caller may want to stop it too.
  if (options.json) {
    process.stdout.write(
      JSON.stringify({ event: 'audit-log', entries: server.audit.entries.length }) + '\n',
    );
  }
}

void main();
