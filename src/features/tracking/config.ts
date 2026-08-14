import type { AnalyticsEnvironment, ProviderConfig } from "./providers";

type AnalyticsEnvironmentInput = Readonly<{
  ANALYTICS_ENVIRONMENT?: string;
  META_PIXEL_ENABLED?: string;
  META_PIXEL_ID?: string;
  GA_ENABLED?: string;
  GA_MEASUREMENT_ID?: string;
}>;

export type AnalyticsConfig = Readonly<{
  environment: AnalyticsEnvironment;
  meta: Omit<ProviderConfig, "consentGranted">;
  ga: Omit<ProviderConfig, "consentGranted">;
}>;

function parseEnvironment(value: string | undefined): AnalyticsEnvironment {
  const normalized = value?.trim().toLowerCase() || "local";
  if (normalized === "local" || normalized === "test" || normalized === "preview" || normalized === "production") {
    return normalized;
  }
  throw new Error("[config] ANALYTICS_ENVIRONMENT deve ser local, test, preview ou production.");
}

function parseEnabled(value: string | undefined, name: string): boolean {
  const normalized = value?.trim().toLowerCase() || "false";
  if (normalized !== "true" && normalized !== "false") {
    throw new Error(`[config] ${name} deve ser true ou false.`);
  }
  return normalized === "true";
}

function providerConfig(
  requested: boolean,
  id: string | undefined,
  environment: AnalyticsEnvironment,
): Omit<ProviderConfig, "consentGranted"> {
  const normalizedId = id?.trim() || null;
  const allowedEnvironment = environment === "test" || environment === "preview";
  return Object.freeze({
    enabled: requested && allowedEnvironment && Boolean(normalizedId),
    id: requested && allowedEnvironment ? normalizedId : null,
    environment,
  });
}
export function parseAnalyticsConfig(env: AnalyticsEnvironmentInput): AnalyticsConfig {
  const environment = parseEnvironment(env.ANALYTICS_ENVIRONMENT);
  return Object.freeze({
    environment,
    meta: providerConfig(parseEnabled(env.META_PIXEL_ENABLED, "META_PIXEL_ENABLED"), env.META_PIXEL_ID, environment),
    ga: providerConfig(parseEnabled(env.GA_ENABLED, "GA_ENABLED"), env.GA_MEASUREMENT_ID, environment),
  });
}
