import { LEAD_STATUSES, type LeadFilters, type LeadStatus } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLeadId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && LEAD_STATUSES.includes(value as LeadStatus);
}

export function validateInternalNotes(value: unknown): string | null {
  if (typeof value !== "string") throw new Error("INVALID_NOTES");
  const notes = value.trim();
  if (notes.length > 2000) throw new Error("INVALID_NOTES");
  return notes || null;
}

export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  const rawPage = Number(params.get("page") ?? "1");
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const status = params.get("status");
  const state = params.get("state")?.trim().toUpperCase();
  const search = params.get("search")?.trim();
  const parseBoolean = (name: string) => {
    const value = params.get(name);
    return value === "true" ? true : value === "false" ? false : undefined;
  };
  const requiresReview = parseBoolean("requiresReview");
  const hasBill = parseBoolean("hasBill");
  return {
    page,
    ...(isLeadStatus(status) ? { status } : {}),
    ...(state && state.length <= 5 ? { state } : {}),
    ...(requiresReview !== undefined ? { requiresReview } : {}),
    ...(hasBill !== undefined ? { hasBill } : {}),
    ...(search && search.length <= 100 ? { search } : {}),
  };
}
