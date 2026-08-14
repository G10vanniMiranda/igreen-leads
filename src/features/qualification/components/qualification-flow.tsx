"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  LeadValidationError,
  formatBrazilianPhoneInput,
  parseLeadSubmission,
} from "../../leads/schemas/lead-submission";
import type {
  LeadAttribution,
  LeadSubmissionResponse,
} from "../../leads/types/lead";
import {
  ACCOUNT_HOLDER_OPTIONS,
  BILL_RANGE_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  getUtilityProviderOptions,
  QUALIFICATION_QUESTIONS,
  QUALIFICATION_STEPS,
  SOCIAL_BENEFIT_OPTIONS,
  STATE_OPTIONS,
  type QualificationOption,
} from "../config/qualification-options";
import { trackQualificationEvent } from "../tracking/qualification-events";
import type { QualificationAction } from "../types/qualification";
import {
  canAdvance,
  createInitialQualificationState,
  deriveQualificationResult,
  getCurrentStep,
  qualificationReducer,
} from "../utils/qualification-machine";

type ChoiceOptionsProps<T extends string> = {
  name: string;
  options: readonly QualificationOption<T>[];
  value: T | null;
  onChange(value: T): void;
};

function ChoiceOptions<T extends string>({
  name,
  options,
  value,
  onChange,
}: ChoiceOptionsProps<T>) {
  return (
    <div className="qualification-options">
      {options.map((option) => (
        <label key={option.value} className="qualification-option-label">
          <input
            className="peer sr-only"
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="qualification-option">
            <span>{option.label}</span>
            <span aria-hidden="true" className="qualification-option-marker">
              <svg viewBox="0 0 20 20" className="size-4" fill="none">
                <path
                  d="m5.8 10 2.6 2.6 5.8-5.8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ReviewNotice() {
  return (
    <div className="qualification-review-note" role="status">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0">
        <path
          d="M10 6.5v4M10 14h.01M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
      <span>Algumas condições precisam de análise adicional.</span>
    </div>
  );
}

function ResultIcon() {
  return (
    <span className="qualification-result-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-7" fill="none">
        <path
          d="m6 12.2 3.7 3.7L18 7.7"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    </span>
  );
}

export function QualificationFlow() {
  const [state, dispatch] = useReducer(
    qualificationReducer,
    undefined,
    createInitialQualificationState,
  );
  const focusTargetRef = useRef<HTMLHeadingElement>(null);
  const hasMountedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const submissionIdRef = useRef("");
  const [contact, setContact] = useState({
    name: "",
    phone: "",
    consentContact: false,
  });
  const [contactErrors, setContactErrors] = useState<
    Readonly<Record<string, string>>
  >({});
  const [submissionState, setSubmissionState] = useState<
    "idle" | "submitting" | "error" | "success" | "complete"
  >("idle");

  const currentStep = getCurrentStep(state);
  const stepNumber = state.stepIndex + 1;
  const isLastQuestion = state.stepIndex === QUALIFICATION_STEPS.length - 1;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    focusTargetRef.current?.focus();
  }, [state.stepIndex, state.view]);

  function answer(action: QualificationAction) {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackQualificationEvent({ name: "qualification_started" });
    }

    dispatch(action);
  }

  function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canAdvance(state)) {
      return;
    }

    trackQualificationEvent({
      name: "qualification_step_completed",
      step: currentStep,
      stepNumber,
    });

    if (isLastQuestion) {
      const result = deriveQualificationResult(state.answers);
      trackQualificationEvent({
        name: "qualification_completed",
        requiresReview: result.requiresReview,
      });
    }

    dispatch({ type: "next" });
  }

  function continueToContact() {
    if (!submissionIdRef.current) {
      submissionIdRef.current = crypto.randomUUID();
    }
    dispatch({ type: "continue_to_next_step" });
  }

  function getAttribution(): LeadAttribution {
    const pageUrl = new URL(window.location.href);
    return {
      utmSource: pageUrl.searchParams.get("utm_source"),
      utmMedium: pageUrl.searchParams.get("utm_medium"),
      utmCampaign: pageUrl.searchParams.get("utm_campaign"),
      utmContent: pageUrl.searchParams.get("utm_content"),
      utmTerm: pageUrl.searchParams.get("utm_term"),
      referrer: document.referrer || null,
      landingPage: pageUrl.href,
    };
  }

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.result || submissionState === "submitting") return;

    const candidate = {
      submissionId: submissionIdRef.current,
      name: contact.name,
      phone: contact.phone,
      consentContact: contact.consentContact,
      qualification: state.result.answers,
      attribution: getAttribution(),
    };

    try {
      parseLeadSubmission(candidate);
      setContactErrors({});
    } catch (error) {
      if (error instanceof LeadValidationError) {
        setContactErrors(error.fieldErrors);
        return;
      }
      setContactErrors({ form: "Revise os dados informados." });
      return;
    }

    setSubmissionState("submitting");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });
      const result = (await response.json()) as LeadSubmissionResponse;
      if (!response.ok || !result.ok) {
        if (!result.ok && result.fieldErrors) setContactErrors(result.fieldErrors);
        setSubmissionState("error");
        return;
      }
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  function renderQuestionFields(): ReactNode {
    switch (currentStep) {
      case "customerType":
        return (
          <ChoiceOptions
            name="customerType"
            options={CUSTOMER_TYPE_OPTIONS}
            value={state.answers.customerType}
            onChange={(value) => answer({ type: "answer_customer_type", value })}
          />
        );
      case "state":
        return (
          <ChoiceOptions
            name="state"
            options={STATE_OPTIONS}
            value={state.answers.state}
            onChange={(value) => answer({ type: "answer_state", value })}
          />
        );
      case "utilityProvider": {
        const isOtherState = state.answers.state === "OTHER";
        const showProviderName =
          isOtherState || state.answers.utilityProvider === "other";

        return (
          <div className="grid gap-5">
            {!isOtherState && state.answers.state && (
              <ChoiceOptions
                name="utilityProvider"
                options={getUtilityProviderOptions(state.answers.state)}
                value={state.answers.utilityProvider}
                onChange={(value) =>
                  answer({ type: "answer_utility_provider", value })
                }
              />
            )}
            {showProviderName && (
              <label className="qualification-text-field">
                <span>Nome da distribuidora</span>
                <input
                  type="text"
                  value={state.answers.utilityProviderName}
                  onChange={(event) =>
                    answer({
                      type: "answer_utility_provider_name",
                      value: event.currentTarget.value,
                    })
                  }
                  placeholder="Digite o nome que aparece na conta"
                  autoComplete="off"
                />
              </label>
            )}
          </div>
        );
      }
      case "billRange":
        return (
          <ChoiceOptions
            name="billRange"
            options={BILL_RANGE_OPTIONS}
            value={state.answers.billRange}
            onChange={(value) => answer({ type: "answer_bill_range", value })}
          />
        );
      case "accountHolder":
        return (
          <ChoiceOptions
            name="accountHolder"
            options={ACCOUNT_HOLDER_OPTIONS}
            value={state.answers.accountHolder}
            onChange={(value) =>
              answer({ type: "answer_account_holder", value })
            }
          />
        );
      case "socialBenefit":
        return (
          <ChoiceOptions
            name="socialBenefit"
            options={SOCIAL_BENEFIT_OPTIONS}
            value={state.answers.socialBenefit}
            onChange={(value) =>
              answer({ type: "answer_social_benefit", value })
            }
          />
        );
    }
  }

  if (state.view === "result") {
    return (
      <div className="qualification-panel qualification-result" aria-live="polite">
        <ResultIcon />
        <p className="text-sm font-bold tracking-[0.14em] text-primary uppercase">
          Pré-qualificação finalizada
        </p>
        <h3
          ref={focusTargetRef}
          tabIndex={-1}
          className="mt-3 text-3xl font-semibold tracking-[-0.04em] outline-none sm:text-4xl"
        >
          Análise inicial concluída
        </h3>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Com essas informações, já podemos avançar para a análise da sua conta
          de energia.
        </p>
        {state.result?.requiresReview && <ReviewNotice />}
        <div className="qualification-result-actions">
          <button
            type="button"
            className="qualification-button qualification-button-secondary"
            onClick={() => dispatch({ type: "back" })}
          >
            Voltar
          </button>
          <button
            type="button"
            className="qualification-button qualification-button-primary"
            onClick={continueToContact}
          >
            Continuar minha análise
          </button>
        </div>
      </div>
    );
  }

  if (state.view === "next_step") {
    if (submissionState === "success" || submissionState === "complete") {
      return (
        <div
          className="qualification-panel qualification-result"
          aria-live="polite"
        >
          <ResultIcon />
          <p className="text-sm font-bold tracking-[0.14em] text-primary uppercase">
            Dados recebidos
          </p>
          <h3
            ref={focusTargetRef}
            tabIndex={-1}
            className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] outline-none sm:text-4xl"
          >
            Recebemos suas informações.
          </h3>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            Agora vamos analisar os dados iniciais da sua conta e orientar você
            sobre a próxima etapa.
          </p>
          {submissionState === "success" ? (
            <div className="qualification-result-actions">
              <button
                type="button"
                className="qualification-button qualification-button-primary"
                onClick={() => setSubmissionState("complete")}
              >
                Continuar
              </button>
            </div>
          ) : (
            <p className="mt-6 font-semibold text-primary" role="status">
              Solicitação registrada. Você pode fechar esta página com segurança.
            </p>
          )}
        </div>
      );
    }

    return (
      <form className="qualification-panel" onSubmit={handleContactSubmit} noValidate>
        <p className="text-sm font-bold tracking-[0.14em] text-primary uppercase">
          Dados de contato
        </p>
        <h3
          ref={focusTargetRef}
          tabIndex={-1}
          className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] outline-none sm:text-4xl"
        >
          Como podemos falar com você?
        </h3>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Informe somente seu nome e WhatsApp para continuarmos a análise inicial.
        </p>

        <div className="qualification-contact-fields">
          <label className="qualification-text-field">
            <span>Nome</span>
            <input
              type="text"
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
              value={contact.name}
              aria-invalid={Boolean(contactErrors.name)}
              aria-describedby={contactErrors.name ? "contact-name-error" : undefined}
              onChange={(event) =>
                setContact((current) => ({ ...current, name: event.target.value }))
              }
            />
            {contactErrors.name && (
              <span id="contact-name-error" className="qualification-field-error">
                {contactErrors.name}
              </span>
            )}
          </label>

          <label className="qualification-text-field">
            <span>WhatsApp</span>
            <input
              type="tel"
              name="phone"
              inputMode="tel"
              autoComplete="tel-national"
              maxLength={16}
              required
              placeholder="(31) 99999-1234"
              value={contact.phone}
              aria-invalid={Boolean(contactErrors.phone)}
              aria-describedby={contactErrors.phone ? "contact-phone-error" : undefined}
              onChange={(event) =>
                setContact((current) => ({
                  ...current,
                  phone: formatBrazilianPhoneInput(event.target.value),
                }))
              }
            />
            {contactErrors.phone && (
              <span id="contact-phone-error" className="qualification-field-error">
                {contactErrors.phone}
              </span>
            )}
          </label>

          <label className="qualification-consent">
            <input
              type="checkbox"
              name="consentContact"
              required
              checked={contact.consentContact}
              aria-invalid={Boolean(contactErrors.consentContact)}
              aria-describedby={contactErrors.consentContact ? "contact-consent-error" : undefined}
              onChange={(event) =>
                setContact((current) => ({
                  ...current,
                  consentContact: event.target.checked,
                }))
              }
            />
            <span>
              Autorizo o contato para análise da minha conta de energia e
              continuidade do atendimento.
            </span>
          </label>
          {contactErrors.consentContact && (
            <span id="contact-consent-error" className="qualification-field-error">
              {contactErrors.consentContact}
            </span>
          )}

          {submissionState === "error" && (
            <p className="qualification-submit-error" role="alert">
              Não foi possível enviar agora. Tente novamente.
            </p>
          )}
        </div>

        <div className="qualification-actions">
          <button
            type="button"
            className="qualification-button qualification-button-secondary"
            onClick={() => dispatch({ type: "back" })}
            disabled={submissionState === "submitting"}
          >
            Voltar ao resultado
          </button>
          <button
            type="submit"
            className="qualification-button qualification-button-primary"
            disabled={submissionState === "submitting"}
          >
            {submissionState === "submitting" ? "Enviando..." : "Enviar dados"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="qualification-panel" onSubmit={handleNext} noValidate>
      <div className="qualification-progress-row">
        <p className="text-sm font-semibold text-muted">
          Etapa {stepNumber} de {QUALIFICATION_STEPS.length}
        </p>
        <p className="text-sm font-semibold text-primary">Leva menos de 1 min</p>
      </div>
      <div
        className="qualification-progress"
        role="progressbar"
        aria-label="Progresso da pré-qualificação"
        aria-valuemin={1}
        aria-valuemax={QUALIFICATION_STEPS.length}
        aria-valuenow={stepNumber}
      >
        <span
          style={{ width: `${(stepNumber / QUALIFICATION_STEPS.length) * 100}%` }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        Etapa {stepNumber} de {QUALIFICATION_STEPS.length}:{" "}
        {QUALIFICATION_QUESTIONS[currentStep]}
      </p>

      <fieldset className="mt-8 border-0 p-0 sm:mt-10">
        <legend className="sr-only">{QUALIFICATION_QUESTIONS[currentStep]}</legend>
        <h3
          ref={focusTargetRef}
          tabIndex={-1}
          className="max-w-3xl text-2xl font-semibold tracking-[-0.035em] outline-none sm:text-3xl"
        >
          {QUALIFICATION_QUESTIONS[currentStep]}
        </h3>
        <div className="mt-6">{renderQuestionFields()}</div>
      </fieldset>

      <div className="qualification-actions">
        <button
          type="button"
          className="qualification-button qualification-button-secondary"
          onClick={() => dispatch({ type: "back" })}
          disabled={state.stepIndex === 0}
        >
          Voltar
        </button>
        <button
          type="submit"
          className="qualification-button qualification-button-primary"
          disabled={!canAdvance(state)}
        >
          {isLastQuestion ? "Concluir análise inicial" : "Continuar"}
        </button>
      </div>
    </form>
  );
}
