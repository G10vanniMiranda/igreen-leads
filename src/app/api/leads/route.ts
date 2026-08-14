import { handleLeadPost } from "@/features/leads/services/lead-route-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleLeadPost(request);
}
