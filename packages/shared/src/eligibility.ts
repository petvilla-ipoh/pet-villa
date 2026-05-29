import { SERVICE_RULES } from "./constants";
import type { DogEligibilityInput } from "./types";

export type EligibilityResult = {
  accepted: boolean;
  reasons: string[];
};

export function evaluateDogEligibility(input: DogEligibilityInput): EligibilityResult {
  const reasons: string[] = [];

  if (input.weightKg < SERVICE_RULES.minDogWeightKg) {
    reasons.push("Dog must be at least 1kg.");
  }

  if (input.weightKg > SERVICE_RULES.maxDogWeightKg) {
    reasons.push("Only small dogs from 1kg to 12kg are accepted.");
  }

  if (input.hasAggression) {
    reasons.push("Aggressive dogs cannot be accepted.");
  }

  if (input.hasFleas) {
    reasons.push("Dogs with fleas cannot be accepted.");
  }

  if (input.vaccineStatus !== "valid") {
    reasons.push("Valid vaccination or health proof is required.");
  }

  return { accepted: reasons.length === 0, reasons };
}

export function assertDailyCapacity(acceptedDogCount: number): void {
  if (acceptedDogCount >= SERVICE_RULES.maxDogsPerDay) {
    throw new Error("Daily capacity reached: maximum 3 dogs.");
  }
}
