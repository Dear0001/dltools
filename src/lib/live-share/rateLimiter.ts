/** Small in-memory limiters used by the session manager. All take an injected clock for tests. */

/** Sliding-window counter: at most `limit` events per `windowMs` per key. */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number) {}

  /** Records an event; returns false when the key is over its limit. */
  take(key: string, now: number): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  sweep(now: number): void {
    for (const [key, times] of this.hits) {
      const recent = times.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

/**
 * Brute-force guard for pairing codes. Failed attempts per client address are counted
 * in a window; crossing the threshold locks that address out for `lockMs`.
 */
export class FailureLockout {
  private failures = new Map<string, number[]>();
  private locked = new Map<string, number>();
  constructor(private threshold: number, private windowMs: number, private lockMs: number) {}

  isLocked(key: string, now: number): boolean {
    const until = this.locked.get(key);
    if (until === undefined) return false;
    if (now >= until) {
      this.locked.delete(key);
      this.failures.delete(key);
      return false;
    }
    return true;
  }

  /** Returns true if this failure caused a lockout. */
  recordFailure(key: string, now: number): boolean {
    const recent = (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
    recent.push(now);
    this.failures.set(key, recent);
    if (recent.length >= this.threshold) {
      this.locked.set(key, now + this.lockMs);
      return true;
    }
    return false;
  }

  reset(key: string): void {
    this.failures.delete(key);
  }

  sweep(now: number): void {
    for (const [key, until] of this.locked) if (now >= until) { this.locked.delete(key); this.failures.delete(key); }
    for (const [key, times] of this.failures) {
      const recent = times.filter((t) => now - t < this.windowMs);
      if (recent.length === 0) this.failures.delete(key);
      else this.failures.set(key, recent);
    }
  }
}

/** Token bucket for per-connection message flood control. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(private ratePerSec: number, private burst: number, now: number) {
    this.tokens = burst;
    this.last = now;
  }
  take(now: number): boolean {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.ratePerSec);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
