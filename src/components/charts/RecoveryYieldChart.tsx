"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CauseItem {
  key: string;
  name: string;
  atRisk: number;
  recovered: number;
  atRiskPaise: number;
  recoveredPaise: number;
  rate: number;
  count: number;
}

interface Props {
  data: CauseItem[];
}

function formatCurrency(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val.toLocaleString("en-IN")}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const atRisk = payload.find((p: any) => p.dataKey === "atRisk")?.value || 0;
    const recovered = payload.find((p: any) => p.dataKey === "recovered")?.value || 0;
    const rate = atRisk > 0 ? ((recovered / atRisk) * 100).toFixed(1) : "0.0";

    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
        <div className="font-semibold text-white border-b border-white/10 pb-1.5 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
            {rate}% Yield
          </span>
        </div>
        <div className="space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-rose-400">
            <span className="flex items-center gap-1.5 text-ink-300">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              At Risk:
            </span>
            <span>₹{atRisk.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-1.5 text-ink-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Recovered:
            </span>
            <span>₹{recovered.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function RecoveryYieldChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-ink-400">
        No case telemetry available
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 10, bottom: 25 }}
          barGap={6}
        >
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#be123c" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="recoveredGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
          
          <XAxis
            dataKey="name"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#ffffff", strokeOpacity: 0.1 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={45}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.03)" }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: "12px", fontSize: "11px", color: "#a1a1aa" }}
          />

          <Bar
            dataKey="atRisk"
            name="Amount at Risk"
            fill="url(#riskGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="recovered"
            name="Recovered Yield"
            fill="url(#recoveredGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
