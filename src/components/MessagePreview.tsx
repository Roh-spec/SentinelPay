import React from "react";
import type { Channel } from "@/engine/types";

export function MessagePreview({
  channel,
  messageBody,
  customerName,
  customerEmail,
  customerPhone,
}: {
  channel: Channel;
  messageBody: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  if (!messageBody || channel === "none") return null;

  if (channel === "email") {
    return (
      <div className="mt-2.5 overflow-hidden rounded-lg border border-white/[0.08] bg-black text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-zinc-900/50 px-3.5 py-2">
          <span className="font-medium text-ink-200">Email Dispatched</span>
          <span className="font-mono text-[10px] text-ink-400">
            {customerEmail || `${customerName.toLowerCase().replace(/\s+/g, ".")}@merchant.test`}
          </span>
        </div>
        <div className="p-3.5 space-y-2.5">
          <div className="text-[11px] text-ink-400">
            Subject: <strong className="text-white font-medium">Payment update required for {customerName}</strong>
          </div>
          <div className="rounded-md border border-white/[0.04] bg-zinc-900/40 p-3 text-xs leading-relaxed text-ink-200 font-sans">
            {messageBody}
          </div>
        </div>
      </div>
    );
  }

  if (channel === "sms") {
    return (
      <div className="mt-2.5 overflow-hidden rounded-lg border border-white/[0.08] bg-black text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-zinc-900/50 px-3.5 py-2">
          <span className="font-medium text-ink-200">SMS / WhatsApp Message</span>
          <span className="font-mono text-[10px] text-ink-400">
            {customerPhone || "+91 98XXXX XXXX"}
          </span>
        </div>
        <div className="p-3.5">
          <div className="rounded-lg border border-white/[0.06] bg-zinc-900/60 p-3 text-xs text-ink-200 leading-relaxed max-w-lg">
            {messageBody}
          </div>
          <p className="mt-2 text-[10px] text-ink-500 font-mono">
            Delivered · Frequency cap: 1 message / 48h
          </p>
        </div>
      </div>
    );
  }

  if (channel === "voice") {
    return (
      <div className="mt-2.5 overflow-hidden rounded-lg border border-amber-500/20 bg-black text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 bg-amber-950/20 px-3.5 py-2">
          <span className="font-medium text-amber-200">Voice Call Outreach</span>
          <span className="font-mono text-[10px] text-amber-400/80">Duration: ~45s</span>
        </div>
        <div className="p-3.5 space-y-2.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400/70">
            Transcript:
          </p>
          <blockquote className="rounded-lg border-l-2 border-amber-500 bg-zinc-950 p-3 text-xs italic text-ink-200 leading-relaxed">
            &ldquo;{messageBody}&rdquo;
          </blockquote>
        </div>
      </div>
    );
  }

  return null;
}
