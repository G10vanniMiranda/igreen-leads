import type { LeadStatus } from "./types";

const EVENT_LABELS: Readonly<Record<string, string>> = {
  lead_created: "Lead criado",
  bill_uploaded: "Fatura recebida",
  whatsapp_opened: "WhatsApp aberto",
  igreen_handoff_opened: "Fluxo iGreen aberto",
  status_changed: "Status alterado",
};

const STATUS_LABELS: Readonly<Record<LeadStatus, string>> = {
  NEW: "Novo",
  IN_REVIEW: "Em análise",
  QUALIFIED: "Qualificado",
  NOT_ELIGIBLE: "Não elegível",
  SENT_TO_IGREEN: "Enviado para iGreen",
  CONTRACT_SENT: "Contrato enviado",
  CONTRACTED: "Contratado",
  ACTIVATED: "Ativado",
};

export function eventLabel(eventType: unknown): string {
  return typeof eventType === "string" ? EVENT_LABELS[eventType] ?? "Evento operacional" : "Evento operacional";
}

export function statusLabel(status: unknown): string {
  return typeof status === "string" && status in STATUS_LABELS
    ? STATUS_LABELS[status as LeadStatus]
    : "Status desconhecido";
}

export function eventDescription(event: Readonly<Record<string, unknown>>): string | null {
  if (event.event_type !== "status_changed") return null;
  const metadata = typeof event.metadata === "object" && event.metadata
    ? event.metadata as Record<string, unknown>
    : {};
  return `Status alterado de ${statusLabel(metadata.from)} para ${statusLabel(metadata.to)}`;
}
