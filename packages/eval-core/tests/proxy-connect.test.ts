/**
 * T1043 — the authorized proxy's `CONNECT` parsing, probed rather than assumed.
 *
 * A peer review asked (INBOX, 2026-11-17) whether `CONNECT` handles an IPv6 literal and whether the 403
 * body leaks anything. It did not: the target was split on `:`, so `[::1]:443` became host `[`, which was
 * refused — safe, but it made an authorized IPv6 host unreachable and put a host in the refusal list that
 * nobody requested. A refusal that names the wrong host is a misleading measurement, which is the class of
 * defect this project treats as serious even when it fails closed.
 *
 * The 403 body echoes the host the client itself asked for, so it discloses nothing the caller did not
 * already send; the test pins that so it cannot grow into a leak (no ports, no paths, no upstream detail).
 */
import { connect, type Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { startAuthorizedProxy } from '../src/harness/authorized-proxy.js';

const connectThrough = (
  proxy: string,
  target: string,
): Promise<{ status: string; socket: Socket }> =>
  new Promise((resolve, reject) => {
    const { hostname, port } = new URL(proxy);
    const socket = connect(Number(port), hostname, () => {
      socket.write('CONNECT ' + target + ' HTTP/1.1\r\nHost: ' + target + '\r\n\r\n');
    });
    socket.once('data', (chunk) => {
      resolve({ status: chunk.toString('utf8').split('\r\n')[0] ?? '', socket });
    });
    socket.once('error', reject);
  });

describe('authorized proxy: CONNECT target parsing (T1043)', () => {
  it('refuses a tunnel to a host that was not authorized, and records that host', async () => {
    const proxy = await startAuthorizedProxy([]);
    try {
      const { status, socket } = await connectThrough(proxy.server, 'unauthorized.invalid:443');
      socket.destroy();
      expect(status).toContain('403');
      expect(proxy.refused()).toContain('unauthorized.invalid');
    } finally {
      await proxy.close();
    }
  }, 20000);

  it('parses an IPv6 literal as a host, not as "[", and names the host it was asked about', async () => {
    const proxy = await startAuthorizedProxy([]);
    try {
      // Nothing listens on port 9. ::1 is loopback and therefore authorized, so the answer must be the
      // upstream failure, not a parse accident — and it must arrive, not hang.
      const { status, socket } = await connectThrough(proxy.server, '[::1]:9');
      socket.destroy();
      expect(status).toContain('502');
      expect(proxy.refused()).not.toContain('[');
      expect(proxy.refused()).not.toContain('::1');
    } finally {
      await proxy.close();
    }
  }, 20000);

  it('refuses an unauthorized IPv6 literal by its real address, not a fragment of it', async () => {
    const proxy = await startAuthorizedProxy(['example.com']);
    try {
      const { status, socket } = await connectThrough(proxy.server, '[2001:db8::1]:443');
      socket.destroy();
      expect(status).toContain('403');
      // The recorded host is the address the client asked for; `[` was what the split used to record.
      expect(proxy.refused()).toContain('2001:db8::1');
      expect(proxy.refused()).not.toContain('[');
    } finally {
      await proxy.close();
    }
  }, 20000);

  it('answers a malformed CONNECT target with 400 rather than hanging', async () => {
    const proxy = await startAuthorizedProxy([]);
    try {
      const { status, socket } = await connectThrough(proxy.server, ':::');
      socket.destroy();
      expect(status).toMatch(/400|403/);
    } finally {
      await proxy.close();
    }
  }, 20000);
});
