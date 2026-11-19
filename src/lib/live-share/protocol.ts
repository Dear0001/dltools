/**
 * Live Share wire protocol (v1). One WebSocket per participant, JSON text frames.
 * Every inbound frame is validated by `parseClientMessage` before it reaches the
 * session manager; nothing is trusted because of its `type`.
 */
import { checkField, isLiveShareTool } from './registry';

export const PROTOCOL_VERSION = 1;

export type SessionEndReason = 'host_ended' | 'host_disconnected' | 'expired' | 'idle' | 'server_shutdown';
export type LeaveReason = SessionEndReason | 'kicked';

export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'MESSAGE_TOO_LARGE'
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'SESSION_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SESSION_FULL'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'UNSUPPORTED_TOOL'
  | 'SENSITIVE_CONTENT'
  | 'NEED_FULL_UPDATE'
  | 'SERVER_BUSY'
  | 'PROTOCOL_MISMATCH';

// ---------- client → server ----------

export type ClientMessage =
  | { type: 'CREATE_SESSION'; protocol: number }
  | { type: 'RECONNECT_HOST'; sessionId: string; hostToken: string }
  | { type: 'JOIN_REQUEST'; code: string; name: string }
  | { type: 'RECONNECT_VIEWER'; sessionId: string; viewerToken: string }
  | { type: 'APPROVE'; requestId: string }
  | { type: 'REJECT'; requestId: string }
  | { type: 'KICK'; viewerId: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'EXTEND' }
  | { type: 'REFRESH_CODE' }
  | { type: 'END' }
  /** `unsupported`: the host opened a tool that cannot be shared (as opposed to having no tool open). */
  | { type: 'CLEAR_TOOL'; unsupported?: boolean }
  | { type: 'SET_ALLOW_FILES'; allow: boolean }
  | { type: 'LEAVE' }
  | { type: 'SYNC_REQUEST' }
  | { type: 'PING'; t: number }
  | {
      type: 'CONTENT_UPDATE';
      toolId: string;
      /** Host-assigned, strictly increasing. Used by the server to drop stale and duplicate updates. */
      version: number;
      /** `true` carries every field of the tool; `false` carries only the changed fields. */
      full: boolean;
      fields: Record<string, string>;
    };

// ---------- server → client ----------

export interface ViewerInfo {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
}
export interface PendingInfo {
  requestId: string;
  name: string;
  requestedAt: number;
  expiresAt: number;
}
export interface HostState {
  sessionId: string;
  /** Display form, e.g. `K7QM-4HXP`. `null` once the pairing code has expired or been used up. */
  code: string | null;
  pairingExpiresAt: number | null;
  sessionExpiresAt: number;
  maxViewers: number;
  paused: boolean;
  /** Host has explicitly allowed file/binary content (e.g. Base64 documents) to be sent. */
  allowFiles: boolean;
  viewers: ViewerInfo[];
  pending: PendingInfo[];
  toolId: string | null;
}
export interface Snapshot {
  toolId: string | null;
  /** Server-assigned sequence number; +1 for every message relayed to viewers. */
  seq: number;
  fields: Record<string, string>;
  /** The host is on a tool that cannot be shared (vs. no tool open). */
  unsupported: boolean;
}

export type ServerMessage =
  | { type: 'SESSION_CREATED'; hostToken: string; state: HostState }
  | { type: 'HOST_STATE'; state: HostState }
  | { type: 'JOIN_PENDING'; requestId: string; expiresAt: number }
  | { type: 'JOIN_APPROVED'; sessionId: string; viewerId: string; viewerToken: string; paused: boolean; sessionExpiresAt: number; snapshot: Snapshot }
  | { type: 'JOIN_REJECTED'; reason: 'rejected' | 'timeout' }
  | { type: 'RECONNECTED'; paused: boolean; hostConnected: boolean; sessionExpiresAt: number; snapshot: Snapshot }
  | { type: 'SNAPSHOT'; paused: boolean; snapshot: Snapshot }
  | { type: 'CONTENT_UPDATE'; seq: number; toolId: string; full: boolean; fields: Record<string, string> }
  | { type: 'SHARING'; paused: boolean }
  | { type: 'HOST_STATUS'; connected: boolean }
  | { type: 'SESSION_ENDED'; reason: LeaveReason }
  | { type: 'ERROR'; code: ErrorCode; message: string; fatal?: boolean }
  | { type: 'PONG'; t: number };

// ---------- validation ----------

export type ParseResult =
  | { ok: true; message: ClientMessage }
  | { ok: false; code: ErrorCode; message: string };

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
const CODE_RE = /^[A-Za-z0-9 -]{6,16}$/;

