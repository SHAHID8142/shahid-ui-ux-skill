/**
 * SUS Live Studio bridge server (T0701, ADR-003 security posture — binding).
 *
 * Read-only session surface: auth, Origin/Host allowlist, session state,
 * validated message envelope, payload caps, append-only audit log.
 * NO consumer-source write endpoints exist at this stage (writes come only
 * after the T0707/T0700w safety gates); the server structurally cannot
 * mutate files. Binds 127.0.0.1 only; no outbound network calls.
 *
 * Prompt-injection quarantine: inspected-page DOM text arriving in messages
 * is treated as DATA — stored wrapped in a quarantine envelope, never
 * interpreted as instructions.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { z } from 'zod';

export const MAX_PAYLOAD_BYTES = 64 * 1024;

/** Messages the bridge accepts. DOM-derived text is quarantined as data. */
export const MessageEnvelope = z
  .object({
    sessionId: z.string().min(8),
    kind: z.enum(['ping', 'select', 'annotate', 'intent']),
    /** Quarantined page-derived content: data only, never instructions. */
    domData: z
      .object({
        quarantined: z.literal(true),
        origin_url: z.string().url(),
        text: z.string().max(10_000),
      })
      .optional(),
  })
  .strict();

export type MessageEnvelopeData = z.infer<typeof MessageEnvelope>;

export interface SessionState {
  id: string;
  createdAt: string;
  origin: string;
  /** HMAC secret for this session's tokens. */
  secret: string;
  status: 'active' | 'closed';
}

export interface AuditEntry {
  at: string;
  event:
    | 'session-open'
    | 'message-ok'
    | 'message-rejected'
    | 'origin-denied'
    | 'auth-denied'
    | 'payload-too-large';
  detail: string;
}

export interface BridgeOptions {
  port: number;
  /** Allowed Origins (browser clients). Empty string = same-origin/no-Origin header. */
  allowedOrigins: string[];
  /** Allowed Host header values (DNS-rebinding guard). */
  allowedHosts: string[];
}

export class BridgeAudit {
  readonly entries: AuditEntry[] = [];
  private sinks: Array<(entry: AuditEntry) => void> = [];
  addSink(sink: (entry: AuditEntry) => void): void {
    this.sinks.push(sink);
  }
  record(event: AuditEntry['event'], detail: string): void {
    const entry: AuditEntry = { at: new Date().toISOString(), event, detail };
    this.entries.push(entry); // append-only: no removal API exists
    for (const sink of this.sinks) sink(entry);
  }
}

export class BridgeServer {
  readonly audit = new BridgeAudit();
  readonly sessions = new Map<string, SessionState>();
  private server: Server | null = null;

  constructor(private readonly options: BridgeOptions) {}

  /** Creates a session and returns its auth token (shown once, like T0904 credentials). */
  openSession(origin: string): { sessionId: string; token: string } {
    const sessionId = randomBytes(16).toString('hex');
    const secret = randomBytes(32).toString('hex');
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date().toISOString(),
      origin,
      secret,
      status: 'active',
    });
    this.audit.record('session-open', `session ${sessionId} origin ${origin}`);
    return { sessionId, token: this.sign(sessionId, secret) };
  }

  private sign(sessionId: string, secret: string): string {
    return createHmac('sha256', secret).update(sessionId).digest('hex');
  }

  /** Constant-time token verification; closed sessions fail closed. */
  verifyToken(sessionId: string, token: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return false;
    const expected = Buffer.from(this.sign(sessionId, session.secret), 'hex');
    let provided: Buffer;
    try {
      provided = Buffer.from(token, 'hex');
    } catch {
      return false;
    }
    return expected.length === provided.length && timingSafeEqual(expected, provided);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.status = 'closed';
  }

  private checkGuards(
    req: IncomingMessage,
    body: string,
  ): { ok: boolean; status?: number; event?: AuditEntry['event']; detail?: string } {
    const origin = req.headers.origin ?? '';
    if (origin && !this.options.allowedOrigins.includes(origin)) {
      return {
        ok: false,
        status: 403,
        event: 'origin-denied',
        detail: `Origin ${origin} not allowlisted`,
      };
    }
    const host = (req.headers.host ?? '').split(':')[0]!;
    if (!this.options.allowedHosts.includes(host)) {
      return {
        ok: false,
        status: 403,
        event: 'origin-denied',
        detail: `Host ${host} not allowlisted (DNS-rebinding guard)`,
      };
    }
    if (body.length > MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        status: 413,
        event: 'payload-too-large',
        detail: `${body.length} bytes > cap ${MAX_PAYLOAD_BYTES}`,
      };
    }
    return { ok: true };
  }

  /** Handles a validated message POST. Returns the response payload or error status. */
  handleMessage(
    req: IncomingMessage,
    body: string,
  ): { status: number; body: Record<string, unknown> } {
    const guards = this.checkGuards(req, body);
    if (!guards.ok) {
      this.audit.record(guards.event!, guards.detail!);
      return { status: guards.status!, body: { error: guards.event } };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      this.audit.record('message-rejected', 'unparseable body');
      return { status: 400, body: { error: 'unparseable' } };
    }
    const sessionId = (parsed as { sessionId?: string }).sessionId ?? '';
    const token = String(req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
    if (!this.verifyToken(sessionId, token)) {
      this.audit.record('auth-denied', `session ${sessionId} token invalid or session closed`);
      return { status: 401, body: { error: 'auth-denied' } };
    }
    const validated = MessageEnvelope.safeParse(parsed);
    if (!validated.success) {
      this.audit.record(
        'message-rejected',
        validated.error.issues.map(String).join('; ').slice(0, 200),
      );
      return {
        status: 400,
        body: { error: 'invalid-envelope', issues: validated.error.issues.map((i) => i.message) },
      };
    }
    const domData = validated.data.domData;
    this.audit.record(
      'message-ok',
      `${validated.data.kind} from ${sessionId}${domData ? ' (domData quarantined)' : ''}`,
    );
    const response: Record<string, unknown> = { ok: true, kind: validated.data.kind, sessionId };
    if (domData) {
      // quarantine discipline: echoed as opaque data with the marker preserved
      response.domDataEcho = { quarantined: true, bytes: domData.text.length };
    }
    return { status: 200, body: response };
  }

  start(): Promise<number> {
    this.server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8');
        if (body.length > MAX_PAYLOAD_BYTES * 4) req.destroy(); // hard cap on drain
      });
      req.on('end', () => {
        const result = this.handleMessage(req, body);
        res.writeHead(result.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(result.body));
      });
    });
    // ADR-003 binding posture: loopback only, never 0.0.0.0
    return new Promise((resolve) => {
      this.server!.listen(this.options.port, '127.0.0.1', () => {
        resolve(this.options.port);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }
}
