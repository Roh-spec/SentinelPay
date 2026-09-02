export type Direction =
  | "failed_subscription"
  | "payment_degradation"
  | "checkout_dropoff"
  | "b2b_receivables"
  | "mandate_retry"
  | "hinglish_voice";

export type RootCause =
  | "insufficient_funds"
  | "expired_card"
  | "issuer_risk"
  | "card_not_supported"
  | "fraud_suspected"
  | "gateway_timeout"
  | "checkout_abandoned"
  | "invoice_overdue"
  | "mandate_window_miss"
  | "silent_debtor";

export type FsmState =
  | "OPEN"
  | "RETRY_1"
  | "RETRY_2"
  | "RETRY_3"
  | "NUDGE_SENT"
  | "PROMISE_TRACKING"
  | "VOICE_ATTEMPTED"
  | "HUMAN_ESCALATED"
  | "CLOSED";

export type CaseStatus =
  | "open"
  | "in_progress"
  | "escalated"
  | "recovered"
  | "lost"
  | "paused"
  | "opted_out";

export type Actor = "agent" | "human" | "system" | "customer";

export type Channel = "none" | "email" | "sms" | "voice" | "in_app";

export interface DiagnoseResult {
  rootCause: RootCause;
  confidence: number;
  reason: string;
  deterministic: boolean;
}

export interface Decision {
  action: string;
  nextState: FsmState;
  channel: Channel;
  messageBody?: string;
  stop?: boolean;
  stopReason?: string;
  offerDiscountBps?: number;
  reason: string;
}

export interface StoppingCheck {
  stop: boolean;
  reason?: string;
  escalate?: boolean;
}

export const POLICY_VERSION = "recovery-v1";

export const DIRECTION_LABEL: Record<Direction, string> = {
  failed_subscription: "Failed subscription",
  payment_degradation: "Payment degradation",
  checkout_dropoff: "Checkout drop-off",
  b2b_receivables: "B2B receivables",
  mandate_retry: "Mandate retry",
  hinglish_voice: "Hinglish voice",
};

export const ROOT_CAUSE_LABEL: Record<RootCause, string> = {
  insufficient_funds: "Insufficient funds",
  expired_card: "Expired card",
  issuer_risk: "Issuer risk flag",
  card_not_supported: "Card not supported",
  fraud_suspected: "Fraud suspected",
  gateway_timeout: "Gateway timeout",
  checkout_abandoned: "Checkout abandoned",
  invoice_overdue: "Invoice overdue",
  mandate_window_miss: "Mandate window miss",
  silent_debtor: "Silent debtor",
};
