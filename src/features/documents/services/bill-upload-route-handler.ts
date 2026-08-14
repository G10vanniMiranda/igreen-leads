import { DocumentRepositoryError, SupabaseDocumentRepository, type DocumentRepository } from "../repository/supabase-document-repository";
import { BillValidationError, parseBillFile, parseSubmissionId } from "../schemas/bill-upload";
import { SupabaseDocumentStorage, type DocumentStorage } from "../storage/supabase-document-storage";
import { MAX_BILL_BYTES, type BillUploadResponse } from "../types/document";
import { uploadBill } from "./bill-upload";
import { isSameOriginRequest } from "../../security/request-security";
import { UPLOAD_RATE_LIMIT, publicRateLimiter, rateLimitResponse, type RateLimiter } from "../../security/rate-limit";

const MAX_MULTIPART_BYTES = MAX_BILL_BYTES + 64 * 1024;

export async function handleBillUploadPost(
  request: Request,
  repository: DocumentRepository = new SupabaseDocumentRepository(),
  storage: DocumentStorage = new SupabaseDocumentStorage(),
  limiter: RateLimiter = publicRateLimiter,
): Promise<Response> {
  if (!isSameOriginRequest(request)) return invalidResponse(403, "Origem inválida.", "INVALID_ORIGIN");
  const limited = rateLimitResponse(request, "bill-upload", UPLOAD_RATE_LIMIT, limiter);
  if (limited) return limited;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES) {
    return invalidResponse(413, "O arquivo deve ter no máximo 10 MB.");
  }

  try {
    const form = await request.formData();
    const allowedFields = new Set(["submissionId", "file"]);
    if ([...form.keys()].some((key) => !allowedFields.has(key)) || form.getAll("file").length !== 1) {
      throw new BillValidationError("file");
    }
    const submissionId = parseSubmissionId(form.get("submissionId"));
    const candidate = form.get("file");
    if (!(candidate instanceof File)) throw new BillValidationError("file");
    const bill = await parseBillFile(candidate);
    const result = await uploadBill(submissionId, bill, repository, storage);

    console.info("bill_upload_success", {
      timestamp: new Date().toISOString(),
      duplicate: result.duplicate,
    });
    const body: BillUploadResponse = { ok: true, documentId: result.documentId, duplicate: result.duplicate };
    return Response.json(body, { status: result.duplicate ? 200 : 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BillValidationError || error instanceof TypeError) {
      const tooLarge = error instanceof BillValidationError && error.reason === "size";
      return invalidResponse(tooLarge ? 413 : 400, tooLarge
        ? "O arquivo deve ter no máximo 10 MB."
        : "Envie uma fatura em PDF, JPG ou PNG.");
    }
    if (error instanceof DocumentRepositoryError && error.errorClass === "not_found") {
      const body: BillUploadResponse = { ok: false, code: "LEAD_NOT_FOUND", message: "Não foi possível localizar sua solicitação." };
      return Response.json(body, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    const errorClass = error instanceof DocumentRepositoryError ? error.errorClass : "upstream";
    console.error("bill_upload_failure", { timestamp: new Date().toISOString(), error_class: errorClass });
    const body: BillUploadResponse = { ok: false, code: "UPLOAD_FAILED", message: "Não foi possível enviar sua fatura agora. Tente novamente." };
    return Response.json(body, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}

function invalidResponse(status: number, message: string, code: "INVALID_INPUT" | "INVALID_ORIGIN" = "INVALID_INPUT"): Response {
  const body = { ok: false as const, code, message };
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
