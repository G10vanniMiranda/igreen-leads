import type { TrackingEvent } from "./types";

type FunnelTracker = Readonly<{
  track(name: "lead_submitted", context?: Readonly<Record<string, string | number | boolean>>): TrackingEvent;
}>;

type UploadTracker = Readonly<{
  track(name: "bill_uploaded", context?: Readonly<Record<string, string | number | boolean>>): TrackingEvent;
}>;

export function trackLeadSubmissionOutcome(succeeded: boolean, tracker: FunnelTracker | null): TrackingEvent | null {
  return succeeded ? tracker?.track("lead_submitted") ?? null : null;
}

export function trackBillUploadOutcome(
  succeeded: boolean,
  duplicate: boolean,
  tracker: UploadTracker | null,
): TrackingEvent | null {
  return succeeded ? tracker?.track("bill_uploaded", { duplicate }) ?? null : null;
}
