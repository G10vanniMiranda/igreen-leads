import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CompletedQualificationAnswers } from "../qualification/types/qualification";
import { LeadPersistenceError } from "./repository/supabase-lead-repository";
import {
  LeadValidationError,
  formatBrazilianPhoneInput,
  normalizeBrazilianPhone,
  parseLeadSubmission,
} from "./schemas/lead-submission";
import { handleLeadPost } from "./services/lead-route-handler";
import {
  mapSubmissionToLead,
  submitLead,
  type LeadRepository,
} from "./services/lead-submission";
import type {
  LeadInsertPayload,
  LeadPersistenceResult,
} from "./types/lead";

const qualification: CompletedQualificationAnswers = {
  customerType: "residential",
  state: "MG",
  utilityProvider: "cemig",
  utilityProviderName: "",
  billRange: "301_to_500",
  accountHolder: "yes",
  socialBenefit: "no",
};

const validBody = {
  submissionId: "c5114a6f-cfeb-4c8c-a13f-18638b2d38f3",
  name: "  José da Silva  ",
  phone: "(31) 99999-1234",
  consentContact: true,
  qualification,
  attribution: {
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "teste",
    utmContent: null,
    utmTerm: null,
    referrer: "https://example.com/",
    landingPage: "https://test.example.com/?utm_source=google",
  },
};

class MemoryLeadRepository implements LeadRepository {
  readonly leads = new Map<string, LeadPersistenceResult>();
  eventCount = 0;

  async create(payload: LeadInsertPayload): Promise<LeadPersistenceResult> {
    const existing = this.leads.get(payload.submissionId);
    if (existing) return { ...existing, created: false };
    const result = { leadId: "4b9cb506-aeab-4b6b-8319-38a6012519d8", created: true };
    this.leads.set(payload.submissionId, result);
    this.eventCount += 1;
    return result;
  }
}

describe("validação do contato", () => {
  test("normaliza nome preservando acentos e limita seu tamanho", () => {
    assert.equal(parseLeadSubmission(validBody).name, "José da Silva");
    assert.throws(
      () => parseLeadSubmission({ ...validBody, name: "A" }),
      LeadValidationError,
    );
    assert.throws(
      () => parseLeadSubmission({ ...validBody, name: "a".repeat(101) }),
      LeadValidationError,
    );
  });

  test("normaliza e valida WhatsApp brasileiro sem assumir DDD", () => {
    assert.equal(normalizeBrazilianPhone("(31) 99999-1234"), "+5531999991234");
    assert.equal(normalizeBrazilianPhone("+55 11 3456-7890"), "+551134567890");
    assert.equal(normalizeBrazilianPhone("9999"), null);
    assert.equal(formatBrazilianPhoneInput("31999991234"), "(31) 99999-1234");
  });

  test("exige consentimento explícito", () => {
    assert.throws(
      () => parseLeadSubmission({ ...validBody, consentContact: false }),
      (error: unknown) =>
        error instanceof LeadValidationError &&
        Boolean(error.fieldErrors.consentContact),
    );
  });

  test("rejeita payloads de qualificação inválidos no servidor", () => {
    assert.throws(
      () =>
        parseLeadSubmission({
          ...validBody,
          qualification: { ...qualification, customerType: "invalid" },
        }),
      LeadValidationError,
    );
  });
});

describe("mapeamento e persistência", () => {
  test("mapeia QualificationAnswers para o payload mínimo do lead", () => {
    const parsed = parseLeadSubmission(validBody);
    const payload = mapSubmissionToLead(parsed, "8963");
    assert.equal(payload.customerType, "residential");
    assert.equal(payload.state, "MG");
    assert.equal(payload.utilityProvider, "cemig");
    assert.equal(payload.utilityProviderOther, null);
    assert.equal(payload.phone, "+5531999991234");
    assert.equal(payload.igreenReferralId, "8963");
  });

  test("preserva requiresReview derivado das respostas", () => {
    const parsed = parseLeadSubmission({
      ...validBody,
      qualification: { ...qualification, socialBenefit: "yes" },
    });
    assert.equal(mapSubmissionToLead(parsed, null).requiresReview, true);
  });

  test("todo novo lead nasce com status NEW", () => {
    const payload = mapSubmissionToLead(parseLeadSubmission(validBody), null);
    assert.equal(payload.status, "NEW");
  });

  test("submission ID torna retries idempotentes", async () => {
    const repository = new MemoryLeadRepository();
    const parsed = parseLeadSubmission(validBody);
    const first = await submitLead(parsed, repository, null);
    const retry = await submitLead(parsed, repository, null);
    assert.equal(first.created, true);
    assert.equal(retry.created, false);
    assert.equal(first.leadId, retry.leadId);
    assert.equal(repository.leads.size, 1);
    assert.equal(repository.eventCount, 1);
  });
});

describe("Route Handler", () => {
  test("responde sucesso sem expor detalhes internos", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      new MemoryLeadRepository(),
      "8963",
    );
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(response.status, 201);
    assert.equal(body.ok, true);
    assert.equal(body.leadId, "4b9cb506-aeab-4b6b-8319-38a6012519d8");
  });

  test("rejeita tentativa inválida server-side", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({ ...validBody, phone: "123" }),
      }),
      new MemoryLeadRepository(),
    );
    const body = (await response.json()) as Record<string, unknown>;
    assert.equal(response.status, 400);
    assert.equal(body.code, "INVALID_INPUT");
  });

  test("erro de persistência retorna somente mensagem pública", async () => {
    const failingRepository: LeadRepository = {
      async create() {
        throw new LeadPersistenceError("upstream");
      },
    };
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify(validBody),
      }),
      failingRepository,
    );
    const serialized = JSON.stringify(await response.json());
    assert.equal(response.status, 503);
    assert.match(serialized, /Não foi possível enviar agora/);
    assert.doesNotMatch(serialized, /Postgres|Supabase|upstream|project/i);
  });

  test("bloqueia corpos absurdamente grandes antes da validação", async () => {
    const response = await handleLeadPost(
      new Request("http://localhost/api/leads", {
        method: "POST",
        body: JSON.stringify({ ...validBody, name: "x".repeat(17_000) }),
      }),
      new MemoryLeadRepository(),
    );
    assert.equal(response.status, 413);
  });
});
