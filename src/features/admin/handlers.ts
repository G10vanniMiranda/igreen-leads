import {
  ADMIN_COOKIE_NAME, ADMIN_SESSION_SECONDS, createAdminSession, isSameOriginMutation,
  readSessionCookie, verifyAdminPassword, verifyAdminSession,
} from "./auth";
import type { AdminRepository } from "./repository";
import { createSignedBillUrl } from "./signed-bill";
import { createSearchToken } from "./search-token";
import { buildCommercialIGreenUrl, buildWhatsAppUrl, type HandoffEventType } from "./handoff";
import { isLeadId, isLeadStatus, validateInternalNotes } from "./validation";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  adminLoginRateLimiter,
  rateLimitResponse,
  type RateLimiter,
} from "../security/rate-limit";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };

function redirect(_request: Request, path: string, headers: HeadersInit = {}) {
  return new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: path, ...headers } });
}

function authorized(request: Request) {
  return verifyAdminSession(readSessionCookie(request));
}

function rejected(status: 400 | 401 | 403 | 500) {
  return Response.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : status === 400 ? "Invalid request" : "Internal error" }, { status, headers: PRIVATE_HEADERS });
}

export async function loginHandler(request: Request, limiter: RateLimiter = adminLoginRateLimiter) {
  if (!isSameOriginMutation(request)) return rejected(403);
  const limited = rateLimitResponse(request, "admin-login", ADMIN_LOGIN_RATE_LIMIT, limiter);
  if (limited) return limited;
  try {
    const form = await request.formData();
    if (!verifyAdminPassword(form.get("password"))) return redirect(request, "/admin/login?error=invalid");
    const token = createAdminSession();
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    const cookie = `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=${ADMIN_SESSION_SECONDS}${secure}`;
    return redirect(request, "/admin", { "Set-Cookie": cookie });
  } catch {
    return rejected(500);
  }
}

export function logoutHandler(request: Request) {
  if (!authorized(request)) return rejected(401);
  if (!isSameOriginMutation(request)) return rejected(403);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return redirect(request, "/admin/login", {
    "Set-Cookie": `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Priority=High; Max-Age=0${secure}`,
  });
}

export async function searchHandler(request: Request) {
  if (!authorized(request)) return rejected(401);
  if (!isSameOriginMutation(request)) return rejected(403);
  try {
    const search = String((await request.formData()).get("search") ?? "").trim();
    if (!search || search.length > 100) return rejected(400);
    return redirect(request, `/admin?searchToken=${encodeURIComponent(createSearchToken(search))}`);
  } catch { return rejected(500); }
}

export async function statusHandler(request: Request, leadId: string, repository: AdminRepository) {
  if (!authorized(request)) return rejected(401);
  if (!isSameOriginMutation(request)) return rejected(403);
  try {
    const form = await request.formData();
    const status = form.get("status");
    if (!isLeadId(leadId) || !isLeadStatus(status)) return rejected(400);
    await repository.updateStatus(leadId, status);
    return redirect(request, `/admin/leads/${leadId}?saved=status`);
  } catch {
    return rejected(500);
  }
}

export async function notesHandler(request: Request, leadId: string, repository: AdminRepository) {
  if (!authorized(request)) return rejected(401);
  if (!isSameOriginMutation(request)) return rejected(403);
  try {
    const form = await request.formData();
    if (!isLeadId(leadId)) return rejected(400);
    const notes = validateInternalNotes(form.get("internalNotes"));
    await repository.updateNotes(leadId, notes);
    return redirect(request, `/admin/leads/${leadId}?saved=notes`);
  } catch (error) {
    return error instanceof Error && error.message === "INVALID_NOTES" ? rejected(400) : rejected(500);
  }
}

export async function billHandler(request: Request, leadId: string, repository: AdminRepository) {
  if (!authorized(request)) return rejected(401);
  if (!isLeadId(leadId)) return rejected(400);
  try {
    const document = await repository.billDocument(leadId);
    const signedUrl = await createSignedBillUrl(document.storage_bucket, document.storage_path);
    return new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: signedUrl } });
  } catch {
    return rejected(500);
  }
}

type HandoffAction = "whatsapp" | "igreen";

export async function handoffHandler(
  request: Request,
  leadId: string,
  action: HandoffAction,
  repository: AdminRepository,
) {
  if (!authorized(request)) return rejected(401);
  if (!isSameOriginMutation(request)) return rejected(403);
  try {
    const actionId = (await request.formData()).get("actionId");
    if (!isLeadId(leadId) || !isLeadId(actionId)) return rejected(400);

    let destination: URL;
    let eventType: HandoffEventType;
    if (action === "whatsapp") {
      const detail = await repository.detail(leadId);
      destination = buildWhatsAppUrl(detail.lead.name, detail.lead.phone);
      eventType = "whatsapp_opened";
    } else {
      destination = buildCommercialIGreenUrl();
      eventType = "igreen_handoff_opened";
    }

    await repository.recordHandoffEvent(leadId, eventType, actionId);
    return new Response(null, {
      status: 303,
      headers: { ...PRIVATE_HEADERS, Location: destination.toString(), "Referrer-Policy": "no-referrer" },
    });
  } catch {
    return rejected(500);
  }
}

export function isAdminRequest(request: Request) {
  return authorized(request);
}
