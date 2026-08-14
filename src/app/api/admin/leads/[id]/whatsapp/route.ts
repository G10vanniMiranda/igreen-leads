import { handoffHandler } from "@/features/admin/handlers";
import { SupabaseAdminRepository } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handoffHandler(request, id, "whatsapp", new SupabaseAdminRepository());
}
