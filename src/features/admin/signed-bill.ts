export const BILL_SIGNED_URL_TTL_SECONDS = 120;

export class SignedBillError extends Error {
  constructor() { super("Unable to create private bill access"); this.name = "SignedBillError"; }
}

function encodedObjectPath(bucket: string, path: string): string {
  return `${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function supabaseOrigin(url: string): URL {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new SignedBillError();
    return new URL(parsed.origin);
  } catch {
    throw new SignedBillError();
  }
}

export function normalizeSignedBillUrl(signed: string, url: string, bucket: string, path: string): string {
  if (!signed || signed !== signed.trim() || /[\r\n]/.test(signed)) throw new SignedBillError();
  const origin = supabaseOrigin(url);
  let candidate: URL;

  try {
    if (signed.startsWith("/")) candidate = new URL(signed, origin);
    else {
      candidate = new URL(signed);
      if (candidate.origin !== origin.origin) throw new SignedBillError();
    }
  } catch {
    throw new SignedBillError();
  }

  if (candidate.protocol !== "https:" || candidate.origin !== origin.origin || candidate.hash) throw new SignedBillError();

  const shortPrefix = "/object/sign/";
  const canonicalPrefix = "/storage/v1/object/sign/";
  const objectPath = candidate.pathname.startsWith(canonicalPrefix)
    ? candidate.pathname.slice(canonicalPrefix.length)
    : candidate.pathname.startsWith(shortPrefix)
      ? candidate.pathname.slice(shortPrefix.length)
      : null;

  if (objectPath !== encodedObjectPath(bucket, path) || !candidate.searchParams.get("token")) throw new SignedBillError();
  candidate.pathname = `${canonicalPrefix}${objectPath}`;
  return candidate.toString();
}

export async function createSignedBillUrl(
  bucket: string,
  path: string,
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
): Promise<string> {
  if (!url || !key || bucket !== "lead-documents" || !path) throw new SignedBillError();
  const origin = supabaseOrigin(url);
  const objectPath = encodedObjectPath(bucket, path);
  const response = await fetch(
    `${origin.origin}/storage/v1/object/sign/${objectPath}`,
    { method: "POST", cache: "no-store", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: BILL_SIGNED_URL_TTL_SECONDS }) },
  );
  if (!response.ok) throw new SignedBillError();
  const data = await response.json() as { signedURL?: unknown; signedUrl?: unknown };
  const signed = typeof data.signedURL === "string" ? data.signedURL : data.signedUrl;
  if (typeof signed !== "string") throw new SignedBillError();
  return normalizeSignedBillUrl(signed, origin.origin, bucket, path);
}
