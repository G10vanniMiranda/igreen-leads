import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ADMIN_COOKIE_NAME, createAdminSession } from "./auth";
import { buildCommercialIGreenUrl, buildWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsAppPhone } from "./handoff";
import { HandoffActionForm } from "./handoff-action-form";
import { handoffHandler, statusHandler } from "./handlers";
import type { AdminRepository } from "./repository";
import { eventDescription, eventLabel } from "./timeline";
import type { DashboardMetrics, LeadDetail, LeadListItem, LeadStatus } from "./types";

process.env.ADMIN_PASSWORD = randomBytes(24).toString("base64url");
process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("base64url");
process.env.IGREEN_BASE_URL = "https://green.example.test/continuar";
process.env.IGREEN_REFERRAL_ID = "referral-configurado";
process.env.IGREEN_SEND_CONTRACT = "true";

const leadId = "22222222-2222-4222-8222-222222222222";
const actionId = "33333333-3333-4333-8333-333333333333";
const origin = "http://localhost:3000";
const sessionCookie = `${ADMIN_COOKIE_NAME}=${createAdminSession()}`;

class HandoffRepository implements AdminRepository {
  eventCalls: Array<[string, string, string]> = [];
  statusCalls: Array<[string, LeadStatus]> = [];
  fail = false;
  dashboard(): Promise<DashboardMetrics> { throw new Error("unused"); }
  list(): Promise<LeadListItem[]> { throw new Error("unused"); }
  async detail(): Promise<LeadDetail> {
    return {
      lead: { id: leadId, name: "Ana Técnica Completa", phone: "+55 (92) 99999-0000", status: "QUALIFIED", internal_notes: null },
      document: null,
      events: [],
    };
  }
  billDocument(): Promise<{ storage_bucket: string; storage_path: string }> { throw new Error("unused"); }
  async updateStatus(id: string, status: LeadStatus) {
    this.statusCalls.push([id, status]);
    return { previous_status: "QUALIFIED", current_status: status, changed: true };
  }
  updateNotes(): Promise<void> { throw new Error("unused"); }
  async recordHandoffEvent(id: string, eventType: "whatsapp_opened" | "igreen_handoff_opened", idempotencyId: string) {
    if (this.fail) throw new Error("SUPABASE_SERVICE_ROLE_KEY phone +5592999990000");
    this.eventCalls.push([id, eventType, idempotencyId]);
    return true;
  }
}

function actionRequest(path: string, authenticated = true, requestOrigin = origin) {
  const body = new FormData();
  body.set("actionId", actionId);
  return new Request(`${origin}${path}`, {
    method: "POST",
    body,
    headers: { Origin: requestOrigin, ...(authenticated ? { Cookie: sessionCookie } : {}) },
  });
}

test("formulário de handoff preserva Origin e isolamento da nova aba", () => {
  const markup = renderToStaticMarkup(
    createElement(HandoffActionForm, {
      action: "/api/admin/leads/lead-id/whatsapp",
      actionId,
      label: "Chamar no WhatsApp",
      pendingLabel: "Abrindo WhatsApp",
    }),
  );
  assert.match(markup, /target="_blank"/);
  assert.match(markup, /rel="noopener"/);
  assert.doesNotMatch(markup, /noreferrer/);
});

test("1. admin não autenticado não acessa ações de handoff", async () => {
  const repository = new HandoffRepository();
  const response = await handoffHandler(actionRequest("/api/whatsapp", false), leadId, "whatsapp", repository);
  assert.equal(response.status, 401);
  assert.equal(repository.eventCalls.length, 0);
});

test("2. WhatsApp usa telefone normalizado obtido no servidor", () => {
  assert.equal(normalizeWhatsAppPhone("+55 (92) 99999-0000"), "5592999990000");
  assert.equal(buildWhatsAppUrl("Ana Completa", "+55 (92) 99999-0000").pathname, "/5592999990000");
});

test("3. mensagem usa só primeiro nome e não contém dados sensíveis", () => {
  const message = buildWhatsAppMessage("Ana Completa");
  assert.match(message, /^Olá, Ana!/);
  assert.doesNotMatch(message, /Completa|distribuidora|benefício social|titularidade|R\$|fatura anexada/i);
});

test("4. ação WhatsApp registra whatsapp_opened", async () => {
  const repository = new HandoffRepository();
  const response = await handoffHandler(actionRequest("/api/whatsapp"), leadId, "whatsapp", repository);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.deepEqual(repository.eventCalls, [[leadId, "whatsapp_opened", actionId]]);
});

