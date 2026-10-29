import type { MonitorStatus } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const statusMap: Record<
  MonitorStatus,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  up: {
    label: "Operational",
    dot: "bg-positive",
    text: "text-positive",
    bg: "bg-positive/8",
    border: "border-positive/20",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/8",
    border: "border-warning/25",
  },
  down: {
    label: "Down",
    dot: "bg-critical",
    text: "text-critical",
    bg: "bg-critical/8",
    border: "border-critical/25",
  },
  paused: {
    label: "Paused",
    dot: "bg-muted-ink",
    text: "text-muted-ink",
    bg: "bg-muted",
    border: "border-line",
  },
};

export function StatusDot({
  status,
  className,
  pulse = false,
}: {
  status: MonitorStatus;
  className?: string;
  pulse?: boolean;
}) {
  const config = statusMap[status];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)}>
      {pulse && status !== "paused" && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-50",
            config.dot,
            "animate-ping",
          )}
        />
      )}
      <span
        className={cn("relative inline-flex size-2 rounded-full", config.dot)}
      />
    </span>
  );
}

export function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: MonitorStatus;
  className?: string;
  showDot?: boolean;
}) {
  const config = statusMap[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
        config.bg,
        config.border,
        config.text,
        className,
      )}
    >
      {showDot && <StatusDot status={status} />}
      {config.label}
    </span>
  );
}

export function statusLabel(status: MonitorStatus) {
  return statusMap[status].label;
}
