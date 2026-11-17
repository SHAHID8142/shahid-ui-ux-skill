/**
 * An allowlisting HTTP proxy for the browser phases (issue #18).
 *
 * Playwright's `page.route` never fires for a redirect hop, so a route handler cannot see where a
 * navigation actually went. A proxy can: Chromium sends every request (including each redirect and
 * each connection) through it, so the destination host is checked before the request leaves the
 * machine.
 *
 * The check is host-level on purpose. HTTPS tunnels are not intercepted: the proxy validates the
 * `CONNECT` target and then relays bytes, so it constrains *which hosts* are contacted, not what a
 * page says. That is the same boundary `--authorize` already promises for the initial target.
 */
import { createServer, request as httpRequest, type Server } from 'node:http';
import { connect as netConnect, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import { isAuthorizedHost } from '../audit/contract.js';

export interface AuthorizedProxy {
  /** `http://127.0.0.1:<port>` to hand to Chromium. */
  readonly server: string;
  /** Hosts refused since start, newest last. */
  refused(): readonly string[];
  close(): Promise<void>;
}

export async function startAuthorizedProxy(
  authorizedHosts: readonly string[],
): Promise<AuthorizedProxy> {
  const refused: string[] = [];
  const record = (rawHost: string): boolean => {
    // A WHATWG URL keeps the brackets on an IPv6 hostname (`[::1]`), while an `--authorize` value is
    // written bare (`::1`). Comparing the two spellings never matched an authorized IPv6 host, and the
    // refusal named a host the operator could not paste back into `--authorize`.
    const host = rawHost.replace(/^\[/, '').replace(/\]$/, '');
    if (isAuthorizedHost(host, authorizedHosts)) return true;
    refused.push(host);
    return false;
  };

  const proxy = createServer((req, res) => {
    let destination: URL;
    try {
      destination = new URL(req.url ?? '');
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain' });
      res.end('proxy expects an absolute URL');
      return;
    }
    if (!record(destination.hostname)) {
      res.writeHead(403, { 'content-type': 'text/plain' });
      res.end('host "' + destination.hostname + '" is not authorized');
      return;
    }
    const upstream = httpRequest(
      destination,
      { method: req.method, headers: req.headers },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('proxy could not reach ' + destination.hostname);
    });
    req.pipe(upstream);
  });

  proxy.on('connect', (req: { url?: string }, socket: Socket, head: Buffer) => {
    // A `CONNECT` target is `host:port`, and an IPv6 literal is `[::1]:443`. Splitting on ':' read that
    // as host `[`, which is refused — safe, but it also meant an authorized IPv6 host could never be
    // reached and the refusal named a host nobody asked for. Parsed as a URL instead.
    let target: URL;
    try {
      target = new URL('http://' + (req.url ?? ''));
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const host = target.hostname;
    if (host.length === 0 || !record(host)) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const port = Number(target.port === '' ? '443' : target.port);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    const upstream = netConnect(port, host, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length > 0) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    // A tunnel that cannot open used to be dropped without a response, so the client waited for its own
    // timeout. Say what happened, then close.
    upstream.on('error', () => {
      socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    });
    socket.on('error', () => upstream.destroy());
  });

  await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address() as AddressInfo;
  return {
    server: 'http://127.0.0.1:' + address.port,
    refused: () => [...refused],
    close: () =>
      new Promise<void>((resolve) => {
        const server: Server = proxy;
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
