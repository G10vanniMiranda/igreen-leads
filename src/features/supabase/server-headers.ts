export type SupabaseServerHeaders = Readonly<{
  apikey: string;
  Authorization?: string;
}>;

const LEGACY_JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MODERN_SECRET_PREFIX = "sb_secret_";
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

  if (credential.startsWith(MODERN_SECRET_PREFIX)) {
    if (credential.length === MODERN_SECRET_PREFIX.length) throw new SupabaseServerCredentialError();
    return Object.freeze({ apikey: credential });
  }

  if (!LEGACY_JWT_PATTERN.test(credential)) throw new SupabaseServerCredentialError();

  return Object.freeze({
    apikey: credential,
    Authorization: `Bearer ${credential}`,
  });
}
