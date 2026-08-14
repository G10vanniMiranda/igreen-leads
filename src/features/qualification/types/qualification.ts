export type CustomerType = "residential" | "business" | "rural";

export type PriorityStateCode = "MG" | "PE" | "BA" | "MS" | "MT" | "CE";
export type StateCode = PriorityStateCode | "OTHER";

export type UtilityProvider =
  | "cemig"
  | "neoenergia_pernambuco"
  | "neoenergia_coelba"
  | "energisa_ms"
  | "energisa_mt"
  | "enel_ceara"
  | "other";

export type BillRange =
  | "up_to_150"
  | "151_to_300"
  | "301_to_500"
  | "501_to_1000"
  | "1001_to_2000"
  | "above_2000";

export type AccountHolderStatus = "yes" | "no" | "unsure";
export type SocialBenefitStatus = "yes" | "no" | "unknown";

export type QualificationStep =
  | "customerType"
  | "state"
  | "utilityProvider"
  | "billRange"
  | "accountHolder"
  | "socialBenefit";

export type QualificationAnswers = {
  customerType: CustomerType | null;
  state: StateCode | null;
  utilityProvider: UtilityProvider | null;
  utilityProviderName: string;
  billRange: BillRange | null;
  accountHolder: AccountHolderStatus | null;
  socialBenefit: SocialBenefitStatus | null;
};

export type CompletedQualificationAnswers = Omit<
  QualificationAnswers,
  | "customerType"
  | "state"
  | "utilityProvider"
  | "billRange"
  | "accountHolder"
  | "socialBenefit"
> & {
  customerType: CustomerType;
  state: StateCode;
  utilityProvider: UtilityProvider;
  billRange: BillRange;
  accountHolder: AccountHolderStatus;
  socialBenefit: SocialBenefitStatus;
};

export type QualificationReviewReason =
  | "social_benefit"
  | "account_holder"
  | "other_state"
  | "other_utility_provider";

export type QualificationResult = Readonly<{
  status: "initial_analysis_completed";
  requiresReview: boolean;
  reviewReasons: readonly QualificationReviewReason[];
  answers: CompletedQualificationAnswers;
}>;

export type QualificationView = "questions" | "result" | "next_step";

export type QualificationState = Readonly<{
  view: QualificationView;
  stepIndex: number;
  answers: QualificationAnswers;
  result: QualificationResult | null;
}>;

export type QualificationAction =
  | { type: "answer_customer_type"; value: CustomerType }
  | { type: "answer_state"; value: StateCode }
  | { type: "answer_utility_provider"; value: UtilityProvider }
  | { type: "answer_utility_provider_name"; value: string }
  | { type: "answer_bill_range"; value: BillRange }
  | { type: "answer_account_holder"; value: AccountHolderStatus }
  | { type: "answer_social_benefit"; value: SocialBenefitStatus }
  | { type: "next" }
  | { type: "back" }
  | { type: "continue_to_next_step" };
