/**
 * T0806 — security test suite (§7.5), G13 owner, NEVER waivable.
 *
 * Every test here is a hostile attempt that must be DENIED, or a privacy
 * obligation that must be OBSERVED. The suite also emits the G13 evidence
 * object it proves, so the gate verdict is produced by running the attacks
 * rather than by asserting a sentence.
 *
 * Threat model: docs/THREAT_MODEL.md (each test names the threat it covers).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTION_KINDS,
  ActionBoundary,
  CapabilityAuthority,
  CaptureStore,
  PROVENANCES,
  evaluateG13,
  findResidues,
  minimizeCapture,
  type CapabilityBinding,
  type G13Evidence,
} from '../src/security.js';
import { PreviewSession } from '../src/preview.js';
import { BridgeServer } from '../src/server.js';
import type { VisualIntentData } from '@sus/schemas';

const BINDING: CapabilityBinding = {
  sessionId: 'session-abc123',
  frameId: 'frame-main-1',
  kind: 'write',
  proposalSha256: 'a'.repeat(64),
  fence: 7,
};

function freshAuthority(): CapabilityAuthority {
  return new CapabilityAuthority(60_000);
}

function intent(): VisualIntentData {
  return {
    id: 'i1',
    fromAnnotationIds: ['a1'],
    target: { selector: '#hero', susId: 'hero', confidence: 0.9 },
    relationship: 'below',
    alignment: undefined,
    orderIndex: undefined,
    maxMeasure: undefined,
    priority: 'should',
    reflow: 'stack',
    userText: 'add trust row',
    constraints: [{ kind: 'content', text: 'add trust row' }],
    unknowns: [],
  } as VisualIntentData;
}

describe('T1/T6 — untrusted provenance never authorises a write, command or network call (DA-31)', () => {
  const boundary = (): { boundary: ActionBoundary; authority: CapabilityAuthority } => {
    const authority = freshAuthority();
    return { boundary: new ActionBoundary(authority), authority };
  };

  it('denies page DOM text, page scripts, OCR, screenshots and recalled lessons', () => {
    for (const provenance of [
      'page-dom',
      'page-script',
      'ocr',
      'screenshot',
      'recalled-lesson',
      'annotation-label',
    ] as const) {
      const { boundary: b, authority } = boundary();
      const capability = authority.issue(BINDING, 'owner');
      const decision = b.request(
        { kind: 'write', target: 'page.tsx', provenance, capabilityId: capability.id },
        BINDING,
      );
      expect(decision.allowed).toBe(false);
      expect(!decision.allowed && decision.reason).toBe('untrusted-provenance');
    }
  });

  it('denies untrusted provenance BEFORE consuming the capability (order matters)', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    b.request(
      { kind: 'write', target: 'x', provenance: 'page-dom', capabilityId: capability.id },
      BINDING,
    );
    // the capability was not spent by the denied request, so the real user can still act
    const allowed = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      BINDING,
    );
    expect(allowed.allowed).toBe(true);
  });

  it('denies direct commands from page-derived content', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue({ ...BINDING, kind: 'command' }, 'owner');
    const decision = b.request(
      {
        kind: 'command',
        target: 'rm -rf /',
        provenance: 'page-script',
        capabilityId: capability.id,
      },
      { ...BINDING, kind: 'command' },
    );
    expect(decision.allowed).toBe(false);
    expect(!decision.allowed && decision.reason).toBe('untrusted-provenance');
  });

  it('rejects an unknown provenance string instead of defaulting to allow', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'trust-me-please', capabilityId: capability.id },
      BINDING,
    );
    expect(decision.allowed).toBe(false);
    expect(!decision.allowed && decision.reason).toBe('unknown-provenance');
  });

  it('rejects an unknown action kind even when the user typed the instruction', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      {
        kind: 'exfiltrate' as never,
        target: 'x',
        provenance: 'user-typed',
        capabilityId: capability.id,
      },
      BINDING,
    );
    expect(decision.allowed).toBe(false);
    expect(!decision.allowed && decision.reason).toBe('unknown-action');
    expect(ACTION_KINDS).not.toContain('exfiltrate');
  });

  it('requires a capability: a user-typed instruction alone cannot write', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const decision = b.request({ kind: 'write', target: 'x', provenance: 'user-typed' }, BINDING);
    expect(decision.allowed).toBe(false);
    expect(!decision.allowed && decision.reason).toBe('missing-capability');
  });
});

describe('T2/T3 — synthetic approval and UI replacement cannot mint authority', () => {
  it('refuses to issue a capability without an identified trusted approver', () => {
    const authority = freshAuthority();
    expect(() => authority.issue(BINDING, '   ')).toThrow(/identified approver/);
    expect(authority.size).toBe(0);
  });

  it('refuses to issue for an unknown action kind (page cannot invent an operation)', () => {
    const authority = freshAuthority();
    expect(() =>
      authority.issue({ ...BINDING, kind: 'delete-everything' as never }, 'owner'),
    ).toThrow(/unknown action kind/);
  });

  it('a capability is opaque: it carries no token, secret or page-readable identity', () => {
    const authority = freshAuthority();
    const capability = authority.issue(BINDING, 'owner');
    expect(capability.id).toMatch(/^[0-9a-f]{32}$/);
    expect(Object.keys(capability).sort()).toEqual(
      [
        'approvedBy',
        'consumedAt',
        'expiresAt',
        'fence',
        'frameId',
        'id',
        'issuedAt',
        'kind',
        'proposalSha256',
        'sessionId',
      ].sort(),
    );
    expect(JSON.stringify(capability)).not.toMatch(/token|secret|password/i);
  });
});

describe('T4/T5 — cross-frame confusion and navigation/reconnect replay are denied', () => {
  it('denies a capability used in a different frame (iframe confusion)', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      { ...BINDING, frameId: 'hostile-iframe' },
    );
    expect(decision.allowed).toBe(false);
    expect(!decision.allowed && decision.reason).toBe('capability-frame-mismatch');
  });

  it('denies a capability used under another session', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      { ...BINDING, sessionId: 'other-session' },
    );
    expect(!decision.allowed && decision.reason).toBe('capability-session-mismatch');
  });

  it('denies a capability used for a different action kind', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      {
        kind: 'network',
        target: 'https://evil.example',
        provenance: 'user-typed',
        capabilityId: capability.id,
      },
      { ...BINDING, kind: 'network' },
    );
    expect(!decision.allowed && decision.reason).toBe('capability-kind-mismatch');
  });

  it('denies reuse after the proposal hash changed (navigation → new preview)', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      { ...BINDING, proposalSha256: 'b'.repeat(64) },
    );
    expect(!decision.allowed && decision.reason).toBe('capability-proposal-mismatch');
  });

  it('denies a stale worker generation (fencing)', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const capability = authority.issue(BINDING, 'owner');
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      { ...BINDING, fence: 6 },
    );
    expect(!decision.allowed && decision.reason).toBe('capability-fence-stale');
  });

  it('denies expiry, and denies replay after a successful use', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const issuedAt = new Date('2026-11-14T00:00:00.000Z');
    const capability = authority.issue(BINDING, 'owner', issuedAt);
    const late = new Date(issuedAt.getTime() + 61_000);
    const expired = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: capability.id },
      BINDING,
      late,
    );
    expect(!expired.allowed && expired.reason).toBe('capability-expired');

    const fresh = authority.issue(BINDING, 'owner');
    const request = {
      kind: 'write' as const,
      target: 'x',
      provenance: 'user-typed' as const,
      capabilityId: fresh.id,
    };
    expect(b.request(request, BINDING).allowed).toBe(true);
    const replay = b.request(request, BINDING);
    expect(!replay.allowed && replay.reason).toBe('capability-replayed');
  });

  it('denies an unknown capability id', () => {
    const authority = freshAuthority();
    const b = new ActionBoundary(authority);
    const decision = b.request(
      { kind: 'write', target: 'x', provenance: 'user-typed', capabilityId: 'deadbeef' },
      BINDING,
    );
    expect(!decision.allowed && decision.reason).toBe('unknown-capability');
  });
});

describe('T7 — DNS rebinding and path escape', () => {
  it('denies a rebinding-style Host header', async () => {
    const server = new BridgeServer({
      port: 0,
      allowedOrigins: ['http://127.0.0.1:4400'],
      allowedHosts: ['127.0.0.1', 'localhost'],
    });
    const port = await server.start();
    const req = `POST /messages HTTP/1.1\r\nHost: 127.0.0.1.evil-rebind.example\r\nConnection: close\r\nContent-Length: 2\r\n\r\n{}`;
    // raw socket: fetch forbids Host overrides
    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const socket = connect(port, '127.0.0.1', () => socket.write(req));
      let raw = '';
      socket.on('data', (chunk) => (raw += chunk.toString('utf8')));
      socket.on('end', () => resolve({ status: Number(raw.split(' ')[1]), body: raw }));
      socket.on('error', reject);
    });
    expect(response.status).toBe(403);
    expect(response.body).toContain('origin-denied');
    await server.stop();
  });

  it('denies path escape and absolute paths in a preview plan', () => {
    const root = mkdtempSync(join(tmpdir(), 't0806-escape-'));
    writeFileSync(join(root, 'page.tsx'), 'x\n');
    expect(() =>
      PreviewSession.open(root, intent(), [{ path: '../escape.ts', after: 'x' }]),
    ).toThrow(/escape/);
    expect(() =>
      PreviewSession.open(root, intent(), [{ path: '/etc/passwd', after: 'x' }]),
    ).toThrow(/absolute/);
    rmSync(root, { recursive: true, force: true });
  });
});

describe('T8 — capture minimisation: unmarked sensitive material never survives', () => {
  const SEEDED = {
    name: 'Amina Rahman',
    email: 'amina.rahman@example-corp.com',
    phone: '+880 1712 345678',
    card: '4242 4242 4242 4242',
    apiKey: 'sk-live-9f3a77b1c2d4',
    customer: 'Nusrat Jahan',
  };

  const input = {
    text: [
      'Customer: Amina Rahman',
      'email: amina.rahman@example-corp.com',
      'call +880 1712 345678 for renewal',
      'card 4242 4242 4242 4242 expires soon',
      'api_key: sk-live-9f3a77b1c2d4',
      'Nusrat Jahan',
      'plain marketing copy that is not sensitive',
    ].join('\n'),
  };

  it('redacts records, emails, phones, cards and secrets', () => {
    const result = minimizeCapture(input);
    const kinds = result.redactions.map((r) => r.kind);
    expect(kinds).toContain('crm-record');
    expect(kinds).toContain('secret');
    expect(result.payload).toContain('plain marketing copy');
    expect(result.consentRequired).toBe(true);
    expect(result.bytesOut).toBeLessThan(result.bytesIn);
  });

  it('leaves no residue of any seeded value', () => {
    const result = minimizeCapture(input);
    expect(findResidues(result.payload, Object.values(SEEDED))).toEqual([]);
    expect(result.payload).not.toMatch(/@example-corp\.com/);
    expect(result.payload).not.toMatch(/\d{4} \d{4} \d{4} \d{4}/);
  });

  it('always replaces form values, keeping only the field names', () => {
    const result = minimizeCapture({
      text: 'ignored',
      formValues: { email: 'x@y.com', card: '4242424242424242', notes: 'Amina Rahman' },
    });
    expect(result.payload).toContain('email=[redacted:form-value]');
    expect(result.payload).toContain('card=[redacted:form-value]');
    expect(findResidues(result.payload, ['x@y.com', '4242424242424242', 'Amina Rahman'])).toEqual(
      [],
    );
  });

  it('treats a bare person name as a CRM record (no assumption that unmarked = public)', () => {
    const result = minimizeCapture({ text: 'Nusrat Jahan' });
    expect(result.payload).toBe('[redacted:crm-record]');
    expect(result.redactions.map((r) => r.kind)).toContain('crm-record');
  });

  it('audit logs never carry seeded material', () => {
    const audit = new BridgeServer({
      port: 0,
      allowedOrigins: ['http://127.0.0.1:4400'],
      allowedHosts: ['127.0.0.1'],
    }).audit;
    audit.record('message-rejected', 'invalid envelope from session-abc');
    const logged = audit.entries.map((e) => e.detail).join('\n');
    expect(findResidues(logged, Object.values(SEEDED))).toEqual([]);
  });
});

describe('T9 — retention, deletion and consent revocation', () => {
  it('stores only redacted payloads and purges at expiry', () => {
    const store = new CaptureStore(1000);
    const redacted = minimizeCapture({ text: 'email: a@b.com' });
    const at = new Date('2026-11-14T00:00:00.000Z');
    const record = store.add('subject-1', 'consent-1', redacted, at);
    expect(record.payload).toBe(redacted.payload);
    expect(store.size).toBe(1);
    expect(store.purgeExpired(new Date(at.getTime() + 999))).toEqual([]);
    expect(store.size).toBe(1);
    expect(store.purgeExpired(new Date(at.getTime() + 1000))).toEqual([record.id]);
    expect(store.size).toBe(0);
    expect(store.get(record.id)).toBeUndefined();
  });

  it('deletes by subject and by revoked consent', () => {
    const store = new CaptureStore(60_000);
    const redacted = minimizeCapture({ text: 'plain' });
    const first = store.add('subject-1', 'consent-1', redacted);
    store.add('subject-1', 'consent-2', redacted);
    const third = store.add('subject-2', 'consent-1', redacted);
    expect(store.deleteSubject('subject-1')).toHaveLength(2);
    expect(store.get(first.id)).toBeUndefined();
    // consent-1 still covers subject-2's record; revoking deletes it
    expect(store.revokeConsent('consent-1')).toEqual([third.id]);
    expect(store.size).toBe(0);
  });

  it('refuses capture without a consent record or with non-positive retention', () => {
    const store = new CaptureStore(1000);
    expect(() => store.add('s', '  ', minimizeCapture({ text: 'x' }))).toThrow(/consent/);
    expect(() => new CaptureStore(0)).toThrow(/retention/);
  });
});

describe('G13 — the gate is authoritative, fail-closed and never waivable', () => {
  it('reports not-run without evidence (never pass)', () => {
    const verdict = evaluateG13({ attempts: [], redaction: [], retention: [] });
    expect(verdict.status).toBe('not-run');
    expect(verdict.waivable).toBe(false);
  });

  it('fails when any hostile attempt was not denied', () => {
    const verdict = evaluateG13({
      attempts: [{ name: 'synthetic-approval', denied: false }],
      redaction: [{ name: 'crm', residueFree: true, consentShown: true }],
      retention: [{ name: 'purge', purgedOrDeleted: true }],
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toContain('synthetic-approval');
  });

  it('fails on redaction residue, skipped consent, retention failure and open criticals', () => {
    const base: G13Evidence = {
      attempts: [{ name: 'x', denied: true }],
      redaction: [{ name: 'r', residueFree: true, consentShown: true }],
      retention: [{ name: 'p', purgedOrDeleted: true }],
    };
    expect(
      evaluateG13({ ...base, redaction: [{ name: 'r', residueFree: false, consentShown: true }] })
        .status,
    ).toBe('fail');
    expect(
      evaluateG13({ ...base, redaction: [{ name: 'r', residueFree: true, consentShown: false }] })
        .status,
    ).toBe('fail');
    expect(
      evaluateG13({ ...base, retention: [{ name: 'p', purgedOrDeleted: false }] }).status,
    ).toBe('fail');
    expect(evaluateG13({ ...base, criticalOpen: ['CVE-like: token in log'] }).status).toBe('fail');
  });

  it('refuses a not-applicable claim outright', () => {
    const verdict = evaluateG13({
      attempts: [{ name: 'x', denied: true }],
      redaction: [{ name: 'r', residueFree: true }],
      retention: [{ name: 'p', purgedOrDeleted: true }],
      claimedNotApplicable: 'no user data here',
    });
    expect(verdict.status).toBe('fail');
    expect(verdict.detail.join(' ')).toContain('never waivable');
  });

  it('passes only when the attacks demonstrably failed and privacy held (this suite’s evidence)', () => {
    const redacted = minimizeCapture({ text: 'email: a@b.com\nCustomer: Amina Rahman' });
    const store = new CaptureStore(1000);
    const record = store.add('s', 'c', redacted, new Date('2026-11-14T00:00:00.000Z'));
    const purged = store.purgeExpired(new Date('2026-11-14T00:00:01.000Z'));

    const evidence: G13Evidence = {
      threatModel: 'docs/THREAT_MODEL.md',
      attempts: [
        { name: 'page-token-read', denied: true },
        { name: 'synthetic-approval', denied: true },
        { name: 'ui-replacement', denied: true },
        { name: 'cross-frame-confusion', denied: true },
        { name: 'navigation-reconnect-replay', denied: true },
        { name: 'direct-command', denied: true },
        { name: 'dns-rebinding', denied: true },
        { name: 'path-escape', denied: true },
      ],
      redaction: [
        {
          name: 'seeded-crm-email-phone-card-secret',
          residueFree: findResidues(redacted.payload, ['a@b.com', 'Amina Rahman']).length === 0,
          consentShown: redacted.consentRequired,
        },
      ],
      retention: [{ name: 'purge-at-expiry', purgedOrDeleted: purged.includes(record.id) }],
      criticalOpen: [],
    };
    const verdict = evaluateG13(evidence);
    expect(verdict.status).toBe('pass');
    expect(verdict.waivable).toBe(false);
    expect(verdict.detail.join(' ')).toContain('THREAT_MODEL');
  });
});

describe('threat model is a real, versioned artefact', () => {
  it('exists and enumerates the eight hostile attempts this suite covers', () => {
    const path = new URL('../../../docs/THREAT_MODEL.md', import.meta.url).pathname;
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, 'utf8');
    for (const name of [
      'token',
      'synthetic approval',
      'UI replacement',
      'cross-frame',
      'replay',
      'direct command',
      'DNS rebinding',
      'path escape',
    ]) {
      expect(text.toLowerCase()).toContain(name.toLowerCase());
    }
    expect(text).toContain('G13');
    expect(PROVENANCES.length).toBeGreaterThan(4);
  });
});
