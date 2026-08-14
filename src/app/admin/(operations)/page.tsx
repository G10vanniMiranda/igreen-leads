import Link from "next/link";
import { SupabaseAdminRepository } from "@/features/admin/repository";
import { LEAD_STATUSES } from "@/features/admin/types";
import { parseLeadFilters } from "@/features/admin/validation";
import { readSearchToken } from "@/features/admin/search-token";

export const dynamic = "force-dynamic";

const metricLabels = {
  total: "Total", new: "Novos", inReview: "Em análise", qualified: "Qualificados",
  sentToIgreen: "Enviados à iGreen", contracted: "Contratados", activated: "Ativados",
  requiresReview: "Requerem revisão", withBill: "Com fatura", withoutBill: "Sem fatura",
} as const;

function queryFor(raw: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "page" && value) params.set(key, value);
  params.set("page", String(page));
  return params.toString();
}

export default async function AdminDashboard({ searchParams }: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  const parsedFilters = parseLeadFilters(params);
  const protectedSearch = readSearchToken(typeof raw.searchToken === "string" ? raw.searchToken : undefined);
  const filters = { ...parsedFilters, ...(protectedSearch ? { search: protectedSearch } : {}) };
  const repository = new SupabaseAdminRepository();
  const [metrics, leads] = await Promise.all([repository.dashboard(), repository.list(filters)]);
  const total = leads[0]?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <main className="admin-main">
      <div className="admin-title-row"><div><p className="admin-kicker">Painel interno</p><h1>Leads captados</h1></div><p>Atualização operacional manual e auditável.</p></div>
      <section className="admin-metrics" aria-label="Resumo operacional">
        {Object.entries(metricLabels).map(([key, label]) => <article key={key}><span>{label}</span><strong>{metrics[key as keyof typeof metrics]}</strong></article>)}
      </section>

      <section className="admin-panel" aria-labelledby="lead-list-title">
        <div className="admin-panel-title"><div><p className="admin-kicker">Fila operacional</p><h2 id="lead-list-title">Lista de leads</h2></div><span>{total} registro(s)</span></div>
        <form action="/api/admin/search" method="post" className="admin-search-form">
          <label>Busca protegida<input name="search" type="search" maxLength={100} defaultValue={protectedSearch} placeholder="Nome ou telefone" required /></label>
          <button type="submit">Buscar</button>
        </form>
        <form method="get" className="admin-filters">
          {typeof raw.searchToken === "string" ? <input type="hidden" name="searchToken" value={raw.searchToken} /> : null}
          <label>Status<select name="status" defaultValue={filters.status ?? ""}><option value="">Todos</option>{LEAD_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label>Estado<input name="state" maxLength={5} defaultValue={filters.state} placeholder="UF" /></label>
          <label>Revisão<select name="requiresReview" defaultValue={filters.requiresReview?.toString() ?? ""}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></label>
          <label>Fatura<select name="hasBill" defaultValue={filters.hasBill?.toString() ?? ""}><option value="">Todos</option><option value="true">Com fatura</option><option value="false">Sem fatura</option></select></label>
          <button type="submit">Filtrar</button><Link href="/admin" className="admin-filter-clear">Limpar</Link>
        </form>
        <div className="admin-table-wrap">
          <table><thead><tr><th>Nome / WhatsApp</th><th>Local</th><th>Conta</th><th>Status</th><th>Revisão</th><th>Fatura</th><th>Criado em</th><th /></tr></thead>
            <tbody>{leads.length ? leads.map((lead) => <tr key={lead.id}>
              <td><strong>{lead.name}</strong><small>{lead.phone}</small></td><td>{lead.state}<small>{lead.utility_provider}</small></td><td>{lead.bill_range}</td>
              <td><span className="admin-status">{lead.status}</span></td><td>{lead.requires_review ? "Sim" : "Não"}</td><td>{lead.has_bill ? "Sim" : "Não"}</td>
              <td>{new Date(lead.created_at).toLocaleString("pt-BR")}</td><td><Link href={`/admin/leads/${lead.id}`}>Abrir</Link></td>
            </tr>) : <tr><td colSpan={8} className="admin-empty">Nenhum lead encontrado.</td></tr>}</tbody>
          </table>
        </div>
        <nav className="admin-pagination" aria-label="Paginação">
          {filters.page > 1 ? <Link href={`/admin?${queryFor(raw, filters.page - 1)}`}>Anterior</Link> : <span />}
          <span>Página {filters.page} de {pages}</span>
          {filters.page < pages ? <Link href={`/admin?${queryFor(raw, filters.page + 1)}`}>Próxima</Link> : <span />}
        </nav>
      </section>
    </main>
  );
}
