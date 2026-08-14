import { loginHandler } from "@/features/admin/handlers";

export const dynamic = "force-dynamic";
export async function POST(request: Request): Promise<Response> {
  return loginHandler(request);
}
