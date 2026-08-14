import type { TrackingEvent, TrackingProvider } from "./types";

export type AnalyticsEnvironment = "local" | "test" | "preview" | "production";

export type ProviderConfig = Readonly<{
  enabled: boolean;
  id: string | null;
  environment: AnalyticsEnvironment;
  consentGranted: boolean;
}>;

type ProviderTransport = (eventName: string, payload: Readonly<Record<string, unknown>>) => void;

export const META_EVENT_MAP = Object.freeze({
  page_view: "PageView",
  lead_submitted: "CompleteRegistration",
} as const);

export const GA4_EVENT_MAP = Object.freeze({
  qualification_started: "qualification_started",
  qualification_completed: "qualification_completed",
  lead_submitted: "lead_submitted",
  bill_uploaded: "bill_uploaded",
} as const);

function canActivate(config: ProviderConfig): boolean {
  return config.enabled
    && config.consentGranted
    && Boolean(config.id)
    && (config.environment === "test" || config.environment === "preview");
}

function createProvider(
  name: string,
  config: ProviderConfig,
  transport: ProviderTransport,
  eventMap: Readonly<Partial<Record<TrackingEvent["eventName"], string>>>,
): TrackingProvider | null {
  if (!canActivate(config)) return null;
  return Object.freeze({
    name,
    track(event: TrackingEvent) {
      const providerEventName = eventMap[event.eventName];
      if (!providerEventName) return;
      transport(providerEventName, {
        event_id: event.eventId,
        session_id: event.sessionId,
        occurred_at: event.occurredAt,
        attribution: event.attribution,
        context: event.context,
      });
    },
  });
}

export function createMetaPixelProvider(config: ProviderConfig, transport: ProviderTransport): TrackingProvider | null {
  return createProvider("meta_pixel", config, transport, META_EVENT_MAP);
}

export function createGa4Provider(config: ProviderConfig, transport: ProviderTransport): TrackingProvider | null {
  return createProvider("ga4", config, transport, GA4_EVENT_MAP);
}
