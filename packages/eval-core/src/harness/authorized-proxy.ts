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
  const record = (host: string): boolean => {
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
    const [host, rawPort] = (req.url ?? '').split(':');
    if (host === undefined || !record(host)) {
      socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const port = Number(rawPort ?? '443');
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
    upstream.on('error', () => socket.destroy());
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
