import {
  BILL_MIME_TYPES,
  MAX_BILL_BYTES,
  type BillExtension,
  type BillMimeType,
  type ValidatedBill,
} from "../types/document";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTENSIONS_BY_MIME: Readonly<Record<BillMimeType, readonly string[]>> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
};

export class BillValidationError extends Error {
  constructor(public readonly reason: "submission" | "file" | "size" | "type" | "content") {
    super("Invalid electricity bill upload");
    this.name = "BillValidationError";
  }
}

export function parseSubmissionId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new BillValidationError("submission");
  }
  return value.toLowerCase();
}

export function validateBillSelection(file: Pick<File, "name" | "type" | "size">): void {
  validateMetadata(file);
}

export async function parseBillFile(file: File): Promise<ValidatedBill> {
  const { originalFilename, mimeType, extension } = validateMetadata(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedSignature(bytes, mimeType)) {
    throw new BillValidationError("content");
  }
  return { originalFilename, mimeType, extension, sizeBytes: file.size, bytes };
}

function validateMetadata(file: Pick<File, "name" | "type" | "size">): {
  originalFilename: string;
  mimeType: BillMimeType;
  extension: BillExtension;
} {
  const filename = file.name.trim();
  if (!filename || filename.length > 180 || filename !== filename.split(/[\\/]/).at(-1) || /[\u0000-\u001f\u007f]/.test(filename)) {
    throw new BillValidationError("file");
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1) throw new BillValidationError("file");
  if (file.size > MAX_BILL_BYTES) throw new BillValidationError("size");
  if (!BILL_MIME_TYPES.includes(file.type as BillMimeType)) throw new BillValidationError("type");

  const mimeType = file.type as BillMimeType;
  const suppliedExtension = filename.includes(".") ? filename.split(".").at(-1)?.toLowerCase() ?? "" : "";
  if (!EXTENSIONS_BY_MIME[mimeType].includes(suppliedExtension)) throw new BillValidationError("type");
  const extension: BillExtension = mimeType === "image/jpeg" ? "jpg" : suppliedExtension as BillExtension;
  return { originalFilename: filename, mimeType, extension };
}

function hasExpectedSignature(bytes: Uint8Array, mimeType: BillMimeType): boolean {
  if (mimeType === "application/pdf") {
    return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
}
