import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, test } from "node:test";
import { SupabaseAdminRepository } from "../admin/repository";
import { createSignedBillUrl } from "../admin/signed-bill";
import { SupabaseDocumentRepository } from "../documents/repository/supabase-document-repository";
import { SupabaseDocumentStorage } from "../documents/storage/supabase-document-storage";
import type { ValidatedBill } from "../documents/types/document";
import { SupabaseLeadRepository } from "../leads/repository/supabase-lead-repository";
import type { LeadInsertPayload } from "../leads/types/lead";
import { buildSupabaseServerHeaders } from "./server-headers";

const url = "https://test.supabase.co";
const modernCredential = "sb_secret_testonlyfixture_checksum";
const legacyCredential = ["legacyHeader", "legacyPayload", "legacySignature"].join(".");
const leadId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";

const leadPayload: LeadInsertPayload = {
  submissionId: "33333333-3333-4333-8333-333333333333",
  name: "Lead técnico",
  phone: "+5592999990000",
  customerType: "residential",
  state: "MG",
  utilityProvider: "cemig",
  utilityProviderOther: null,
  billRange: "301_to_500",
  accountHolderStatus: "yes",
  socialBenefitStatus: "no",
  requiresReview: false,
  status: "NEW",
  consentContact: true,
  attribution: {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    referrer: null,
    landingPage: null,
  },
  igreenReferralId: "8963",
};

const bill: ValidatedBill = {
  originalFilename: "fatura.pdf",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: 14,
  bytes: new TextEncoder().encode("%PDF-1.4\n%%EOF"),
};

function capturedHeaders(init: RequestInit | undefined): Headers {
  return new Headers(init?.headers);
}

async function withFetch<T>(
  response: (input: RequestInfo | URL, init?: RequestInit) => Response,
  operation: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input, init) => response(input, init)) as typeof fetch;
  try {
    return await operation();
  } finally {
    globalThis.fetch = original;
  }
}

function assertModernHeaders(headers: Headers) {
  assert.equal(headers.get("apikey"), modernCredential);
  assert.equal(headers.has("authorization"), false);
}

describe("Supabase server credential compatibility", () => {
  test("credencial vazia, placeholder ou formato desconhecido falha sem logs", () => {
    const invalidCredentials = [
      undefined,
      "",
      "   ",
      "placeholder",
      "<service-role-key>",
      "your-supabase-service-role-key",
      "sb_secret_placeholder",
      "sb_secret_test fixture",
      "opaque-unknown-credential",
    ];
    const calls: unknown[][] = [];
    const originals = [console.log, console.info, console.warn, console.error];
    console.log = console.info = console.warn = console.error = (...args: unknown[]) => { calls.push(args); };
    try {
      for (const credential of invalidCredentials) {
        assert.throws(
          () => buildSupabaseServerHeaders(credential),
          (error: unknown) => error instanceof Error
            && error.message === "Invalid Supabase server credential"
            && (!credential || !error.message.includes(credential)),
        );
      }
    } finally {
      [console.log, console.info, console.warn, console.error] = originals;
    }
    assert.deepEqual(calls, []);
  });

  test("JWT legado mantém apikey e Authorization Bearer", async () => {
    let headers = new Headers();
    await withFetch(
      (_input, init) => {
        headers = capturedHeaders(init);
        return Response.json([{ lead_id: leadId, created: true }]);
      },
      () => new SupabaseLeadRepository(url, legacyCredential).create(leadPayload),
    );
    assert.equal(headers.get("apikey"), legacyCredential);
    assert.equal(headers.get("authorization"), `Bearer ${legacyCredential}`);
  });

  test("lead RPC usa sb_secret_ somente em apikey", async () => {
    let headers = new Headers();
    await withFetch(
      (_input, init) => {
        headers = capturedHeaders(init);
        return Response.json([{ lead_id: leadId, created: true }]);
      },
      () => new SupabaseLeadRepository(url, modernCredential).create(leadPayload),
    );
    assertModernHeaders(headers);
  });

  test("document RPC usa sb_secret_ somente em apikey", async () => {
    let headers = new Headers();
    await withFetch(
      (_input, init) => {
        headers = capturedHeaders(init);
        return Response.json([{ lead_id: leadId, existing_document_id: null }]);
      },
      () => new SupabaseDocumentRepository(url, modernCredential).findTarget(leadPayload.submissionId),
    );
    assertModernHeaders(headers);
  });

  test("Storage upload e cleanup usam sb_secret_ somente em apikey", async () => {
    const requests: Array<{ method: string; headers: Headers }> = [];
    await withFetch(
      (_input, init) => {
        requests.push({ method: init?.method ?? "GET", headers: capturedHeaders(init) });
        return new Response(null, { status: 200 });
      },
      async () => {
        const storage = new SupabaseDocumentStorage(url, modernCredential);
        await storage.upload("lead-documents", `${leadId}/${documentId}.pdf`, bill);
        await storage.remove("lead-documents", `${leadId}/${documentId}.pdf`);
      },
    );
    assert.deepEqual(requests.map(({ method }) => method), ["POST", "DELETE"]);
    for (const request of requests) assertModernHeaders(request.headers);
  });

  test("admin RPC usa sb_secret_ somente em apikey", async () => {
    let headers = new Headers();
    await withFetch(
      (_input, init) => {
        headers = capturedHeaders(init);
        return Response.json({ total: 0 });
      },
      () => new SupabaseAdminRepository(url, modernCredential).dashboard(),
    );
    assertModernHeaders(headers);
  });

  test("signed bill usa sb_secret_ somente em apikey", async () => {
    let headers = new Headers();
    await withFetch(
      (_input, init) => {
        headers = capturedHeaders(init);
        return Response.json({
          signedURL: `/object/sign/lead-documents/${leadId}/${documentId}.pdf?token=temporary-token`,
        });
      },
      () => createSignedBillUrl("lead-documents", `${leadId}/${documentId}.pdf`, url, modernCredential),
    );
    assertModernHeaders(headers);
  });

  test("credencial server-side não é referenciada por Client Components", async () => {
    const sourceRoot = join(process.cwd(), "src");
    const entries = await readdir(sourceRoot, { recursive: true });
    const sourceFiles = entries.filter((entry) => /\.(?:ts|tsx)$/.test(entry));
    for (const entry of sourceFiles) {
      const source = await readFile(join(sourceRoot, entry), "utf8");
      if (!/^\s*["']use client["'];/m.test(source)) continue;
      assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|supabase\/server-headers/);
    }
  });
});
