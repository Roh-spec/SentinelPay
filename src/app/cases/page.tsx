import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/money";
import { Shell } from "@/components/Shell";
import { CasesFilterBar } from "@/components/CasesFilterBar";
import {
  DIRECTION_LABEL,
  ROOT_CAUSE_LABEL,
  type Direction,
  type RootCause,
} from "@/engine/types";

export const dynamic = "force-dynamic";

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    rootCause?: string;
    direction?: string;
    search?: string;
  }>;
}) {
  const sp = await searchParams;

  const where: Prisma.RecoveryCaseWhereInput = {
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.rootCause ? { rootCause: sp.rootCause } : {}),
    ...(sp.direction ? { direction: sp.direction } : {}),
  };

  if (sp.search) {
    const q = sp.search.trim();
    where.OR = [
      { id: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { email: { contains: q } } },
      { customer: { phone: { contains: q } } },
      { sourceId: { contains: q } },
    ];
  }

  const [totalCasesCount, cases] = await Promise.all([
    prisma.recoveryCase.count(),
    prisma.recoveryCase.findMany({
      where,
      include: { customer: true, subscription: true, invoice: true, checkout: true, mandate: true },
      orderBy: [{ amountAtRisk: "desc" }, { openedAt: "desc" }],
    }),
  ]);

  const filteredAtRiskPaise = cases.reduce((acc, c) => acc + c.amountAtRisk, 0);
  const filteredRecoveredPaise = cases.reduce((acc, c) => acc + c.amountRecovered, 0);

  return (
    <Shell active="cases">
      <div className="space-y-5">
        {/* Interactive Filter Bar */}
        <CasesFilterBar
          totalCases={totalCasesCount}
          filteredCases={cases.length}
          filteredAtRisk={formatInr(filteredAtRiskPaise)}
          filteredRecovered={formatInr(filteredRecoveredPaise)}
        />

        {/* Cases Table */}
        <div className="overflow-hidden rounded-xl border border-white/[0.08] clean-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-black/50 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                <tr>
                  <th className="px-4 py-3">Customer & ID</th>
                  <th className="px-4 py-3">Rail</th>
                  <th className="px-4 py-3">Diagnosed Cause</th>
                  <th className="px-4 py-3">FSM State</th>
                  <th className="px-4 py-3 text-right">At Risk</th>
                  <th className="px-4 py-3 text-right">Recovered</th>
                  <th className="px-4 py-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-sans">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                      <p className="font-medium text-ink-300">No cases matched criteria</p>
                      <p className="text-xs text-ink-500 mt-0.5">Try resetting search filters.</p>
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const isRecovered = c.status === "recovered";
                    const isEscalated = c.status === "escalated";
                    const isOptedOut = c.status === "opted_out" || c.stoppedReason === "customer_opted_out";

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                        {/* Customer Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 border border-white/[0.08] font-bold text-white text-[11px]">
                              {c.customer.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/cases/${c.id}`}
                                  className="font-medium text-white hover:text-ink-200 transition-colors"
                                >
                                  {c.customer.name}
                                </Link>
                                <span className="rounded bg-zinc-900 px-1 py-0.2 font-mono text-[9px] text-ink-400 border border-white/[0.04]">
                                  {c.customer.riskTier}
                                </span>
                              </div>
                              <p className="text-[11px] text-ink-500 font-mono">
                                {c.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="px-4 py-3 text-ink-300">
                          {DIRECTION_LABEL[c.direction as Direction] ?? c.direction}
                        </td>

                        {/* Root Cause */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                              c.rootCause === "fraud_suspected"
                                ? "bg-rose-950/80 text-rose-300 border border-rose-500/30"
                                : c.rootCause === "insufficient_funds"
                                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                  : "bg-zinc-900 text-ink-300 border border-white/[0.06]"
                            }`}
                          >
                            {ROOT_CAUSE_LABEL[c.rootCause as RootCause] ?? c.rootCause}
                          </span>
                        </td>

                        {/* FSM State & Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                              isRecovered
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                                : isEscalated
                                  ? "bg-rose-950/80 text-rose-400 border border-rose-500/30"
                                  : isOptedOut
                                    ? "bg-purple-950/80 text-purple-300 border border-purple-500/30"
                                    : "bg-zinc-900 text-ink-300 border border-white/[0.06]"
                            }`}
                          >
                            {c.fsmState} · {c.status}
                          </span>
                        </td>

                        {/* At Risk */}
                        <td className="px-4 py-3 text-right font-mono text-xs font-medium text-white">
                          {formatInr(c.amountAtRisk)}
                        </td>

                        {/* Recovered */}
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                          <span className={isRecovered ? "text-emerald-400" : "text-ink-500"}>
                            {formatInr(c.amountRecovered)}
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 rounded bg-zinc-900 border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-ink-300 hover:text-white hover:border-white/20 transition-all"
                          >
                            <span>Inspect</span>
                            <span>→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}
