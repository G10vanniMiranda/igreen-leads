import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SEARCH_TOKEN_SECONDS = 15 * 60;

function key() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_AUTH_NOT_CONFIGURED");
  return createHash("sha256").update(secret).digest();
}

export function createSearchToken(search: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const plaintext = JSON.stringify({ search, expiresAt: nowSeconds + SEARCH_TOKEN_SECONDS });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function readSearchToken(token: unknown, nowSeconds = Math.floor(Date.now() / 1000)): string | undefined {
  if (typeof token !== "string" || token.length > 512) return;
  try {
    const value = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), value.subarray(0, 12));
    decipher.setAuthTag(value.subarray(12, 28));
    const payload = JSON.parse(Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]).toString("utf8")) as { search?: unknown; expiresAt?: unknown };
    if (typeof payload.search !== "string" || payload.search.length > 100 || typeof payload.expiresAt !== "number" || payload.expiresAt <= nowSeconds) return;
    return payload.search;
  } catch { return; }
}
