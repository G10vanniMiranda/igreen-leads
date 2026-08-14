import { handleBillUploadPost } from "@/features/documents/services/bill-upload-route-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleBillUploadPost(request);
}
