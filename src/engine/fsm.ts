import type {
  Channel,
  Decision,
  Direction,
  FsmState,
  RootCause,
} from "./types";
import { POLICY_VERSION } from "./types";
import { contactAllowed, paydayAlignedRetry, policyFor } from "./policy";
import { evaluateStopping } from "./stopping";
import { willRecover } from "./simulate";

export interface CaseSnapshot {
  id: string;
  customerName: string;
  direction: Direction;
  rootCause: RootCause;
  fsmState: FsmState;
  status: string;
  amountAtRisk: number;
  amountRecovered: number;
  attemptsUsed: number;
  nudgeSent: boolean;
  openedAt: Date;
  lastContactAt: Date | null;
  optedOut: boolean;
  dndStartHour: number;
  dndEndHour: number;
  paydayDay: number;
  discountOfferedBps: number;
  promiseDate: Date | null;
  promiseStatus: string | null;
  stoppedReason: string | null;
}

export interface StepResult {
  decision: Decision;
  recovered: boolean;
  recoveredPaise: number;
  audit: {
    action: string;
    actor: "agent" | "system";
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    channel: Channel;
    messageBody?: string;
    policyVersion: string;
  };
  next: Partial<CaseSnapshot> & { fsmState: FsmState; status: string };
}

const RETRY_STATES: FsmState[] = ["RETRY_1", "RETRY_2", "RETRY_3"];

export function nextRetryState(attemptsUsed: number): FsmState {
  return RETRY_STATES[Math.min(attemptsUsed, 2)];
}