function fail(message: string, code: ErrorCode = 'INVALID_MESSAGE'): ParseResult {
  return { ok: false, code, message };
}

/** Strips control characters and collapses whitespace; viewer names are shown to the host. */
export function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return cleaned || 'Viewer';
}

export function parseClientMessage(raw: unknown, maxBytes: number): ParseResult {
  if (typeof raw !== 'string') return fail('Binary frames are not supported.');
  if (new TextEncoder().encode(raw).length > maxBytes) return fail('Message is too large.', 'MESSAGE_TOO_LARGE');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail('Message is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('Message must be an object.');
  const m = data as Record<string, unknown>;
  const str = (key: string, re: RegExp) => typeof m[key] === 'string' && re.test(m[key] as string);

  switch (m.type) {
    case 'CREATE_SESSION':
      if (m.protocol !== PROTOCOL_VERSION) return fail('Unsupported protocol version.', 'PROTOCOL_MISMATCH');
      return { ok: true, message: { type: 'CREATE_SESSION', protocol: PROTOCOL_VERSION } };
    case 'RECONNECT_HOST':
      if (!str('sessionId', ID_RE) || !str('hostToken', TOKEN_RE)) return fail('Invalid reconnect credentials.');
      return { ok: true, message: { type: 'RECONNECT_HOST', sessionId: m.sessionId as string, hostToken: m.hostToken as string } };
    case 'RECONNECT_VIEWER':
      if (!str('sessionId', ID_RE) || !str('viewerToken', TOKEN_RE)) return fail('Invalid reconnect credentials.');
      return { ok: true, message: { type: 'RECONNECT_VIEWER', sessionId: m.sessionId as string, viewerToken: m.viewerToken as string } };
    case 'JOIN_REQUEST':
      if (!str('code', CODE_RE)) return fail('Invalid pairing code format.', 'INVALID_CODE');
      return { ok: true, message: { type: 'JOIN_REQUEST', code: m.code as string, name: sanitizeName(typeof m.name === 'string' ? m.name : '') } };
    case 'APPROVE':
    case 'REJECT':
      if (!str('requestId', ID_RE)) return fail('Invalid request id.');
      return { ok: true, message: { type: m.type, requestId: m.requestId as string } };
    case 'KICK':
      if (!str('viewerId', ID_RE)) return fail('Invalid viewer id.');
      return { ok: true, message: { type: 'KICK', viewerId: m.viewerId as string } };
    case 'PAUSE':
    case 'RESUME':
    case 'EXTEND':
    case 'REFRESH_CODE':
    case 'END':
    case 'LEAVE':
    case 'SYNC_REQUEST':
      return { ok: true, message: { type: m.type } };
    case 'CLEAR_TOOL':
      if (m.unsupported !== undefined && typeof m.unsupported !== 'boolean') return fail('Invalid option.');
      return { ok: true, message: { type: 'CLEAR_TOOL', unsupported: m.unsupported === true } };
    case 'SET_ALLOW_FILES':
      if (typeof m.allow !== 'boolean') return fail('Invalid option.');
      return { ok: true, message: { type: 'SET_ALLOW_FILES', allow: m.allow } };
    case 'PING':
      if (typeof m.t !== 'number' || !Number.isFinite(m.t)) return fail('Invalid ping.');
      return { ok: true, message: { type: 'PING', t: m.t } };
    case 'CONTENT_UPDATE': {
      if (typeof m.toolId !== 'string' || !isLiveShareTool(m.toolId)) return fail('This tool does not support Live Share.', 'UNSUPPORTED_TOOL');
      if (!Number.isSafeInteger(m.version) || (m.version as number) < 1) return fail('Invalid version.');
      if (typeof m.full !== 'boolean') return fail('Invalid update.');
      if (!m.fields || typeof m.fields !== 'object' || Array.isArray(m.fields)) return fail('Invalid fields.');
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(m.fields as Record<string, unknown>)) {
        const check = checkField(m.toolId, key, value);
        if (!check.ok) {
          return fail(`Field "${key.slice(0, 32)}" was rejected (${check.reason}).`, check.reason === 'unknown_field' ? 'UNSUPPORTED_TOOL' : 'INVALID_MESSAGE');
        }
        fields[key] = value as string;
      }
      return { ok: true, message: { type: 'CONTENT_UPDATE', toolId: m.toolId, version: m.version as number, full: m.full, fields } };
    }
    default:
      return fail('Unknown message type.');
  }
}

export function encode(message: ServerMessage | ClientMessage): string {
  return JSON.stringify(message);
}

/** Display form of a pairing code: `K7QM4HXP` → `K7QM-4HXP`. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Canonical form used for lookup: uppercase alphanumerics only. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
