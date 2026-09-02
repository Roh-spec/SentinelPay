import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/money";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
  type Direction,
  type RootCause,
  type Channel,
  type FsmState,
} from "@/engine/types";
import { FsmStepper } from "@/components/FsmStepper";
import { MessagePreview } from "@/components/MessagePreview";
import { AuditPayloadViewer } from "@/components/AuditPayloadViewer";
import { CaseActionPanel } from "@/components/CaseActionPanel";

export const dynamic = "force-dynamic";

function getCaseDescription(row: {
  direction: string;
  rootCause: string;
  amountAtRisk: number;
  customer: { name: string; paydayDay: number };
}) {
  const inr = formatInr(row.amountAtRisk);
  if (row.rootCause === "insufficient_funds") {
    return `Subscription renewal of ${inr} failed due to low account balance. Recovery policy is scheduling smart retries aligned to customer payday (Day ${row.customer.paydayDay}).`;
  }
  if (row.rootCause === "fraud_suspected") {
    return `Transaction of ${inr} was flagged for suspected fraud by the issuer bank. All automated retries are permanently halted and routed to the human escalation queue.`;
  }
  if (row.rootCause === "invoice_overdue") {
    return `B2B invoice of ${inr} is overdue. The engine is executing a graduated tone schedule (professional reminder → firm notice) and tracking Promise-to-Pay commitments.`;
  }
  if (row.rootCause === "checkout_abandoned") {
    return `Customer abandoned checkout session (${inr}) at payment step. A time-boxed 24h recovery payment link was dispatched via SMS for single-touch re-engagement.`;
  }
  if (row.rootCause === "mandate_window_miss") {
    return `Auto-debit of ${inr} missed the NACH / UPI Autopay processing cutoff. Presentation retry is held until the next verified bank debit window opens.`;
  }
  if (row.rootCause === "silent_debtor") {
    return `Digital reminder channels yielded no response for ${inr}. The engine is staging a conversational Hinglish voice recovery attempt with transcript logging.`;
  }
  if (row.rootCause === "expired_card") {
    return `Recurring charge of ${inr} failed due to an expired card on file. Dispatched card update notice and deferred auto-retry until a new payment method is added.`;
  }
  return `Recovery case active for ${inr} following a ${row.rootCause.replace(/_/g, " ")} decline event. Policy engine is managing the bounded recovery workflow.`;
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.recoveryCase.findUnique({
    where: { id },
    include: {
      customer: true,
      audits: { orderBy: { timestamp: "asc" } },
      subscription: true,
      invoice: true,
      checkout: true,
      mandate: true,
      attempts: { orderBy: { attemptedAt: "desc" } },
    },
  });

  if (!row) notFound();

  const isRecovered = row.status === "recovered";
  const isEscalated = row.status === "escalated";
  const isOptedOut = row.status === "opted_out" || row.stoppedReason === "customer_opted_out";

  // Clean status label without repetition
  const statusBadge = isRecovered
    ? "Recovered"
    : isEscalated
      ? "Escalated"
      : isOptedOut
        ? "Opted Out"
        : row.fsmState === "OPEN"
          ? "Open"
          : row.fsmState.replace(/_/g, " ");

  const caseDescription = getCaseDescription(row);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-1.5 text-xs text-ink-300 hover:text-white hover:border-white/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>All cases</span>
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs text-ink-400">
          <span className="rounded bg-zinc-900 border border-white/[0.06] px-2 py-0.5">
            ID: <strong className="text-white">{row.id}</strong>
          </span>
          <span className="rounded bg-zinc-900 border border-white/[0.06] px-2 py-0.5">
            Policy: <strong className="text-white">{row.policyVersion}</strong>
          </span>
        </div>
      </div>

      {/* Main Case Header Card */}
      <header className="rounded-xl border border-white/[0.08] clean-card p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-200">
                {DIRECTION_LABEL[row.direction as Direction] ?? row.direction}
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  isRecovered
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    : isEscalated
                      ? "bg-rose-950 text-rose-400 border border-rose-500/30"
                      : isOptedOut
                        ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                        : "bg-zinc-800 text-ink-200 border border-zinc-700"
                }`}
              >
                {statusBadge}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {row.customer.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
              <span className="font-medium text-ink-300">Diagnosed Cause:</span>
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white border border-white/[0.06]">
                {ROOT_CAUSE_LABEL[row.rootCause as RootCause] ?? row.rootCause}
              </span>
              <span>·</span>
              <span>
                Opened{" "}
                {new Date(row.openedAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Contextual Case Description */}
            <p className="text-xs sm:text-sm text-ink-300 leading-relaxed max-w-3xl pt-1">
              {caseDescription}
            </p>
          </div>

          {/* Financial Scorecard */}
          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 md:border-l border-white/[0.06] pt-3 md:pt-0 md:pl-6 shrink-0">
            <div className="text-left md:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 font-mono">At Risk</p>
              <p className="font-mono text-xl sm:text-2xl font-bold text-white">{formatInr(row.amountAtRisk)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 font-mono">Recovered</p>
              <p className={`font-mono text-xl sm:text-2xl font-bold ${isRecovered ? "text-emerald-400" : "text-ink-500"}`}>
                {formatInr(row.amountRecovered)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Details Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-white/[0.06] pt-4 text-xs">
          <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5">
            <span className="text-ink-500 block text-[10px] uppercase font-mono">LTV</span>
            <strong className="text-white font-mono">{formatInr(row.customer.ltvPaise)}</strong>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5">
            <span className="text-ink-500 block text-[10px] uppercase font-mono">Risk Tier</span>
            <strong className="text-white capitalize">{row.customer.riskTier}</strong>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5">
            <span className="text-ink-500 block text-[10px] uppercase font-mono">Payday</span>
            <strong className="text-white">Day {row.customer.paydayDay}</strong>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-black/40 p-2.5">
            <span className="text-ink-500 block text-[10px] uppercase font-mono">Quiet Hours</span>
            <strong className="text-white font-mono">{row.customer.dndStartHour}:00 - {row.customer.dndEndHour}:00</strong>
          </div>
        </div>
      </header>

      {/* State Machine */}
      <FsmStepper
        currentState={row.fsmState as FsmState}
        status={row.status}
        stoppedReason={row.stoppedReason}
        audits={row.audits}
      />

      {/* Action Controls */}
      <CaseActionPanel
        caseId={row.id}
        fsmState={row.fsmState as FsmState}
        status={row.status}
        amountAtRisk={row.amountAtRisk}
      />

      {/* Side by Side Diagnosis vs Decision */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
          <div className="border-b border-white/[0.06] pb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Decline Telemetry
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-500">Source ID:</span>
              <span className="font-mono text-ink-200">{row.sourceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Decline Code:</span>
              <span className="font-mono font-semibold text-rose-400">
                {row.attempts[0]?.declineCode || "None (session drop)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Gateway:</span>
              <span className="font-mono text-ink-200">
                {row.attempts[0]?.gateway || "Direct"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-3">
          <div className="border-b border-white/[0.06] pb-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Policy Resolution
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-500">Action:</span>
              <span className="font-medium text-white">
                {row.rootCause === "fraud_suspected"
                  ? "Immediate Human Escalation"
                  : row.rootCause === "insufficient_funds"
                    ? "Payday Aligned Retry"
                    : "Bounded Multi-Rail Outreach"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Attempts:</span>
              <span className="font-mono text-ink-200">{row.attemptsUsed} / 3 used</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-500">Stopping Rule:</span>
              <span className="font-mono text-ink-200">{row.stoppedReason || "None"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Audit Trail */}
      <section className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
            Append-Only Audit Trail
          </h2>
          <span className="font-mono text-[11px] text-ink-500">
            {row.audits.length} events
          </span>
        </div>

        <div className="space-y-3">
          {row.audits.map((audit, idx) => {
            let inputParsed = {};
            let outputParsed = {};
            try {
              inputParsed = JSON.parse(audit.inputJson);
              outputParsed = JSON.parse(audit.outputJson);
            } catch {
              /* ignore */
            }

            return (
              <div
                key={audit.id}
                className="rounded-lg border border-white/[0.06] bg-black/40 p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.04] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ink-500">#{idx + 1}</span>
                    <strong className="text-xs font-mono text-white">{audit.action}</strong>
                    <span className="rounded bg-zinc-900 border border-white/[0.06] px-1.5 py-0.2 text-[10px] text-ink-400 font-mono">
                      {audit.actor}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-500">
                    {new Date(audit.timestamp).toLocaleTimeString("en-IN")}
                  </span>
                </div>

                {audit.messageBody && (
                  <MessagePreview
                    channel={audit.channel as Channel}
                    messageBody={audit.messageBody}
                    customerName={row.customer.name}
                    customerEmail={row.customer.email}
                    customerPhone={row.customer.phone}
                  />
                )}

                <AuditPayloadViewer input={inputParsed} output={outputParsed} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