export function composeMessage(
  direction: Direction,
  rootCause: RootCause,
  channel: Channel,
  customerName: string,
  amountPaise: number,
): string {
  const rupees = (amountPaise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const first = customerName.split(" ")[0];

  if (channel === "voice") {
    return `Namaste ${first} ji, main Razorpay Recovery se bol rahi hoon. Aapka ${rupees} ka payment pending hai — kya aaj 6 baje se pehle settle kar sakte hain, ya ek promise-to-pay date de sakte hain?`;
  }
  if (rootCause === "expired_card") {
    return `Hi ${first}, your card on file expired so we couldn't renew your plan (${rupees}). Update your payment method to keep access — we won't retry until you do.`;
  }
  if (rootCause === "checkout_abandoned") {
    return `${first}, your checkout of ${rupees} is still open for 24h. Complete payment via UPI or saved card — this is the only reminder in 48 hours.`;
  }
  if (rootCause === "invoice_overdue") {
    return `Dear ${first}, invoice ${rupees} is past due. Reply with a payment confirmation or a promise-to-pay date. Further notices escalate to collections.`;
  }
  if (rootCause === "card_not_supported") {
    return `Hi ${first}, your bank declined this card on our current rail. Pay ${rupees} via UPI Autopay or a different card to resume the subscription.`;
  }
  if (direction === "mandate_retry") {
    return `Mandate debit of ${rupees} missed the allowed window. Next auto-debit is queued in-window. No extra customer ping.`;
  }
  return `Hi ${first}, we couldn't collect ${rupees}. We'll retry at a better time. Reply STOP to opt out.`;
}

export function decideAndApply(
  snap: CaseSnapshot,
  now: Date,
  batchDiscountUsedPaise: number,
): StepResult {
  const stop = evaluateStopping({
    rootCause: snap.rootCause,
    attemptsUsed: snap.attemptsUsed,
    nudgeSent: snap.nudgeSent,
    optedOut: snap.optedOut,
    openedAt: snap.openedAt,
    now,
    discountOfferedBps: snap.discountOfferedBps,
    batchDiscountUsedPaise,
    batchDiscountOfferPaise: 0,
  });

  if (snap.optedOut) {
    const decision: Decision = {
      action: "stop",
      nextState: "CLOSED",
      channel: "none",
      stop: true,
      stopReason: "customer_opted_out",
      reason: "Hard stop: customer opt-out / unsubscribe.",
    };
    return close(snap, decision, "opted_out", false, 0);
  }

  if (stop.stop && stop.escalate) {
    const decision: Decision = {
      action: "escalate_to_human",
      nextState: "HUMAN_ESCALATED",
      channel: "none",
      stop: true,
      stopReason: stop.reason,
      reason: `Compliant escalation: ${stop.reason}. Automation halted.`,
    };
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, { stopping: stop }),
      next: {
        fsmState: "HUMAN_ESCALATED",
        status: "escalated",
        stoppedReason: stop.reason ?? "escalated",
      },
    };
  }

  if (stop.stop) {
    const offer =
      stop.reason === "max_attempts_exhausted" &&
      snap.rootCause !== "fraud_suspected"
        ? 800
        : 0;
    const decision: Decision = {
      action: "stop",
      nextState: "CLOSED",
      channel: offer ? "email" : "none",
      stop: true,
      stopReason: stop.reason,
      offerDiscountBps: offer || undefined,
      reason: `Stopping rule fired: ${stop.reason}.`,
      messageBody: offer
        ? `We paused retries. A ${offer / 100}% goodwill pause/discount is within policy; above 10% needs a human.`
        : undefined,
    };
    return close(snap, decision, "lost", false, 0, offer);
  }

  const spec = policyFor(snap.rootCause);

  if (snap.rootCause === "fraud_suspected") {
    const decision: Decision = {
      action: "escalate_to_human",
      nextState: "HUMAN_ESCALATED",
      channel: "none",
      stop: true,
      stopReason: "fraud_hard_stop",
      reason: spec.notes,
    };
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, {}),
      next: {
        fsmState: "HUMAN_ESCALATED",
        status: "escalated",
        stoppedReason: "fraud_hard_stop",
      },
    };
  }

  if (snap.rootCause === "silent_debtor" || snap.direction === "hinglish_voice") {
    const contact = contactAllowed(
      snap.lastContactAt,
      now,
      snap.optedOut,
      snap.dndStartHour,
      snap.dndEndHour,
    );
    if (!contact.ok) {
      return wait(snap, `contact_blocked:${contact.reason}`);
    }
    const body = composeMessage(
      snap.direction,
      "silent_debtor",
      "voice",
      snap.customerName,
      snap.amountAtRisk,
    );
    const recovered = willRecover({
      caseId: snap.id,
      step: "voice",
      rootCause: "silent_debtor",
      attempt: 0,
    });
    const decision: Decision = {
      action: "hinglish_voice_call",
      nextState: recovered ? "CLOSED" : "HUMAN_ESCALATED",
      channel: "voice",
      messageBody: body,
      reason: "Digital channels stalled. One bounded Hinglish voice attempt, then stop.",
    };
    if (recovered) {
      return close(snap, decision, "recovered", true, snap.amountAtRisk);
    }
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, { contact }),
      next: {
        fsmState: "HUMAN_ESCALATED",
        status: "escalated",
        nudgeSent: true,
        lastContactAt: now,
        stoppedReason: "voice_unresolved",
      },
    };
  }

  if (snap.rootCause === "invoice_overdue") {
    return b2bStep(snap, now);
  }

  if (snap.rootCause === "checkout_abandoned") {
    const contact = contactAllowed(
      snap.lastContactAt,
      now,
      snap.optedOut,
      snap.dndStartHour,
      snap.dndEndHour,
    );
    if (!contact.ok) return wait(snap, contact.reason ?? "contact_blocked");
    const body = composeMessage(
      snap.direction,
      snap.rootCause,
      "sms",
      snap.customerName,
      snap.amountAtRisk,
    );
    const recovered = willRecover({
      caseId: snap.id,
      step: "checkout_nudge",
      rootCause: snap.rootCause,
      attempt: 0,
    });
    const decision: Decision = {
      action: "checkout_nudge",
      nextState: recovered ? "CLOSED" : "CLOSED",
      channel: "sms",
      messageBody: body,
      reason: "Single drop-off recovery message, then stop (no card retry).",
      stop: true,
      stopReason: recovered ? "recovered" : "nudge_exhausted",
    };
    return close(
      snap,
      decision,
      recovered ? "recovered" : "lost",
      recovered,
      recovered ? snap.amountAtRisk : 0,
    );
  }

  if (snap.rootCause === "expired_card" && !snap.nudgeSent) {
    const contact = contactAllowed(
      snap.lastContactAt,
      now,
      snap.optedOut,
      snap.dndStartHour,
      snap.dndEndHour,
    );
    if (!contact.ok) return wait(snap, contact.reason ?? "contact_blocked");
    const body = composeMessage(
      snap.direction,
      snap.rootCause,
      "email",
      snap.customerName,
      snap.amountAtRisk,
    );
    const decision: Decision = {
      action: "send_update_card",
      nextState: "NUDGE_SENT",
      channel: "email",
      messageBody: body,
      reason: spec.notes,
    };
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, {}),
      next: {
        fsmState: "NUDGE_SENT",
        status: "in_progress",
        nudgeSent: true,
        lastContactAt: now,
      },
    };
  }

  if (snap.rootCause === "mandate_window_miss") {
    const inWindow = now.getDate() <= 7 || (now.getDate() >= 14 && now.getDate() <= 21);
    if (!inWindow && snap.attemptsUsed === 0) {
      const decision: Decision = {
        action: "defer_to_mandate_window",
        nextState: "OPEN",
        channel: "none",
        reason: spec.notes,
      };
      return {
        decision,
        recovered: false,
        recoveredPaise: 0,
        audit: auditOf(snap, decision, now, { inWindow: false }),
        next: { fsmState: "OPEN", status: "in_progress" },
      };
    }
    const attempt = snap.attemptsUsed + 1;
    const ok = willRecover({
      caseId: snap.id,
      step: "mandate_window",
      rootCause: snap.rootCause,
      attempt: attempt - 1,
    });
    const decision: Decision = {
      action: "mandate_retry_in_window",
      nextState: ok ? "CLOSED" : nextRetryState(attempt - 1),
      channel: "none",
      reason: inWindow
        ? spec.notes
        : "Window opened. Sequencer retries debit without extra customer contact.",
    };
    if (ok) return close(snap, decision, "recovered", true, snap.amountAtRisk);
    if (attempt >= 3) {
      return close(
        snap,
        { ...decision, stop: true, stopReason: "max_attempts_exhausted" },
        "lost",
        false,
        0,
      );
    }
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, { inWindow }),
      next: {
        fsmState: nextRetryState(attempt - 1),
        status: "in_progress",
        attemptsUsed: attempt,
      },
    };
  }

  const retryAt = paydayAlignedRetry(now, snap.paydayDay);
  const attempt = snap.attemptsUsed + 1;
  const gateway =
    snap.rootCause === "gateway_timeout" || snap.rootCause === "issuer_risk"
      ? "razorpay_backup"
      : "razorpay";
  const recovered = willRecover({
    caseId: snap.id,
    step: "retry",
    rootCause: snap.rootCause,
    attempt: attempt - 1,
  });
  const aligned =
    snap.rootCause === "insufficient_funds"
      ? `Payday-aligned retry scheduled conceptually for ${retryAt.toISOString().slice(0, 10)}.`
      : spec.notes;

  const decision: Decision = {
    action:
      snap.rootCause === "gateway_timeout"
        ? "immediate_retry_alt_gateway"
        : snap.rootCause === "issuer_risk"
          ? "retry_alt_gateway"
          : snap.rootCause === "expired_card"
            ? "retry_on_update"
            : "smart_retry",
    nextState: recovered ? "CLOSED" : nextRetryState(attempt - 1),
    channel: "none",
    reason: aligned,
  };

  if (recovered) {
    return close(snap, decision, "recovered", true, snap.amountAtRisk);
  }

  if (attempt >= (spec.maxRetries ?? 3) && !snap.nudgeSent && snap.rootCause !== "insufficient_funds") {
    const body = composeMessage(
      snap.direction,
      snap.rootCause,
      "email",
      snap.customerName,
      snap.amountAtRisk,
    );
    const nudge: Decision = {
      action: "send_nudge",
      nextState: "NUDGE_SENT",
      channel: "email",
      messageBody: body,
      reason: "Retries exhausted; one compliant nudge then stop.",
    };
    return {
      decision: nudge,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, nudge, now, { gateway, attempt }),
      next: {
        fsmState: "NUDGE_SENT",
        status: "in_progress",
        attemptsUsed: attempt,
        nudgeSent: true,
        lastContactAt: now,
      },
    };
  }

  if (attempt >= (spec.maxRetries ?? 3) && snap.nudgeSent) {
    return close(
      snap,
      { ...decision, stop: true, stopReason: "max_attempts_exhausted" },
      "lost",
      false,
      0,
    );
  }

  if (attempt >= (spec.maxRetries ?? 3)) {
    const body = composeMessage(
      snap.direction,
      snap.rootCause,
      "email",
      snap.customerName,
      snap.amountAtRisk,
    );
    const nudge: Decision = {
      action: "send_nudge",
      nextState: "NUDGE_SENT",
      channel: "email",
      messageBody: body,
      reason: "Max smart retries reached; one nudge then timebox/stop.",
    };
    return {
      decision: nudge,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, nudge, now, { gateway, attempt }),
      next: {
        fsmState: "NUDGE_SENT",
        status: "in_progress",
        attemptsUsed: attempt,
        nudgeSent: true,
        lastContactAt: now,
      },
    };
  }

  return {
    decision,
    recovered: false,
    recoveredPaise: 0,
    audit: auditOf(snap, decision, now, { gateway, attempt, retryAt: retryAt.toISOString() }),
    next: {
      fsmState: nextRetryState(attempt - 1),
      status: "in_progress",
      attemptsUsed: attempt,
    },
  };
}

