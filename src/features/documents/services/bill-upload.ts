import type { DocumentRepository } from "../repository/supabase-document-repository";
import type { DocumentStorage } from "../storage/supabase-document-storage";
import { BILL_BUCKET, type ValidatedBill } from "../types/document";

export type BillUploadResult = Readonly<{ documentId: string; duplicate: boolean }>;

export async function uploadBill(
  submissionId: string,
  bill: ValidatedBill,
  repository: DocumentRepository,
  storage: DocumentStorage,
  createId: () => string = () => crypto.randomUUID(),
): Promise<BillUploadResult> {
  const target = await repository.findTarget(submissionId);
  if (target.existingDocumentId) {
    return { documentId: target.existingDocumentId, duplicate: true };
  }

  const documentId = createId();
  const objectPath = `${target.leadId}/${documentId}.${bill.extension}`;
  await storage.upload(BILL_BUCKET, objectPath, bill);

  try {
    const registration = await repository.register({
      submissionId,
      documentId,
      storageBucket: BILL_BUCKET,
      storagePath: objectPath,
      bill,
    });
    if (!registration.created) {
      await cleanupUploadedObject(storage, objectPath);
    }
    return { documentId: registration.documentId, duplicate: !registration.created };
  } catch (error) {
    await cleanupUploadedObject(storage, objectPath);
    throw error;
  }
}

async function cleanupUploadedObject(
  storage: DocumentStorage,
  objectPath: string,
): Promise<void> {
  try {
    await storage.remove(BILL_BUCKET, objectPath);
  } catch {
    console.error("bill_upload_cleanup_failure", {
      timestamp: new Date().toISOString(),
      error_class: "cleanup",
    });
  }
}
