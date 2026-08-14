import { deriveQualificationResult } from "../../qualification/utils/qualification-machine";
import { LEAD_STATUS, type LeadInsertPayload, type LeadPersistenceResult, type LeadSubmissionInput } from "../types/lead";

export interface LeadRepository {
  create(payload: LeadInsertPayload): Promise<LeadPersistenceResult>;
}

export function mapSubmissionToLead(
  submission: LeadSubmissionInput,
  igreenReferralId: string | null,
): LeadInsertPayload {
  const result = deriveQualificationResult(submission.qualification);
  return {
    submissionId: submission.submissionId,
    name: submission.name,
    phone: submission.phone,
    customerType: result.answers.customerType,
    state: result.answers.state,
    utilityProvider: result.answers.utilityProvider,
    utilityProviderOther: result.answers.utilityProvider === "other"
      ? result.answers.utilityProviderName
      : null,
    billRange: result.answers.billRange,
    accountHolderStatus: result.answers.accountHolder,
    socialBenefitStatus: result.answers.socialBenefit,
    requiresReview: result.requiresReview,
    status: LEAD_STATUS,
    consentContact: true,
    attribution: submission.attribution,
    igreenReferralId,
  };
}

export async function submitLead(
  submission: LeadSubmissionInput,
  repository: LeadRepository,
  igreenReferralId: string | null,
): Promise<LeadPersistenceResult> {
  return repository.create(mapSubmissionToLead(submission, igreenReferralId));
}
