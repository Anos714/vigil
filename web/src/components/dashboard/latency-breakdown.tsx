import type { Monitor } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const segments = [
  { key: "dns", label: "DNS lookup", color: "bg-teal" },
  { key: "connect", label: "TCP connect", color: "bg-violet" },
  { key: "tls", label: "TLS handshake", color: "bg-signal-deep" },
  { key: "ttfb", label: "Time to first byte", color: "bg-warning" },
] as const;

export function LatencyBreakdown({ monitor }: { monitor: Monitor }) {
  const breakdown = monitor.latencyBreakdown;
  const total =
    breakdown.dns + breakdown.connect + breakdown.tls + breakdown.ttfb;
  const max = Math.max(...Object.values(breakdown));

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card">
      <div className="flex items-start justify-between border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
            Latency breakdown
          </h3>
          <p className="mt-1 text-[0.72rem] text-muted-ink">
            Where the {total}ms went.
          </p>
        </div>
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
          p50
        </span>
      </div>

      <div className="flex-1 px-5 py-4">
        <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
          {segments.map((segment) => (
            <span
              key={segment.key}
              className={cn(
                "h-full first:rounded-l-full last:rounded-r-full",
                segment.color,
              )}
              style={{ width: `${(breakdown[segment.key] / total) * 100}%` }}
            />
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {segments.map((segment) => (
            <div key={segment.key} className="group">
              <div className="flex items-center justify-between gap-3 text-[0.76rem]">
                <span className="flex items-center gap-2">
                  <span
                    className={cn("size-1.5 rounded-full", segment.color)}
                  />
                  {segment.label}
                </span>
                <span className="tabular font-mono text-[10px] text-muted-ink">
                  {breakdown[segment.key]}ms ·{" "}
                  {Math.round((breakdown[segment.key] / total) * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    segment.color,
                  )}
                  style={{ width: `${(breakdown[segment.key] / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line px-5 py-3 font-mono text-[9px] text-muted-ink">
        measured from ap-south-1 · 24h aggregate
      </div>
    </div>
  );
}
