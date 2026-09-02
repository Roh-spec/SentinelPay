import { policy } from "./policy";
import type { RootCause, StoppingCheck } from "./types";

export interface StoppingInput {
  rootCause: RootCause;
  attemptsUsed: number;
  nudgeSent: boolean;
  optedOut: boolean;
  openedAt: Date;
  now: Date;
  discountOfferedBps: number;
  batchDiscountUsedPaise: number;
  batchDiscountOfferPaise: number;
}

export function evaluateStopping(input: StoppingInput): StoppingCheck {
  if (input.optedOut) {
    return { stop: true, reason: "customer_opted_out" };
  }
  if (input.rootCause === "fraud_suspected") {
    return { stop: true, reason: "fraud_hard_stop", escalate: true };
  }
  const ageDays =
    (input.now.getTime() - input.openedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > policy.timeboxDays) {
    return { stop: true, reason: "timebox_exceeded" };
  }
  if (input.discountOfferedBps > policy.discountCeilingBps) {
    return { stop: true, reason: "discount_ceiling", escalate: true };
  }
  if (
    input.batchDiscountUsedPaise + input.batchDiscountOfferPaise >
    policy.batchDiscountBudgetPaise
  ) {
    return { stop: true, reason: "batch_discount_budget" };
  }
  const maxRetries =
    policy.rootCauses[input.rootCause]?.maxRetries ?? policy.maxAutoRetries;
  if (input.attemptsUsed >= maxRetries && input.nudgeSent) {
    return { stop: true, reason: "max_attempts_exhausted" };
  }
  if (input.attemptsUsed >= policy.maxAutoRetries && input.nudgeSent) {
    return { stop: true, reason: "max_attempts_exhausted" };
  }
  return { stop: false };
}
