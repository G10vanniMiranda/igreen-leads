import type { QualificationResult, QualificationStep } from "../types/qualification";

export type QualificationEvent =
  | { name: "qualification_started" }
  | {
      name: "qualification_step_completed";
      step: QualificationStep;
      stepNumber: number;
    }
  | {
      name: "qualification_completed";
      requiresReview: QualificationResult["requiresReview"];
    };

export interface QualificationTracker {
  track(event: QualificationEvent): void;
}

const noopQualificationTracker: QualificationTracker = {
  track() {
    // Ponto de extensão intencional: nenhum evento sai da aplicação nesta task.
  },
};

export function trackQualificationEvent(event: QualificationEvent): void {
  noopQualificationTracker.track(event);
}
