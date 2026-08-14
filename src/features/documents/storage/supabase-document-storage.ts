import type { ValidatedBill } from "../types/document";

export class DocumentStorageError extends Error {
  constructor(public readonly errorClass: "configuration" | "upload" | "cleanup") {
    super("Document storage operation failed");
    this.name = "DocumentStorageError";
  }
}

export interface DocumentStorage {
  upload(bucketName: string, objectPath: string, bill: ValidatedBill): Promise<void>;
  remove(bucketName: string, objectPath: string): Promise<void>;
}

export class SupabaseDocumentStorage implements DocumentStorage {
  constructor(
    private readonly url: string | undefined = process.env.SUPABASE_URL,
    private readonly serviceRoleKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) {}

  async upload(bucketName: string, objectPath: string, bill: ValidatedBill): Promise<void> {
    const response = await this.request(bucketName, objectPath, {
      method: "POST",
      headers: { "Content-Type": bill.mimeType, "x-upsert": "false" },
      body: bill.bytes.slice().buffer,
    });
    if (!response.ok) throw new DocumentStorageError("upload");
  }

  async remove(bucketName: string, objectPath: string): Promise<void> {
    const response = await this.request(bucketName, objectPath, { method: "DELETE" });
    if (!response.ok) throw new DocumentStorageError("cleanup");
  }

  private request(bucketName: string, objectPath: string, init: RequestInit): Promise<Response> {
    if (!this.url || !this.serviceRoleKey) throw new DocumentStorageError("configuration");
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return fetch(`${this.url.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodedPath}`, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        ...init.headers,
      },
    });
  }
}
