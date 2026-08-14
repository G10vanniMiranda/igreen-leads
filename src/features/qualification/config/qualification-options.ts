import type {
  AccountHolderStatus,
  BillRange,
  CustomerType,
  PriorityStateCode,
  QualificationStep,
  SocialBenefitStatus,
  StateCode,
  UtilityProvider,
} from "../types/qualification";

export type QualificationOption<T extends string> = Readonly<{
  value: T;
  label: string;
}>;

export const QUALIFICATION_STEPS = [
  "customerType",
  "state",
  "utilityProvider",
  "billRange",
  "accountHolder",
  "socialBenefit",
] as const satisfies readonly QualificationStep[];

export const QUALIFICATION_QUESTIONS: Record<QualificationStep, string> = {
  customerType: "Que tipo de conta você quer analisar?",
  state: "Em qual estado está a unidade consumidora?",
  utilityProvider: "Qual é a distribuidora de energia?",
  billRange: "Quanto você paga aproximadamente de energia por mês?",
  accountHolder:
    "A conta de energia está no seu nome ou no nome da sua empresa?",
  socialBenefit:
    "Essa unidade possui Tarifa Social, Baixa Renda ou algum benefício social na conta de energia?",
};

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "residential", label: "Residencial" },
  { value: "business", label: "Empresa" },
  { value: "rural", label: "Rural" },
] as const satisfies readonly QualificationOption<CustomerType>[];

export const STATE_OPTIONS = [
  { value: "MG", label: "Minas Gerais" },
  { value: "PE", label: "Pernambuco" },
  { value: "BA", label: "Bahia" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MT", label: "Mato Grosso" },
  { value: "CE", label: "Ceará" },
  { value: "OTHER", label: "Outro estado" },
] as const satisfies readonly QualificationOption<StateCode>[];

export const UTILITY_PROVIDER_OPTIONS: Record<
  PriorityStateCode,
  readonly QualificationOption<UtilityProvider>[]
> = {
  MG: [
    { value: "cemig", label: "Cemig" },
    { value: "other", label: "Outra distribuidora" },
  ],
  PE: [
    { value: "neoenergia_pernambuco", label: "Neoenergia Pernambuco" },
    { value: "other", label: "Outra distribuidora" },
  ],
  BA: [
    { value: "neoenergia_coelba", label: "Neoenergia Coelba" },
    { value: "other", label: "Outra distribuidora" },
  ],
  MS: [
    { value: "energisa_ms", label: "Energisa MS" },
    { value: "other", label: "Outra distribuidora" },
  ],
  MT: [
    { value: "energisa_mt", label: "Energisa MT" },
    { value: "other", label: "Outra distribuidora" },
  ],
  CE: [
    { value: "enel_ceara", label: "Enel Ceará" },
    { value: "other", label: "Outra distribuidora" },
  ],
};

export const BILL_RANGE_OPTIONS = [
  { value: "up_to_150", label: "Até R$ 150" },
  { value: "151_to_300", label: "R$ 151 a R$ 300" },
  { value: "301_to_500", label: "R$ 301 a R$ 500" },
  { value: "501_to_1000", label: "R$ 501 a R$ 1.000" },
  { value: "1001_to_2000", label: "R$ 1.001 a R$ 2.000" },
  { value: "above_2000", label: "Acima de R$ 2.000" },
] as const satisfies readonly QualificationOption<BillRange>[];

export const ACCOUNT_HOLDER_OPTIONS = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "unsure", label: "Não tenho certeza" },
] as const satisfies readonly QualificationOption<AccountHolderStatus>[];

export const SOCIAL_BENEFIT_OPTIONS = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "unknown", label: "Não sei" },
] as const satisfies readonly QualificationOption<SocialBenefitStatus>[];

export function getUtilityProviderOptions(
  state: StateCode,
): readonly QualificationOption<UtilityProvider>[] {
  return state === "OTHER" ? [] : UTILITY_PROVIDER_OPTIONS[state];
}
