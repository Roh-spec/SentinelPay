import React from "react";
import type { FsmState } from "@/engine/types";

interface AuditStep {
  action: string;
  outputJson: string;
}

export function FsmStepper({
  currentState,
  status,
  stoppedReason,
  audits,
}: {
  currentState: FsmState;
  status: string;
  stoppedReason: string | null;
  audits: AuditStep[];
}) {
  const visitedStates = new Set<string>(["OPEN"]);
  audits.forEach((a) => {
    try {
      const out = JSON.parse(a.outputJson) as { nextState?: string };
      if (out.nextState) visitedStates.add(out.nextState);
    } catch {
      /* ignore */
    }
  });

  const isRecovered = status === "recovered";
  const isEscalated = status === "escalated" || currentState === "HUMAN_ESCALATED";
  const isOptedOut = status === "opted_out" || stoppedReason === "customer_opted_out";
  const isLost = status === "lost";

  const pipeline = [
    {
      id: "OPEN",
      label: "Open",
      description: "Detect & classify",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: "RETRY_1",
      label: "Retry 1",
      description: "Smart cadence retry",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: "RETRY_2",
      label: "Retry 2",
      description: "Backup rail / gateway",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "RETRY_3",
      label: "Retry 3",
      description: "Final auto-attempt",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "NUDGE_SENT",
      label: "Nudge",
      description: "Multi-channel notice",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  if (visitedStates.has("PROMISE_TRACKING")) {
    pipeline.splice(4, 0, {
      id: "PROMISE_TRACKING",
      label: "PTP Tracker",
      description: "Promise date tracking",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    });
  }
  if (visitedStates.has("VOICE_ATTEMPTED")) {
    pipeline.splice(4, 0, {
      id: "VOICE_ATTEMPTED",
      label: "Voice Call",
      description: "Hinglish voice agent",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
    });
  }

  // Display status label without repeating words
  const statusBadge = isRecovered
    ? "Recovered"
    : isEscalated
      ? "Escalated"
      : isOptedOut
        ? "Opted Out"
        : isLost
          ? "Closed"
          : currentState === "OPEN"
            ? "Open"
            : currentState.replace(/_/g, " ");

  const terminalLabel = isRecovered
    ? "Recovered"
    : isEscalated
      ? "Escalated"
      : isOptedOut
        ? "Opted Out"
        : isLost
          ? "Closed (Lost)"
          : "Terminal";

  return (
    <div className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-ink-300">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-200">
            State Machine Progression
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ink-500 font-mono">Current State:</span>
          <span
            className={`rounded px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wider ${
              isRecovered
                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                : isEscalated
                  ? "bg-rose-950 text-rose-400 border border-rose-500/40"
                  : isOptedOut
                    ? "bg-purple-950 text-purple-300 border border-purple-500/40"
                    : "bg-zinc-800 text-white border border-zinc-700"
            }`}
          >
            {statusBadge}
          </span>
        </div>
      </div>

      {/* Stepper Track */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {pipeline.map((step, idx) => {
          const isVisited = visitedStates.has(step.id);
          const isCurrent = currentState === step.id;

          return (
            <div
              key={step.id}
              className={`relative flex flex-col justify-between rounded-lg border p-3 transition-all ${
                isCurrent
                  ? "border-white/30 bg-zinc-900 shadow-sm ring-1 ring-white/10"
                  : isVisited
                    ? "border-emerald-500/20 bg-emerald-950/20"
                    : "border-white/[0.04] bg-black/40 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold ${
                    isCurrent
                      ? "bg-white text-black"
                      : isVisited
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-zinc-800 text-ink-500"
                  }`}
                >
                  {isVisited && !isCurrent ? "✓" : idx + 1}
                </div>
                <span className="text-ink-400">
                  {step.icon}
                </span>
              </div>

              <div className="mt-3">
                <h4
                  className={`text-xs font-semibold ${
                    isCurrent ? "text-white" : isVisited ? "text-ink-200" : "text-ink-500"
                  }`}
                >
                  {step.label}
                </h4>
                <p className="text-[10px] text-ink-500 leading-tight mt-0.5">
                  {step.description}
                </p>
              </div>

              {isCurrent && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Active Step</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Terminal Outcome Card */}
        <div
          className={`flex flex-col justify-between rounded-lg border p-3 ${
            isRecovered
              ? "border-emerald-500/40 bg-emerald-950/40"
              : isEscalated
                ? "border-rose-500/40 bg-rose-950/40"
                : isOptedOut
                  ? "border-purple-500/40 bg-purple-950/40"
                  : "border-white/[0.04] bg-black/40 opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono font-bold ${
                isRecovered
                  ? "bg-emerald-500 text-black"
                  : isEscalated
                    ? "bg-rose-500 text-white"
                    : isOptedOut
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-ink-500"
              }`}
            >
              {isRecovered ? "₹" : isEscalated ? "!" : "■"}
            </div>
            <span className="text-ink-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>

          <div className="mt-3">
            <h4
              className={`text-xs font-semibold ${
                isRecovered
                  ? "text-emerald-400"
                  : isEscalated
                    ? "text-rose-400"
                    : isOptedOut
                      ? "text-purple-300"
                      : "text-ink-400"
              }`}
            >
              {terminalLabel}
            </h4>
            <p className="text-[10px] text-ink-500 leading-tight mt-0.5">
              {isRecovered
                ? "Funds collected"
                : isEscalated
                  ? "Human queue"
                  : isOptedOut
                    ? "DND enforced"
                    : "Final state"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
