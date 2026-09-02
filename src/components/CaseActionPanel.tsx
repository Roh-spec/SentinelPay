"use client";

import { useState, useTransition } from "react";
import {
  actionStepCase,
  actionHumanResolve,
  actionHumanOptOut,
} from "@/app/actions";
import type { FsmState } from "@/engine/types";

export function CaseActionPanel({
  caseId,
  fsmState,
  status,
  amountAtRisk,
}: {
  caseId: string;
  fsmState: FsmState;
  status: string;
  amountAtRisk: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState("");
  const [optOutReason, setOptOutReason] = useState("Customer requested DND / opt-out via support portal");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isTerminal = fsmState === "CLOSED";
  const isEscalated = status === "escalated" || fsmState === "HUMAN_ESCALATED";

  const handleStep = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await actionStepCase(caseId);
      if (!res.ok) {
        setFeedback(res.reason ?? "Cannot step case.");
      } else {
        setFeedback("Executed next bounded FSM state transition.");
      }
    });
  };

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      await actionHumanResolve(caseId, resolveNotes || "Resolved via human operations override.", amountAtRisk);
      setShowResolveModal(false);
      setFeedback("Case marked as recovered by operator.");
    });
  };

  const handleOptOut = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      await actionHumanOptOut(caseId, optOutReason || "Customer requested DND / opt-out");
      setShowOptOutModal(false);
      setFeedback("Customer opted out. All automated recovery workflows stopped.");
    });
  };

  return (
    <div className="rounded-xl border border-white/[0.08] clean-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
          Operator & Workflow Controls
        </h3>
        <span className="font-mono text-[11px] text-ink-400">
          Status: <strong className="text-white uppercase">{status === "open" && fsmState === "OPEN" ? "OPEN" : `${fsmState} (${status})`}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Step FSM Button */}
        {!isTerminal && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleStep}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all disabled:opacity-40"
          >
            {isPending ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
            <span>Execute Next Step</span>
          </button>
        )}

        {/* Human Resolve Button */}
        {(!isTerminal || isEscalated) && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setShowOptOutModal(false);
              setShowResolveModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-zinc-900 px-3 py-1.5 text-xs font-medium text-ink-200 hover:text-white hover:border-white/20 transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Resolve Case</span>
          </button>
        )}

        {/* Customer Opt-Out Dialogue Trigger */}
        {!isTerminal && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setShowResolveModal(false);
              setShowOptOutModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-rose-400 hover:border-rose-500/30 transition-all disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span>Enforce Opt-Out</span>
          </button>
        )}

        {isTerminal && !isEscalated && (
          <span className="text-xs text-ink-500 italic">
            Case is closed ({status}).
          </span>
        )}
      </div>

      {feedback && (
        <div className="rounded-lg border border-white/[0.08] bg-zinc-900/60 p-2.5 text-xs text-ink-200">
          {feedback}
        </div>
      )}

      {/* Opt-Out Dialogue Box */}
      {showOptOutModal && (
        <div className="mt-3 rounded-lg border border-rose-500/30 bg-black p-4 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-rose-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h4 className="text-xs font-semibold text-white">Enforce Customer Opt-Out / DND</h4>
          </div>
          <p className="text-xs text-ink-400 leading-relaxed">
            This will immediately halt all automated payment retries, SMS nudges, emails, and voice calls for this customer, and record an immutable compliance audit log entry.
          </p>
          <form onSubmit={handleOptOut} className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-ink-300 mb-1">
                Opt-Out Reason:
              </label>
              <input
                type="text"
                required
                value={optOutReason}
                onChange={(e) => setOptOutReason(e.target.value)}
                placeholder="e.g. Customer requested DND via support ticket"
                className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs text-white placeholder-ink-500 focus:border-rose-500/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOptOutModal(false)}
                className="rounded-lg bg-zinc-900 border border-white/[0.08] px-3 py-1.5 text-xs text-ink-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {isPending ? "Stopping..." : "Confirm & Halt Automation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Settlement Override Modal */}
      {showResolveModal && (
        <div className="mt-3 rounded-lg border border-white/[0.08] bg-black p-4 space-y-3">
          <h4 className="text-xs font-semibold text-white">Manual Settlement Override</h4>
          <p className="text-xs text-ink-400">
            Record manual offline collection details (e.g., bank transfer or support ticket settlement).
          </p>
          <form onSubmit={handleResolve} className="space-y-3">
            <textarea
              required
              rows={2}
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Enter offline settlement details (e.g. wire transfer received)..."
              className="w-full rounded-lg border border-white/[0.08] bg-zinc-900 p-2.5 text-xs text-white placeholder-ink-500 focus:border-white/30 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-ink-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200"
              >
                {isPending ? "Saving..." : "Confirm Settlement"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
