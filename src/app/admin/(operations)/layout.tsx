import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/features/admin/auth";

export const dynamic = "force-dynamic";

export default async function OperationsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!verifyAdminSession(token)) redirect("/admin/login");
  return (
    <>
      <header className="admin-header">
        <Link href="/admin" className="admin-brand">iGreen <span>Operações</span></Link>
        <form action="/api/admin/logout" method="post"><button type="submit" className="admin-quiet-button">Sair</button></form>
      </header>
      {children}
    </>
  );
}
