import type { LeadAttribution } from "../leads/types/lead";
import type { TrackingAttribution } from "./types";

export const ATTRIBUTION_STORAGE_KEY = "igreen.first_touch.v1";
export const SESSION_STORAGE_KEY = "igreen.journey.v1";
const UTM_LIMIT = 200;
const URL_LIMIT = 2048;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function bounded(value: string | null, maximum: number): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maximum) : null;
}

function safeReferrer(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return bounded(`${url.origin}${url.pathname}`, URL_LIMIT);
  } catch {
    return null;
  }
}

function safeLandingPage(value: string): string | null {
  try {
    const source = new URL(value);
    if (source.protocol !== "http:" && source.protocol !== "https:") return null;
    const safe = new URL(`${source.origin}${source.pathname}`);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const item = bounded(source.searchParams.get(key), UTM_LIMIT);
      if (item) safe.searchParams.set(key, item);
    }
    return bounded(safe.href, URL_LIMIT);
  } catch {
    return null;
  }
}

export function readAttribution(url: string, referrer: string): TrackingAttribution {
  let source: URL | null = null;
  try {
    source = new URL(url);
  } catch {
    // A landing inválida é descartada sem interromper o funil.
  }
  return Object.freeze({
    utmSource: bounded(source?.searchParams.get("utm_source") ?? null, UTM_LIMIT),
    utmMedium: bounded(source?.searchParams.get("utm_medium") ?? null, UTM_LIMIT),
    utmCampaign: bounded(source?.searchParams.get("utm_campaign") ?? null, UTM_LIMIT),
    utmContent: bounded(source?.searchParams.get("utm_content") ?? null, UTM_LIMIT),
    utmTerm: bounded(source?.searchParams.get("utm_term") ?? null, UTM_LIMIT),
    referrer: safeReferrer(referrer),
    landingPage: safeLandingPage(url),
  });
}

function isAttribution(value: unknown): value is TrackingAttribution {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "referrer", "landingPage"]
    .every((key) => record[key] === null || typeof record[key] === "string");
}

export function getFirstTouchAttribution(
  storage: StorageLike,
  url: string,
  referrer: string,
): TrackingAttribution {
  try {
    const stored = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isAttribution(parsed)) return Object.freeze(parsed);
    }
  } catch {
    // Storage indisponível ou corrompido: usa a captura atual em memória.
  }
  const attribution = readAttribution(url, referrer);
  try {
    storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // O tracking não pode impedir o fluxo funcional.
  }
  return attribution;
}

export function getJourneyId(storage: StorageLike, randomId: () => string): string {
  try {
    const stored = storage.getItem(SESSION_STORAGE_KEY);
    if (stored && UUID_PATTERN.test(stored)) return stored;
  } catch {
    // Segue com um identificador efêmero.
  }
  const id = randomId();
  try {
    storage.setItem(SESSION_STORAGE_KEY, id);
  } catch {
    // Segue sem persistência entre navegações.
  }
  return id;
}

export function toLeadAttribution(attribution: TrackingAttribution): LeadAttribution {
  return { ...attribution };
}
