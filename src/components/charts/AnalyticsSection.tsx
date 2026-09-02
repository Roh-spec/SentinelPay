"use client";

import React, { useState } from "react";
import { RecoveryYieldChart } from "./RecoveryYieldChart";
import { ChannelEfficiencyChart } from "./ChannelEfficiencyChart";
import { RecoveryFunnelChart } from "./RecoveryFunnelChart";
import { HourlyVelocityChart } from "./HourlyVelocityChart";

interface Props {
  metrics: {
    causeChartData: any[];
    directionChartData: any[];
    funnelData: any[];
    hourlyVelocityData: any[];
    safetyData: any[];
    statusBreakdown: {
      recovered: number;
      escalated: number;
      inProgress: number;
      open: number;
    };
    caseCount: number;
    atRisk: number;
    recovered: number;
    rate: number;
  };
}

export function AnalyticsSection({ metrics }: Props) {
  const [activeTab, setActiveTab] = useState<"yield" | "funnel" | "velocity">("yield");

  return (
    <div className="space-y-4">
      {/* Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Visual Telemetry & Yield Analytics</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Live Engine Data
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Real-time capital salvage yield, intervention conversion rates, and hourly recovery timing.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-lg bg-zinc-900/90 p-1 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab("yield")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === "yield"
                ? "bg-white/[0.12] text-white shadow-sm font-semibold"
                : "text-ink-400 hover:text-white"
            }`}
          >
            Yield & Channels
          </button>
          <button
            onClick={() => setActiveTab("funnel")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === "funnel"
                ? "bg-white/[0.12] text-white shadow-sm font-semibold"
                : "text-ink-400 hover:text-white"
            }`}
          >
            Recovery Funnel
          </button>
          <button
            onClick={() => setActiveTab("velocity")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              activeTab === "velocity"
                ? "bg-white/[0.12] text-white shadow-sm font-semibold"
                : "text-ink-400 hover:text-white"
            }`}
          >
            Hourly & Payday Velocity
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "yield" && (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Grouped Bar Chart: Yield by Root Cause */}
          <div className="lg:col-span-7 rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Salvaged Capital vs. At-Risk by Cause
                </h3>
                <p className="text-[11px] text-ink-400 mt-0.5">
                  Comparison of gross declined value vs actual recovered INR across decline reasons
                </p>
              </div>
            </div>
            <RecoveryYieldChart data={metrics.causeChartData} />
          </div>

          {/* Donut & Conversion: Channel Efficiency */}
          <div className="lg:col-span-5 rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Channel Strategy Mix
              </h3>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Yield distribution and win-rate across active intervention policies
              </p>
            </div>
            <ChannelEfficiencyChart data={metrics.directionChartData} />
          </div>
        </div>
      )}

      {activeTab === "funnel" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 rounded-xl border border-white/[0.08] clean-card p-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Autonomous Recovery Lifecycle Funnel
              </h3>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Conversion drop-off from webhook decline ingestion to bank settlement
              </p>
            </div>
            <RecoveryFunnelChart data={metrics.funnelData} />
          </div>

          {/* Quick Case Status Metric Summary */}
          <div className="lg:col-span-4 rounded-xl border border-white/[0.08] clean-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Case Status Distribution
              </h3>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Current FSM lifecycle disposition
              </p>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Recovered:
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {metrics.statusBreakdown.recovered} Cases
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  In Flight:
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {metrics.statusBreakdown.inProgress + metrics.statusBreakdown.open} Cases
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <span className="text-xs text-rose-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Escalated / Guardrail:
                </span>
                <span className="text-xs font-bold text-rose-400">
                  {metrics.statusBreakdown.escalated} Cases
                </span>
              </div>
            </div>

            <div className="text-[11px] text-ink-400 bg-zinc-900/60 p-3 rounded-lg border border-white/[0.04] leading-relaxed">
              💡 <strong>AI Insight:</strong> Payday synchronization and mandate window sequencing yielded 85%+ of total recovered capital.
            </div>
          </div>
        </div>
      )}

      {activeTab === "velocity" && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8 rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                24-Hour Recovery Velocity & DND Compliance
              </h3>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Hourly attempt pacing highlighting Payday peaks and zero-contact quiet hours
              </p>
            </div>
            <HourlyVelocityChart data={metrics.hourlyVelocityData} />
          </div>

          <div className="lg:col-span-4 rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                Safety Guardrail Triggers
              </h3>
              <p className="text-[11px] text-ink-400 mt-0.5">
                Proactive protection mechanisms enforcing zero brand damage
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              {metrics.safetyData && metrics.safetyData.length > 0 ? (
                metrics.safetyData.map((s: any) => (
                  <div
                    key={s.reason}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                  >
                    <span className="text-xs font-medium text-white">{s.reason}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-ink-300">
                      {s.count} triggered
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-ink-400 italic p-3">
                  All active cases within safe operational limits.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
