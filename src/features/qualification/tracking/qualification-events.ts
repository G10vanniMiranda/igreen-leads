import type { QualificationResult, QualificationStep } from "../types/qualification";
import { getBrowserTracker } from "../../tracking/client";

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

export function trackQualificationEvent(event: QualificationEvent): void {
  const { name, ...context } = event;
  getBrowserTracker()?.track(name, context);
}
