import { buildIGreenReferralUrl } from "@/lib/igreen";
import type { IGreenConfig } from "@/types/igreen";

export const WHATSAPP_MESSAGE_TEMPLATE =
  "Olá, {primeiro_nome}! Tudo bem?\n\n" +
  "Recebemos sua solicitação para analisar sua conta de energia.\n\n" +
  "Estou entrando em contato para dar continuidade à sua análise e explicar os próximos passos da Conexão Green.";

export type HandoffEventType = "whatsapp_opened" | "igreen_handoff_opened";

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!/^55[1-9][0-9]{9,10}$/.test(digits)) throw new Error("INVALID_LEAD_PHONE");
  return digits;
}

export function firstName(name: string): string {
  const normalized = name.trim().split(/\s+/u)[0] ?? "";
  if (!normalized || normalized.length > 50) throw new Error("INVALID_LEAD_NAME");
  return normalized;
}

export function buildWhatsAppMessage(name: string): string {
  return WHATSAPP_MESSAGE_TEMPLATE.replace("{primeiro_nome}", firstName(name));
}

export function buildWhatsAppUrl(name: string, phone: string): URL {
  const url = new URL(`https://wa.me/${normalizeWhatsAppPhone(phone)}`);
  url.searchParams.set("text", buildWhatsAppMessage(name));
  return url;
}

export function buildCommercialIGreenUrl(config?: IGreenConfig): URL {
  return buildIGreenReferralUrl(config);
}
