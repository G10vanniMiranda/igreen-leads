export const PUBLIC_FUNNEL_EVENTS = [
  "page_view",
  "qualification_started",
  "qualification_step_completed",
  "qualification_completed",
  "lead_started",
  "lead_submitted",
  "bill_upload_started",
  "bill_uploaded",
] as const;

export type PublicFunnelEventName = (typeof PUBLIC_FUNNEL_EVENTS)[number];

export type TrackingAttribution = Readonly<{
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrer: string | null;
  landingPage: string | null;
}>;

export type TrackingContext = Readonly<Record<string, string | number | boolean>>;

export type TrackingEvent = Readonly<{
  eventName: PublicFunnelEventName;
  eventId: string;
  occurredAt: string;
  sessionId: string;
  attribution: TrackingAttribution;
  context: TrackingContext;
}>;

export interface TrackingProvider {
  readonly name: string;
  track(event: TrackingEvent): void;
}
