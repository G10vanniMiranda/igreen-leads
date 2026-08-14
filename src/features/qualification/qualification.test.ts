import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getUtilityProviderOptions,
  UTILITY_PROVIDER_OPTIONS,
} from "./config/qualification-options.ts";
import type {
  QualificationAction,
  QualificationAnswers,
  QualificationState,
} from "./types/qualification.ts";
import {
  createInitialQualificationState,
  deriveQualificationResult,
  getCurrentStep,
  qualificationReducer,
} from "./utils/qualification-machine.ts";

const completeAnswers: QualificationAnswers = {
  customerType: "residential",
  state: "MG",
  utilityProvider: "cemig",
  utilityProviderName: "",
  billRange: "301_to_500",
  accountHolder: "yes",
  socialBenefit: "no",
};

function reduce(
  state: QualificationState,
  ...actions: QualificationAction[]
): QualificationState {
  return actions.reduce(qualificationReducer, state);
}

describe("derivação do resultado", () => {
  test("marca requiresReview somente para sinais de atenção conhecidos", () => {
    const standardResult = deriveQualificationResult(completeAnswers);
    const reviewResult = deriveQualificationResult({
      ...completeAnswers,
      accountHolder: "no",
      socialBenefit: "yes",
    });

    assert.equal(standardResult.requiresReview, false);
    assert.deepEqual(standardResult.reviewReasons, []);
    assert.equal(reviewResult.requiresReview, true);
    assert.deepEqual(reviewResult.reviewReasons, [
      "social_benefit",
      "account_holder",
    ]);
  });

  test("outro estado e outra distribuidora não geram reprovação automática", () => {
    const otherStateResult = deriveQualificationResult({
      ...completeAnswers,
      state: "OTHER",
      utilityProvider: "other",
      utilityProviderName: "Distribuidora regional",
    });
    const otherProviderResult = deriveQualificationResult({
      ...completeAnswers,
      utilityProvider: "other",
      utilityProviderName: "Outra distribuidora",
    });

    assert.equal(otherStateResult.status, "initial_analysis_completed");
    assert.equal(otherStateResult.requiresReview, true);
    assert.deepEqual(otherStateResult.reviewReasons, [
      "other_state",
      "other_utility_provider",
    ]);
    assert.equal(otherProviderResult.status, "initial_analysis_completed");
    assert.deepEqual(otherProviderResult.reviewReasons, [
      "other_utility_provider",
    ]);
    assert.equal("approved" in otherStateResult, false);
    assert.equal("rejected" in otherStateResult, false);
  });
});

describe("configuração de distribuidoras", () => {
  test("oferece as opções prioritárias corretas para cada estado", () => {
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(UTILITY_PROVIDER_OPTIONS).map(([state, options]) => [
          state,
          options.map((option) => option.label),
        ]),
      ),
      {
        MG: ["Cemig", "Outra distribuidora"],
        PE: ["Neoenergia Pernambuco", "Outra distribuidora"],
        BA: ["Neoenergia Coelba", "Outra distribuidora"],
        MS: ["Energisa MS", "Outra distribuidora"],
        MT: ["Energisa MT", "Outra distribuidora"],
        CE: ["Enel Ceará", "Outra distribuidora"],
      },
    );
    assert.deepEqual(getUtilityProviderOptions("OTHER"), []);
  });
});

describe("fluxo de pré-qualificação", () => {
  test("percorre o fluxo principal e conclui a análise inicial", () => {
    let state = createInitialQualificationState();

    state = reduce(
      state,
      { type: "answer_customer_type", value: "residential" },
      { type: "next" },
      { type: "answer_state", value: "MG" },
      { type: "next" },
      { type: "answer_utility_provider", value: "cemig" },
      { type: "next" },
      { type: "answer_bill_range", value: "301_to_500" },
      { type: "next" },
      { type: "answer_account_holder", value: "yes" },
      { type: "next" },
      { type: "answer_social_benefit", value: "no" },
      { type: "next" },
    );

    assert.equal(state.view, "result");
    assert.equal(state.result?.status, "initial_analysis_completed");
    assert.equal(state.result?.requiresReview, false);

    state = qualificationReducer(state, { type: "continue_to_next_step" });
    assert.equal(state.view, "next_step");
  });

  test("bloqueia avanço incompleto e permite voltar sem perder respostas", () => {
    let state = createInitialQualificationState();

    state = qualificationReducer(state, { type: "next" });
    assert.equal(state.stepIndex, 0);

    state = reduce(
      state,
      { type: "answer_customer_type", value: "business" },
      { type: "next" },
    );
    assert.equal(getCurrentStep(state), "state");

    state = qualificationReducer(state, { type: "back" });
    assert.equal(getCurrentStep(state), "customerType");
    assert.equal(state.answers.customerType, "business");
  });
});
