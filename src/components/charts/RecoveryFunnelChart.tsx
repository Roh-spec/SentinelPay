"use client";

import React from "react";

interface FunnelStep {
  stage: string;
  count: number;
  amount: number;
  pctOfTotal: number;
  description: string;
}

interface Props {
  data: FunnelStep[];
}

export function RecoveryFunnelChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      {data.map((step, idx) => {
        const isFinal = idx === data.length - 1;
        const widthPercent = Math.max(15, step.pctOfTotal);

        return (
          <div key={step.stage} className="relative group">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-mono font-bold text-ink-300">
                  0{idx + 1}
                </span>
                <span className="font-semibold text-white tracking-tight">{step.stage}</span>
                <span className="text-[11px] text-ink-400 hidden sm:inline">
                  — {step.description}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-ink-400 text-xs">{step.count} cases</span>
                <span className={`font-semibold ${isFinal ? "text-emerald-400" : "text-white"}`}>
                  ₹{step.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Funnel Bar Container */}
            <div className="w-full bg-zinc-900/80 rounded-lg h-7 p-1 border border-white/[0.06] flex items-center overflow-hidden">
              <div
                className={`h-full rounded-md transition-all duration-700 flex items-center justify-between px-3 text-[11px] font-mono font-medium ${
                  isFinal
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/20"
                    : idx === 2
                    ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white"
                    : idx === 1
                    ? "bg-gradient-to-r from-zinc-600 to-zinc-500 text-white"
                    : "bg-zinc-700 text-zinc-300"
                }`}
                style={{ width: `${widthPercent}%` }}
              >
                <span className="truncate">{step.pctOfTotal.toFixed(1)}% Conversion</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
