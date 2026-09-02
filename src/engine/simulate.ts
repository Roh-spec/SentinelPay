function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 from case id + step, so demos are stable. */
export function unit(seed: string): number {
  return hash32(seed) / 0xffffffff;
}

export function willRecover(opts: {
  caseId: string;
  step: string;
  rootCause: string;
  attempt: number;
}): boolean {
  const u = unit(`${opts.caseId}:${opts.step}:${opts.attempt}`);
  const table: Record<string, number[]> = {
    insufficient_funds: [0.18, 0.42, 0.71],
    expired_card: [0.08, 0.62, 0.7],
    issuer_risk: [0.22, 0.38, 0.45],
    card_not_supported: [0.12, 0.55, 0.6],
    fraud_suspected: [0, 0, 0],
    gateway_timeout: [0.55, 0.78, 0.82],
    checkout_abandoned: [0.28, 0.41, 0.41],
    invoice_overdue: [0.2, 0.36, 0.58],
    mandate_window_miss: [0.25, 0.48, 0.66],
    silent_debtor: [0.34, 0.5, 0.5],
  };
  const probs = table[opts.rootCause] ?? [0.2, 0.3, 0.35];
  const p = probs[Math.min(opts.attempt, probs.length - 1)] ?? 0.3;
  return u < p;
}
