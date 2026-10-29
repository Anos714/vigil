import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  detail,
  trend,
  trendDirection = "up",
  icon: Icon,
  sparkline,
  className,
  accent = "signal",
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  sparkline?: number[];
  className?: string;
  accent?: "signal" | "violet" | "warning" | "critical";
}) {
  const accentMap = {
    signal: {
      icon: "bg-signal/25 text-signal-ink",
      stroke: "var(--signal-deep)",
      fill: "var(--signal)",
    },
    violet: {
      icon: "bg-violet/10 text-violet",
      stroke: "var(--violet)",
      fill: "var(--violet)",
    },
    warning: {
      icon: "bg-warning/10 text-warning",
      stroke: "var(--warning)",
      fill: "var(--warning)",
    },
    critical: {
      icon: "bg-critical/10 text-critical",
      stroke: "var(--critical)",
      fill: "var(--critical)",
    },
  }[accent];

  return (
    <div
      className={cn(
        "group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-card p-5 transition-colors hover:border-ink/15",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mono-label text-muted-ink">{label}</div>
          <div className="mt-2.5 text-[1.8rem] font-medium leading-none tracking-[-0.04em] tabular">
            {value}
          </div>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              accentMap.icon,
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} />
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                trendDirection === "up" && "text-positive",
                trendDirection === "down" && "text-critical",
                trendDirection === "neutral" && "text-muted-ink",
              )}
            >
              {trendDirection === "up" && <ArrowUpRight className="size-3" />}
              {trendDirection === "down" && (
                <ArrowDownRight className="size-3" />
              )}
              {trend}
            </span>
          )}
          {detail && <span className="text-muted-ink">{detail}</span>}
        </div>
        {sparkline && (
          <Sparkline
            data={sparkline}
            stroke={accentMap.stroke}
            fill={accentMap.fill}
            className="opacity-70 transition-opacity group-hover:opacity-100"
            width={92}
            height={30}
          />
        )}
      </div>
    </div>
  );
}
