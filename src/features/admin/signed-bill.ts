export const BILL_SIGNED_URL_TTL_SECONDS = 120;

export class SignedBillError extends Error {
  constructor() { super("Unable to create private bill access"); this.name = "SignedBillError"; }
}

export async function createSignedBillUrl(
  bucket: string,
  path: string,
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
): Promise<string> {
  if (!url || !key || bucket !== "lead-documents" || !path) throw new SignedBillError();
  const response = await fetch(
    `${url.replace(/\/$/, "")}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`,
    { method: "POST", cache: "no-store", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: BILL_SIGNED_URL_TTL_SECONDS }) },
  );
  if (!response.ok) throw new SignedBillError();
  const data = await response.json() as { signedURL?: unknown; signedUrl?: unknown };
  const signed = typeof data.signedURL === "string" ? data.signedURL : data.signedUrl;
  if (typeof signed !== "string") throw new SignedBillError();
  return new URL(signed, url).toString();
}
