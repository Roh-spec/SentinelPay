"use client";

import { useState } from "react";

export function AuditPayloadViewer({
  input,
  output,
}: {
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const payloadString = JSON.stringify({ input, output }, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payloadString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard fallback */
    }
  };

  return (
    <div className="mt-2.5 rounded-lg border border-white/[0.06] bg-zinc-950 p-2.5 text-xs">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 font-mono text-[11px] text-ink-400 hover:text-white transition-colors"
        >
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${
              open ? "rotate-90 text-white" : "text-ink-500"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{open ? "Hide Payload JSON" : "Inspect Payload JSON"}</span>
        </button>

        {open && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded bg-zinc-900 border border-white/[0.08] px-2 py-0.5 text-[10px] text-ink-300 hover:text-white"
          >
            {copied ? (
              <span className="text-emerald-400 font-medium">Copied!</span>
            ) : (
              <span>Copy</span>
            )}
          </button>
        )}
      </div>

      {open && (
        <pre className="mt-2.5 overflow-x-auto rounded bg-black p-3 font-mono text-[11px] leading-relaxed text-ink-300 border border-white/[0.04]">
          {payloadString}
        </pre>
      )}
    </div>
  );
}
