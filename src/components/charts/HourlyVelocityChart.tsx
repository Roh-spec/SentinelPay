"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface HourlyItem {
  hour: string;
  retries: number;
  recoveries: number;
  status: string;
}

interface Props {
  data: HourlyItem[];
}

const CustomVelocityTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const retries = payload.find((p: any) => p.dataKey === "retries")?.value || 0;
    const recoveries = payload.find((p: any) => p.dataKey === "recoveries")?.value || 0;
    const rate = retries > 0 ? ((recoveries / retries) * 100).toFixed(0) : "0";

    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="font-semibold text-white border-b border-white/10 pb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-ink-300 font-mono">
            {rate}% Success
          </span>
        </div>
        <div className="text-[11px] text-ink-400 font-sans italic">
          {item.status}
        </div>
        <div className="space-y-1 font-mono pt-1">
          <div className="flex justify-between items-center text-sky-400">
            <span>Scheduled Attempts:</span>
            <span>{retries}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Recoveries Realized:</span>
            <span>{recoveries}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function HourlyVelocityChart({ data }: Props) {
  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
        >
          <defs>
            <linearGradient id="attemptsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="velocityRecoveries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.06} vertical={false} />
          
          <XAxis
            dataKey="hour"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#ffffff", strokeOpacity: 0.1 }}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={40}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomVelocityTooltip />} />

          <Area
            type="monotone"
            dataKey="retries"
            name="Scheduled Retries"
            stroke="#38bdf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#attemptsGradient)"
          />
          <Area
            type="monotone"
            dataKey="recoveries"
            name="Successful Recoveries"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#velocityRecoveries)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
