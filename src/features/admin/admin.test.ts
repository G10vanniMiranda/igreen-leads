import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ADMIN_COOKIE_NAME, createAdminSession, isSameOriginMutation } from "./auth";
import { billHandler, loginHandler, logoutHandler, notesHandler, searchHandler, statusHandler } from "./handlers";
import { SupabaseAdminRepository, type AdminRepository } from "./repository";
import { BILL_SIGNED_URL_TTL_SECONDS } from "./signed-bill";
import type { DashboardMetrics, LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "./types";

process.env.ADMIN_PASSWORD = randomBytes(24).toString("base64url");
process.env.ADMIN_SESSION_SECRET = randomBytes(48).toString("base64url");
const testServiceKey = ["testHeader", "testPayload", "testSignature"].join(".");

const leadId = "11111111-1111-4111-8111-111111111111";
const origin = "http://localhost:3000";
const sessionCookie = `${ADMIN_COOKIE_NAME}=${createAdminSession()}`;

class MockRepository implements AdminRepository {
  statusCalls: Array<[string, LeadStatus]> = [];
  notesCalls: Array<[string, string | null]> = [];
  handoffCalls: Array<[string, string, string]> = [];
  shouldFail = false;
  dashboard(): Promise<DashboardMetrics> { throw new Error("unused"); }
  list(): Promise<LeadListItem[]> { throw new Error("unused"); }
  detail(): Promise<LeadDetail> { throw new Error("unused"); }
  async billDocument() { return { storage_bucket: "lead-documents", storage_path: `${leadId}/bill.pdf` }; }
  async updateStatus(id: string, status: LeadStatus) {
    if (this.shouldFail) throw new Error("SUPABASE_SECRET SQL private.leads");
    this.statusCalls.push([id, status]);
    return { previous_status: "NEW", current_status: status, changed: true };
  }
  async updateNotes(id: string, notes: string | null) { this.notesCalls.push([id, notes]); }
  async recordHandoffEvent(id: string, eventType: "whatsapp_opened" | "igreen_handoff_opened", actionId: string) {
    this.handoffCalls.push([id, eventType, actionId]); return true;
  }
}

function formRequest(path: string, values: Record<string, string>, authenticated = true, requestOrigin = origin) {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) body.set(key, value);
  return new Request(`${origin}${path}`, {
    method: "POST", body,
    headers: { Origin: requestOrigin, ...(authenticated ? { Cookie: sessionCookie } : {}) },
  });
}

test("1. admin não autenticado é bloqueado sem executar mutação", async () => {
  const repository = new MockRepository();
  const response = await statusHandler(formRequest(`/api/admin/leads/${leadId}/status`, { status: "QUALIFIED" }, false), leadId, repository);
  assert.equal(response.status, 401); assert.equal(repository.statusCalls.length, 0);
});

test("2. admin autenticado recebe acesso à operação", async () => {
  const repository = new MockRepository();
  const response = await statusHandler(formRequest(`/api/admin/leads/${leadId}/status`, { status: "QUALIFIED" }), leadId, repository);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `/admin/leads/${leadId}?saved=status`);
  const external = new Request(`${origin}/api/status`, { method: "POST", headers: { Origin: "https://evil.example", Host: "127.0.0.1:3000" } });
  assert.equal(isSameOriginMutation(external), false);
  const login = await loginHandler(formRequest("/api/admin/session", { password: process.env.ADMIN_PASSWORD! }, false));
  assert.match(login.headers.get("set-cookie") ?? "", /Path=\/;/);
});

async function captureList(filters: LeadFilters) {
  let body: Record<string, unknown> | undefined;
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => { body = JSON.parse(String(init?.body)); return Response.json([]); }) as typeof fetch;
  try { await new SupabaseAdminRepository("https://test.supabase.co", testServiceKey).list(filters); }
  finally { globalThis.fetch = original; }
  return body!;
}

