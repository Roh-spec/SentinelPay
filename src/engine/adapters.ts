/**
 * Signal adapters. Each direction maps a source record → a recovery case.
 * The shared engine (diagnose / decide / FSM) stays the same.
 */
export const ADAPTERS = [
  {
    id: "failed_subscription",
    source: "PaymentAttempt.sourceType = subscription",
    trigger: "status = failed",
  },
  {
    id: "payment_degradation",
    source: "PaymentAttempt.sourceType = one_off",
    trigger: "Razorpay-like payment.failed",
  },
  {
    id: "checkout_dropoff",
    source: "CheckoutSession",
    trigger: "abandoned checkout, no blind charge",
  },
  {
    id: "b2b_receivables",
    source: "Invoice",
    trigger: "status = overdue + promise-to-pay tracker",
  },
  {
    id: "mandate_retry",
    source: "Mandate",
    trigger: "NACH / UPI Autopay failure inside debit windows",
  },
  {
    id: "hinglish_voice",
    source: "PaymentAttempt.sourceType = voice_queue",
    trigger: "silent debtor after digital stall; one voice attempt",
  },
] as const;
