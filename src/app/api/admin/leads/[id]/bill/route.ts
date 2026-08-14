import { billHandler } from "@/features/admin/handlers";
import { SupabaseAdminRepository } from "@/features/admin/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return billHandler(request, id, new SupabaseAdminRepository());
}
