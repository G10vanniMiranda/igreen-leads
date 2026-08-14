import { getFirstTouchAttribution, getJourneyId } from "./attribution";
import type {
  PublicFunnelEventName,
  TrackingContext,
  TrackingEvent,
  TrackingProvider,
} from "./types";

type BrowserTrackingDependencies = Readonly<{
  storage: Pick<Storage, "getItem" | "setItem">;
  url: string;
  referrer: string;
  providers?: readonly TrackingProvider[];
  randomId?: () => string;
  now?: () => Date;
}>;

export function createBrowserTracker(dependencies: BrowserTrackingDependencies) {
  const randomId = dependencies.randomId ?? (() => crypto.randomUUID());
  const now = dependencies.now ?? (() => new Date());
  const attribution = getFirstTouchAttribution(
    dependencies.storage,
    dependencies.url,
    dependencies.referrer,
  );
  const sessionId = getJourneyId(dependencies.storage, randomId);
  let providers = dependencies.providers ?? [];

  return Object.freeze({
    attribution,
    sessionId,
    setProviders(nextProviders: readonly TrackingProvider[]) {
      providers = [...nextProviders];
    },
    track(eventName: PublicFunnelEventName, context: TrackingContext = {}): TrackingEvent {
      const event = Object.freeze({
        eventName,
        eventId: randomId(),
        occurredAt: now().toISOString(),
        sessionId,
        attribution,
        context: Object.freeze({ ...context }),
      });
      for (const provider of providers) provider.track(event);
      return event;
    },
  });
}

let browserTracker: ReturnType<typeof createBrowserTracker> | null = null;

export function getBrowserTracker(): ReturnType<typeof createBrowserTracker> | null {
  if (typeof window === "undefined") return null;
  browserTracker ??= createBrowserTracker({
    storage: window.sessionStorage,
    url: window.location.href,
    referrer: document.referrer,
  });
  return browserTracker;
}

export function resetBrowserTrackerForTests(): void {
  browserTracker = null;
}
