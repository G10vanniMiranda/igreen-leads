import type { BillRegistration, BillUploadTarget, ValidatedBill } from "../types/document";
import { buildSupabaseServerHeaders } from "../../supabase/server-headers";

type RpcTarget = Readonly<{ lead_id: string; existing_document_id: string | null }>;
type RpcRegistration = Readonly<{ document_id: string; created: boolean }>;

export class DocumentRepositoryError extends Error {
  constructor(public readonly errorClass: "configuration" | "upstream" | "not_found") {
    super("Document repository operation failed");
    this.name = "DocumentRepositoryError";
  }
}

export interface DocumentRepository {
  findTarget(submissionId: string): Promise<BillUploadTarget>;
  register(input: Readonly<{
    submissionId: string;
    documentId: string;
    storageBucket: string;
    storagePath: string;
    bill: ValidatedBill;
  }>): Promise<BillRegistration>;
}

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(
    private readonly url: string | undefined = process.env.SUPABASE_URL,
    private readonly serviceRoleKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) {}

  async findTarget(submissionId: string): Promise<BillUploadTarget> {
    const rows = await this.rpc<RpcTarget>("get_bill_upload_target", { p_submission_id: submissionId });
    if (rows.length === 0) throw new DocumentRepositoryError("not_found");
    if (rows.length !== 1 || typeof rows[0].lead_id !== "string") throw new DocumentRepositoryError("upstream");
    return { leadId: rows[0].lead_id, existingDocumentId: rows[0].existing_document_id };
  }

  async register(input: Readonly<{
    submissionId: string;
    documentId: string;
    storageBucket: string;
    storagePath: string;
    bill: ValidatedBill;
  }>): Promise<BillRegistration> {
    const rows = await this.rpc<RpcRegistration>("register_bill_upload", {
      p_submission_id: input.submissionId,
      p_document_id: input.documentId,
      p_storage_bucket: input.storageBucket,
      p_storage_path: input.storagePath,
      p_original_filename: input.bill.originalFilename,
      p_mime_type: input.bill.mimeType,
      p_size_bytes: input.bill.sizeBytes,
    });
    if (rows.length !== 1 || typeof rows[0].document_id !== "string" || typeof rows[0].created !== "boolean") {
      throw new DocumentRepositoryError("upstream");
    }
    return { documentId: rows[0].document_id, created: rows[0].created };
  }

  private async rpc<T>(name: string, body: Record<string, unknown>): Promise<T[]> {
    if (!this.url || !this.serviceRoleKey) throw new DocumentRepositoryError("configuration");
    const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...buildSupabaseServerHeaders(this.serviceRoleKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new DocumentRepositoryError("upstream");
    const value = await response.json() as unknown;
    if (!Array.isArray(value)) throw new DocumentRepositoryError("upstream");
    return value as T[];
  }
}
