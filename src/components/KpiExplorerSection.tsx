"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatInr, pct } from "@/lib/money";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
  type Direction,
  type RootCause,
} from "@/engine/types";
import { getEscalationMeta, type EscalatedCaseItem } from "./GuardrailEscalationsSection";

export interface CaseListItem {
  id: string;
  customerId: string;
  direction: string;
  sourceType: string;
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
  closedAt: Date | string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    riskTier: string;
    contactPrefs: string;
    paydayDay: number;
    optedOut: boolean;
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
  cases: CaseListItem[];
  totalAtRiskPaise: number;
  totalRecoveredPaise: number;
  recoveryRate: number;
  escalatedCount: number;
}

type TabType = "total-at-risk" | "recovered-yield" | "recovery-rate" | "guardrail-escalations";

export function KpiExplorerSection({
  cases,
  totalAtRiskPaise,
  totalRecoveredPaise,
  recoveryRate,
  escalatedCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("total-at-risk");
  const [subFilter, setSubFilter] = useState<string>("all");

  // Sync with URL Hash on mount and on hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "") as TabType;
      if (
        hash === "total-at-risk" ||
        hash === "recovered-yield" ||
        hash === "recovery-rate" ||
        hash === "guardrail-escalations"
      ) {
        setActiveTab(hash);
        setSubFilter("all");
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSubFilter("all");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  const recoveredCases = cases.filter((c) => c.status === "recovered");
  const escalatedCases = cases.filter(
    (c) => c.status === "escalated" || c.fsmState === "HUMAN_ESCALATED",
  );
  const lostCases = cases.filter((c) => c.status === "lost");
  const inProgressCases = cases.filter(
    (c) => c.status === "open" || c.status === "in_progress",
  );

  return (
    <section
      id="kpi-explorer"
      className="scroll-mt-24 space-y-5 rounded-2xl border border-white/[0.08] bg-black/40 p-5 sm:p-6 clean-card transition-all"
    >
      {/* Anchor Targets for smooth jump */}
      <div id="total-at-risk" className="scroll-mt-24" />
      <div id="recovered-yield" className="scroll-mt-24" />
      <div id="recovery-rate" className="scroll-mt-24" />
      <div id="guardrail-escalations" className="scroll-mt-24" />

      {/* Top Section Header & KPI Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
              KPI Telemetry Explorer & Case Registry
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-ink-300">
            Interactive breakdown of cases powering the executive KPI matrix. Select any metric to inspect underlying telemetry and root causes.
          </p>
        </div>

        {/* Global Directory Link */}
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 self-start lg:self-auto rounded-lg border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 px-3 py-2 text-xs font-medium text-ink-200 hover:text-white transition-colors"
        >
          <span>Open Full Directory ({cases.length})</span>
          <span>→</span>
        </Link>
      </div>

      {/* 4 Main KPI Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/[0.06] pb-4">
        {/* Tab 1: Total At Risk */}
        <button
          onClick={() => handleTabChange("total-at-risk")}
          className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
            activeTab === "total-at-risk"
              ? "border-blue-500/50 bg-blue-950/20 shadow-sm shadow-blue-950/50"
              : "border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-400">
            <span>Total At Risk</span>
            <span
              className={`h-2 w-2 rounded-full ${
                activeTab === "total-at-risk" ? "bg-blue-400" : "bg-transparent"
              }`}
            />
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-white">
            {formatInr(totalAtRiskPaise)}
          </div>
          <span className="text-[11px] text-ink-500 font-mono mt-0.5">
            {cases.length} failure cases
          </span>
        </button>

        {/* Tab 2: Recovered Yield */}
        <button
          onClick={() => handleTabChange("recovered-yield")}
          className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
            activeTab === "recovered-yield"
              ? "border-emerald-500/50 bg-emerald-950/20 shadow-sm shadow-emerald-950/50"
              : "border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-400">
            <span>Recovered Yield</span>
            <span
              className={`h-2 w-2 rounded-full ${
                activeTab === "recovered-yield" ? "bg-emerald-400" : "bg-transparent"
              }`}
            />
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-emerald-400">
            {formatInr(totalRecoveredPaise)}
          </div>
          <span className="text-[11px] text-emerald-500/80 font-mono mt-0.5">
            {recoveredCases.length} recovered
          </span>
        </button>

        {/* Tab 3: Recovery Rate */}
        <button
          onClick={() => handleTabChange("recovery-rate")}
          className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
            activeTab === "recovery-rate"
              ? "border-indigo-500/50 bg-indigo-950/20 shadow-sm shadow-indigo-950/50"
              : "border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-400">
            <span>Recovery Rate</span>
            <span
              className={`h-2 w-2 rounded-full ${
                activeTab === "recovery-rate" ? "bg-indigo-400" : "bg-transparent"
              }`}
            />
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-white">
            {pct(recoveryRate)}
          </div>
          <span className="text-[11px] text-ink-500 font-mono mt-0.5">
            {pct(recoveryRate)} yield conversion
          </span>
        </button>

        {/* Tab 4: Guardrail Escalations */}
        <button
          onClick={() => handleTabChange("guardrail-escalations")}
          className={`flex flex-col text-left rounded-xl border p-3 transition-all ${
            activeTab === "guardrail-escalations"
              ? "border-rose-500/50 bg-rose-950/20 shadow-sm shadow-rose-950/50"
              : "border-white/[0.06] bg-zinc-900/50 hover:bg-zinc-900 hover:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-ink-400">
            <span>Guardrails</span>
            <span
              className={`h-2 w-2 rounded-full ${
                activeTab === "guardrail-escalations" ? "bg-rose-400" : "bg-transparent"
              }`}
            />
          </div>
          <div className="mt-1 font-mono text-base sm:text-lg font-bold text-rose-300">
            {escalatedCount} Cases
          </div>
          <span className="text-[11px] text-rose-400/80 font-mono mt-0.5">
            Manual safety halt
          </span>
        </button>
      </div>

      {/* Render Active KPI Sub-View */}
      {activeTab === "total-at-risk" && (
        <TotalAtRiskView
          cases={cases}
          subFilter={subFilter}
          setSubFilter={setSubFilter}
          totalAtRisk={totalAtRiskPaise}
        />
      )}

      {activeTab === "recovered-yield" && (
        <RecoveredYieldView
          cases={recoveredCases}
          subFilter={subFilter}
          setSubFilter={setSubFilter}
          totalRecovered={totalRecoveredPaise}
        />
      )}

      {activeTab === "recovery-rate" && (
        <RecoveryRateView
          allCases={cases}
          subFilter={subFilter}
          setSubFilter={setSubFilter}
          rate={recoveryRate}
        />
      )}

      {activeTab === "guardrail-escalations" && (
        <GuardrailEscalationsView
          cases={escalatedCases as EscalatedCaseItem[]}
          subFilter={subFilter}
          setSubFilter={setSubFilter}
        />
      )}
    </section>
  );
}

/* =========================================================================
   1. TOTAL AT RISK VIEW
   ========================================================================= */
function TotalAtRiskView({
  cases,
  subFilter,
  setSubFilter,
  totalAtRisk,
}: {
  cases: CaseListItem[];
  subFilter: string;
  setSubFilter: (f: string) => void;
  totalAtRisk: number;
}) {
  const rails = [
    { id: "all", label: "All Failure Rails", count: cases.length },
    {
      id: "failed_subscription",
      label: "Subscriptions",
      count: cases.filter((c) => c.direction === "failed_subscription").length,
    },
    {
      id: "payment_degradation",
      label: "One-Off Charges",
      count: cases.filter((c) => c.direction === "payment_degradation").length,
    },
    {
      id: "b2b_receivables",
      label: "B2B Receivables",
      count: cases.filter((c) => c.direction === "b2b_receivables").length,
    },
    {
      id: "checkout_dropoff",
      label: "Abandoned Checkouts",
      count: cases.filter((c) => c.direction === "checkout_dropoff").length,
    },
    {
      id: "mandate_retry",
      label: "Mandates / Autopay",
      count: cases.filter((c) => c.direction === "mandate_retry").length,
    },
    {
      id: "hinglish_voice",
      label: "Voice Queue",
      count: cases.filter((c) => c.direction === "hinglish_voice").length,
    },
  ].filter((r) => r.id === "all" || r.count > 0);

  const filtered =
    subFilter === "all" ? cases : cases.filter((c) => c.direction === subFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-950/20 border border-blue-500/20 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Total Capital at Risk: {formatInr(totalAtRisk)}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5">
            Decline events ingested from subscriptions, invoices, checkouts, and mandate queues awaiting or undergoing bounded recovery.
          </p>
        </div>
        <span className="font-mono text-xs text-blue-300 bg-blue-950 border border-blue-500/30 px-2.5 py-1 rounded-lg shrink-0">
          {filtered.length} Cases in View
        </span>
      </div>

      {/* Subfilters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {rails.map((r) => {
          const active = subFilter === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSubFilter(r.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-blue-950 text-blue-200 border border-blue-500/50"
                  : "bg-zinc-900/80 text-ink-400 border border-white/[0.06] hover:text-white"
              }`}
            >
              <span>{r.label}</span>
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono">
                {r.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/50 hover:border-blue-500/40 p-4 transition-all"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded bg-zinc-900 border border-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                    {DIRECTION_LABEL[c.direction as Direction] ?? c.direction}
                  </span>
                  <h4 className="mt-1.5 text-sm font-bold text-white">{c.customer.name}</h4>
                  <p className="text-[11px] text-ink-400">{c.customer.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-ink-500 block">At Risk</span>
                  <span className="font-mono text-base font-bold text-white">
                    {formatInr(c.amountAtRisk)}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-500">Diagnosed Cause:</span>
                  <span className="font-medium text-ink-200">
                    {ROOT_CAUSE_LABEL[c.rootCause as RootCause] ?? c.rootCause}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">FSM State:</span>
                  <span className="font-mono text-ink-300">{c.fsmState}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-xs">
              <span className="font-mono text-[11px] text-ink-500">ID: {c.id}</span>
              <Link
                href={`/cases/${c.id}`}
                className="font-medium text-blue-400 hover:text-white transition-colors"
              >
                Inspect Telemetry →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   2. RECOVERED YIELD VIEW
   ========================================================================= */
function RecoveredYieldView({
  cases,
  subFilter,
  setSubFilter,
  totalRecovered,
}: {
  cases: CaseListItem[];
  subFilter: string;
  setSubFilter: (f: string) => void;
  totalRecovered: number;
}) {
  const causes = [
    { id: "all", label: "All Recovered", count: cases.length },
    {
      id: "insufficient_funds",
      label: "Payday Aligned Retries",
      count: cases.filter((c) => c.rootCause === "insufficient_funds").length,
    },
    {
      id: "expired_card",
      label: "Card Update Nudges",
      count: cases.filter((c) => c.rootCause === "expired_card").length,
    },
    {
      id: "mandate_window_miss",
      label: "Mandate Sequenced",
      count: cases.filter((c) => c.rootCause === "mandate_window_miss").length,
    },
    {
      id: "checkout_abandoned",
      label: "Checkout Nudges",
      count: cases.filter((c) => c.rootCause === "checkout_abandoned").length,
    },
    {
      id: "invoice_overdue",
      label: "B2B Reminders & PTP",
      count: cases.filter((c) => c.rootCause === "invoice_overdue").length,
    },
  ].filter((c) => c.id === "all" || c.count > 0);

  const filtered =
    subFilter === "all" ? cases : cases.filter((c) => c.rootCause === subFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-emerald-300">
            Total Yield Recovered: {formatInr(totalRecovered)}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5">
            Capital successfully captured and returned to merchant balance through autonomous policy interventions.
          </p>
        </div>
        <span className="font-mono text-xs text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2.5 py-1 rounded-lg shrink-0">
          {filtered.length} Successful Recoveries
        </span>
      </div>

      {/* Subfilters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {causes.map((c) => {
          const active = subFilter === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSubFilter(c.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-emerald-950 text-emerald-200 border border-emerald-500/50"
                  : "bg-zinc-900/80 text-ink-400 border border-white/[0.06] hover:text-white"
              }`}
            >
              <span>{c.label}</span>
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono">
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-8 text-center text-ink-500">
          No recovered cases in this category yet. Run the recovery engine to execute interventions.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40 p-4 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="rounded bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Recovered
                    </span>
                    <h4 className="mt-1.5 text-sm font-bold text-white">{c.customer.name}</h4>
                    <p className="text-[11px] text-ink-400">{c.customer.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-emerald-500 block">Recovered</span>
                    <span className="font-mono text-base font-bold text-emerald-400">
                      {formatInr(c.amountRecovered || c.amountAtRisk)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-500/10 bg-black/40 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Strategy Applied:</span>
                    <span className="font-medium text-emerald-200">
                      {c.rootCause === "insufficient_funds"
                        ? `Payday retry (Day ${c.customer.paydayDay})`
                        : c.rootCause === "expired_card"
                          ? "Card update email dispatch"
                          : c.rootCause === "mandate_window_miss"
                            ? "In-window banking retry"
                            : c.rootCause === "checkout_abandoned"
                              ? "24h SMS recovery link"
                              : "Tone ladder & PTP"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Attempts Used:</span>
                    <span className="font-mono text-ink-300">{c.attemptsUsed} attempt(s)</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-xs">
                <span className="font-mono text-[11px] text-ink-500">ID: {c.id}</span>
                <Link
                  href={`/cases/${c.id}`}
                  className="font-medium text-emerald-400 hover:text-white transition-colors"
                >
                  View Recovery Audit Trail →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. RECOVERY RATE & OUTCOME MATRIX VIEW
   ========================================================================= */
function RecoveryRateView({
  allCases,
  subFilter,
  setSubFilter,
  rate,
}: {
  allCases: CaseListItem[];
  subFilter: string;
  setSubFilter: (f: string) => void;
  rate: number;
}) {
  const outcomes = [
    { id: "all", label: "All Outcomes", count: allCases.length },
    {
      id: "recovered",
      label: "Recovered (Success)",
      count: allCases.filter((c) => c.status === "recovered").length,
    },
    {
      id: "escalated",
      label: "Escalated (Guardrails)",
      count: allCases.filter(
        (c) => c.status === "escalated" || c.fsmState === "HUMAN_ESCALATED",
      ).length,
    },
    {
      id: "lost",
      label: "Lost / Max Touches",
      count: allCases.filter((c) => c.status === "lost").length,
    },
    {
      id: "in_progress",
      label: "In Progress / Open",
      count: allCases.filter((c) => c.status === "open" || c.status === "in_progress").length,
    },
  ].filter((o) => o.id === "all" || o.count > 0);

  const filtered =
    subFilter === "all"
      ? allCases
      : subFilter === "escalated"
        ? allCases.filter((c) => c.status === "escalated" || c.fsmState === "HUMAN_ESCALATED")
        : subFilter === "in_progress"
          ? allCases.filter((c) => c.status === "open" || c.status === "in_progress")
          : allCases.filter((c) => c.status === subFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-indigo-300">
            Yield Conversion Efficiency: {pct(rate)}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5">
            Full outcome ledger showing how every decline event was resolved (Recovered vs Escalated vs Bounded Loss).
          </p>
        </div>
        <span className="font-mono text-xs text-indigo-300 bg-indigo-950 border border-indigo-500/30 px-2.5 py-1 rounded-lg shrink-0">
          {pct(rate)} Overall Yield
        </span>
      </div>

      {/* Subfilters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {outcomes.map((o) => {
          const active = subFilter === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSubFilter(o.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-indigo-950 text-indigo-200 border border-indigo-500/50"
                  : "bg-zinc-900/80 text-ink-400 border border-white/[0.06] hover:text-white"
              }`}
            >
              <span>{o.label}</span>
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono">
                {o.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((c) => {
          const isRec = c.status === "recovered";
          const isEsc = c.status === "escalated" || c.fsmState === "HUMAN_ESCALATED";

          return (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/50 hover:border-indigo-500/40 p-4 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
                        isRec
                          ? "bg-emerald-950 text-emerald-300 border-emerald-500/30"
                          : isEsc
                            ? "bg-rose-950 text-rose-300 border-rose-500/30"
                            : "bg-zinc-900 text-ink-300 border-white/[0.06]"
                      }`}
                    >
                      {c.status}
                    </span>
                    <h4 className="mt-1.5 text-sm font-bold text-white">{c.customer.name}</h4>
                    <p className="text-[11px] text-ink-400">{c.customer.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-ink-500 block">At Risk</span>
                    <span className="font-mono text-base font-bold text-white">
                      {formatInr(c.amountAtRisk)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Diagnosed Root Cause:</span>
                    <span className="font-medium text-ink-200">
                      {ROOT_CAUSE_LABEL[c.rootCause as RootCause] ?? c.rootCause}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Terminal Outcome:</span>
                    <span
                      className={`font-mono font-medium ${
                        isRec ? "text-emerald-400" : isEsc ? "text-rose-400" : "text-ink-300"
                      }`}
                    >
                      {isRec
                        ? `Recovered (${formatInr(c.amountRecovered || c.amountAtRisk)})`
                        : c.stoppedReason || c.fsmState}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-xs">
                <span className="font-mono text-[11px] text-ink-500">ID: {c.id}</span>
                <Link
                  href={`/cases/${c.id}`}
                  className="font-medium text-indigo-400 hover:text-white transition-colors"
                >
                  Inspect Case Details →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   4. GUARDRAIL ESCALATIONS VIEW
   ========================================================================= */
function GuardrailEscalationsView({
  cases,
  subFilter,
  setSubFilter,
}: {
  cases: EscalatedCaseItem[];
  subFilter: string;
  setSubFilter: (f: string) => void;
}) {
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

  const filtered =
    subFilter === "all"
      ? cases
      : cases.filter((c) => getEscalationMeta(c).category === subFilter);

  const totalAtRisk = cases.reduce((acc, c) => acc + c.amountAtRisk, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-950/20 border border-rose-500/20 rounded-xl p-4">
        <div>
          <h3 className="text-sm font-semibold text-rose-300">
            Active Guardrail Escalations: {formatInr(totalAtRisk)}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5">
            Deterministic safety rules halted autonomous outreach to prevent fraud losses, spamming, or compliance violations.
          </p>
        </div>
        <Link
          href="/cases?status=escalated"
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/60 hover:bg-rose-900/50 px-3 py-1.5 text-xs font-medium text-rose-200 transition-colors shrink-0"
        >
          <span>Filter in Directory</span>
          <span>→</span>
        </Link>
      </div>

      {/* Subfilters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {categories.map((cat) => {
          const active = subFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSubFilter(cat.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "bg-rose-950 text-rose-200 border border-rose-500/50"
                  : "bg-zinc-900/80 text-ink-400 border border-white/[0.06] hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
              <span className="rounded-full bg-zinc-800 px-1.5 py-0.2 text-[10px] font-mono">
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cases List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-black/40 p-8 text-center text-ink-500">
          No guardrail escalations active in this category.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => {
            const meta = getEscalationMeta(c);
            const lastAudit = c.audits?.[0];

            return (
              <div
                key={c.id}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-black/60 hover:border-rose-500/40 p-4 sm:p-5 transition-all shadow-sm"
              >
                <div className="space-y-3.5">
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
      )}
    </div>
  );
}
