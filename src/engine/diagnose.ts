import type { DiagnoseResult, RootCause } from "./types";

const CODE_MAP: Record<string, RootCause> = {
  insufficient_funds: "insufficient_funds",
  BAD_REQUEST_ERROR_INSUFFICIENT_FUNDS: "insufficient_funds",
  GATEWAY_ERROR_INSUFFICIENT_FUNDS: "insufficient_funds",
  expired_card: "expired_card",
  card_expired: "expired_card",
  BAD_REQUEST_ERROR_CARD_EXPIRED: "expired_card",
  do_not_honor: "issuer_risk",
  generic_decline: "issuer_risk",
  GATEWAY_ERROR_DO_NOT_HONOR: "issuer_risk",
  card_not_supported: "card_not_supported",
  BAD_REQUEST_ERROR_CARD_NOT_SUPPORTED: "card_not_supported",
  fraud_suspected: "fraud_suspected",
  suspected_fraud: "fraud_suspected",
  GATEWAY_ERROR_FRAUD: "fraud_suspected",
  timeout: "gateway_timeout",
  gateway_timeout: "gateway_timeout",
  GATEWAY_ERROR_TIMEOUT: "gateway_timeout",
  checkout_abandoned: "checkout_abandoned",
  invoice_overdue: "invoice_overdue",
  mandate_failed: "mandate_window_miss",
  NACH_REJECT: "mandate_window_miss",
  UPI_AUTOPAY_FAILED: "mandate_window_miss",
  no_response: "silent_debtor",
};

export function diagnoseDecline(
  declineCode: string | null | undefined,
  gatewayMessage?: string | null,
): DiagnoseResult {
  const code = (declineCode ?? "").trim();
  if (code && CODE_MAP[code]) {
    return {
      rootCause: CODE_MAP[code],
      confidence: 0.99,
      reason: `Mapped decline code '${code}' via rules table.`,
      deterministic: true,
    };
  }

  const blob = `${code} ${gatewayMessage ?? ""}`.toLowerCase();
  if (/nsf|insufficient|not enough/.test(blob)) {
    return fuzzy("insufficient_funds", gatewayMessage);
  }
  if (/expir/.test(blob)) {
    return fuzzy("expired_card", gatewayMessage);
  }
  if (/fraud|stolen|pickup/.test(blob)) {
    return fuzzy("fraud_suspected", gatewayMessage);
  }
  if (/timeout|unavailable|51\b/.test(blob)) {
    return fuzzy("gateway_timeout", gatewayMessage);
  }
  if (/honor|issuer|05\b/.test(blob)) {
    return fuzzy("issuer_risk", gatewayMessage);
  }
  if (/abandon|drop.?off|cart/.test(blob)) {
    return fuzzy("checkout_abandoned", gatewayMessage);
  }
  if (/overdue|invoice|receivable/.test(blob)) {
    return fuzzy("invoice_overdue", gatewayMessage);
  }
  if (/nach|mandate|autopay|upi/.test(blob)) {
    return fuzzy("mandate_window_miss", gatewayMessage);
  }

  return {
    rootCause: "issuer_risk",
    confidence: 0.45,
    reason: `Ambiguous gateway text; defaulted to issuer_risk. Message: ${gatewayMessage ?? (code || "none")}`,
    deterministic: false,
  };
}

function fuzzy(rootCause: RootCause, message?: string | null): DiagnoseResult {
  return {
    rootCause,
    confidence: 0.72,
    reason: `Free-text classification from gateway message: '${message ?? ""}'`,
    deterministic: false,
  };
}
