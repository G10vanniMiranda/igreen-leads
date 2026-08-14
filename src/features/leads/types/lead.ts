import type { CompletedQualificationAnswers } from "../../qualification/types/qualification";

export const LEAD_STATUS = "NEW" as const;

export type LeadAttribution = Readonly<{
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landingPage: string | null;
}>;

export type LeadSubmissionInput = Readonly<{
  submissionId: string;
  name: string;
  phone: string;
  consentContact: boolean;
  qualification: CompletedQualificationAnswers;
  attribution: LeadAttribution;
}>;

export type LeadInsertPayload = Readonly<{
  submissionId: string;
  name: string;
  phone: string;
  customerType: CompletedQualificationAnswers["customerType"];
  state: CompletedQualificationAnswers["state"];
  utilityProvider: CompletedQualificationAnswers["utilityProvider"];
  utilityProviderOther: string | null;
  billRange: CompletedQualificationAnswers["billRange"];
  accountHolderStatus: CompletedQualificationAnswers["accountHolder"];
  socialBenefitStatus: CompletedQualificationAnswers["socialBenefit"];
  requiresReview: boolean;
  status: typeof LEAD_STATUS;
  consentContact: true;
  attribution: LeadAttribution;
  igreenReferralId: string | null;
}>;

export type LeadPersistenceResult = Readonly<{
  leadId: string;
  created: boolean;
}>;

export type LeadSubmissionResponse =
  | Readonly<{ ok: true; leadId: string }>
  | Readonly<{
      ok: false;
      code: "INVALID_INPUT" | "PERSISTENCE_FAILED";
      message: string;
      fieldErrors?: Readonly<Record<string, string>>;
    }>;
