import { createHmac, randomBytes } from "node:crypto";

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

const processSecuritySalt = randomBytes(32);

export function deriveAbuseKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip")?.trim() || "unavailable";
  return createHmac("sha256", processSecuritySalt).update(`${scope}:${address}`).digest("base64url");
}
