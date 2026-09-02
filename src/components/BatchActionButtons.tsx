"use client";

import { useTransition } from "react";
import { actionReseed, actionRunBatch } from "@/app/actions";

export function BatchActionButtons() {
  const [isReseeding, startReseed] = useTransition();
  const [isRunning, startRun] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Reseed Button */}
      <button
        type="button"
        disabled={isReseeding || isRunning}
        onClick={() => {
          startReseed(async () => {
            await actionReseed();
          });
        }}
        className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-ink-300 hover:border-white/20 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-40"
      >
        {isReseeding ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span>Reseeding...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reseed Batch</span>
          </>
        )}
      </button>

      {/* Run Engine Button */}
      <button
        type="button"
        disabled={isRunning || isReseeding}
        onClick={() => {
          startRun(async () => {
            await actionRunBatch();
          });
        }}
        className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all disabled:opacity-40 shadow-sm active:scale-95"
      >
        {isRunning ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5 text-black fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Run Recovery Engine</span>
          </>
        )}
      </button>
    </div>
  );
}
