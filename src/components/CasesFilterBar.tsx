"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
} from "@/engine/types";

export function CasesFilterBar({
  totalCases,
  filteredCases,
  filteredAtRisk,
  filteredRecovered,
}: {
  totalCases: number;
  filteredCases: number;
  filteredAtRisk: string;
  filteredRecovered: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";
  const currentStatus = searchParams.get("status") ?? "";
  const currentRootCause = searchParams.get("rootCause") ?? "";
  const currentDirection = searchParams.get("direction") ?? "";

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (!val) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      startTransition(() => {
        router.push(`/cases?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const hasActiveFilters = Boolean(
    currentSearch || currentStatus || currentRootCause || currentDirection
  );

  const clearAllFilters = () => {
    startTransition(() => {
      router.push("/cases");
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Toolbar Card */}
      <div className="rounded-xl border border-white/[0.08] clean-card p-4 space-y-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Input */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-ink-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              defaultValue={currentSearch}
              placeholder="Search customer, ID, email..."
              onChange={(e) => updateFilters({ search: e.target.value.trim() || null })}
              className="w-full rounded-lg border border-white/[0.08] bg-black py-1.5 pl-8 pr-3 text-xs text-white placeholder-ink-500 focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value || null })}
              aria-label="Filter by case status"
              className="w-full rounded-lg border border-white/[0.08] bg-black px-3 py-1.5 text-xs text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="recovered">Recovered</option>
              <option value="escalated">Escalated</option>
              <option value="opted_out">Opted Out</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Direction Dropdown */}
          <div>
            <select
              value={currentDirection}
              onChange={(e) => updateFilters({ direction: e.target.value || null })}
              aria-label="Filter by signal direction"
              className="w-full rounded-lg border border-white/[0.08] bg-black px-3 py-1.5 text-xs text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="">All Rails</option>
              {Object.entries(DIRECTION_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Root Cause Dropdown */}
          <div>
            <select
              value={currentRootCause}
              onChange={(e) => updateFilters({ rootCause: e.target.value || null })}
              aria-label="Filter by diagnosed root cause"
              className="w-full rounded-lg border border-white/[0.08] bg-black px-3 py-1.5 text-xs text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="">All Decline Causes</option>
              {Object.entries(ROOT_CAUSE_LABEL).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2.5">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-[11px] uppercase tracking-wider text-ink-500 mr-1 font-mono">
              Filters:
            </span>
            <button
              type="button"
              onClick={() => updateFilters({ status: "recovered", rootCause: null, direction: null })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                currentStatus === "recovered"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-semibold"
                  : "bg-zinc-900 border border-white/[0.06] text-ink-400 hover:text-white"
              }`}
            >
              Recovered
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ status: "escalated", rootCause: null, direction: null })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                currentStatus === "escalated"
                  ? "bg-rose-950 text-rose-300 border border-rose-500/40 font-semibold"
                  : "bg-zinc-900 border border-white/[0.06] text-ink-400 hover:text-white"
              }`}
            >
              Escalated
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ rootCause: "insufficient_funds", status: null, direction: null })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                currentRootCause === "insufficient_funds"
                  ? "bg-white text-black font-semibold"
                  : "bg-zinc-900 border border-white/[0.06] text-ink-400 hover:text-white"
              }`}
            >
              Payday Retries
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ rootCause: "fraud_suspected", status: null, direction: null })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                currentRootCause === "fraud_suspected"
                  ? "bg-rose-950 text-rose-300 border border-rose-500/40 font-semibold"
                  : "bg-zinc-900 border border-white/[0.06] text-ink-400 hover:text-white"
              }`}
            >
              Fraud Blocks
            </button>
            <button
              type="button"
              onClick={() => updateFilters({ direction: "b2b_receivables", status: null, rootCause: null })}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition-all ${
                currentDirection === "b2b_receivables"
                  ? "bg-zinc-800 text-white border border-zinc-600 font-semibold"
                  : "bg-zinc-900 border border-white/[0.06] text-ink-400 hover:text-white"
              }`}
            >
              B2B Invoices
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded bg-zinc-900 border border-white/[0.08] px-2 py-0.5 text-[11px] text-ink-300 hover:text-white"
            >
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Counts */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-ink-400">
        <div>
          Showing <strong className="text-white font-mono">{filteredCases}</strong> of{" "}
          <strong className="text-white font-mono">{totalCases}</strong> cases
          {isPending && <span className="ml-2 text-ink-500">Updating...</span>}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>
            At Risk: <strong className="text-white">{filteredAtRisk}</strong>
          </span>
          <span>·</span>
          <span>
            Recovered: <strong className="text-emerald-400">{filteredRecovered}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
