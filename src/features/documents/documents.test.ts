import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { DocumentRepository } from "./repository/supabase-document-repository";
import { DocumentRepositoryError } from "./repository/supabase-document-repository";
import {
  BillValidationError,
  parseBillFile,
  parseSubmissionId,
  validateBillSelection,
} from "./schemas/bill-upload";
import { handleBillUploadPost } from "./services/bill-upload-route-handler";
import { uploadBill } from "./services/bill-upload";
import type { DocumentStorage } from "./storage/supabase-document-storage";
import { MAX_BILL_BYTES, type ValidatedBill } from "./types/document";
import {
  INITIAL_BILL_UPLOAD_STATE,
  billUploadUiReducer,
} from "./utils/bill-upload-state";

const submissionId = "4b9cb506-aeab-4b6b-8319-38a6012519d8";
const leadId = "812692bc-579f-46d4-9c78-2a074d74be4e";
const documentId = "cfe5d4a1-2676-46e8-abf4-78460b6010fc";
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

function file(name = "fatura.pdf", type = "application/pdf", bytes = pdfBytes): File {
  return new File([bytes], name, { type });
}

async function bill(): Promise<ValidatedBill> {
  return parseBillFile(file());
}

class MemoryStorage implements DocumentStorage {
  uploads: string[] = [];
  removals: string[] = [];
  failUpload = false;

  async upload(bucketName: string, objectPath: string): Promise<void> {
    if (this.failUpload) throw new Error("upload failed");
    this.uploads.push(`${bucketName}/${objectPath}`);
  }

  async remove(bucketName: string, objectPath: string): Promise<void> {
    this.removals.push(`${bucketName}/${objectPath}`);
  }
}

function repository(options: Readonly<{
  existing?: string | null;
  created?: boolean;
  failRegister?: boolean;
}> = {}): DocumentRepository & { registrations: number } {
  return {
    registrations: 0,
    async findTarget() {
      return { leadId, existingDocumentId: options.existing ?? null };
    },
    async register() {
      this.registrations += 1;
      if (options.failRegister) throw new DocumentRepositoryError("upstream");
      return { documentId, created: options.created ?? true };
    },
  };
}

