import type { DashboardMetrics, LeadDetail, LeadFilters, LeadListItem, LeadStatus } from "./types";
import type { HandoffEventType } from "./handoff";
import { buildSupabaseServerHeaders } from "../supabase/server-headers";

type StatusResult = Readonly<{ previous_status: string; current_status: string; changed: boolean }>;
type BillDocument = Readonly<{ storage_bucket: string; storage_path: string }>;

export class AdminRepositoryError extends Error {
  constructor(public readonly errorClass: "configuration" | "upstream" | "not_found") {
    super("Admin repository operation failed");
    this.name = "AdminRepositoryError";
  }
}

export interface AdminRepository {
  dashboard(): Promise<DashboardMetrics>;
  list(filters: LeadFilters): Promise<LeadListItem[]>;
  detail(leadId: string): Promise<LeadDetail>;
  billDocument(leadId: string): Promise<BillDocument>;
  updateStatus(leadId: string, status: LeadStatus): Promise<StatusResult>;
  updateNotes(leadId: string, notes: string | null): Promise<void>;
  recordHandoffEvent(leadId: string, eventType: HandoffEventType, actionId: string): Promise<boolean>;
}

export class SupabaseAdminRepository implements AdminRepository {
  constructor(
    private readonly url = process.env.SUPABASE_URL,
    private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
  ) {}

  async dashboard() {
    return this.rpcScalar<DashboardMetrics>("admin_dashboard_metrics", {});
  }

  async list(filters: LeadFilters) {
    return this.rpcRows<LeadListItem>("admin_list_leads", {
      p_page: filters.page, p_page_size: 20, p_status: filters.status ?? null,
      p_state: filters.state ?? null, p_requires_review: filters.requiresReview ?? null,
      p_has_bill: filters.hasBill ?? null, p_search: filters.search ?? null,
    });
  }

  async detail(leadId: string) {
    const value = await this.rpcScalar<LeadDetail | null>("admin_get_lead", { p_lead_id: leadId });
    if (!value) throw new AdminRepositoryError("not_found");
    return value;
  }

  async billDocument(leadId: string) {
    const rows = await this.rpcRows<BillDocument>("admin_get_bill_document", { p_lead_id: leadId });
    if (rows.length !== 1) throw new AdminRepositoryError("not_found");
    return rows[0];
  }

  async updateStatus(leadId: string, status: LeadStatus) {
    const rows = await this.rpcRows<StatusResult>("admin_update_lead_status", {
      p_lead_id: leadId, p_status: status,
    });
    if (rows.length !== 1) throw new AdminRepositoryError("upstream");
    return rows[0];
  }

  async updateNotes(leadId: string, notes: string | null) {
    await this.rpcScalar<string | null>("admin_update_internal_notes", {
      p_lead_id: leadId, p_internal_notes: notes,
    });
  }

  async recordHandoffEvent(leadId: string, eventType: HandoffEventType, actionId: string) {
    return this.rpcScalar<boolean>("admin_record_handoff_event", {
      p_lead_id: leadId, p_event_type: eventType, p_action_id: actionId,
    });
  }

  private async request(name: string, body: Record<string, unknown>) {
    if (!this.url || !this.serviceRoleKey) throw new AdminRepositoryError("configuration");
    const response = await fetch(`${this.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST", cache: "no-store",
      headers: { ...buildSupabaseServerHeaders(this.serviceRoleKey), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new AdminRepositoryError(response.status === 404 ? "not_found" : "upstream");
    return response.json() as Promise<unknown>;
  }

  private async rpcRows<T>(name: string, body: Record<string, unknown>): Promise<T[]> {
    const value = await this.request(name, body);
    if (!Array.isArray(value)) throw new AdminRepositoryError("upstream");
    return value as T[];
  }

  private async rpcScalar<T>(name: string, body: Record<string, unknown>): Promise<T> {
    return await this.request(name, body) as T;
  }
}
