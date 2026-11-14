/**
 * Security & privacy boundary for the Studio (T0806, G13 — never waivable).
 *
 * The inspected page is hostile: its DOM, scripts, frames, screenshots,
 * annotations and any text the Studio reads out of it. Nothing that comes from
 * the page may authorise a write, a command or a network call (DA-31). This
 * module is the *action boundary* that enforces that, plus the privacy
 * machinery the safety contract requires (minimise/redact before capture,
 * retention and deletion), plus the G13 verdict emitter that refuses to be
 * waived or marked not-applicable.
 *
 * Design stance: every function here fails CLOSED. An unrecognised provenance,
 * a capability for another frame, an expired or already-consumed capability, a
 * capture that still contains a seeded secret — all of them deny. There is no
 * "allow by default" branch, and no exception mechanism.
 */
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// 1. Action boundary — untrusted content never authorises anything (DA-31)
// ---------------------------------------------------------------------------

/**
 * Where the content that motivated an action came from.
 * Only user-typed and user-drawn intent is trusted; everything the page or a
 * model produced is data.
 */
export const PROVENANCES = [
  'user-typed',
  'user-drawn',
  'page-dom',
  'page-script',
  'ocr',
  'screenshot',
  'recalled-lesson',
  'annotation-label',
] as const;
export type Provenance = (typeof PROVENANCES)[number];

const TRUSTED_PROVENANCE: ReadonlySet<string> = new Set(['user-typed', 'user-drawn']);

export const ACTION_KINDS = ['write', 'command', 'network', 'undo', 'capture'] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export type DenyReason =
  | 'untrusted-provenance'
  | 'unknown-provenance'
  | 'unknown-action'
  | 'missing-capability'
  | 'unknown-capability'
  | 'capability-kind-mismatch'
  | 'capability-frame-mismatch'
  | 'capability-session-mismatch'
  | 'capability-proposal-mismatch'
  | 'capability-fence-stale'
  | 'capability-expired'
  | 'capability-replayed';

export type BoundaryDecision =
  { allowed: true; capabilityId: string } | { allowed: false; reason: DenyReason; detail: string };

export interface ActionRequest {
  kind: ActionKind;
  /** Human-readable target, recorded (never executed). */
  target: string;
  provenance: Provenance | string;
  /** Operation capability id minted by the privileged surface (not the page). */
  capabilityId?: string;
}

/** Everything a capability is bound to. Any mismatch is a denial. */
export interface CapabilityBinding {
  sessionId: string;
  /** CDP target/frame the capability was issued for. */
  frameId: string;
  kind: ActionKind;
  /** Hash of the approved proposal this capability executes. */
  proposalSha256: string;
  /** Worker fencing generation at issue time (stale worker cannot act). */
  fence: number;
}

export interface OperationCapability extends CapabilityBinding {
  id: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  /** Set by the trusted surface that minted it; never derived from page data. */
  approvedBy: string;
}

export type CapabilityCheck =
  { ok: true; capability: OperationCapability } | { ok: false; reason: DenyReason; detail: string };

/**
 * Issues and verifies single-use operation capabilities.
 *
 * Bound to session + frame + kind + proposal hash + fence + expiry, so a
 * capability cannot be replayed in another tab, reused after the user edited
 * the proposal, or used by a stale worker. Consumption is recorded; replaying
 * a consumed capability is a denial, not a no-op.
 */
export class CapabilityAuthority {
  private readonly capabilities = new Map<string, OperationCapability>();

  constructor(private readonly defaultTtlMs = 5 * 60 * 1000) {}

