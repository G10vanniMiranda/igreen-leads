import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HandoffActionForm } from "@/features/admin/handoff-action-form";
import { AdminRepositoryError, SupabaseAdminRepository } from "@/features/admin/repository";
import { eventDescription, eventLabel, statusLabel } from "@/features/admin/timeline";
import { LEAD_STATUSES } from "@/features/admin/types";
import { isLeadId } from "@/features/admin/validation";

export const dynamic = "force-dynamic";

const show = (value: unknown) => typeof value === "string" && value ? value : typeof value === "boolean" ? (value ? "Sim" : "Não") : "—";

function DataGroup({ title, fields, lead }: Readonly<{ title: string; fields: ReadonlyArray<readonly [string, string]>; lead: Record<string, unknown> }>) {
  return <section className="admin-detail-card"><h2>{title}</h2><dl>{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{show(lead[key])}</dd></div>)}</dl></section>;
}

export default async function LeadDetailPage({ params, searchParams }: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}>) {
  const { id } = await params;
  if (!isLeadId(id)) notFound();
  let detail;
  try { detail = await new SupabaseAdminRepository().detail(id); }
  catch (error) { if (error instanceof AdminRepositoryError && error.errorClass === "not_found") notFound(); throw error; }
  const { saved } = await searchParams;
  const lead = detail.lead;
  const document = detail.document;
  const whatsappActionId = randomUUID();
  const igreenActionId = randomUUID();

  return (
    <main className="admin-main">
      <Link href="/admin" className="admin-back">← Voltar à lista</Link>
      <div className="admin-title-row"><div><p className="admin-kicker">Detalhe do lead</p><h1>{lead.name}</h1></div><span className="admin-status">{lead.status}</span></div>
      {saved ? <p className="admin-success" role="status">Alteração salva com segurança.</p> : null}
      <div className="admin-detail-grid">
        <DataGroup title="Contato" lead={lead} fields={[["name", "Nome"], ["phone", "WhatsApp"]]} />
        <DataGroup title="Pré-qualificação" lead={lead} fields={[["customer_type", "Tipo de unidade"], ["state", "Estado"], ["utility_provider", "Distribuidora"], ["utility_provider_other", "Outra distribuidora"], ["bill_range", "Faixa da conta"], ["account_holder_status", "Titularidade"], ["social_benefit_status", "Benefício social"], ["requires_review", "Requer revisão"]]} />
        <DataGroup title="Origem" lead={lead} fields={[["utm_source", "UTM source"], ["utm_medium", "UTM medium"], ["utm_campaign", "UTM campaign"], ["utm_content", "UTM content"], ["utm_term", "UTM term"], ["referrer", "Referrer"], ["landing_page", "Landing page"]]} />
        <DataGroup title="Operação" lead={lead} fields={[["status", "Status"], ["created_at", "Criado em"], ["updated_at", "Atualizado em"]]} />
        <section className="admin-detail-card">
          <h2>Fatura</h2>
          {document ? <dl><div><dt>Existe fatura?</dt><dd>Sim</dd></div><div><dt>Tipo</dt><dd>{show(document.document_type)}</dd></div><div><dt>Tamanho</dt><dd>{typeof document.size_bytes === "number" ? `${Math.ceil(document.size_bytes / 1024)} KB` : "—"}</dd></div><div><dt>Upload</dt><dd>{show(document.created_at)}</dd></div></dl> : <p className="admin-muted">Nenhuma fatura vinculada.</p>}
          {document ? <a href={`/api/admin/leads/${id}/bill`} target="_blank" rel="noreferrer" className="admin-primary-link">Visualizar fatura</a> : null}
          <p className="admin-help">Acesso privado temporário, válido por 120 segundos.</p>
        </section>
        <section className="admin-detail-card">
          <p className="admin-section-kicker">Contato</p>
          <h2>Conversar com o lead</h2>
          <p className="admin-help">Abre uma conversa com mensagem inicial. Nenhuma mensagem é enviada automaticamente.</p>
          <HandoffActionForm
            action={`/api/admin/leads/${id}/whatsapp`}
            actionId={whatsappActionId}
            label="Chamar no WhatsApp"
            pendingLabel="Abrindo WhatsApp…"
          />
        </section>
        <section className="admin-detail-card">
          <p className="admin-section-kicker">Handoff</p>
          <h2>Continuar no fluxo oficial</h2>
          <p className="admin-help">Abre somente o link configurado da iGreen, sem enviar dados do lead.</p>
          <HandoffActionForm
            action={`/api/admin/leads/${id}/igreen-handoff`}
            actionId={igreenActionId}
            label="Continuar na iGreen"
            pendingLabel="Abrindo iGreen…"
            variant="secondary"
          />
          <form action={`/api/admin/leads/${id}/status`} method="post" className="admin-explicit-status-form">
            <input type="hidden" name="status" value="SENT_TO_IGREEN" />
            <button type="submit">Marcar como enviado para iGreen</button>
          </form>
          <p className="admin-help">Abrir o fluxo não altera o status. Use a marcação apenas após confirmação operacional.</p>
        </section>
        <section className="admin-detail-card">
          <p className="admin-section-kicker">Status</p>
          <h2>Atualizar status</h2>
          <form action={`/api/admin/leads/${id}/status`} method="post" className="admin-form-inline">
            <label htmlFor="status">Novo status</label><select id="status" name="status" defaultValue={lead.status}>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
            <button type="submit">Salvar status</button>
          </form>
          <p className="admin-help">Contrato enviado, contratado e ativado são declarações manuais. Mudanças reais geram <code>status_changed</code>.</p>
        </section>
        <section className="admin-detail-card admin-detail-wide">
          <h2>Observação interna</h2>
          <form action={`/api/admin/leads/${id}/notes`} method="post" className="admin-form">
            <label htmlFor="internalNotes">Uso operacional interno</label>
            <textarea id="internalNotes" name="internalNotes" maxLength={2000} rows={6} defaultValue={lead.internal_notes ?? ""} />
            <button type="submit">Salvar observação</button>
          </form>
        </section>
        <section className="admin-detail-card admin-detail-wide">
          <h2>Histórico de eventos</h2>
          <ol className="admin-events">{detail.events.map((event) => {
            const description = eventDescription(event);
            return <li key={String(event.id)}><div><strong>{eventLabel(event.event_type)}</strong><span>{show(event.created_at)}</span></div>{description ? <small>{description}</small> : null}</li>;
          })}</ol>
        </section>
      </div>
    </main>
  );
}
