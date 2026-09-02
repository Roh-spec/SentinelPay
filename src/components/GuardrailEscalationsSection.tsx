"use client";

import { useState } from "react";
import Link from "next/link";
import { formatInr } from "@/lib/money";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
  type Direction,
  type RootCause,
} from "@/engine/types";

export interface EscalatedCaseItem {
  id: string;
  customerId: string;
  direction: string;
  rootCause: string;
  status: string;
  fsmState: string;
  amountAtRisk: number;
  amountRecovered: number;
  attemptsUsed: number;
  stoppedReason: string | null;
  policyVersion: string;
  promiseDate: Date | string | null;
  promiseStatus: string | null;
  openedAt: Date | string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    riskTier: string;
    contactPrefs: string;
    paydayDay: number;
  };
  attempts?: Array<{
    declineCode: string | null;
    gateway: string;
  }>;
  audits?: Array<{
    action: string;
    actor: string;
    timestamp: Date | string;
    messageBody?: string | null;
  }>;
}

interface Props {
  cases: EscalatedCaseItem[];
}

export function getEscalationMeta(c: EscalatedCaseItem) {
  const reasonCode =
    c.stoppedReason ||
    (c.rootCause === "fraud_suspected" ? "fraud_hard_stop" : "human_escalated");

  if (reasonCode === "fraud_hard_stop" || c.rootCause === "fraud_suspected") {
    return {
      category: "fraud",
      categoryLabel: "Fraud Hard-Stop",
      badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/40",
      icon: (
        <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      reasonTitle: "Suspected Fraud Flagged by Issuer",
      explanation:
        "Issuer gateway reported suspect fraud or stolen instrument. The engine's safety guardrails strictly enforce zero automated retries to prevent dispute penalties and chargebacks.",
      policyRule: "Rule: 0 auto-retries on fraud flags → Immediate human escalation queue",
      recommendedAction: "Verify KYC & cardholder identity with risk operations before attempting payment re-initiation.",
    };
  }

  if (reasonCode === "broken_promise" || c.promiseStatus === "broken" || c.stoppedReason === "broken_promise") {
    const pDate = c.promiseDate
      ? new Date(c.promiseDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
      : "the agreed date";
    return {
      category: "promise",
      categoryLabel: "Broken Promise-to-Pay",
      badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      icon: (
        <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      reasonTitle: "Overdue B2B Promise-to-Pay Breached",
      explanation: `Customer agreed to settle invoice by ${pDate} during tone ladder outreach, but no settlement was received when the window closed.`,
      policyRule: "Rule: Escalating tone ladder transitions to human collections desk on broken PTP",
      recommendedAction: "High-touch outreach by accounts receivable specialist with formal statement of account.",
    };
  }

  if (reasonCode === "voice_unresolved" || (c.direction === "hinglish_voice" && c.status === "escalated")) {
    return {
      category: "voice",
      categoryLabel: "Voice Unresolved",
      badgeClass: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      icon: (
        <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      ),
      reasonTitle: "Conversational Voice Outreach Incomplete",
      explanation:
        "Single conversational Hinglish voice recovery attempt completed after digital stall, but no payment confirmation or promise date was secured.",
      policyRule: "Rule: Max 1 voice touch permitted to prevent customer fatigue → Transferred with transcript",
      recommendedAction: "Review full conversational audio transcript in audit trail and assign dedicated call handler.",
    };
  }

  if (reasonCode === "max_attempts_exhausted") {
    return {
      category: "touches",
      categoryLabel: "Max Touches Exhausted",
      badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
      icon: (
        <svg className="w-4 h-4 text-ink-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      reasonTitle: "Maximum Allowed Retries & Nudges Exhausted",
      explanation:
        "All 3 smart retry cycles and the permitted digital nudge have been exhausted over the 14-day recovery window without successful collection.",
      policyRule: "Rule: Hard bounded FSM ceiling (3 retries + 1 nudge) enforced to prevent runaway charges",
      recommendedAction: "Decide whether to suspend merchant service, apply discretionary goodwill pause, or write off.",
    };
  }

  if (reasonCode === "customer_opted_out") {
    return {
      category: "optout",
      categoryLabel: "Customer Opted Out",
      badgeClass: "bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/40",
      icon: (
        <svg className="w-4 h-4 text-fuchsia-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      reasonTitle: "Customer Explicitly Opted Out (STOP)",
      explanation:
        "Customer replied STOP or requested exclusion from automated recovery outreach. All autonomous channels halted immediately.",
      policyRule: "Rule: Zero contact permitted post-opt-out under TRAI/RBI compliance",
      recommendedAction: "Customer profile marked opted-out. Only inbound customer-initiated support permitted.",
    };
  }

  return {
    category: "other",
    categoryLabel: "Policy Escalation",
    badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/40",
    icon: (
      <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    reasonTitle: "Manual Review Triggered by Guardrail Policy",
    explanation: `Case transitioned to HUMAN_ESCALATED state due to policy condition (${c.stoppedReason || "system trigger"}).`,
    policyRule: "Rule: Safety enforcer halted automated pipeline for human evaluation",
    recommendedAction: "Inspect recent audit logs and decline telemetry to determine recovery pathway.",
  };
}

export function GuardrailEscalationsSection({ cases }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const totalAtRisk = cases.reduce((acc, c) => acc + c.amountAtRisk, 0);

  // Filter categories
  const categories = [
    { id: "all", label: "All Escalations", count: cases.length },
    {
      id: "fraud",
      label: "Fraud Hard-Stop",
      count: cases.filter((c) => getEscalationMeta(c).category === "fraud").length,
    },
    {
      id: "promise",
      label: "Broken Promise (PTP)",
      count: cases.filter((c) => getEscalationMeta(c).category === "promise").length,
    },
    {
      id: "voice",
      label: "Voice Unresolved",
      count: cases.filter((c) => getEscalationMeta(c).category === "voice").length,
    },
    {
      id: "touches",
      label: "Touches Exhausted",
      count: cases.filter((c) => getEscalationMeta(c).category === "touches").length,
    },
    {
      id: "optout",
      label: "Opt-Outs",
      count: cases.filter((c) => getEscalationMeta(c).category === "optout").length,
    },
  ].filter((cat) => cat.id === "all" || cat.count > 0);

  const filteredCases =
    selectedFilter === "all"
      ? cases
      : cases.filter((c) => getEscalationMeta(c).category === selectedFilter);

  return (
    <section
      id="guardrail-escalations"
      className="scroll-mt-24 space-y-5 rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-950/10 via-black/40 to-black/60 p-5 sm:p-6 clean-card transition-all"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Guardrail Escalation Registry
              </h2>
              <span className="rounded-full bg-rose-950 border border-rose-500/40 px-2 py-0.5 text-[11px] font-mono font-semibold text-rose-300">
                {cases.length} Active Cases
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-300">
              Deterministic safety rules halted autonomous outreach to prevent fraud losses, spamming, or compliance violations.
            </p>
          </div>
        </div>

        {/* Aggregate Stats & Link */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-white/[0.06] bg-black/50 px-3 py-1.5 text-right">
            <span className="text-[10px] uppercase font-mono text-ink-500 block">Total At Risk</span>
            <span className="font-mono text-sm font-bold text-white">{formatInr(totalAtRisk)}</span>
          </div>
          <Link
            href="/cases?status=escalated"
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 hover:bg-rose-900/50 px-3 py-2 text-xs font-medium text-rose-200 transition-colors"
          >
            <span>Filter in Directory</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-ink-400 border border-white/[0.06]">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">No Active Guardrail Escalations</h3>
          <p className="mt-1 text-xs text-ink-400 max-w-md mx-auto">
            Click &ldquo;Run Recovery Engine&rdquo; above to execute the recovery pipeline across the seeded failure batch.
          </p>
        </div>
      ) : (
        <>
          {/* Filter Pills Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const active = selectedFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedFilter(cat.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-rose-950 text-rose-200 border border-rose-500/50 shadow-sm shadow-rose-950/50"
                      : "bg-zinc-900/80 text-ink-400 border border-white/[0.06] hover:text-white hover:border-white/20"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      active ? "bg-rose-900/80 text-rose-200" : "bg-zinc-800 text-ink-400"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Escalated Cases Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCases.map((c) => {
              const meta = getEscalationMeta(c);
              const lastAudit = c.audits?.[0];

              return (
                <div
                  key={c.id}
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/60 hover:border-rose-500/40 p-4 sm:p-5 transition-all shadow-sm"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Customer, Amount, Case ID */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${meta.badgeClass}`}
                          >
                            {meta.icon}
                            <span>{meta.categoryLabel}</span>
                          </span>
                          <span className="rounded bg-zinc-900 border border-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                            {DIRECTION_LABEL[c.direction as Direction] ?? c.direction}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-white group-hover:text-rose-200 transition-colors">
                          {c.customer.name}
                        </h3>
                        <p className="text-xs text-ink-400">
                          {c.customer.email} · {c.customer.phone}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-mono text-ink-500 block">At Risk</span>
                        <span className="font-mono text-lg font-bold text-white">
                          {formatInr(c.amountAtRisk)}
                        </span>
                        <span className="block font-mono text-[10px] text-ink-500">{c.id}</span>
                      </div>
                    </div>

                    {/* Escalation Reason Box */}
                    <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                        <span>{meta.reasonTitle}</span>
                      </div>
                      <p className="text-xs text-rose-100/80 leading-relaxed font-normal">
                        {meta.explanation}
                      </p>
                      <div className="border-t border-rose-500/20 pt-1.5 flex flex-col gap-1 text-[11px]">
                        <span className="font-mono text-rose-400/90 font-medium">
                          {meta.policyRule}
                        </span>
                        <span className="text-ink-400">
                          <strong className="text-ink-300">Recommended Next Step:</strong> {meta.recommendedAction}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] border-t border-white/[0.06] pt-2.5">
                      <div>
                        <span className="text-ink-500 block text-[10px] uppercase font-mono">Diagnosed</span>
                        <span className="text-ink-200 font-medium">
                          {ROOT_CAUSE_LABEL[c.rootCause as RootCause] ?? c.rootCause}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-500 block text-[10px] uppercase font-mono">Attempts</span>
                        <span className="text-ink-200 font-mono font-medium">
                          {c.attemptsUsed} / 3 retries
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-500 block text-[10px] uppercase font-mono">Risk Tier</span>
                        <span className="text-ink-200 capitalize font-medium">{c.customer.riskTier}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & CTA */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <div className="text-[11px] text-ink-500 font-mono">
                      {lastAudit ? (
                        <span>Last audit: {lastAudit.action} ({new Date(lastAudit.timestamp).toLocaleTimeString("en-IN")})</span>
                      ) : (
                        <span>Awaiting operator action</span>
                      )}
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-white transition-colors"
                    >
                      <span>Review Case & Resolve</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
