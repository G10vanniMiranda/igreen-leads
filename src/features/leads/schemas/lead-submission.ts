import type {
  AccountHolderStatus,
  BillRange,
  CompletedQualificationAnswers,
  CustomerType,
  SocialBenefitStatus,
  StateCode,
  UtilityProvider,
} from "../../qualification/types/qualification";
import type { LeadAttribution, LeadSubmissionInput } from "../types/lead";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUSTOMER_TYPES = new Set<CustomerType>(["residential", "business", "rural"]);
const STATES = new Set<StateCode>(["MG", "PE", "BA", "MS", "MT", "CE", "OTHER"]);
const UTILITY_PROVIDERS = new Set<UtilityProvider>([
  "cemig",
  "neoenergia_pernambuco",
  "neoenergia_coelba",
  "energisa_ms",
  "energisa_mt",
  "enel_ceara",
  "other",
]);
const BILL_RANGES = new Set<BillRange>([
  "up_to_150",
  "151_to_300",
  "301_to_500",
  "501_to_1000",
  "1001_to_2000",
  "above_2000",
]);
const ACCOUNT_HOLDER_STATUSES = new Set<AccountHolderStatus>(["yes", "no", "unsure"]);
const SOCIAL_BENEFIT_STATUSES = new Set<SocialBenefitStatus>(["yes", "no", "unknown"]);

export class LeadValidationError extends Error {
  constructor(public readonly fieldErrors: Readonly<Record<string, string>>) {
    super("Invalid lead submission");
    this.name = "LeadValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedNullableString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("invalid");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("invalid");
  return normalized;
}

export function normalizeBrazilianPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (!/^\d{10,11}$/.test(digits) || digits.startsWith("0")) return null;
  return `+55${digits}`;
}

export function formatBrazilianPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return `(${ddd}) ${local.slice(0, split)}${local.length > split ? `-${local.slice(split)}` : ""}`;
}

function parseQualification(value: unknown, errors: Record<string, string>): CompletedQualificationAnswers | null {
  if (!isRecord(value)) {
    errors.qualification = "Respostas da pré-qualificação são obrigatórias.";
    return null;
  }

  const customerType = value.customerType;
  const state = value.state;
  const utilityProvider = value.utilityProvider;
  const utilityProviderName = typeof value.utilityProviderName === "string"
    ? value.utilityProviderName.trim()
    : "";
  const billRange = value.billRange;
  const accountHolder = value.accountHolder;
  const socialBenefit = value.socialBenefit;

  if (typeof customerType !== "string" || !CUSTOMER_TYPES.has(customerType as CustomerType)) errors.qualification = "Pré-qualificação inválida.";
  if (typeof state !== "string" || !STATES.has(state as StateCode)) errors.qualification = "Pré-qualificação inválida.";
  if (typeof utilityProvider !== "string" || !UTILITY_PROVIDERS.has(utilityProvider as UtilityProvider)) errors.qualification = "Pré-qualificação inválida.";
  if (utilityProvider === "other" && (utilityProviderName.length < 2 || utilityProviderName.length > 120)) errors.qualification = "Pré-qualificação inválida.";
  if (utilityProvider !== "other" && utilityProviderName.length > 0) errors.qualification = "Pré-qualificação inválida.";
  if (typeof billRange !== "string" || !BILL_RANGES.has(billRange as BillRange)) errors.qualification = "Pré-qualificação inválida.";
  if (typeof accountHolder !== "string" || !ACCOUNT_HOLDER_STATUSES.has(accountHolder as AccountHolderStatus)) errors.qualification = "Pré-qualificação inválida.";
  if (typeof socialBenefit !== "string" || !SOCIAL_BENEFIT_STATUSES.has(socialBenefit as SocialBenefitStatus)) errors.qualification = "Pré-qualificação inválida.";
  if (errors.qualification) return null;

  return {
    customerType: customerType as CustomerType,
    state: state as StateCode,
    utilityProvider: utilityProvider as UtilityProvider,
    utilityProviderName,
    billRange: billRange as BillRange,
    accountHolder: accountHolder as AccountHolderStatus,
    socialBenefit: socialBenefit as SocialBenefitStatus,
  };
}

function parseAttribution(value: unknown, errors: Record<string, string>): LeadAttribution {
  if (value === undefined || value === null) {
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrer: null, landingPage: null };
  }
  if (!isRecord(value)) {
    errors.attribution = "Atribuição inválida.";
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrer: null, landingPage: null };
  }
  try {
    return {
      utmSource: boundedNullableString(value.utmSource, 200),
      utmMedium: boundedNullableString(value.utmMedium, 200),
      utmCampaign: boundedNullableString(value.utmCampaign, 200),
      utmContent: boundedNullableString(value.utmContent, 200),
      utmTerm: boundedNullableString(value.utmTerm, 200),
      referrer: boundedNullableString(value.referrer, 2048),
      landingPage: boundedNullableString(value.landingPage, 2048),
    };
  } catch {
    errors.attribution = "Atribuição inválida.";
    return { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrer: null, landingPage: null };
  }
}

export function parseLeadSubmission(value: unknown): LeadSubmissionInput {
  const errors: Record<string, string> = {};
  if (!isRecord(value)) throw new LeadValidationError({ form: "Dados inválidos." });

  const submissionId = typeof value.submissionId === "string" ? value.submissionId : "";
  if (!UUID_PATTERN.test(submissionId)) errors.submissionId = "Identificador de envio inválido.";

  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (name.length < 2 || name.length > 100) errors.name = "Informe um nome entre 2 e 100 caracteres.";

  const rawPhone = typeof value.phone === "string" && value.phone.length <= 30 ? value.phone : "";
  const phone = normalizeBrazilianPhone(rawPhone);
  if (!phone) errors.phone = "Informe um WhatsApp com DDD válido.";

  if (value.consentContact !== true) errors.consentContact = "O consentimento para contato é obrigatório.";

  const qualification = parseQualification(value.qualification, errors);
  const attribution = parseAttribution(value.attribution, errors);
  if (Object.keys(errors).length > 0 || !phone || !qualification) throw new LeadValidationError(errors);

  return { submissionId, name, phone, consentContact: true, qualification, attribution };
}