  issue(binding: CapabilityBinding, approvedBy: string, now = new Date()): OperationCapability {
    if (approvedBy.trim() === '') {
      throw new Error('a capability needs an identified approver (never page-derived)');
    }
    if (!ACTION_KINDS.includes(binding.kind))
      throw new Error(`unknown action kind ${binding.kind}`);
    const capability: OperationCapability = {
      ...binding,
      id: randomBytes(16).toString('hex'),
      issuedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.defaultTtlMs).toISOString(),
      consumedAt: null,
      approvedBy: approvedBy.trim(),
    };
    this.capabilities.set(capability.id, capability);
    return capability;
  }

  get size(): number {
    return this.capabilities.size;
  }

  /**
   * Verifies then CONSUMES. Order matters: expiry, binding and reuse are all
   * checked before the capability is spent, so a denied request leaves the
   * authority unchanged.
   */
  verifyAndConsume(id: string, binding: CapabilityBinding, now = new Date()): CapabilityCheck {
    const capability = this.capabilities.get(id);
    if (!capability) {
      return { ok: false, reason: 'unknown-capability', detail: `no capability ${id}` };
    }
    if (capability.consumedAt !== null) {
      return {
        ok: false,
        reason: 'capability-replayed',
        detail: `capability ${id} was consumed at ${capability.consumedAt}`,
      };
    }
    if (new Date(capability.expiresAt).getTime() <= now.getTime()) {
      return { ok: false, reason: 'capability-expired', detail: `expired ${capability.expiresAt}` };
    }
    const mismatches: Array<[DenyReason, boolean, string]> = [
      [
        'capability-kind-mismatch',
        capability.kind !== binding.kind,
        `${capability.kind} vs ${binding.kind}`,
      ],
      [
        'capability-frame-mismatch',
        capability.frameId !== binding.frameId,
        `${capability.frameId} vs ${binding.frameId}`,
      ],
      [
        'capability-session-mismatch',
        capability.sessionId !== binding.sessionId,
        `${capability.sessionId} vs ${binding.sessionId}`,
      ],
      [
        'capability-proposal-mismatch',
        capability.proposalSha256 !== binding.proposalSha256,
        'proposal hash differs from the approved one',
      ],
      [
        'capability-fence-stale',
        capability.fence !== binding.fence,
        `fence ${capability.fence} vs ${binding.fence}`,
      ],
    ];
    for (const [reason, failed, detail] of mismatches) {
      if (failed) return { ok: false, reason, detail };
    }
    capability.consumedAt = now.toISOString();
    return { ok: true, capability };
  }
}

/**
 * The single gate every privileged action passes through.
 * Order: provenance → action kind → capability. Untrusted content is refused
 * before its capability is even looked at, so a page that somehow learned a
 * capability id still cannot act on page-derived content.
 */
export class ActionBoundary {
  constructor(private readonly capabilities: CapabilityAuthority) {}

  request(action: ActionRequest, binding: CapabilityBinding, now = new Date()): BoundaryDecision {
    if (!TRUSTED_PROVENANCE.has(action.provenance)) {
      const known = PROVENANCES.includes(action.provenance as Provenance);
      return {
        allowed: false,
        reason: known ? 'untrusted-provenance' : 'unknown-provenance',
        detail: `"${action.provenance}" content is data, not authorisation (DA-31)`,
      };
    }
    if (!ACTION_KINDS.includes(action.kind)) {
      return { allowed: false, reason: 'unknown-action', detail: `unknown action ${action.kind}` };
    }
    if (!action.capabilityId) {
      return {
        allowed: false,
        reason: 'missing-capability',
        detail: 'no capability: approval is issued by the trusted surface, never implied',
      };
    }
    const check = this.capabilities.verifyAndConsume(action.capabilityId, binding, now);
    if (!check.ok) return { allowed: false, reason: check.reason, detail: check.detail };
    return { allowed: true, capabilityId: check.capability.id };
  }
}

// ---------------------------------------------------------------------------
// 2. Capture minimisation — nothing leaves or is stored unredacted
// ---------------------------------------------------------------------------

export type RedactionKind =
  'form-value' | 'email' | 'phone' | 'card' | 'secret' | 'crm-record' | 'person-name';

export interface Redaction {
  kind: RedactionKind;
  /** Count for this kind (aggregate only — never the removed value). */
  count: number;
}

