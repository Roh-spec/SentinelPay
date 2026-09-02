import policy from "../../policies/recovery-v1.json";
import type { Direction, RootCause } from "./types";

export { policy };

export function policyFor(rootCause: RootCause) {
  return policy.rootCauses[rootCause];
}

export function contactAllowed(
  lastContactAt: Date | null,
  now: Date,
  optedOut: boolean,
  dndStartHour: number,
  dndEndHour: number,
): { ok: boolean; reason?: string } {
  if (optedOut) return { ok: false, reason: "customer_opted_out" };
  const hour = now.getHours();
  const inDnd =
    dndStartHour > dndEndHour
      ? hour >= dndStartHour || hour < dndEndHour
      : hour >= dndStartHour && hour < dndEndHour;
  if (inDnd) return { ok: false, reason: "dnd_window" };
  if (lastContactAt) {
    const gapMs = policy.contactGapHours * 60 * 60 * 1000;
    if (now.getTime() - lastContactAt.getTime() < gapMs) {
      return { ok: false, reason: "frequency_cap" };
    }
  }
  return { ok: true };
}

export function paydayAlignedRetry(now: Date, paydayDay: number): Date {
  const next = new Date(now);
  next.setDate(paydayDay);
  if (next <= now) next.setMonth(next.getMonth() + 1);
  const allowed = new Set(policy.paydayAlignDays);
  if (!allowed.has(paydayDay)) {
    next.setDate(policy.paydayAlignDays[0]);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  next.setHours(10, 0, 0, 0);
  return next;
}

export function directionDefaultCause(direction: Direction): RootCause {
  switch (direction) {
    case "checkout_dropoff":
      return "checkout_abandoned";
    case "b2b_receivables":
      return "invoice_overdue";
    case "mandate_retry":
      return "mandate_window_miss";
    case "hinglish_voice":
      return "silent_debtor";
    default:
      return "issuer_risk";
  }
}