test("3. lista usa paginação server-side fixa de 20", async () => {
  const body = await captureList({ page: 3 }); assert.equal(body.p_page, 3); assert.equal(body.p_page_size, 20);
});
test("4. filtro por status é parametrizado", async () => {
  assert.equal((await captureList({ page: 1, status: "IN_REVIEW" })).p_status, "IN_REVIEW");
});
test("5. filtro requiresReview é parametrizado", async () => {
  assert.equal((await captureList({ page: 1, requiresReview: true })).p_requires_review, true);
});
test("6. filtro possui fatura é parametrizado", async () => {
  assert.equal((await captureList({ page: 1, hasBill: false })).p_has_bill, false);
});
test("7. busca por nome ocorre via parâmetro RPC", async () => {
  assert.equal((await captureList({ page: 1, search: "Nome Técnico" })).p_search, "Nome Técnico");
});
test("8. busca aceita telefone formatado para normalização no RPC", async () => {
  assert.equal((await captureList({ page: 1, search: "(92) 99999-0000" })).p_search, "(92) 99999-0000");
  assert.match(migrationSql(), /regexp_replace\(coalesce\(p_search[\s\S]*\[\^0-9\]/);
});

test("9. detalhe do lead é obtido por ID parametrizado", async () => {
  let body: Record<string, unknown> = {};
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => { body = JSON.parse(String(init?.body)); return Response.json({ lead: { id: leadId, name: "T", phone: "+5592999990000", status: "NEW", internal_notes: null }, document: null, events: [] }); }) as typeof fetch;
  try { const result = await new SupabaseAdminRepository("https://test.supabase.co", testServiceKey).detail(leadId); assert.equal(result.lead.id, leadId); assert.equal(body.p_lead_id, leadId); }
  finally { globalThis.fetch = original; }
});

test("10. fatura privada exige sessão e redireciona somente após assinatura server-side", async () => {
  const repository = new MockRepository();
  const unauthorized = await billHandler(new Request(`${origin}/api/admin/leads/${leadId}/bill`), leadId, repository);
  assert.equal(unauthorized.status, 401);
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ signedURL: `/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token` })) as typeof fetch;
  process.env.SUPABASE_URL = "https://test.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = testServiceKey;
  try {
    const response = await billHandler(new Request(`${origin}/api/admin/leads/${leadId}/bill`, { headers: { Cookie: sessionCookie } }), leadId, repository);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), `https://test.supabase.co/storage/v1/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  }
  finally { globalThis.fetch = original; }
});

async function signedBillResponse(signedURL: string, responseStatus = 200) {
  const repository = new MockRepository();
  const original = globalThis.fetch;
  globalThis.fetch = (async () => responseStatus === 200
    ? Response.json({ signedURL })
    : Response.json({ error: "Object not found", internal: "temporary-token" }, { status: responseStatus })) as typeof fetch;
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = testServiceKey;
  try {
    return await billHandler(new Request(`${origin}/api/admin/leads/${leadId}/bill`, { headers: { Cookie: sessionCookie } }), leadId, repository);
  } finally {
    globalThis.fetch = original;
  }
}

test("11. signed URL já canônica permanece sob a API privada de Storage", async () => {
  const response = await signedBillResponse(`/storage/v1/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `https://test.supabase.co/storage/v1/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
});

test("12. signed URL absoluta é aceita somente no origin Supabase autorizado", async () => {
  const accepted = await signedBillResponse(`https://test.supabase.co/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  const external = await signedBillResponse(`https://evil.example/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  assert.equal(accepted.headers.get("location"), `https://test.supabase.co/storage/v1/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  assert.equal(external.status, 500);
  assert.deepEqual(await external.json(), { error: "Internal error" });
});

test("13. protocolo inesperado e URL pública ou permanente são rejeitados", async () => {
  const insecure = await signedBillResponse(`http://test.supabase.co/object/sign/lead-documents/${leadId}/bill.pdf?token=temporary-token`);
  const publicUrl = await signedBillResponse(`/storage/v1/object/public/lead-documents/${leadId}/bill.pdf`);
  const authenticatedUrl = await signedBillResponse(`/storage/v1/object/authenticated/lead-documents/${leadId}/bill.pdf`);
  assert.deepEqual([insecure.status, publicUrl.status, authenticatedUrl.status], [500, 500, 500]);
});

test("14. objeto inexistente falha com erro genérico sem registrar token", async () => {
  const calls: unknown[][] = [];
  const originals = [console.log, console.info, console.warn, console.error];
  console.log = console.info = console.warn = console.error = (...args: unknown[]) => { calls.push(args); };
  try {
    const response = await signedBillResponse("", 404);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal error" });
    assert.deepEqual(calls, []);
  } finally {
    [console.log, console.info, console.warn, console.error] = originals;
  }
});

