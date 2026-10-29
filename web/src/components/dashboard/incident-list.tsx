import { ArrowUpRight, CircleCheck, CircleDot } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatRelative } from "@/lib/format";
import { incidents } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "bg-critical/8 text-critical border-critical/20",
  major: "bg-warning/8 text-warning border-warning/20",
  minor: "bg-info/8 text-info border-info/20",
};

export function IncidentList({
  limit = 4,
  showHeader = true,
}: {
  limit?: number;
  showHeader?: boolean;
}) {
  const rows = incidents.slice(0, limit);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card">
      {showHeader && (
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
              Recent incidents
            </h3>
            <p className="mt-1 text-[0.72rem] text-muted-ink">
              The last 7 days, newest first.
            </p>
          </div>
          <Link
            href="/dashboard/incidents"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink underline-offset-4 hover:underline"
          >
            All incidents <ArrowUpRight className="size-3" />
          </Link>
        </div>
      )}

      <div className="flex-1 divide-y divide-line/80">
        {rows.map((incident) => {
          const open = !incident.resolvedAt;
          return (
            <Link
              key={incident.id}
              href={`/dashboard/incidents#${incident.id}`}
              className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-paper/60"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  open
                    ? "bg-critical/10 text-critical"
                    : "bg-secondary text-muted-ink",
                )}
              >
                {open ? (
                  <CircleDot className="size-3.5" />
                ) : (
                  <CircleCheck className="size-3.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.78rem] font-medium">
                    {incident.monitorName}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 border px-1.5 text-[9px] font-medium",
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
                <span className="mt-0.5 block truncate text-[0.72rem] text-muted-ink">
                  {incident.cause}
                </span>
                <span className="mt-1 flex items-center gap-2 font-mono text-[9px] text-muted-ink/80">
                  <span>{formatRelative(incident.startedAt)}</span>
                  <span className="text-line">·</span>
                  <span>
                    {formatDuration(incident.startedAt, incident.resolvedAt)}
                  </span>
                  <span className="text-line">·</span>
                  <span>
                    {incident.statusCode
                      ? `HTTP ${incident.statusCode}`
                      : "no response"}
                  </span>
                </span>
              </span>
              <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-ink opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
