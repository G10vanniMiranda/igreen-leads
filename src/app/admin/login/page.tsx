import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminSession } from "@/features/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (verifyAdminSession(token)) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <p className="admin-kicker">Área restrita</p>
        <h1 id="admin-login-title">Operações iGreen Leads</h1>
        <p>Acesso exclusivo para administração autorizada.</p>
        <form action="/api/admin/session" method="post" className="admin-form">
          <label htmlFor="password">Senha administrativa</label>
          <input id="password" name="password" type="password" minLength={12} autoComplete="current-password" required />
          {error === "invalid" ? <p className="admin-error" role="alert">Credencial inválida.</p> : null}
          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
