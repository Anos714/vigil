"use client";

import {
  ArrowUpRight,
  ChevronDown,
  CircleCheck,
  CircleDot,
  Clock3,
  Search,
  ServerCrash,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime, formatDuration } from "@/lib/format";
import { type Incident, incidents } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const severityStyles = {
  critical: "border-critical/20 bg-critical/8 text-critical",
  major: "border-warning/20 bg-warning/8 text-warning",
  minor: "border-info/20 bg-info/8 text-info",
};

const filters = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
] as const;

function IncidentRow({ incident }: { incident: Incident }) {
  const open = !incident.resolvedAt;
  const [expanded, setExpanded] = useState(open);

  return (
    <article
      id={incident.id}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-paper/50"
      >
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
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
            <span className="text-[0.85rem] font-medium">
              {incident.monitorName}: {incident.cause}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "h-4 border px-1.5 text-[9px] capitalize",
                severityStyles[incident.severity],
              )}
            >
              {incident.severity}
            </Badge>
            {open ? (
              <span className="rounded-full bg-critical/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-critical">
                ongoing
              </span>
            ) : (
              <span className="rounded-full bg-positive/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-positive">
                resolved
              </span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-muted-ink">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-2.5" />{" "}
              {formatDateTime(incident.startedAt)}
            </span>
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
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-ink transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-line bg-paper/40 px-5 py-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mono-label mb-2 text-[9px] text-muted-ink">
                Response timeline
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-[0.72rem]">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ink" />
                  <span className="text-muted-ink">
                    <span className="text-ink">Detected</span> — 2 consecutive
                    checks failed.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-[0.72rem]">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ink" />
                  <span className="text-muted-ink">
                    <span className="text-ink">Alert routed</span> — email via
                    Brevo; webhook routing is planned.
                  </span>
                </div>
                {!open && (
                  <div className="flex items-start gap-2.5 text-[0.72rem]">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-positive" />
                    <span className="text-muted-ink">
                      <span className="text-ink">Resolved</span> — endpoint
                      returned 200 for 2 checks in a row.
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Link
                href={`/dashboard/monitors/${incident.monitorId}`}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-line bg-card px-2.5 text-[10px] font-medium transition-colors hover:bg-secondary"
              >
                Open monitor <ArrowUpRight className="size-3" />
              </Link>
              <span className="text-center font-mono text-[9px] text-muted-ink">
                {incident.resolvedAt
                  ? "closed automatically"
                  : "awaiting resolution"}
              </span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export function IncidentLog() {
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return incidents.filter((incident) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "open"
          ? !incident.resolvedAt
          : Boolean(incident.resolvedAt));
      const matchesQuery =
        !query ||
        incident.monitorName.toLowerCase().includes(query.toLowerCase()) ||
        incident.cause.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-card p-0.5">
          {filters.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setFilter(entry.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors",
                filter === entry.key
                  ? "bg-secondary text-ink"
                  : "text-muted-ink hover:text-ink",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search incidents…"
            className="h-8 w-full rounded-lg border-line bg-card pl-8 text-xs sm:w-[240px]"
          />
        </div>
      </div>

      {rows.map((incident) => (
        <IncidentRow key={incident.id} incident={incident} />
      ))}

      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card px-5 py-12 text-center">
          <ServerCrash className="size-5 text-muted-ink" />
          <p className="mt-2 text-sm font-medium">No incidents match.</p>
          <p className="mt-1 text-xs text-muted-ink">
            Try a different filter or search term.
          </p>
        </div>
      )}
    </div>
  );
}
