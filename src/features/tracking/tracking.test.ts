import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  ATTRIBUTION_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  getFirstTouchAttribution,
  getJourneyId,
  readAttribution,
  toLeadAttribution,
} from "./attribution.ts";
import { createBrowserTracker } from "./client.ts";
import { parseAnalyticsConfig } from "./config.ts";
import { trackBillUploadOutcome, trackLeadSubmissionOutcome } from "./funnel-outcomes.ts";
import { GA4_EVENT_MAP, META_EVENT_MAP, createGa4Provider, createMetaPixelProvider } from "./providers.ts";
import { PUBLIC_FUNNEL_EVENTS, type TrackingEvent, type TrackingProvider } from "./types.ts";
import { isPublicExperiencePath } from "../../config/route-scope.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const ids = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
  "10000000-0000-4000-8000-000000000003",
  "10000000-0000-4000-8000-000000000004",
];

function tracker(providers: readonly TrackingProvider[] = []) {
  const storage = new MemoryStorage();
  let index = 0;
  return createBrowserTracker({
    storage,
    url: "https://example.test/?utm_source=meta&utm_medium=paid&utm_campaign=solar",
    referrer: "https://search.example/results?q=phone",
    providers,
    randomId: () => ids[index++]!,
    now: () => new Date("2026-08-14T20:00:00.000Z"),
  });
}

describe("atribuição first-touch", () => {
  test("captura UTMs aprovadas", () => {
    const result = readAttribution("https://site.test/lp?utm_source=meta&utm_medium=cpc&utm_campaign=x&utm_content=a&utm_term=b", "");
    assert.deepEqual(result, {
      utmSource: "meta", utmMedium: "cpc", utmCampaign: "x", utmContent: "a", utmTerm: "b",
      referrer: null,
      landingPage: "https://site.test/lp?utm_source=meta&utm_medium=cpc&utm_campaign=x&utm_content=a&utm_term=b",
    });
  });

  test("preserva o primeiro toque durante a jornada", () => {
    const storage = new MemoryStorage();
    const first = getFirstTouchAttribution(storage, "https://site.test/?utm_source=first", "https://first.test/x");
    const second = getFirstTouchAttribution(storage, "https://site.test/?utm_source=second", "https://second.test/x");
    assert.equal(first.utmSource, "first");
    assert.deepEqual(second, first);
    assert.ok(storage.getItem(ATTRIBUTION_STORAGE_KEY));
  });

  test("remove parâmetros desconhecidos, fragmento e query do referrer", () => {
    const result = readAttribution(
      "https://site.test/path?email=person%40example.com&utm_source=safe#secret",
      "https://ref.test/path?phone=5511999999999#secret",
    );
    assert.equal(result.landingPage, "https://site.test/path?utm_source=safe");
    assert.equal(result.referrer, "https://ref.test/path");
    assert.doesNotMatch(JSON.stringify(result), /person|5511999999999|secret/);
  });

  test("limita valores de UTM", () => {
    const result = readAttribution(`https://site.test/?utm_source=${"a".repeat(500)}`, "");
    assert.equal(result.utmSource?.length, 200);
  });

  test("converte atribuição para o contrato já persistido pelo lead", () => {
    const result = readAttribution("https://site.test/?utm_campaign=campaign", "");
    assert.deepEqual(toLeadAttribution(result), result);
  });
});

describe("jornada e contrato de eventos", () => {
  test("mantém um session_id aleatório na mesma sessão", () => {
    const storage = new MemoryStorage();
    const first = getJourneyId(storage, () => ids[0]);
    const second = getJourneyId(storage, () => ids[1]);
    assert.equal(first, ids[0]);
    assert.equal(second, first);
    assert.equal(storage.getItem(SESSION_STORAGE_KEY), first);
  });

  test("uma nova sessão recebe outro identificador", () => {
    assert.notEqual(
      getJourneyId(new MemoryStorage(), () => ids[0]),
      getJourneyId(new MemoryStorage(), () => ids[1]),
    );
  });

  test("cada evento tem event_id opaco e distinto do session_id", () => {
    const client = tracker();
    const first = client.track("page_view");
    const second = client.track("qualification_started");
    assert.notEqual(first.eventId, second.eventId);
    assert.notEqual(first.eventId, first.sessionId);
    assert.match(first.eventId, /^[0-9a-f-]{36}$/);
  });

  test("inclui timestamp ISO, atribuição e contexto mínimo", () => {
    const event = tracker().track("qualification_step_completed", { step: "state", stepNumber: 2 });
    assert.equal(event.occurredAt, "2026-08-14T20:00:00.000Z");
    assert.equal(event.attribution.utmSource, "meta");
    assert.deepEqual(event.context, { step: "state", stepNumber: 2 });
  });

  test("o funil público contém somente os oito eventos aprovados", () => {
    assert.deepEqual(PUBLIC_FUNNEL_EVENTS, [
      "page_view", "qualification_started", "qualification_step_completed", "qualification_completed",
      "lead_started", "lead_submitted", "bill_upload_started", "bill_uploaded",
    ]);
  });

  test("emite qualification_started", () => {
    assert.equal(tracker().track("qualification_started").eventName, "qualification_started");
  });

  test("emite qualification_step_completed com etapa não pessoal", () => {
    const event = tracker().track("qualification_step_completed", { step: "billRange", stepNumber: 4 });
    assert.deepEqual(event.context, { step: "billRange", stepNumber: 4 });
  });

  test("emite qualification_completed sem declarar conversão", () => {
    const event = tracker().track("qualification_completed", { requiresReview: true });
    assert.deepEqual(event.context, { requiresReview: true });
    assert.equal("converted" in event.context, false);
  });

  test("emite lead_started separadamente de lead_submitted", () => {
    assert.equal(tracker().track("lead_started").eventName, "lead_started");
  });

  test("lead_submitted só é emitido para resultado bem-sucedido", () => {
    const client = tracker();
    assert.equal(trackLeadSubmissionOutcome(false, client), null);
    assert.equal(trackLeadSubmissionOutcome(true, client)?.eventName, "lead_submitted");
  });

  test("emite bill_upload_started sem nome do arquivo", () => {
    const event = tracker().track("bill_upload_started", { fileType: "application/pdf" });
    assert.deepEqual(event.context, { fileType: "application/pdf" });
  });

  test("bill_uploaded só é emitido para upload bem-sucedido", () => {
    const client = tracker();
    assert.equal(trackBillUploadOutcome(false, false, client), null);
    assert.deepEqual(trackBillUploadOutcome(true, false, client)?.context, { duplicate: false });
  });
});

