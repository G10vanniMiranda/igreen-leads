export type SupabaseServerHeaders = Readonly<{
  apikey: string;
  Authorization?: string;
}>;

const LEGACY_JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MODERN_SECRET_PATTERN = /^sb_secret_[A-Za-z0-9]+_[A-Za-z0-9]+$/;
const PLACEHOLDER_PATTERN = /^(?:placeholder|change-?me|your[-_].*|<.*>)$/i;

export class SupabaseServerCredentialError extends Error {
  constructor() {
    super("Invalid Supabase server credential");
    this.name = "SupabaseServerCredentialError";
  }
}

export function buildSupabaseServerHeaders(
  credential: string | undefined,
): SupabaseServerHeaders {
  if (
    typeof credential !== "string"
    || credential.length === 0
    || credential !== credential.trim()
    || /\s|[\u0000-\u001f\u007f]/.test(credential)
    || PLACEHOLDER_PATTERN.test(credential)
  ) {
    throw new SupabaseServerCredentialError();
  }

  if (credential.startsWith("sb_secret_")) {
    if (!MODERN_SECRET_PATTERN.test(credential)) throw new SupabaseServerCredentialError();
    return Object.freeze({ apikey: credential });
  }

  if (!LEGACY_JWT_PATTERN.test(credential)) throw new SupabaseServerCredentialError();

  return Object.freeze({
    apikey: credential,
    Authorization: `Bearer ${credential}`,
  });
}