export interface RedactionResult {
  /** The ONLY payload that may be previewed, logged, stored or sent. */
  payload: string;
  redactions: Redaction[];
  /** Per the safety contract: the exact redacted payload is shown before consent. */
  consentRequired: true;
  bytesIn: number;
  bytesOut: number;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /\+?\d[\d\s().-]{7,}\d/g;
const CARD = /\b(?:\d[ -]?){13,18}\d\b/g;
const SECRET_ASSIGNMENT =
  /^(\s*["']?(?:api[_-]?key|apikey|token|secret|password|passwd|authorization|bearer|cookie)["']?\s*[:=]\s*).+$/i;
const RECORD_LINE =
  /^\s*["']?(?:name|customer|client|contact|account|email|phone|address)["']?\s*[:=]\s*.+$/i;
const PERSON_NAME = /^\s*[A-Z][a-z'’-]{1,20}(?:\s+[A-Z][a-z'’-]{1,20}){1,2}\s*$/;

export interface CaptureInput {
  text: string;
  /** Raw form field values; keys are kept, values are always replaced. */
  formValues?: Record<string, string>;
}

/**
 * Minimises a capture. Conservative by construction: a value that merely
 * *looks* like a person name or a record line is masked, because the contract
 * forbids assuming that missing `data-sensitive` means public.
 */
export function minimizeCapture(input: CaptureInput, fieldOrder?: string[]): RedactionResult {
  const counts = new Map<RedactionKind, number>();
  const bump = (kind: RedactionKind): void => {
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  };
  const bytesIn = Buffer.byteLength(input.text, 'utf8');

  // Form values are redacted structurally (key kept, value gone) and are NOT
  // fed through the free-text line rules — a field literally named "email"
  // rendered as `email=[redacted:form-value]` must not be re-labelled a CRM
  // record, which would lose the field name the reviewer needs.
  const formLines = input.formValues
    ? (fieldOrder ?? Object.keys(input.formValues))
        .filter((key) => Object.hasOwn(input.formValues!, key))
        .map((key) => {
          bump('form-value');
          return `${key}=[redacted:form-value]`;
        })
    : [];

  const lines = input.text.split('\n').map((line) => {
    if (SECRET_ASSIGNMENT.test(line)) {
      const prefix = SECRET_ASSIGNMENT.exec(line)![1]!;
      bump('secret');
      return `${prefix}[redacted:secret]`;
    }
    if (RECORD_LINE.test(line) || PERSON_NAME.test(line.replace(/^[-\s]+/, ''))) {
      bump('crm-record');
      return '[redacted:crm-record]';
    }
    let out = line;
    out = out.replace(EMAIL, () => (bump('email'), '[redacted:email]'));
    out = out.replace(CARD, () => (bump('card'), '[redacted:card]'));
    out = out.replace(PHONE, () => (bump('phone'), '[redacted:phone]'));
    return out;
  });

  const minimised = [...formLines, ...lines]
    .filter((line, i, all) => line !== '' || i < all.length - 1)
    .join('\n');
  return {
    payload: minimised,
    redactions: [...counts.entries()].map(([kind, count]) => ({ kind, count })),
    consentRequired: true,
    bytesIn,
    bytesOut: Buffer.byteLength(minimised, 'utf8'),
  };
}

/**
 * Residue check: which of the seeded sensitive values still appear verbatim in
 * a payload? Empty array = clean. Used by the tests to prove that previews,
 * audit logs and outbound payloads carry none of the seeded material.
 */
export function findResidues(payload: string, sensitive: readonly string[]): string[] {
  return sensitive.filter((value) => value.trim() !== '' && payload.includes(value));
}

// ---------------------------------------------------------------------------
// 3. Retention and deletion — captured material has a lifetime
// ---------------------------------------------------------------------------

export interface CaptureRecord {
  id: string;
  subjectId: string;
  consentId: string;
  /** Already-redacted payload (`RedactionResult.payload`); never raw. */
  payload: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Stores only redacted payloads — the constructor type makes it impossible to
 * hand it a raw string. Retention is per-record and enforced by `purgeExpired`;
 * `deleteSubject` and `revokeConsent` remove material before expiry.
 */
export class CaptureStore {
  private readonly records = new Map<string, CaptureRecord>();

  constructor(private readonly retentionMs = 60 * 60 * 1000) {
    if (retentionMs <= 0) throw new Error('retention must be positive');
  }

  add(
    subjectId: string,
    consentId: string,
    redacted: RedactionResult,
    now = new Date(),
  ): CaptureRecord {
    if (consentId.trim() === '') throw new Error('capture needs a consent record');
    const record: CaptureRecord = {
      id: randomBytes(8).toString('hex'),
      subjectId,
      consentId,
      payload: redacted.payload,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + this.retentionMs).toISOString(),
    };
    this.records.set(record.id, record);
    return record;
  }

  get(id: string): CaptureRecord | undefined {
    return this.records.get(id);
  }

  get size(): number {
    return this.records.size;
  }

  /** Deletes every record past its expiry; returns the deleted ids. */
  purgeExpired(now = new Date()): string[] {
    const purged: string[] = [];
    for (const [id, record] of this.records) {
      if (new Date(record.expiresAt).getTime() <= now.getTime()) {
        this.records.delete(id);
        purged.push(id);
      }
    }
    return purged;
  }

  deleteSubject(subjectId: string): string[] {
    const removed: string[] = [];
    for (const [id, record] of this.records) {
      if (record.subjectId === subjectId) {
        this.records.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }

  /** Consent revocation deletes the material it authorised, immediately. */
  revokeConsent(consentId: string): string[] {
    const removed: string[] = [];
    for (const [id, record] of this.records) {
      if (record.consentId === consentId) {
        this.records.delete(id);
        removed.push(id);
      }
    }
    return removed;
  }
}

// ---------------------------------------------------------------------------
// 4. G13 verdict — fail closed, never waived, never not-applicable
// ---------------------------------------------------------------------------

export type GateStatus = 'pass' | 'fail' | 'not-run' | 'not-applicable';

export interface G13Evidence {
  /** Path to the threat model the evidence was produced against. */
  threatModel?: string;
  /** Every hostile attempt and whether the system denied it. */
  attempts: Array<{ name: string; denied: boolean; note?: string }>;
  /** Redaction cases: seeded secrets must leave no residue; consent must be shown. */
  redaction: Array<{ name: string; residueFree: boolean; consentShown?: boolean }>;
  /** Retention cases: material must actually disappear. */
  retention: Array<{ name: string; purgedOrDeleted: boolean }>;
  /** Any unresolved critical security/privacy finding. */
  criticalOpen?: string[];
  /** A caller trying to excuse G13 — always refused. */
  claimedNotApplicable?: string;
}

export interface G13Verdict {
  gate: 'G13';
  status: GateStatus;
  detail: string[];
  /** Structural: this gate has no waiver mechanism. */
  waivable: false;
}

export function evaluateG13(evidence: G13Evidence): G13Verdict {
  const detail: string[] = [];

  if (evidence.claimedNotApplicable !== undefined) {
    return {
      gate: 'G13',
      status: 'fail',
      detail: [
        `not-applicable refused: G13 is never waivable (claimed: "${evidence.claimedNotApplicable}")`,
      ],
      waivable: false,
    };
  }

  const missing: string[] = [];
  if (!evidence.attempts || evidence.attempts.length === 0) missing.push('hostile-attempt denials');
  if (!evidence.redaction || evidence.redaction.length === 0) missing.push('redaction cases');
  if (!evidence.retention || evidence.retention.length === 0) missing.push('retention cases');
  if (missing.length > 0) {
    return {
      gate: 'G13',
      status: 'not-run',
      detail: [`no evidence for ${missing.join(', ')} — G13 is not-run without it`],
      waivable: false,
    };
  }

  const undefended = evidence.attempts.filter((a) => !a.denied).map((a) => a.name);
  if (undefended.length > 0) {
    detail.push(`hostile attempt(s) NOT denied: ${undefended.join(', ')}`);
  }
  const leaky = evidence.redaction
    .filter((r) => !r.residueFree || r.consentShown === false)
    .map((r) => r.name);
  if (leaky.length > 0) {
    detail.push(`redaction case(s) left residue or skipped consent: ${leaky.join(', ')}`);
  }
  const retained = evidence.retention.filter((r) => !r.purgedOrDeleted).map((r) => r.name);
  if (retained.length > 0) {
    detail.push(`retention case(s) did not delete: ${retained.join(', ')}`);
  }
  if ((evidence.criticalOpen?.length ?? 0) > 0) {
    detail.push(`open critical finding(s): ${evidence.criticalOpen!.join(', ')}`);
  }

  if (detail.length > 0) return { gate: 'G13', status: 'fail', detail, waivable: false };

  return {
    gate: 'G13',
    status: 'pass',
    detail: [
      `${evidence.attempts.length} hostile attempt(s) denied, ${evidence.redaction.length} redaction case(s) residue-free with consent, ${evidence.retention.length} retention case(s) verified`,
      ...(evidence.threatModel ? [`threat model: ${evidence.threatModel}`] : []),
    ],
    waivable: false,
  };
}
