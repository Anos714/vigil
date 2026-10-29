import { ArrowUpRight, CircleCheck, CircleDot, Inbox } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDuration } from "@/lib/format";
import { getMonitorIncidents, type Monitor } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "border-critical/20 bg-critical/8 text-critical",
  major: "border-warning/20 bg-warning/8 text-warning",
  minor: "border-info/20 bg-info/8 text-info",
};

export function MonitorIncidents({ monitor }: { monitor: Monitor }) {
  const incidents = getMonitorIncidents(monitor.id);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
            Incident history
          </h3>
          <p className="mt-1 text-[0.72rem] text-muted-ink">
            Last 90 days for this endpoint.
          </p>
        </div>
        <Link
          href="/dashboard/incidents"
          className="text-[11px] font-medium text-ink underline-offset-4 hover:underline"
        >
          View all
        </Link>
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-positive/10 text-positive">
            <Inbox className="size-4" />
          </span>
          <p className="mt-3 text-[0.8rem] font-medium">No incidents</p>
          <p className="mt-1 max-w-[220px] text-[0.7rem] leading-5 text-muted-ink">
            This endpoint has stayed within thresholds for the entire window.
          </p>
        </div>
      ) : (
        <div className="flex-1 px-5 py-4">
          <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
            {incidents.map((incident) => {
              const open = !incident.resolvedAt;
              return (
                <Link
                  key={incident.id}
                  href={`/dashboard/incidents#${incident.id}`}
                  className="group relative flex gap-3"
                >
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-card",
                      open
                        ? "bg-critical/15 text-critical"
                        : "bg-secondary text-muted-ink",
                    )}
                  >
                    {open ? (
                      <CircleDot className="size-2.5" />
                    ) : (
                      <CircleCheck className="size-2.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 border px-1.5 text-[9px] capitalize",
                          severityStyles[incident.severity],
                        )}
                      >
                        {incident.severity}
                      </Badge>
                      {open && (
                        <span className="rounded-full bg-critical/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-critical">
                          open
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.76rem] font-medium">
                      {incident.cause}
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] text-muted-ink">
                      {formatDateTime(incident.startedAt)} ·{" "}
                      {formatDuration(incident.startedAt, incident.resolvedAt)}
                    </span>
                  </span>
                  <ArrowUpRight className="mt-1 size-3 shrink-0 text-muted-ink opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
