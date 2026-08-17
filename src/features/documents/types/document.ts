export const BILL_BUCKET = "lead-documents" as const;
export const MAX_BILL_BYTES = 4 * 1024 * 1024;
const MAX_BILL_MEBIBYTES = MAX_BILL_BYTES / (1024 * 1024);
export const BILL_UPLOAD_HELP_TEXT = `PDF, JPG ou PNG · Tamanho máximo: ${MAX_BILL_MEBIBYTES} MB`;
export const BILL_UPLOAD_SIZE_ERROR_MESSAGE = `O arquivo deve ter no máximo ${MAX_BILL_MEBIBYTES} MB.`;

export const BILL_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type BillMimeType = (typeof BILL_MIME_TYPES)[number];
export type BillExtension = "pdf" | "jpg" | "png";

export type ValidatedBill = Readonly<{
  originalFilename: string;
  mimeType: BillMimeType;
  extension: BillExtension;
  sizeBytes: number;
  bytes: Uint8Array;
}>;

export type BillUploadTarget = Readonly<{
  leadId: string;
  existingDocumentId: string | null;
}>;

export type BillRegistration = Readonly<{
  documentId: string;
  created: boolean;
}>;

export type BillUploadResponse =
  | Readonly<{ ok: true; documentId: string; duplicate: boolean }>
  | Readonly<{
      ok: false;
      code: "INVALID_INPUT" | "LEAD_NOT_FOUND" | "UPLOAD_FAILED";
      message: string;
    }>;
