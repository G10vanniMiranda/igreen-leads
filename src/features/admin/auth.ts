import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isSameOriginRequest } from "../security/request-security";

export const ADMIN_COOKIE_NAME = "igreen_admin_session";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;

type SessionPayload = Readonly<{ role: "admin"; issuedAt: number; expiresAt: number }>;

function getConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < ADMIN_PASSWORD_MIN_LENGTH || !secret || secret.length < 32) return null;
  return { password, secret };
}

function safeEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function verifyAdminPassword(candidate: unknown): boolean {
  const config = getConfig();
  return config !== null && typeof candidate === "string" && safeEqual(candidate, config.password);
}

export function createAdminSession(nowSeconds = Math.floor(Date.now() / 1000)): string {
  const config = getConfig();
  if (!config) throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  const payload: SessionPayload = {
    role: "admin", issuedAt: nowSeconds, expiresAt: nowSeconds + ADMIN_SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", config.secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAdminSession(token: unknown, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const config = getConfig();
  if (!config || typeof token !== "string") return false;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return false;
  const expected = createHmac("sha256", config.secret).update(encoded).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    return payload.role === "admin" && Number.isInteger(payload.issuedAt)
      && Number.isInteger(payload.expiresAt) && payload.issuedAt! <= nowSeconds
      && payload.expiresAt! > nowSeconds && payload.expiresAt! - payload.issuedAt! === ADMIN_SESSION_SECONDS;
  } catch {
    return false;
  }
}

export function isSameOriginMutation(request: Request): boolean {
  return isSameOriginRequest(request);
}

export function readSessionCookie(request: Request): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === ADMIN_COOKIE_NAME) return decodeURIComponent(value.join("="));
  }
}
