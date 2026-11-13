/**
 * @sus/studio-bridge — localhost server, auth, allowlist, session state
 * (ADR-003). T0701: read-only session surface. NO consumer-source write
 * endpoints exist before the T0707/T0700w safety gates pass.
 */
export {
  BridgeServer,
  BridgeAudit,
  MessageEnvelope,
  MAX_PAYLOAD_BYTES,
  type BridgeOptions,
  type SessionState,
  type AuditEntry,
  type MessageEnvelopeData,
} from './server.js';