describe("validação da fatura", () => {
  test("aceita submission ID UUID e normaliza caixa", () => {
    assert.equal(parseSubmissionId(submissionId.toUpperCase()), submissionId);
  });

  test("rejeita identificador arbitrário de lead", () => {
    assert.throws(() => parseSubmissionId(leadId.replaceAll("-", "")), BillValidationError);
  });

  test("aceita PDF coerente com assinatura real", async () => {
    const parsed = await parseBillFile(file());
    assert.equal(parsed.mimeType, "application/pdf");
    assert.equal(parsed.extension, "pdf");
  });

  test("rejeita MIME permitido com conteúdo falsificado", async () => {
    await assert.rejects(() => parseBillFile(file("fatura.pdf", "application/pdf", new Uint8Array([1, 2, 3]))),
      (error: unknown) => error instanceof BillValidationError && error.reason === "content");
  });

  test("rejeita combinação incoerente de extensão e MIME", async () => {
    await assert.rejects(() => parseBillFile(file("fatura.png", "application/pdf")), BillValidationError);
  });

  test("rejeita tipo não permitido", () => {
    assert.throws(() => validateBillSelection({ name: "fatura.txt", type: "text/plain", size: 20 }), BillValidationError);
  });

  test("rejeita filename com path traversal ou caracteres de controle", () => {
    assert.throws(() => validateBillSelection({ name: "../fatura.pdf", type: "application/pdf", size: 20 }), BillValidationError);
    assert.throws(() => validateBillSelection({ name: "fatura\u0000.pdf", type: "application/pdf", size: 20 }), BillValidationError);
  });

  test("rejeita arquivo vazio", () => {
    assert.throws(() => validateBillSelection({ name: "fatura.pdf", type: "application/pdf", size: 0 }), BillValidationError);
  });

  test("rejeita arquivo acima de 10 MB", () => {
    assert.throws(
      () => validateBillSelection({ name: "fatura.pdf", type: "application/pdf", size: MAX_BILL_BYTES + 1 }),
      (error: unknown) => error instanceof BillValidationError && error.reason === "size",
    );
  });

  test("aceita JPEG e normaliza extensão jpeg para jpg", async () => {
    const parsed = await parseBillFile(file("fatura.jpeg", "image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xd9])));
    assert.equal(parsed.extension, "jpg");
  });

  test("aceita assinatura PNG completa", async () => {
    const parsed = await parseBillFile(file("fatura.png", "image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])));
    assert.equal(parsed.extension, "png");
  });
});

describe("ciclo de vida seguro", () => {
  test("gera caminho opaco sem nome original ou PII", async () => {
    const repo = repository();
    const storage = new MemoryStorage();
    await uploadBill(submissionId, await bill(), repo, storage, () => documentId);
    assert.deepEqual(storage.uploads, [`lead-documents/${leadId}/${documentId}.pdf`]);
    assert.doesNotMatch(storage.uploads[0], /fatura/i);
  });

  test("retry com documento existente não cria novo objeto ou evento", async () => {
    const repo = repository({ existing: documentId });
    const storage = new MemoryStorage();
    const result = await uploadBill(submissionId, await bill(), repo, storage);
    assert.equal(result.duplicate, true);
    assert.equal(repo.registrations, 0);
    assert.equal(storage.uploads.length, 0);
  });

  test("corrida de duplicidade remove o objeto excedente", async () => {
    const repo = repository({ created: false });
    const storage = new MemoryStorage();
    const result = await uploadBill(submissionId, await bill(), repo, storage, () => documentId);
    assert.equal(result.duplicate, true);
    assert.equal(storage.removals.length, 1);
  });

  test("falha de metadados compensa o objeto no Storage", async () => {
    const repo = repository({ failRegister: true });
    const storage = new MemoryStorage();
    const parsedBill = await bill();
    await assert.rejects(() => uploadBill(submissionId, parsedBill, repo, storage));
    assert.equal(storage.removals.length, 1);
  });

  test("falha de Storage não tenta registrar metadados", async () => {
    const repo = repository();
    const storage = new MemoryStorage();
    storage.failUpload = true;
    const parsedBill = await bill();
    await assert.rejects(() => uploadBill(submissionId, parsedBill, repo, storage));
    assert.equal(repo.registrations, 0);
  });
});

describe("Route Handler", () => {
  function request(upload = file()): Request {
    const form = new FormData();
    form.set("submissionId", submissionId);
    form.set("file", upload);
    return new Request("http://localhost/api/lead-documents", { method: "POST", body: form });
  }

  test("retorna sucesso sem expor bucket ou caminho", async () => {
    const response = await handleBillUploadPost(request(), repository(), new MemoryStorage());
    const serialized = JSON.stringify(await response.json());
    assert.equal(response.status, 201);
    assert.doesNotMatch(serialized, /lead-documents|object_path|supabase/i);
  });

  test("mantém retry idempotente no contrato HTTP", async () => {
    const response = await handleBillUploadPost(request(), repository({ existing: documentId }), new MemoryStorage());
    const body = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 200);
    assert.equal(body.duplicate, true);
  });

  test("rejeita arquivo inválido no servidor", async () => {
    const response = await handleBillUploadPost(
      request(file("fatura.pdf", "application/pdf", new Uint8Array([1, 2, 3]))),
      repository(),
      new MemoryStorage(),
    );
    assert.equal(response.status, 400);
  });

  test("submission inexistente não revela detalhes internos", async () => {
    const missing: DocumentRepository = {
      async findTarget() { throw new DocumentRepositoryError("not_found"); },
      async register() { throw new Error("unreachable"); },
    };
    const response = await handleBillUploadPost(request(), missing, new MemoryStorage());
    const serialized = JSON.stringify(await response.json());
    assert.equal(response.status, 404);
    assert.doesNotMatch(serialized, /private\.leads|Postgres|Supabase/i);
  });
});

describe("estado da UI", () => {
  test("falha de upload preserva arquivo e permite retry", () => {
    const selected = billUploadUiReducer(INITIAL_BILL_UPLOAD_STATE, { type: "select", file: file() });
    const uploading = billUploadUiReducer(selected, { type: "upload_started" });
    const failed = billUploadUiReducer(uploading, { type: "upload_failed", message: "falha técnica" });
    assert.equal(failed.status, "error");
    assert.equal(failed.file?.name, "fatura.pdf");
    assert.equal(billUploadUiReducer(failed, { type: "upload_started" }).status, "uploading");
  });
});
