import { ArrowUpRight, Globe2 } from "lucide-react";
import Link from "next/link";
import { StatusDot } from "@/components/ui/status";
import { formatUptime } from "@/lib/format";
import { monitors, overviewStats } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export function CurrentStatusCard({ className }: { className?: string }) {
  const publicMonitors = monitors.filter((monitor) => monitor.isPublic);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-line bg-card",
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
            Current status
          </h3>
          <p className="mt-1 text-[0.72rem] text-muted-ink">
            Public services right now.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-positive/8 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-positive">
          <span className="size-1.5 animate-pulse rounded-full bg-positive" />{" "}
          sample
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[2rem] font-medium leading-none tracking-[-0.05em] tabular">
              99.94%
            </div>
            <div className="mt-1.5 text-[0.72rem] text-muted-ink">
              overall uptime · 24h
            </div>
          </div>
          <div className="relative flex size-12 items-center justify-center">
            <svg
              viewBox="0 0 36 36"
              className="size-12 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--line)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--signal-deep)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${99.94} ${100 - 99.94}`}
                pathLength="100"
              />
            </svg>
            <span className="absolute font-mono text-[8px] text-muted-ink">
              24h
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {publicMonitors.map((monitor) => (
            <Link
              key={monitor.id}
              href={`/dashboard/monitors/${monitor.id}`}
              className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-paper/70"
            >
              <StatusDot
                status={monitor.status}
                pulse={monitor.status !== "up"}
              />
              <span className="min-w-0 flex-1 truncate text-[0.78rem]">
                {monitor.name}
              </span>
              <span className="tabular font-mono text-[10px] text-muted-ink">
                {formatUptime(monitor.uptime24h)}
              </span>
              <ArrowUpRight className="size-3 text-muted-ink opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-line p-3">
        <Link
          href="/status/acme-api-live"
          target="_blank"
          className="flex items-center justify-between rounded-xl bg-paper px-3 py-2.5 text-[0.75rem] font-medium transition-colors hover:bg-secondary/70"
        >
          <span className="flex items-center gap-2">
            <Globe2 className="size-3.5 text-muted-ink" />
            Open public status page
          </span>
          <ArrowUpRight className="size-3.5 text-muted-ink" />
        </Link>
        <p className="mt-2 px-1 font-mono text-[9px] text-muted-ink/70">
          {overviewStats.down} down · {overviewStats.degraded} degraded ·{" "}
          {overviewStats.operational} operational
        </p>
      </div>
    </div>
  );
}
