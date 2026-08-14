import { LeadPersistenceError, SupabaseLeadRepository } from "../repository/supabase-lead-repository";
import { LeadValidationError, parseLeadSubmission } from "../schemas/lead-submission";
import type { LeadRepository } from "./lead-submission";
import { submitLead } from "./lead-submission";

const MAX_REQUEST_BYTES = 16_384;

export async function handleLeadPost(
  request: Request,
  repository: LeadRepository = new SupabaseLeadRepository(),
  igreenReferralId: string | null = process.env.IGREEN_REFERRAL_ID?.trim() || null,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return Response.json({ ok: false, code: "INVALID_INPUT", message: "Dados inválidos." }, { status: 413 });
  }

  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return Response.json({ ok: false, code: "INVALID_INPUT", message: "Dados inválidos." }, { status: 413 });
    }
    const input = parseLeadSubmission(JSON.parse(rawBody) as unknown);
    const result = await submitLead(input, repository, igreenReferralId);

    console.info("lead_submission_success", {
      submission_id: input.submissionId,
      timestamp: new Date().toISOString(),
      created: result.created,
    });

    return Response.json({ ok: true, leadId: result.leadId }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof LeadValidationError || error instanceof SyntaxError) {
      const fieldErrors = error instanceof LeadValidationError ? error.fieldErrors : undefined;
      return Response.json({ ok: false, code: "INVALID_INPUT", message: "Revise os dados informados.", fieldErrors }, { status: 400 });
    }

    const errorClass = error instanceof LeadPersistenceError ? error.errorClass : "unexpected";
    console.error("lead_submission_failure", { timestamp: new Date().toISOString(), error_class: errorClass });
    return Response.json({ ok: false, code: "PERSISTENCE_FAILED", message: "Não foi possível enviar agora. Tente novamente." }, { status: 503 });
  }
}