describe("providers, privacidade e operação", () => {
  test("tracking e consentimento públicos nunca abrangem rotas administrativas", async () => {
    assert.equal(isPublicExperiencePath("/"), true);
    assert.equal(isPublicExperiencePath("/privacidade"), true);
    assert.equal(isPublicExperiencePath("/admin"), false);
    assert.equal(isPublicExperiencePath("/admin/login"), false);
    assert.equal(isPublicExperiencePath("/admin/leads/00000000-0000-4000-8000-000000000000"), false);
    const sources = await Promise.all([
      readFile("src/features/tracking/tracking-bootstrap.tsx", "utf8"),
      readFile("src/features/privacy/consent-preferences.tsx", "utf8"),
    ]);
    assert.ok(sources.every((source) => source.includes("isPublicExperiencePath")));
  });

  test("Meta e GA não inicializam quando desabilitados", () => {
    const transport = () => assert.fail("transport não deve ser chamado");
    const config = { enabled: false, id: null, environment: "test" as const, consentGranted: true };
    assert.equal(createMetaPixelProvider(config, transport), null);
    assert.equal(createGa4Provider(config, transport), null);
  });

  test("providers não inicializam sem consentimento analytics/ad", () => {
    const config = { enabled: true, id: "configured-at-runtime", environment: "test" as const, consentGranted: false };
    assert.equal(createMetaPixelProvider(config, () => undefined), null);
    assert.equal(createGa4Provider(config, () => undefined), null);
  });

  test("Production força providers desligados e remove IDs", () => {
    const config = parseAnalyticsConfig({
      ANALYTICS_ENVIRONMENT: "production",
      META_PIXEL_ENABLED: "true", META_PIXEL_ID: "runtime-meta",
      GA_ENABLED: "true", GA_MEASUREMENT_ID: "runtime-ga",
    });
    assert.deepEqual(config.meta, { enabled: false, id: null, environment: "production" });
    assert.deepEqual(config.ga, { enabled: false, id: null, environment: "production" });
  });

  test("o mesmo event_id é entregue aos providers para deduplicação futura", () => {
    const received: TrackingEvent[] = [];
    const providers: TrackingProvider[] = [
      { name: "meta", track: (event) => received.push(event) },
      { name: "ga", track: (event) => received.push(event) },
    ];
    const event = tracker(providers).track("lead_submitted");
    assert.equal(received.length, 2);
    assert.equal(received[0]?.eventId, event.eventId);
    assert.equal(received[1]?.eventId, event.eventId);
  });

  test("mapeamentos externos não contêm Purchase nem semântica financeira", () => {
    assert.deepEqual(META_EVENT_MAP, { page_view: "PageView", lead_submitted: "CompleteRegistration" });
    assert.deepEqual(GA4_EVENT_MAP, {
      qualification_started: "qualification_started",
      qualification_completed: "qualification_completed",
      lead_submitted: "lead_submitted",
      bill_uploaded: "bill_uploaded",
    });
    assert.doesNotMatch(JSON.stringify({ META_EVENT_MAP, GA4_EVENT_MAP }), /purchase|revenue|value/i);
  });

  test("payload de analytics não contém nome, telefone, arquivo ou lead id", () => {
    const serialized = JSON.stringify(tracker().track("bill_uploaded", { duplicate: false }));
    assert.doesNotMatch(serialized, /"(?:name|phone|whatsapp|fileName|leadId)"|person|5511999999999/i);
  });

  test("IDs externos não estão hardcoded e defaults permanecem off", async () => {
    const [example, providerSource] = await Promise.all([
      readFile(".env.example", "utf8"),
      readFile("src/features/tracking/providers.ts", "utf8"),
    ]);
    assert.match(example, /META_PIXEL_ENABLED=false/);
    assert.match(example, /META_PIXEL_ID=\r?\n/);
    assert.match(example, /GA_ENABLED=false/);
    assert.match(example, /GA_MEASUREMENT_ID=\r?\n/);
    assert.doesNotMatch(providerSource, /\b\d{10,}\b|G-[A-Z0-9]{6,}/);
  });

  test("admin mantém todos os campos de origem visíveis", async () => {
    const source = await readFile("src/app/admin/(operations)/leads/[id]/page.tsx", "utf8");
    for (const field of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer", "landing_page"]) {
      assert.match(source, new RegExp(field));
    }
  });

  test("logs de lead e upload não incluem PII nem metadado do arquivo", async () => {
    const source = await readFile("src/features/leads/services/lead-route-handler.ts", "utf8")
      + await readFile("src/features/documents/services/bill-upload-route-handler.ts", "utf8");
    const logBodies = [...source.matchAll(/console\.(?:info|error)\([^;]+/g)].map((match) => match[0]).join("\n");
    assert.doesNotMatch(logBodies, /input\.name|input\.phone|candidate\.name|file\.name|storagePath/);
  });
});
