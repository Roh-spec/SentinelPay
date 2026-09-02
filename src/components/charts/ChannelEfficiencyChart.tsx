"use client";

import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";

interface DirectionItem {
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
  data: DirectionItem[];
}

const COLORS = [
  "#10b981", // Emerald (Failed subscription)
  "#38bdf8", // Sky Blue (Payment degradation)
  "#a855f7", // Purple (Checkout drop-off)
  "#6366f1", // Indigo (B2B receivables)
  "#f59e0b", // Amber (Mandate retry)
  "#ec4899", // Pink
  "#94a3b8", // Slate
];

function formatInr(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
  } = props;

  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        dy={8}
        textAnchor="middle"
        fill="#ffffff"
        className="font-medium text-xs font-sans"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 10}
        dy={8}
        textAnchor="middle"
        fill="#10b981"
        className="font-mono text-xs font-semibold"
      >
        {payload.recovered > 0 ? formatInr(payload.recovered) : `${payload.rate.toFixed(0)}% yield`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 7}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export function ChannelEfficiencyChart({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter out Hinglish voice
  const filteredData = (data || []).filter(
    (d) =>
      d.key !== "hinglish_voice" &&
      !d.name.toLowerCase().includes("hinglish") &&
      !d.name.toLowerCase().includes("voice")
  );

  if (filteredData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-ink-400">
        No channel data available
      </div>
    );
  }

  const totalRecovered = filteredData.reduce((acc, curr) => acc + curr.recovered, 0);

  // Calculate Yield Share representation
  const chartData = filteredData.map((d) => {
    const yieldShare = totalRecovered > 0 ? (d.recovered / totalRecovered) * 100 : (d.rate > 0 ? d.rate : 1);
    return {
      ...d,
      value: d.recovered > 0 ? d.recovered : (d.rate > 0 ? d.rate : 0.001),
      yieldShare,
    };
  });

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 h-80">
      {/* Donut Chart */}
      <div className="w-full md:w-1/2 h-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              {...({ activeIndex, activeShape: renderActiveShape } as any)}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={78}
              dataKey="value"
              onMouseEnter={onPieEnter}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
                      <div className="font-semibold text-white border-b border-white/10 pb-1">
                        {item.name}
                      </div>
                      <div className="flex justify-between text-emerald-400 font-mono text-[11px]">
                        <span>Recovered:</span>
                        <span className="font-semibold">{formatInr(item.recovered)}</span>
                      </div>
                      <div className="flex justify-between text-ink-400 font-mono text-[11px]">
                        <span>At Risk:</span>
                        <span>{formatInr(item.atRisk)}</span>
                      </div>
                      <div className="flex justify-between text-sky-400 font-mono font-semibold pt-1 border-t border-white/10 text-[11px]">
                        <span>Yield:</span>
                        <span>{item.rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion List */}
      <div className="w-full md:w-1/2 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-1">
          Strategy Conversion Yield
        </div>
        {chartData.map((item, idx) => {
          const color = COLORS[idx % COLORS.length];
          const isSelected = activeIndex === idx;
          const rateClamped = Math.min(100, Math.max(0, item.rate));

          return (
            <div
              key={item.key}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? "bg-white/[0.06] border-white/20 shadow-md"
                  : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-2 font-medium text-white truncate max-w-[140px]">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{item.name}</span>
                </span>
                <span
                  className={`font-mono font-semibold text-xs ${
                    item.rate > 0 ? "text-emerald-400" : "text-ink-500"
                  }`}
                >
                  {item.rate > 0 ? `${item.rate.toFixed(0)}%` : "0%"}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rateClamped}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
