import type { LeadRepository } from "../services/lead-submission";
import type { LeadInsertPayload, LeadPersistenceResult } from "../types/lead";

type RpcResult = Readonly<{ lead_id: string; created: boolean }>;

export class LeadPersistenceError extends Error {
  constructor(public readonly errorClass: "configuration" | "upstream") {
    super("Lead persistence failed");
    this.name = "LeadPersistenceError";
  }
}

export class SupabaseLeadRepository implements LeadRepository {
  constructor(
    private readonly url: string | undefined = process.env.SUPABASE_URL,
    private readonly serviceRoleKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) {}

  async create(payload: LeadInsertPayload): Promise<LeadPersistenceResult> {
    if (!this.url || !this.serviceRoleKey) throw new LeadPersistenceError("configuration");

    const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/rpc/create_lead_submission`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_submission_id: payload.submissionId,
        p_name: payload.name,
        p_phone: payload.phone,
        p_customer_type: payload.customerType,
        p_state: payload.state,
        p_utility_provider: payload.utilityProvider,
        p_utility_provider_other: payload.utilityProviderOther,
        p_bill_range: payload.billRange,
        p_account_holder_status: payload.accountHolderStatus,
        p_social_benefit_status: payload.socialBenefitStatus,
        p_requires_review: payload.requiresReview,
        p_consent_contact: payload.consentContact,
        p_utm_source: payload.attribution.utmSource,
        p_utm_medium: payload.attribution.utmMedium,
        p_utm_campaign: payload.attribution.utmCampaign,
        p_utm_content: payload.attribution.utmContent,
        p_utm_term: payload.attribution.utmTerm,
        p_referrer: payload.attribution.referrer,
        p_landing_page: payload.attribution.landingPage,
        p_igreen_referral_id: payload.igreenReferralId,
      }),
    });

    if (!response.ok) throw new LeadPersistenceError("upstream");
    const rows = (await response.json()) as unknown;
    if (!Array.isArray(rows) || rows.length !== 1) throw new LeadPersistenceError("upstream");
    const result = rows[0] as Partial<RpcResult>;
    if (typeof result.lead_id !== "string" || typeof result.created !== "boolean") throw new LeadPersistenceError("upstream");
    return { leadId: result.lead_id, created: result.created };
  }
}