function b2bStep(snap: CaseSnapshot, now: Date): StepResult {
  const contact = contactAllowed(
    snap.lastContactAt,
    now,
    snap.optedOut,
    snap.dndStartHour,
    snap.dndEndHour,
  );
  if (!contact.ok) return wait(snap, contact.reason ?? "contact_blocked");

  if (!snap.nudgeSent) {
    const body = composeMessage(
      snap.direction,
      snap.rootCause,
      "email",
      snap.customerName,
      snap.amountAtRisk,
    );
    const decision: Decision = {
      action: "invoice_reminder",
      nextState: "NUDGE_SENT",
      channel: "email",
      messageBody: body,
      reason: "Tone ladder step 1: factual reminder.",
    };
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, {}),
      next: {
        fsmState: "NUDGE_SENT",
        status: "in_progress",
        nudgeSent: true,
        lastContactAt: now,
        attemptsUsed: snap.attemptsUsed + 1,
      },
    };
  }

  if (!snap.promiseDate) {
    const promise = new Date(now);
    promise.setDate(promise.getDate() + 5);
    const recovered = willRecover({
      caseId: snap.id,
      step: "ptp_ask",
      rootCause: snap.rootCause,
      attempt: 1,
    });
    if (recovered) {
      const decision: Decision = {
        action: "collect_on_reminder",
        nextState: "CLOSED",
        channel: "email",
        reason: "Customer paid after first reminder.",
      };
      return close(snap, decision, "recovered", true, snap.amountAtRisk);
    }
    const decision: Decision = {
      action: "capture_promise_to_pay",
      nextState: "PROMISE_TRACKING",
      channel: "email",
      messageBody: `${snap.customerName} promised to pay by ${promise.toISOString().slice(0, 10)}. Tracker armed; broken promise escalates.`,
      reason: "Tone ladder step 2: promise-to-pay.",
    };
    return {
      decision,
      recovered: false,
      recoveredPaise: 0,
      audit: auditOf(snap, decision, now, { promiseDate: promise.toISOString() }),
      next: {
        fsmState: "PROMISE_TRACKING",
        status: "in_progress",
        promiseDate: promise,
        promiseStatus: "open",
        lastContactAt: now,
        attemptsUsed: snap.attemptsUsed + 1,
      },
    };
  }

  const kept = willRecover({
    caseId: snap.id,
    step: "ptp_keep",
    rootCause: snap.rootCause,
    attempt: 2,
  });
  if (kept) {
    const decision: Decision = {
      action: "promise_kept",
      nextState: "CLOSED",
      channel: "none",
      reason: "Promise-to-pay honored. Case recovered.",
    };
    return close(snap, decision, "recovered", true, snap.amountAtRisk);
  }
  const decision: Decision = {
    action: "promise_broken_escalate",
    nextState: "HUMAN_ESCALATED",
    channel: "none",
    stop: true,
    stopReason: "broken_promise",
    reason: "Promise broken. Compliant handoff to human collections.",
  };
  return {
    decision,
    recovered: false,
    recoveredPaise: 0,
    audit: auditOf(snap, decision, now, {}),
    next: {
      fsmState: "HUMAN_ESCALATED",
      status: "escalated",
      promiseStatus: "broken",
      stoppedReason: "broken_promise",
    },
  };
}

