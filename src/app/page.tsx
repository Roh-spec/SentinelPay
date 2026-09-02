import Link from "next/link";
import { batchMetrics } from "@/engine/measure";
import { formatInr, pct } from "@/lib/money";
import { Shell } from "@/components/Shell";
import { prisma } from "@/lib/prisma";
import { AnalyticsSection } from "@/components/charts/AnalyticsSection";
import { KpiExplorerSection } from "@/components/KpiExplorerSection";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
  type Direction,
  type RootCause,
} from "@/engine/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const metrics = await batchMetrics();

  // Fetch representative cases for all 6 core demo storylines + all cases for explorer
  const [
    paydayCase,
    fraudCase,
    b2bCase,
    voiceCase,
    mandateCase,
    checkoutCase,
    allCases,
  ] = await Promise.all([
    prisma.recoveryCase.findFirst({
      where: { rootCause: "insufficient_funds" },
      include: { customer: true, subscription: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findFirst({
      where: { rootCause: "fraud_suspected" },
      include: { customer: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findFirst({
      where: { direction: "b2b_receivables" },
      include: { customer: true, invoice: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findFirst({
      where: { direction: "hinglish_voice" },
      include: { customer: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findFirst({
      where: { direction: "mandate_retry" },
      include: { customer: true, mandate: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findFirst({
      where: { direction: "checkout_dropoff" },
      include: { customer: true, checkout: true },
      orderBy: { amountAtRisk: "desc" },
    }),
    prisma.recoveryCase.findMany({
      include: {
        customer: true,
        attempts: { orderBy: { attemptedAt: "desc" }, take: 1 },
        audits: { orderBy: { timestamp: "desc" }, take: 1 },
      },
      orderBy: [{ amountAtRisk: "desc" }, { openedAt: "desc" }],
    }),
  ]);

  return (
    <Shell active="board">
      {metrics.caseCount === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] p-12 text-center clean-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-ink-300 border border-white/[0.08]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">No Batch Data Seeded</h2>
          <p className="mt-1 max-w-sm mx-auto text-xs text-ink-400">
            Click &ldquo;Reseed Batch&rdquo; to generate test decline events across subscriptions, invoices, and checkouts.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Executive KPI Matrix */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total At Risk"
              value={formatInr(metrics.atRisk)}
              hint={`${metrics.caseCount} failure cases · Click to view`}
              href="#total-at-risk"
              icon={
                <svg className="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <StatCard
              label="Recovered Yield"
              value={formatInr(metrics.recovered)}
              hint={metrics.lastRun ? "Autonomous engine executed · Click to view" : "Awaiting batch run · Click to view"}
              accent
              href="#recovered-yield"
              icon={
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <StatCard
              label="Recovery Rate"
              value={pct(metrics.rate)}
              hint="Conversion on at-risk capital · Click to view"
              href="#recovery-rate"
              icon={
                <svg className="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            <StatCard
              label="Guardrail Escalations"
              value={`${metrics.escalated} Cases`}
              hint={`${metrics.messages} audit dispatches · Click to view`}
              href="#guardrail-escalations"
              icon={
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </section>

          {/* Real-time Interactive Visual Telemetry & Graphs */}
          <section>
            <AnalyticsSection metrics={metrics} />
          </section>

          {/* Intervention Strategies Section */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-3">
              <div>
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                  Intervention Strategies
                </h2>
                <p className="mt-0.5 text-xs text-ink-400">
                  Targeted recovery policies mapped directly to decline telemetry and customer context.
                </p>
              </div>
              <Link
                href="/cases"
                className="text-xs text-ink-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <span>View all {metrics.caseCount} cases</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Story 1: Payday Aligned */}
              {paydayCase && (
                <StoryCard
                  badge="Payday Retry"
                  badgeType="emerald"
                  title="Insufficient Funds"
                  description="Aligns retry cadence to payday windows (1st/5th/7th/15th) to avoid redundant attempts and bank bounce fees."
                  caseId={paydayCase.id}
                  customerName={paydayCase.customer.name}
                  atRisk={formatInr(paydayCase.amountAtRisk)}
                  recovered={formatInr(paydayCase.amountRecovered)}
                  status={paydayCase.status}
                  rule="Payday aligned retry window"
                />
              )}

              {/* Story 2: Fraud Hard Stop */}
              {fraudCase && (
                <StoryCard
                  badge="Hard Stop"
                  badgeType="rose"
                  title="Fraud Suspected"
                  description="Halts automated attempts on issuer risk flags (0 retries) and routes directly to human escalation queue."
                  caseId={fraudCase.id}
                  customerName={fraudCase.customer.name}
                  atRisk={formatInr(fraudCase.amountAtRisk)}
                  recovered={formatInr(fraudCase.amountRecovered)}
                  status={fraudCase.status}
                  rule="0 auto-retries → Human Escalated"
                />
              )}

              {/* Story 3: B2B Promise-to-Pay */}
              {b2bCase && (
                <StoryCard
                  badge="Tone Ladder + PTP"
                  badgeType="zinc"
                  title="Overdue Invoice"
                  description="Escalating tone schedule: professional reminder → capture Promise-to-Pay date → arm tracker → escalate on breach."
                  caseId={b2bCase.id}
                  customerName={b2bCase.customer.name}
                  atRisk={formatInr(b2bCase.amountAtRisk)}
                  recovered={formatInr(b2bCase.amountRecovered)}
                  status={b2bCase.status}
                  rule="Graduated tone ladder with PTP"
                />
              )}

              {/* Story 4: Hinglish AI Voice */}
              {voiceCase && (
                <StoryCard
                  badge="Voice Outreach"
                  badgeType="amber"
                  title="Silent Debtor Recovery"
                  description="When digital emails and SMS stall, initiates one conversational voice call with full transcript written to audit log."
                  caseId={voiceCase.id}
                  customerName={voiceCase.customer.name}
                  atRisk={formatInr(voiceCase.amountAtRisk)}
                  recovered={formatInr(voiceCase.amountRecovered)}
                  status={voiceCase.status}
                  rule="1 Hinglish Voice outreach"
                />
              )}

              {/* Story 5: Mandate Window Sequencer */}
              {mandateCase && (
                <StoryCard
                  badge="Mandate Sequencer"
                  badgeType="blue"
                  title="NACH / Autopay Window"
                  description="Sequences auto-debit retries inside verified banking presentation windows without spamming customer."
                  caseId={mandateCase.id}
                  customerName={mandateCase.customer.name}
                  atRisk={formatInr(mandateCase.amountAtRisk)}
                  recovered={formatInr(mandateCase.amountRecovered)}
                  status={mandateCase.status}
                  rule="In-window retry sequencing"
                />
              )}

              {/* Story 6: Checkout Dropoff */}
              {checkoutCase && (
                <StoryCard
                  badge="Session Nudge"
                  badgeType="purple"
                  title="Abandoned Checkout"
                  description="Recovers abandoned cart/checkout sessions with a single 24-hour expiring payment link via SMS."
                  caseId={checkoutCase.id}
                  customerName={checkoutCase.customer.name}
                  atRisk={formatInr(checkoutCase.amountAtRisk)}
                  recovered={formatInr(checkoutCase.amountRecovered)}
                  status={checkoutCase.status}
                  rule="1 SMS nudge with payment link"
                />
              )}
            </div>
          </section>

          {/* Detailed Analytical Breakdown */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* Recovery by Root Cause */}
            <div className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                    Yield by Diagnosed Cause
                  </h3>
                  <p className="text-[11px] text-ink-500 mt-0.5">
                    Conversion efficiency across classified failure categories.
                  </p>
                </div>
                <span className="font-mono text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  {pct(metrics.rate)} Avg
                </span>
              </div>

              <div className="space-y-3">
                {Object.entries(metrics.byCause).map(([causeKey, data]) => {
                  const rate = data.atRisk > 0 ? data.recovered / data.atRisk : 0;
                  return (
                    <div key={causeKey} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-ink-200 font-medium">
                          {data.label}
                        </span>
                        <div className="flex items-center gap-2.5 font-mono text-[11px]">
                          <span className="text-ink-400">
                            {formatInr(data.recovered)} / {formatInr(data.atRisk)}
                          </span>
                          <span className={`font-semibold ${rate > 0.5 ? "text-emerald-400" : rate > 0 ? "text-ink-200" : "text-ink-500"}`}>
                            {pct(rate)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 border border-white/[0.04]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.max(rate * 100, rate > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guardrails & Safety Enforcer Panel */}
            <div className="rounded-xl border border-white/[0.08] clean-card p-5 space-y-4">
              <div className="border-b border-white/[0.06] pb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-300">
                  Safety Guardrails Enforced
                </h3>
                <p className="text-[11px] text-ink-500 mt-0.5">
                  Hard bounds preventing runaway retries, spamming, and non-compliant outreach.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <GuardrailItem
                  title="Fraud Hard Stop"
                  rule="0 auto-retries"
                  description="Immediately routes to human escalation queue."
                />
                <GuardrailItem
                  title="Contact Frequency"
                  rule="Max 1 message / 48h"
                  description="Checks last contact timestamp before sending."
                />
                <GuardrailItem
                  title="DND Blackout"
                  rule="21:00 to 09:00 IST"
                  description="Enforces quiet hours by customer timezone."
                />
                <GuardrailItem
                  title="Discount Ceiling"
                  rule="Max 10% waiver"
                  description="Batch budget threshold strictly capped."
                />
              </div>

              {/* Stopping Rules Hit Counter */}
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Stopping Rules Triggered:
                </h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(metrics.stops).length === 0 ? (
                    <span className="text-xs text-ink-500 italic">No stopping rules triggered yet</span>
                  ) : (
                    Object.entries(metrics.stops).map(([reason, count]) => (
                      <span
                        key={reason}
                        className="rounded border border-white/[0.08] bg-zinc-900 px-2 py-0.5 text-xs text-ink-300 flex items-center gap-1.5 font-mono"
                      >
                        <span>{reason}:</span>
                        <strong className="text-white">{count}</strong>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Interactive KPI Explorer & Case Registry */}
          <KpiExplorerSection
            cases={allCases}
            totalAtRiskPaise={metrics.atRisk}
            totalRecoveredPaise={metrics.recovered}
            recoveryRate={metrics.rate}
            escalatedCount={metrics.escalated}
          />
        </div>
      )}
    </Shell>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent = false,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-xl border p-4 transition-all clean-card clean-card-hover ${
        accent ? "border-emerald-500/30 bg-zinc-950" : "border-white/[0.08]"
      } ${href ? "cursor-pointer group hover:border-rose-500/50 hover:bg-rose-950/10" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-400 group-hover:text-ink-200 transition-colors">
          {label}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 border border-white/[0.08] group-hover:border-rose-500/30 transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {href && (
          <span className="text-[11px] text-rose-400 font-mono font-medium opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            <span>Inspect</span>
            <span>↓</span>
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-500 border-t border-white/[0.04] pt-2">
        {hint}
      </p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

function StoryCard({
  badge,
  badgeType,
  title,
  description,
  caseId,
  customerName,
  atRisk,
  recovered,
  status,
  rule,
}: {
  badge: string;
  badgeType: "emerald" | "rose" | "zinc" | "amber" | "blue" | "purple";
  title: string;
  description: string;
  caseId: string;
  customerName: string;
  atRisk: string;
  recovered: string;
  status: string;
  rule: string;
}) {
  const badgeClasses = {
    emerald: "bg-emerald-950/60 text-emerald-300 border-emerald-500/30",
    rose: "bg-rose-950/60 text-rose-300 border-rose-500/30",
    zinc: "bg-zinc-800 text-zinc-300 border-zinc-700",
    amber: "bg-amber-950/60 text-amber-300 border-amber-500/30",
    blue: "bg-blue-950/60 text-blue-300 border-blue-500/30",
    purple: "bg-purple-950/60 text-purple-300 border-purple-500/30",
  }[badgeType];

  const isRecovered = status === "recovered";
  const isEscalated = status === "escalated";

  return (
    <Link
      href={`/cases/${caseId}`}
      className="group flex flex-col justify-between rounded-xl border border-white/[0.08] clean-card clean-card-hover p-4 transition-all"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${badgeClasses}`}>
            {badge}
          </span>
          <span className="font-mono text-[11px] text-ink-500 group-hover:text-white transition-colors">
            {caseId} →
          </span>
        </div>

        <h3 className="mt-2.5 text-sm font-semibold text-white group-hover:text-zinc-200 transition-colors">
          {title}
        </h3>
        <p className="mt-1 text-xs text-ink-400 line-clamp-2 leading-relaxed font-normal">
          {description}
        </p>

        <div className="mt-3 rounded-lg border border-white/[0.04] bg-black/40 p-2.5 text-xs text-ink-300 space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-500">Customer:</span>
            <span className="font-medium text-white">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Intervention:</span>
            <span className="font-mono text-[11px] text-ink-300">{rule}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-2.5 text-xs">
        <div>
          <span className="text-ink-500">At Risk: </span>
          <strong className="text-white font-mono">{atRisk}</strong>
          <span className="text-ink-500"> → </span>
          <strong className={isRecovered ? "text-emerald-400 font-mono" : "text-ink-500 font-mono"}>
            {recovered}
          </strong>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isRecovered
              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
              : isEscalated
                ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                : "bg-zinc-900 text-ink-400 border border-white/[0.06]"
          }`}
        >
          {status}
        </span>
      </div>
    </Link>
  );
}

function GuardrailItem({
  title,
  rule,
  description,
}: {
  title: string;
  rule: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3 space-y-0.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-white">{title}</h4>
        <span className="rounded bg-emerald-950/60 px-1 py-0.2 font-mono text-[10px] text-emerald-400 border border-emerald-500/20">
          ✓ Active
        </span>
      </div>
      <p className="text-xs font-medium text-ink-300 font-mono">{rule}</p>
      <p className="text-[11px] text-ink-500 leading-snug">{description}</p>
    </div>
  );
}
