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
  /**
   * Expiry bookkeeping (T1062, audit finding T1003-18, issue #25): `expiresAt` is the absolute
   * deadline (epoch ms), `lastUsedAt` is renewed on every successful authenticated request for
   * the idle timeout. Both are enforced fail-closed in `verifyToken` — an expired or idle-expired
   * session is dead even though its HMAC is still valid.
   */
  expiresAt: number;
  lastUsedAt: number;
}

export interface AuditEntry {
  at: string;
  event:
    | 'session-open'
    | 'session-expired'
    | 'session-evicted'
    | 'session-closed'
    | 'message-ok'
    | 'message-rejected'
    | 'origin-denied'
    | 'auth-denied'
    | 'payload-too-large'
    | 'handler-failure';
  detail: string;
}

export interface SessionPolicy {
  /**
   * Absolute session lifetime in ms. Default 24h: the bridge is a per-use, localhost process, so
   * this is a backstop against a leaked token living forever, not the primary control.
   */
  absoluteTtlMs?: number;
  /**
   * Idle timeout in ms, renewed on every successful authenticated request. Default 30min: an
   * abandoned Studio tab's token stops working half an hour after the last real use.
   */
  idleTtlMs?: number;
  /** Maximum simultaneously retained sessions; the least-recently-used is evicted beyond it. */
  maxSessions?: number;
  /** Injectable clock for tests; production uses Date.now. */
  clock?: () => number;
}

export const DEFAULT_SESSION_POLICY: Required<Omit<SessionPolicy, 'clock'>> = {
  absoluteTtlMs: 24 * 60 * 60 * 1000,
  idleTtlMs: 30 * 60 * 1000,
  maxSessions: 16,
};

export interface BridgeOptions {
  port: number;
  /** Allowed Origins (browser clients). Empty string = same-origin/no-Origin header. */
  allowedOrigins: string[];
  /** Allowed Host header values (DNS-rebinding guard). */
  allowedHosts: string[];
  /** Session lifetime policy (T1062). Defaults keep the studio flow working unchanged. */
  sessionPolicy?: SessionPolicy;
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
  private readonly policy: Required<Omit<SessionPolicy, 'clock'>> & { clock: () => number };

  constructor(private readonly options: BridgeOptions) {
    const { clock, ...rest } = options.sessionPolicy ?? {};
    this.policy = { ...DEFAULT_SESSION_POLICY, ...rest, clock: clock ?? (() => Date.now()) };
  }

  /** Drops sessions whose deadline has passed; an expired session is dead, not retained. */
  private pruneExpired(now: number): void {
    for (const [id, session] of this.sessions) {
      if (session.status === 'active' && now >= session.expiresAt) {
        session.status = 'closed';
        this.audit.record('session-expired', `session ${id} passed its absolute deadline`);
        this.sessions.delete(id);
      }
    }
  }

