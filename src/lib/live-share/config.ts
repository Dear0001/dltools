/** Server limits. Every value can be overridden with a LIVE_SHARE_* environment variable. */
export interface LiveShareConfig {
  pairingTtlMs: number;
  sessionTtlMs: number;
  sessionExtendMs: number;
  maxSessionLifetimeMs: number;
  idleTimeoutMs: number;
  hostGraceMs: number;
  viewerGraceMs: number;
  joinRequestTtlMs: number;
  maxViewers: number;
  maxPendingRequests: number;
  maxSessions: number;
  maxConnectionsPerIp: number;
  maxMessageBytes: number;
  maxSnapshotChars: number;
  joinAttemptsPerMinute: number;
  failedJoinLockThreshold: number;
  failedJoinWindowMs: number;
  failedJoinLockMs: number;
  createsPerHour: number;
  messagesPerSecond: number;
  messageBurst: number;
  backpressureBytes: number;
}

export const DEFAULT_CONFIG: LiveShareConfig = {
  pairingTtlMs: 5 * 60_000,
  sessionTtlMs: 60 * 60_000,
  sessionExtendMs: 30 * 60_000,
  maxSessionLifetimeMs: 4 * 60 * 60_000,
  idleTimeoutMs: 30 * 60_000,
  hostGraceMs: 30_000,
  viewerGraceMs: 60_000,
  joinRequestTtlMs: 90_000,
  maxViewers: 5,
  maxPendingRequests: 5,
  maxSessions: 1_000,
  maxConnectionsPerIp: 25,
  maxMessageBytes: 1_048_576,
  maxSnapshotChars: 600_000,
  joinAttemptsPerMinute: 12,
  failedJoinLockThreshold: 6,
  failedJoinWindowMs: 10 * 60_000,
  failedJoinLockMs: 15 * 60_000,
  createsPerHour: 20,
  messagesPerSecond: 30,
  messageBurst: 90,
  backpressureBytes: 512 * 1024,
};

const ENV_KEYS: Record<keyof LiveShareConfig, string> = {
  pairingTtlMs: 'LIVE_SHARE_PAIRING_TTL_MS',
  sessionTtlMs: 'LIVE_SHARE_SESSION_TTL_MS',
  sessionExtendMs: 'LIVE_SHARE_SESSION_EXTEND_MS',
  maxSessionLifetimeMs: 'LIVE_SHARE_MAX_SESSION_LIFETIME_MS',
  idleTimeoutMs: 'LIVE_SHARE_IDLE_TIMEOUT_MS',
  hostGraceMs: 'LIVE_SHARE_HOST_GRACE_MS',
  viewerGraceMs: 'LIVE_SHARE_VIEWER_GRACE_MS',
  joinRequestTtlMs: 'LIVE_SHARE_JOIN_REQUEST_TTL_MS',
  maxViewers: 'LIVE_SHARE_MAX_VIEWERS',
  maxPendingRequests: 'LIVE_SHARE_MAX_PENDING_REQUESTS',
  maxSessions: 'LIVE_SHARE_MAX_SESSIONS',
  maxConnectionsPerIp: 'LIVE_SHARE_MAX_CONNECTIONS_PER_IP',
  maxMessageBytes: 'LIVE_SHARE_MAX_MESSAGE_BYTES',
  maxSnapshotChars: 'LIVE_SHARE_MAX_SNAPSHOT_CHARS',
  joinAttemptsPerMinute: 'LIVE_SHARE_JOIN_ATTEMPTS_PER_MINUTE',
  failedJoinLockThreshold: 'LIVE_SHARE_FAILED_JOIN_LOCK_THRESHOLD',
  failedJoinWindowMs: 'LIVE_SHARE_FAILED_JOIN_WINDOW_MS',
  failedJoinLockMs: 'LIVE_SHARE_FAILED_JOIN_LOCK_MS',
  createsPerHour: 'LIVE_SHARE_CREATES_PER_HOUR',
  messagesPerSecond: 'LIVE_SHARE_MESSAGES_PER_SECOND',
  messageBurst: 'LIVE_SHARE_MESSAGE_BURST',
  backpressureBytes: 'LIVE_SHARE_BACKPRESSURE_BYTES',
};

/** Reads overrides from `env`. Invalid or non-positive values fall back to the default. */
export function loadConfig(
  env: Record<string, string | undefined> = {},
  overrides: Partial<LiveShareConfig> = {},
): LiveShareConfig {
  const config = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(ENV_KEYS) as Array<keyof LiveShareConfig>) {
    const raw = env[ENV_KEYS[key]];
    if (raw === undefined || raw.trim() === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) config[key] = Math.floor(value);
  }
  return { ...config, ...overrides };
}
