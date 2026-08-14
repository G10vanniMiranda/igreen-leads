import type { ConsentPreferences } from "../privacy/consent";
import type { AnalyticsConfig } from "./config";
import { createGa4Provider, createMetaPixelProvider } from "./providers";
import type { TrackingProvider } from "./types";

type VendorWindow = Window & typeof globalThis & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & { queue?: unknown[][]; loaded?: boolean; version?: string };
  _fbq?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: boolean | undefined;
};

function addScript(documentObject: Document, id: string, source: string): HTMLScriptElement {
  const existing = documentObject.getElementById(id);
  if (existing instanceof HTMLScriptElement) return existing;
  const script = documentObject.createElement("script");
  script.id = id;
  script.async = true;
  script.src = source;
  documentObject.head.append(script);
  return script;
}

function configureGa(
  windowObject: VendorWindow,
  documentObject: Document,
  id: string,
  environment: AnalyticsConfig["environment"],
): TrackingProvider {
  windowObject[`ga-disable-${id}`] = false;
  windowObject.dataLayer ??= [];
  windowObject.gtag ??= (...args: unknown[]) => { windowObject.dataLayer?.push(args); };
  windowObject.gtag("js", new Date());
  windowObject.gtag("config", id, { send_page_view: false });
  addScript(documentObject, "igreen-ga4", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  return createGa4Provider(
    { enabled: true, id, environment, consentGranted: true },
    (eventName, payload) => windowObject.gtag?.("event", eventName, payload),
  )!;
}

function configureMeta(
  windowObject: VendorWindow,
  documentObject: Document,
  id: string,
  environment: AnalyticsConfig["environment"],
): TrackingProvider {
  if (!windowObject.fbq) {
    const queue = ((...args: unknown[]) => { queue.queue?.push(args); }) as NonNullable<VendorWindow["fbq"]>;
    queue.queue = [];
    queue.loaded = true;
    queue.version = "2.0";
    windowObject.fbq = queue;
    windowObject._fbq = queue;
  }
  windowObject.fbq("consent", "grant");
  windowObject.fbq("init", id);
  addScript(documentObject, "igreen-meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
  return createMetaPixelProvider(
    { enabled: true, id, environment, consentGranted: true },
    (eventName, payload) => windowObject.fbq?.("track", eventName, payload, { eventID: payload.event_id }),
  )!;
}

export function configureBrowserProviders(
  config: AnalyticsConfig,
  preferences: ConsentPreferences,
  windowObject: VendorWindow = window as VendorWindow,
  documentObject: Document = document,
): Readonly<{ providers: readonly TrackingProvider[]; dispose(): void }> {
  const providers: TrackingProvider[] = [];
  if (preferences.analytics && config.ga.enabled && config.ga.id) {
    providers.push(configureGa(windowObject, documentObject, config.ga.id, config.environment));
  }
  if (preferences.advertising && config.meta.enabled && config.meta.id) {
    providers.push(configureMeta(windowObject, documentObject, config.meta.id, config.environment));
  }
  return Object.freeze({
    providers,
    dispose() {
      if (config.ga.id) windowObject[`ga-disable-${config.ga.id}`] = true;
      windowObject.fbq?.("consent", "revoke");
      documentObject.getElementById("igreen-ga4")?.remove();
      documentObject.getElementById("igreen-meta-pixel")?.remove();
    },
  });
}