function wait(snap: CaseSnapshot, reason?: string): StepResult {
  const decision: Decision = {
    action: "defer",
    nextState: snap.fsmState,
    channel: "none",
    reason: `Guardrail blocked action (${reason}). Will resume when window opens.`,
  };
  return {
    decision,
    recovered: false,
    recoveredPaise: 0,
    audit: {
      action: "defer",
      actor: "system",
      input: { reason },
      output: { deferred: true },
      channel: "none",
      policyVersion: POLICY_VERSION,
    },
    next: {
      fsmState: snap.fsmState,
      status: snap.status === "open" ? "open" : "in_progress",
    },
  };
}

function close(
  snap: CaseSnapshot,
  decision: Decision,
  status: string,
  recovered: boolean,
  paise: number,
  discountBps = 0,
): StepResult {
  return {
    decision: { ...decision, nextState: "CLOSED", stop: true },
    recovered,
    recoveredPaise: paise,
    audit: auditOf(snap, decision, new Date(), { recovered, paise }),
    next: {
      fsmState: "CLOSED",
      status,
      amountRecovered: paise,
      stoppedReason: decision.stopReason ?? (recovered ? "recovered" : decision.stopReason),
      discountOfferedBps: discountBps || snap.discountOfferedBps,
      nudgeSent: snap.nudgeSent || Boolean(decision.channel !== "none"),
    },
  };
}

function auditOf(
  snap: CaseSnapshot,
  decision: Decision,
  now: Date,
  extra: Record<string, unknown>,
): StepResult["audit"] {
  return {
    action: decision.action,
    actor: "agent",
    input: {
      caseId: snap.id,
      state: snap.fsmState,
      rootCause: snap.rootCause,
      direction: snap.direction,
      at: now.toISOString(),
      ...extra,
    },
    output: {
      nextState: decision.nextState,
      stop: decision.stop ?? false,
      stopReason: decision.stopReason,
      reason: decision.reason,
    },
    channel: decision.channel,
    messageBody: decision.messageBody,
    policyVersion: POLICY_VERSION,
  };
}