  /** Creates a session and returns its auth token (shown once, like T0904 credentials). */
  openSession(origin: string): { sessionId: string; token: string } {
    const now = this.policy.clock();
    this.pruneExpired(now);
    // Bound retained sessions: the least-recently-used active session is evicted beyond the cap,
    // so a leaked token cannot keep a slot alive indefinitely by never being used again.
    if (this.sessions.size >= this.policy.maxSessions) {
      let oldestId: string | null = null;
      let oldestUsed = Number.POSITIVE_INFINITY;
      for (const [id, session] of this.sessions) {
        if (session.status === 'active' && session.lastUsedAt < oldestUsed) {
          oldestId = id;
          oldestUsed = session.lastUsedAt;
        }
      }
      if (oldestId !== null) {
        this.sessions.get(oldestId)!.status = 'closed';
        this.audit.record('session-evicted', `session ${oldestId} evicted at the session cap`);
        this.sessions.delete(oldestId);
      } else {
        // T1093 (issue #25): the cap bounds TOTAL retained entries, not just active ones. The
        // normal close path deletes entries (see closeSession), so this fallback should never
        // fire — but a future code path that leaves a non-active entry behind must not be able
        // to grow the map past the cap. Evict the oldest entry of any status instead of adding.
        let staleId: string | null = null;
        let staleUsed = Number.POSITIVE_INFINITY;
        for (const [id, session] of this.sessions) {
          if (session.lastUsedAt < staleUsed) {
            staleId = id;
            staleUsed = session.lastUsedAt;
          }
        }
        if (staleId !== null) {
          this.audit.record(
            'session-evicted',
            `session ${staleId} evicted at the session cap (no active entry to evict)`,
          );
          this.sessions.delete(staleId);
        }
      }
    }
    const sessionId = randomBytes(16).toString('hex');
    const secret = randomBytes(32).toString('hex');
    this.sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date(now).toISOString(),
      origin,
      secret,
      status: 'active',
      expiresAt: now + this.policy.absoluteTtlMs,
      lastUsedAt: now,
    });
    this.audit.record('session-open', `session ${sessionId} origin ${origin}`);
    return { sessionId, token: this.sign(sessionId, secret) };
  }

  private sign(sessionId: string, secret: string): string {
    return createHmac('sha256', secret).update(sessionId).digest('hex');
  }

  /**
   * Constant-time token verification; closed, expired and idle-expired sessions fail closed.
   * A successful verification renews the session's idle clock (T1062).
   */
  verifyToken(sessionId: string, token: string): boolean {
    const now = this.policy.clock();
    this.pruneExpired(now);
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return false;
    if (now >= session.expiresAt || now - session.lastUsedAt > this.policy.idleTtlMs) {
      session.status = 'closed';
      this.audit.record('session-expired', `session ${sessionId} expired (absolute or idle)`);
      this.sessions.delete(sessionId);
      return false;
    }
    const expected = Buffer.from(this.sign(sessionId, session.secret), 'hex');
    let provided: Buffer;
    try {
      provided = Buffer.from(token, 'hex');
    } catch {
      return false;
    }
    const ok = expected.length === provided.length && timingSafeEqual(expected, provided);
    if (ok) session.lastUsedAt = now;
    return ok;
  }

  /**
   * T1093 (issue #25): closing removes the session outright. The previous behaviour flipped
   * `status` to `'closed'` and kept the entry, so open/close churn accumulated dead entries
   * beyond `maxSessions` (Codex probe: 20 retained at a cap of 16). A closed entry is dead
   * weight — `verifyToken` rejects it — so the closed state lives in the audit trail, not in
   * the map. Fail-closed semantics are unchanged: a closed or deleted session denies the token.
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.audit.record('session-closed', `session ${sessionId} closed`);
      this.sessions.delete(sessionId);
    }
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
    // T1063 (audit finding T1003-19): the cap is a BYTE cap — `body.length` counts UTF-16 code
    // units, so a multi-byte body up to ~4x the cap in bytes was accepted against the documented
    // 64KB.
    if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        status: 413,
        event: 'payload-too-large',
        detail: `${Buffer.byteLength(body)} bytes > cap ${MAX_PAYLOAD_BYTES}`,
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
    // T1092 (issue #32): JSON.parse succeeding says nothing about the top-level shape. `null`
    // is valid JSON, and reading `.sessionId` off it threw a TypeError that escaped the request
    // handler before authentication ever ran. The status ordering below is deliberate and
    // documented: a body whose top-level shape is wrong (null, array, string, number, boolean)
    // is rejected with a stable 400 and a bounded `message-rejected` audit entry — the detail
    // names the shape, never the body content — while a structurally acceptable object with a
    // bad or missing token keeps its 401. Only shapes an envelope could plausibly have reach
    // the token check.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      const shape = parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed;
      this.audit.record('message-rejected', `non-object JSON body (${shape})`);
      return { status: 400, body: { error: 'invalid-shape' } };
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
      let bodyBytes = 0;
      req.on('data', (chunk: Buffer) => {
        bodyBytes += chunk.byteLength;
        body += chunk.toString('utf8');
        if (bodyBytes > MAX_PAYLOAD_BYTES * 4) req.destroy(); // hard cap on drain (bytes, T1063)
      });
      req.on('end', () => {
        // T1092 (issue #32): no exception from the message path may escape the request handler.
        // The catch answers with an intentional bounded body so the connection never hangs; it
        // records a bounded audit event and never logs the request body or any secret.
        try {
          const result = this.handleMessage(req, body);
          res.writeHead(result.status, { 'content-type': 'application/json' });
          res.end(JSON.stringify(result.body));
        } catch {
          this.audit.record('handler-failure', 'request handler threw; bounded response sent');
          if (!res.headersSent) {
            res.writeHead(500, { 'content-type': 'application/json' });
          }
          if (!res.writableEnded) {
            res.end(JSON.stringify({ error: 'handler-failure' }));
          }
        }
      });
    });
    // ADR-003 binding posture: loopback only, never 0.0.0.0.
    // Resolves the ACTUAL bound port (port 0 → ephemeral), so a test or a
    // second bridge can never collide on a fixed port or silently report a
    // port nothing is listening on.
    return new Promise((resolve) => {
      this.server!.listen(this.options.port, '127.0.0.1', () => {
        const address = this.server!.address();
        resolve(typeof address === 'object' && address ? address.port : this.options.port);
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