test("5. clique WhatsApp não muda status", async () => {
  const repository = new HandoffRepository();
  await handoffHandler(actionRequest("/api/whatsapp"), leadId, "whatsapp", repository);
  assert.deepEqual(repository.statusCalls, []);
});

test("6. URL iGreen usa exclusivamente a configuração tipada", () => {
  const url = buildCommercialIGreenUrl();
  assert.equal(url.origin + url.pathname, "https://green.example.test/continuar");
});

test("7. URL iGreen contém referral ID configurado", () => {
  assert.equal(buildCommercialIGreenUrl().searchParams.get("id"), "referral-configurado");
});

test("8. URL iGreen contém sendcontract configurado", () => {
  assert.equal(buildCommercialIGreenUrl().searchParams.get("sendcontract"), "true");
});

test("9. URL iGreen contém somente id e sendcontract, sem PII", () => {
  const url = buildCommercialIGreenUrl();
  assert.deepEqual([...url.searchParams.keys()].sort(), ["id", "sendcontract"]);
  assert.doesNotMatch(url.toString(), /Ana|5592|QUALIFIED|22222222|submission/i);
});

test("10. ação iGreen registra igreen_handoff_opened", async () => {
  const repository = new HandoffRepository();
  const response = await handoffHandler(actionRequest("/api/igreen"), leadId, "igreen", repository);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.deepEqual(repository.eventCalls, [[leadId, "igreen_handoff_opened", actionId]]);
});

test("11. handoff iGreen não muda status", async () => {
  const repository = new HandoffRepository();
  await handoffHandler(actionRequest("/api/igreen"), leadId, "igreen", repository);
  assert.deepEqual(repository.statusCalls, []);
});

async function assertManualStatus(status: LeadStatus) {
  const repository = new HandoffRepository();
  const body = new FormData(); body.set("status", status);
  const request = new Request(`${origin}/api/status`, { method: "POST", body, headers: { Origin: origin, Cookie: sessionCookie } });
  await statusHandler(request, leadId, repository);
  assert.deepEqual(repository.statusCalls, [[leadId, status]]);
}

test("12. SENT_TO_IGREEN continua sendo alteração explícita", () => assertManualStatus("SENT_TO_IGREEN"));
test("13. CONTRACT_SENT continua manual", () => assertManualStatus("CONTRACT_SENT"));
test("14. CONTRACTED continua manual", () => assertManualStatus("CONTRACTED"));
test("15. ACTIVATED continua manual", () => assertManualStatus("ACTIVATED"));

test("16. timeline traduz eventos e descreve mudança de status", () => {
  assert.equal(eventLabel("lead_created"), "Lead criado");
  assert.equal(eventLabel("bill_uploaded"), "Fatura recebida");
  assert.equal(eventLabel("whatsapp_opened"), "WhatsApp aberto");
  assert.equal(eventLabel("igreen_handoff_opened"), "Fluxo iGreen aberto");
  assert.equal(eventDescription({ event_type: "status_changed", metadata: { from: "QUALIFIED", to: "SENT_TO_IGREEN" } }), "Status alterado de Qualificado para Enviado para iGreen");
});

test("17. erro interno não vaza PII nem secrets", async () => {
  const repository = new HandoffRepository(); repository.fail = true;
  const response = await handoffHandler(actionRequest("/api/whatsapp"), leadId, "whatsapp", repository);
  const body = await response.text();
  assert.equal(response.status, 500);
  assert.doesNotMatch(body, /SUPABASE|SERVICE_ROLE|5592999990000|Ana/i);
});

test("18. ação exige autenticação e origem válida", async () => {
  for (const requestOrigin of [undefined, "null", "https://evil.example"] as const) {
    const repository = new HandoffRepository();
    const body = new FormData(); body.set("actionId", actionId);
    const headers = new Headers({ Cookie: sessionCookie });
    if (requestOrigin !== undefined) headers.set("Origin", requestOrigin);
    const request = new Request(`${origin}/api/whatsapp`, { method: "POST", body, headers });
    const response = await handoffHandler(request, leadId, "whatsapp", repository);
    assert.equal(response.status, 403);
    assert.equal(repository.eventCalls.length, 0);
  }
});

test("19. migration tolera retry por action_id sem impedir novas ações", () => {
  const sql = readFileSync(new URL("../../../supabase/migrations/20260814165633_add_commercial_handoff_events.sql", import.meta.url), "utf8");
  assert.match(sql, /lead_events_handoff_action_id_idx/);
  assert.match(sql, /metadata ->> 'action_id'/);
  assert.match(sql, /on conflict do nothing/);
  assert.match(sql, /'whatsapp_opened', 'igreen_handoff_opened'/);
  assert.doesNotMatch(sql, /update private\.leads set status/i);
});