test("15. signed URL usa TTL curto aprovado", () => {
  assert.equal(BILL_SIGNED_URL_TTL_SECONDS, 120); assert.ok(BILL_SIGNED_URL_TTL_SECONDS >= 60 && BILL_SIGNED_URL_TTL_SECONDS <= 300);
});
test("12. atualização válida de status chega ao repository", async () => {
  const repository = new MockRepository(); await statusHandler(formRequest("/api/status", { status: "ACTIVATED" }), leadId, repository); assert.deepEqual(repository.statusCalls, [[leadId, "ACTIVATED"]]);
});
test("13. status inválido é rejeitado no servidor", async () => {
  const repository = new MockRepository(); const response = await statusHandler(formRequest("/api/status", { status: "HACKED" }), leadId, repository); assert.equal(response.status, 400); assert.equal(repository.statusCalls.length, 0);
});
test("14. migration cria status_changed apenas com metadata from/to", () => {
  const sql = migrationSql(); assert.match(sql, /'status_changed'/); assert.match(sql, /jsonb_build_object\('from', v_previous, 'to', v_current\)/);
});
test("15. update e evento estão na mesma função transacional", () => {
  const sql = migrationSql(); const start = sql.indexOf("create function public.admin_update_lead_status"); const end = sql.indexOf("create function public.admin_update_internal_notes"); const fn = sql.slice(start, end); assert.match(fn, /for update/); assert.match(fn, /update private\.leads/); assert.match(fn, /insert into private\.lead_events/);
});
test("16. internal_notes respeita limite de 2000 caracteres", async () => {
  const repository = new MockRepository(); const response = await notesHandler(formRequest("/api/notes", { internalNotes: "x".repeat(2001) }), leadId, repository); assert.equal(response.status, 400); assert.equal(repository.notesCalls.length, 0);
});
test("17. erro interno não vaza detalhes Supabase ou SQL", async () => {
  const repository = new MockRepository(); repository.shouldFail = true; const response = await statusHandler(formRequest("/api/status", { status: "QUALIFIED" }), leadId, repository); const body = await response.text(); assert.equal(response.status, 500); assert.doesNotMatch(body, /SUPABASE|SQL|private\.leads/i);
});
test("18. payload com PII não é escrito em logs", async () => {
  const calls: unknown[][] = []; const originals = [console.log, console.info, console.warn, console.error];
  console.log = console.info = console.warn = console.error = (...args: unknown[]) => { calls.push(args); };
  try { await notesHandler(formRequest("/api/notes", { internalNotes: "telefone +5592999990000" }), leadId, new MockRepository()); }
  finally { [console.log, console.info, console.warn, console.error] = originals; }
  assert.deepEqual(calls, []);
});

test("19. mutações administrativas legítimas continuam aceitando mesma origem", async () => {
  const repository = new MockRepository();
  const notes = await notesHandler(formRequest("/api/notes", { internalNotes: "Nota técnica" }), leadId, repository);
  const status = await statusHandler(formRequest("/api/status", { status: "QUALIFIED" }), leadId, repository);
  const search = await searchHandler(formRequest("/api/search", { search: "Lead técnico" }));
  const logout = logoutHandler(formRequest("/api/logout", {}));
  assert.deepEqual([notes.status, status.status, search.status, logout.status], [303, 303, 303, 303]);
});

test("20. mutações administrativas continuam rejeitando origem externa", async () => {
  const repository = new MockRepository();
  const evilOrigin = "https://evil.example";
  const notes = await notesHandler(formRequest("/api/notes", { internalNotes: "Nota técnica" }, true, evilOrigin), leadId, repository);
  const status = await statusHandler(formRequest("/api/status", { status: "QUALIFIED" }, true, evilOrigin), leadId, repository);
  const search = await searchHandler(formRequest("/api/search", { search: "Lead técnico" }, true, evilOrigin));
  const logout = logoutHandler(formRequest("/api/logout", {}, true, evilOrigin));
  assert.deepEqual([notes.status, status.status, search.status, logout.status], [403, 403, 403, 403]);
  assert.equal(repository.notesCalls.length, 0);
  assert.equal(repository.statusCalls.length, 0);
});

function migrationSql() {
  return readFileSync(new URL("../../../supabase/migrations/20260814035608_create_admin_operations.sql", import.meta.url), "utf8");
}
