export const CONSENT_STORAGE_KEY = "igreen.consent.v1";
export const CONSENT_VERSION = "1";
export const CONSENT_CHANGED_EVENT = "igreen:consent-changed";
export const OPEN_CONSENT_EVENT = "igreen:open-consent";

export type ConsentPreferences = Readonly<{
  version: typeof CONSENT_VERSION;
  essential: true;
  analytics: boolean;
  advertising: boolean;
  updatedAt: string;
}>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function defaultConsentPreferences(now = new Date(0)): ConsentPreferences {
  return Object.freeze({
    version: CONSENT_VERSION,
    essential: true,
    analytics: false,
    advertising: false,
    updatedAt: now.toISOString(),
  });
}

function isConsentPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.version === CONSENT_VERSION
    && record.essential === true
    && typeof record.analytics === "boolean"
    && typeof record.advertising === "boolean"
    && typeof record.updatedAt === "string"
    && !Number.isNaN(Date.parse(record.updatedAt));
}

export function readConsentPreferences(storage: StorageLike): ConsentPreferences | null {
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentPreferences(parsed) ? Object.freeze(parsed) : null;
  } catch {
    return null;
  }
}

export function saveConsentPreferences(
  storage: StorageLike,
  choices: Readonly<{ analytics: boolean; advertising: boolean }>,
  now = new Date(),
): ConsentPreferences {
  const preferences = Object.freeze({
    version: CONSENT_VERSION,
    essential: true as const,
    analytics: choices.analytics,
    advertising: choices.advertising,
    updatedAt: now.toISOString(),
  });
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  return preferences;
}

export function containsConsentPii(preferences: ConsentPreferences): boolean {
  return /name|phone|email|whatsapp|lead|document/i.test(JSON.stringify(preferences));
}
