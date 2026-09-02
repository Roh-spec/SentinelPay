import Link from "next/link";
import { BatchActionButtons } from "@/components/BatchActionButtons";

export function Shell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: "board" | "cases";
}) {
  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Top Header */}
      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          {/* Sleek Minimalist Logo Mark */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-black font-extrabold text-lg shadow-sm">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.5 2L4 14h7l-2 8 10.5-12h-7l2.5-8z" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              AI Revenue Recovery
            </h1>
            <p className="text-xs sm:text-sm text-ink-400 mt-0.5 max-w-2xl font-normal">
              Automated recovery workflows for failed charges, degraded gateways, and overdue accounts.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <BatchActionButtons />
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <nav className="flex gap-1 rounded-lg border border-white/[0.08] bg-zinc-950 p-1 text-xs">
          <Link
            href="/"
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 font-medium transition-all ${
              active === "board"
                ? "bg-zinc-800 text-white shadow-sm font-semibold"
                : "text-ink-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Overview & Metrics</span>
          </Link>
          <Link
            href="/cases"
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 font-medium transition-all ${
              active === "cases"
                ? "bg-zinc-800 text-white shadow-sm font-semibold"
                : "text-ink-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <svg className="w-3.5 h-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Cases & Audit Trail</span>
          </Link>
        </nav>

        {/* Clean minimal indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-ink-500 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Engine Active · Policy v1</span>
        </div>
      </div>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
