import { deriveAbuseKey } from "./request-security";

export type RateLimitPolicy = Readonly<{ limit: number; windowMs: number }>;
type Entry = { count: number; resetAt: number };

export interface RateLimiter {
  consume(key: string, policy: RateLimitPolicy, now?: number): Readonly<{ allowed: boolean; retryAfterSeconds: number }>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, Entry>();
  constructor(private readonly maximumEntries = 5_000) {}

  consume(key: string, policy: RateLimitPolicy, now = Date.now()) {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      if (this.entries.size >= this.maximumEntries) this.prune(now);
      this.entries.set(key, { count: 1, resetAt: now + policy.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    current.count += 1;
    return {
      allowed: current.count <= policy.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  private prune(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now || this.entries.size >= this.maximumEntries) this.entries.delete(key);
      if (this.entries.size < this.maximumEntries) break;
    }
  }
}

export const LEAD_RATE_LIMIT = Object.freeze({ limit: 5, windowMs: 10 * 60 * 1_000 });
export const UPLOAD_RATE_LIMIT = Object.freeze({ limit: 5, windowMs: 10 * 60 * 1_000 });
export const ADMIN_LOGIN_RATE_LIMIT = Object.freeze({ limit: 5, windowMs: 15 * 60 * 1_000 });

export const publicRateLimiter = new MemoryRateLimiter();
export const adminLoginRateLimiter = new MemoryRateLimiter();

export function rateLimitResponse(
  request: Request,
  scope: string,
  policy: RateLimitPolicy,
  limiter: RateLimiter,
): Response | null {
  const decision = limiter.consume(deriveAbuseKey(request, scope), policy);
  if (decision.allowed) return null;
  return Response.json(
    { ok: false, code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde e tente novamente." },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(decision.retryAfterSeconds),
      },
    },
  );
}
