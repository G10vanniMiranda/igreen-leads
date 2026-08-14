import { QUALIFICATION_STEPS } from "../config/qualification-options.ts";
import type {
  CompletedQualificationAnswers,
  QualificationAction,
  QualificationAnswers,
  QualificationResult,
  QualificationState,
  QualificationStep,
} from "../types/qualification.ts";

export const EMPTY_QUALIFICATION_ANSWERS: QualificationAnswers = {
  customerType: null,
  state: null,
  utilityProvider: null,
  utilityProviderName: "",
  billRange: null,
  accountHolder: null,
  socialBenefit: null,
};

export function createInitialQualificationState(): QualificationState {
  return {
    view: "questions",
    stepIndex: 0,
    answers: { ...EMPTY_QUALIFICATION_ANSWERS },
    result: null,
  };
}

export function getCurrentStep(state: QualificationState): QualificationStep {
  return QUALIFICATION_STEPS[state.stepIndex] ?? QUALIFICATION_STEPS[0];
}

export function canAdvance(state: QualificationState): boolean {
  const { answers } = state;

  switch (getCurrentStep(state)) {
    case "customerType":
      return answers.customerType !== null;
    case "state":
      return answers.state !== null;
    case "utilityProvider":
      return (
        answers.utilityProvider !== null &&
        (answers.utilityProvider !== "other" ||
          answers.utilityProviderName.trim().length > 0)
      );
    case "billRange":
      return answers.billRange !== null;
    case "accountHolder":
      return answers.accountHolder !== null;
    case "socialBenefit":
      return answers.socialBenefit !== null;
  }
}

function requireCompletedAnswers(
  answers: QualificationAnswers,
): CompletedQualificationAnswers {
  if (
    answers.customerType === null ||
    answers.state === null ||
    answers.utilityProvider === null ||
    answers.billRange === null ||
    answers.accountHolder === null ||
    answers.socialBenefit === null
  ) {
    throw new Error(
      "Não é possível concluir a pré-qualificação com respostas incompletas.",
    );
  }

  return {
    ...answers,
    utilityProviderName: answers.utilityProviderName.trim(),
    customerType: answers.customerType,
    state: answers.state,
    utilityProvider: answers.utilityProvider,
    billRange: answers.billRange,
    accountHolder: answers.accountHolder,
    socialBenefit: answers.socialBenefit,
  };
}

export function deriveQualificationResult(
  answers: QualificationAnswers,
): QualificationResult {
  const completedAnswers = requireCompletedAnswers(answers);
  const reviewReasons: QualificationResult["reviewReasons"][number][] = [];

  if (completedAnswers.socialBenefit === "yes") {
    reviewReasons.push("social_benefit");
  }

  if (completedAnswers.accountHolder === "no") {
    reviewReasons.push("account_holder");
  }

  if (completedAnswers.state === "OTHER") {
    reviewReasons.push("other_state");
  }

  if (completedAnswers.utilityProvider === "other") {
    reviewReasons.push("other_utility_provider");
  }

  return {
    status: "initial_analysis_completed",
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
    answers: completedAnswers,
  };
}

export function qualificationReducer(
  state: QualificationState,
  action: QualificationAction,
): QualificationState {
  switch (action.type) {
    case "answer_customer_type":
      return {
        ...state,
        answers: { ...state.answers, customerType: action.value },
      };
    case "answer_state":
      return {
        ...state,
        answers: {
          ...state.answers,
          state: action.value,
          utilityProvider: action.value === "OTHER" ? "other" : null,
          utilityProviderName: "",
        },
      };
    case "answer_utility_provider":
      return {
        ...state,
        answers: {
          ...state.answers,
          utilityProvider: action.value,
          utilityProviderName:
            action.value === state.answers.utilityProvider
              ? state.answers.utilityProviderName
              : "",
        },
      };
    case "answer_utility_provider_name":
      return {
        ...state,
        answers: { ...state.answers, utilityProviderName: action.value },
      };
    case "answer_bill_range":
      return {
        ...state,
        answers: { ...state.answers, billRange: action.value },
      };
    case "answer_account_holder":
      return {
        ...state,
        answers: { ...state.answers, accountHolder: action.value },
      };
    case "answer_social_benefit":
      return {
        ...state,
        answers: { ...state.answers, socialBenefit: action.value },
      };
    case "next": {
      if (state.view !== "questions" || !canAdvance(state)) {
        return state;
      }

      if (state.stepIndex < QUALIFICATION_STEPS.length - 1) {
        return { ...state, stepIndex: state.stepIndex + 1 };
      }

      return {
        ...state,
        view: "result",
        result: deriveQualificationResult(state.answers),
      };
    }
    case "back":
      if (state.view === "next_step") {
        return { ...state, view: "result" };
      }

      if (state.view === "result") {
        return {
          ...state,
          view: "questions",
          stepIndex: QUALIFICATION_STEPS.length - 1,
        };
      }

      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "continue_to_next_step":
      return state.view === "result" ? { ...state, view: "next_step" } : state;
  }
}
