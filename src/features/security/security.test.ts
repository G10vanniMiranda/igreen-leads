import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { buildContentSecurityPolicy, createSecurityHeaders } from "../../config/security-headers.ts";
import { ADMIN_COOKIE_NAME, ADMIN_PASSWORD_MIN_LENGTH, verifyAdminPassword } from "../admin/auth.ts";
import { loginHandler } from "../admin/handlers.ts";
import {
  CONSENT_STORAGE_KEY,
  containsConsentPii,
  defaultConsentPreferences,
  readConsentPreferences,
  saveConsentPreferences,
} from "../privacy/consent.ts";
import { createBrowserTracker } from "../tracking/client.ts";
import { createGa4Provider, createMetaPixelProvider } from "../tracking/providers.ts";
import type { TrackingProvider } from "../tracking/types.ts";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  LEAD_RATE_LIMIT,
  UPLOAD_RATE_LIMIT,
  MemoryRateLimiter,
  rateLimitResponse,
} from "./rate-limit.ts";
import { deriveAbuseKey, isSameOriginRequest } from "./request-security.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const origin = "http://localhost:3000";
function request(path = "/api/leads", ip = "192.0.2.10") {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { Origin: origin, "X-Forwarded-For": ip },
  });
}

describe("consentimento e tracking", () => {
  test("1. analytics inicia false", () => assert.equal(defaultConsentPreferences().analytics, false));
  test("2. advertising inicia false", () => assert.equal(defaultConsentPreferences().advertising, false));

  test("3. aceitar todos persiste ambas as categorias", () => {
    const storage = new MemoryStorage();
    const saved = saveConsentPreferences(storage, { analytics: true, advertising: true }, new Date("2026-08-14T00:00:00Z"));
    assert.equal(saved.analytics, true); assert.equal(saved.advertising, true);
    assert.deepEqual(readConsentPreferences(storage), saved);
  });

  test("4. somente necessários mantém categorias opcionais false", () => {
    const saved = saveConsentPreferences(new MemoryStorage(), { analytics: false, advertising: false });
    assert.equal(saved.essential, true); assert.equal(saved.analytics, false); assert.equal(saved.advertising, false);
  });

  test("5. revogação substitui escolha anterior", () => {
    const storage = new MemoryStorage();
    saveConsentPreferences(storage, { analytics: true, advertising: true });
    const revoked = saveConsentPreferences(storage, { analytics: false, advertising: false });
    assert.deepEqual(readConsentPreferences(storage), revoked);
  });

  test("6. Meta fica bloqueado sem consentimento", () => {
    assert.equal(createMetaPixelProvider({ enabled: true, id: "runtime", environment: "test", consentGranted: false }, () => undefined), null);
  });

  test("7. GA fica bloqueado sem consentimento", () => {
    assert.equal(createGa4Provider({ enabled: true, id: "runtime", environment: "test", consentGranted: false }, () => undefined), null);
  });

  test("8. preferências mínimas não contêm PII", () => {
    const preferences = saveConsentPreferences(new MemoryStorage(), { analytics: true, advertising: false });
    assert.equal(containsConsentPii(preferences), false);
    assert.deepEqual(Object.keys(preferences), ["version", "essential", "analytics", "advertising", "updatedAt"]);
  });

  test("9. consent_contact permanece independente", async () => {
    const source = await readFile("src/features/qualification/components/qualification-flow.tsx", "utf8");
    const contactCopy = source.match(/Autorizo o contato[\s\S]*?<\/span>/)?.[0] ?? "";
    assert.match(contactCopy, /análise da minha conta|continuidade do atendimento/);
    assert.doesNotMatch(contactCopy, /analytics|publicidade|newsletter|remarketing/i);
  });

  test("10. revogação impede novos eventos de terceiros", () => {
    let calls = 0;
    const provider: TrackingProvider = { name: "external", track: () => { calls += 1; } };
    const storage = new MemoryStorage();
    let id = 0;
    const tracker = createBrowserTracker({
      storage, url: "https://example.test", referrer: "", providers: [provider],
      randomId: () => `10000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    });
    tracker.track("page_view");
    tracker.setProviders([]);
    tracker.track("qualification_started");
    assert.equal(calls, 1);
  });

  test("11. storage inválido falha fechado", () => {
    const storage = new MemoryStorage(); storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ analytics: true }));
    assert.equal(readConsentPreferences(storage), null);
  });
});

describe("rotas, headers e indexação", () => {
  test("12. rota pública de privacidade existe e não inventa email", async () => {
    const source = await readFile("src/app/privacidade/page.tsx", "utf8");
    assert.match(source, /Política de Privacidade/);
    assert.doesNotMatch(source, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  });

  test("13. admin declara noindex e nofollow", async () => {
    const source = await readFile("src/app/admin/layout.tsx", "utf8");
    assert.match(source, /index: false/); assert.match(source, /follow: false/);
  });

  test("14. headers de segurança incluem CSP", () => {
    assert.ok(createSecurityHeaders({ NODE_ENV: "production" }).some((header) => header.key === "Content-Security-Policy"));
  });

  test("15. framing é bloqueado", () => {
    const csp = buildContentSecurityPolicy({ NODE_ENV: "production" });
    assert.match(csp, /frame-ancestors 'none'/);
    assert.deepEqual(createSecurityHeaders({ NODE_ENV: "production" }).find((header) => header.key === "X-Frame-Options"), { key: "X-Frame-Options", value: "DENY" });
  });

  test("16. MIME sniffing é bloqueado", () => {
    assert.deepEqual(createSecurityHeaders({}).find((header) => header.key === "X-Content-Type-Options"), { key: "X-Content-Type-Options", value: "nosniff" });
  });

  test("17. referrer policy reduz vazamento cross-origin", () => {
    assert.deepEqual(createSecurityHeaders({}).find((header) => header.key === "Referrer-Policy"), { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" });
  });

  test("18. Preview/Test permanecem noindex por padrão", () => {
    assert.deepEqual(createSecurityHeaders({ INDEXING_ENABLED: "false" }).find((header) => header.key === "X-Robots-Tag"), { key: "X-Robots-Tag", value: "noindex, nofollow" });
  });

  test("19. CSP Production não usa unsafe-eval nem libera trackers desligados", () => {
    const csp = buildContentSecurityPolicy({ NODE_ENV: "production", ANALYTICS_ENVIRONMENT: "production", GA_ENABLED: "true", GA_MEASUREMENT_ID: "runtime" });
    assert.doesNotMatch(csp, /unsafe-eval|googletagmanager|facebook/);
  });

  test("20. HSTS só é emitido em Production HTTPS explicitamente habilitado", () => {
    assert.equal(createSecurityHeaders({ NODE_ENV: "development", SECURITY_HTTPS_HEADERS_ENABLED: "true" }).some((header) => header.key === "Strict-Transport-Security"), false);
    assert.equal(createSecurityHeaders({ NODE_ENV: "production", SECURITY_HTTPS_HEADERS_ENABLED: "true" }).some((header) => header.key === "Strict-Transport-Security"), true);
  });
});

describe("anti-abuse, origem e admin", () => {
  test("21. endpoint de lead é limitado", () => {
    const limiter = new MemoryRateLimiter();
    for (let index = 0; index < LEAD_RATE_LIMIT.limit; index += 1) assert.equal(rateLimitResponse(request(), "lead", LEAD_RATE_LIMIT, limiter), null);
    assert.equal(rateLimitResponse(request(), "lead", LEAD_RATE_LIMIT, limiter)?.status, 429);
  });

  test("22. upload possui limite independente", () => {
    const limiter = new MemoryRateLimiter();
    for (let index = 0; index < UPLOAD_RATE_LIMIT.limit; index += 1) assert.equal(rateLimitResponse(request("/api/lead-documents"), "upload", UPLOAD_RATE_LIMIT, limiter), null);
    assert.equal(rateLimitResponse(request("/api/lead-documents"), "upload", UPLOAD_RATE_LIMIT, limiter)?.status, 429);
  });

  test("23. admin login mitiga brute force sem bloqueio permanente", () => {
    const limiter = new MemoryRateLimiter();
    const key = deriveAbuseKey(request("/api/admin/session"), "admin-login");
    for (let index = 0; index < ADMIN_LOGIN_RATE_LIMIT.limit; index += 1) assert.equal(limiter.consume(key, ADMIN_LOGIN_RATE_LIMIT, 0).allowed, true);
    assert.equal(limiter.consume(key, ADMIN_LOGIN_RATE_LIMIT, 0).allowed, false);
    assert.equal(limiter.consume(key, ADMIN_LOGIN_RATE_LIMIT, ADMIN_LOGIN_RATE_LIMIT.windowMs + 1).allowed, true);
  });

  test("24. same-origin rejeita origem ausente ou externa", () => {
    assert.equal(isSameOriginRequest(request()), true);
    assert.equal(isSameOriginRequest(new Request(`${origin}/api/leads`, { method: "POST" })), false);
    assert.equal(isSameOriginRequest(new Request(`${origin}/api/leads`, { method: "POST", headers: { Origin: "https://evil.test" } })), false);
  });

  test("25. senha administrativa abaixo do mínimo falha fechado", () => {
    const previousPassword = process.env.ADMIN_PASSWORD;
    const previousSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "x".repeat(ADMIN_PASSWORD_MIN_LENGTH - 1);
    process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("base64url");
    try { assert.equal(verifyAdminPassword(process.env.ADMIN_PASSWORD), false); }
    finally { process.env.ADMIN_PASSWORD = previousPassword; process.env.ADMIN_SESSION_SECRET = previousSecret; }
  });

  test("26. cookie admin usa HttpOnly, SameSite Strict, Secure e expiração", async () => {
    const previousPassword = process.env.ADMIN_PASSWORD;
    const previousSecret = process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = randomBytes(24).toString("base64url");
    process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("base64url");
    const body = new FormData(); body.set("password", process.env.ADMIN_PASSWORD);
    try {
      const response = await loginHandler(new Request("https://example.test/api/admin/session", { method: "POST", body, headers: { Origin: "https://example.test" } }), new MemoryRateLimiter());
      const cookie = response.headers.get("set-cookie") ?? "";
      assert.match(cookie, new RegExp(`^${ADMIN_COOKIE_NAME}=`));
      assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Secure/); assert.match(cookie, /Max-Age=/);
    } finally { process.env.ADMIN_PASSWORD = previousPassword; process.env.ADMIN_SESSION_SECRET = previousSecret; }
  });

  test("27. respostas privadas e erros são no-store e genéricos", async () => {
    const [handlers, leadHandler] = await Promise.all([
      readFile("src/features/admin/handlers.ts", "utf8"),
      readFile("src/features/leads/services/lead-route-handler.ts", "utf8"),
    ]);
    assert.match(handlers, /private, no-store/); assert.match(leadHandler, /Cache-Control.*private, no-store/);
    assert.doesNotMatch(leadHandler, /error\.message|error\.stack/);
  });

  test("28. logs não referenciam campos de PII ou secrets", async () => {
    const files = [
      "src/features/leads/services/lead-route-handler.ts",
      "src/features/documents/services/bill-upload-route-handler.ts",
      "src/features/documents/services/bill-upload.ts",
    ];
    const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
    const logs = [...source.matchAll(/console\.(?:info|error|warn|log)\([^;]+/g)].map((match) => match[0]).join("\n");
    assert.doesNotMatch(logs, /\.name|\.phone|filename|signed|cookie|ADMIN_PASSWORD|SERVICE_ROLE|file\.arrayBuffer/i);
  });
});
