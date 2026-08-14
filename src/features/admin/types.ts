export const LEAD_STATUSES = [
  "NEW", "IN_REVIEW", "QUALIFIED", "NOT_ELIGIBLE", "SENT_TO_IGREEN",
  "CONTRACT_SENT", "CONTRACTED", "ACTIVATED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type DashboardMetrics = Readonly<{
  total: number; new: number; inReview: number; qualified: number;
  sentToIgreen: number; contracted: number; activated: number;
  requiresReview: number; withBill: number; withoutBill: number;
}>;

export type LeadListItem = Readonly<{
  id: string; name: string; phone: string; state: string; utility_provider: string;
  bill_range: string; status: LeadStatus; requires_review: boolean;
  has_bill: boolean; created_at: string; total_count: number;
}>;

export type LeadDetail = Readonly<{
  lead: Record<string, unknown> & {
    id: string; name: string; phone: string; status: LeadStatus;
    internal_notes: string | null;
  };
  document: null | Record<string, unknown>;
  events: ReadonlyArray<Record<string, unknown>>;
}>;

export type LeadFilters = Readonly<{
  page: number; status?: LeadStatus; state?: string; requiresReview?: boolean;
  hasBill?: boolean; search?: string;
}>;
