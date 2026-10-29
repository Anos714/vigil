"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLatency, formatRelative, formatUptime } from "@/lib/format";
import { type MonitorStatus, monitors } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const filters: { key: "all" | MonitorStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "up", label: "Operational" },
  { key: "degraded", label: "Degraded" },
  { key: "down", label: "Down" },
  { key: "paused", label: "Paused" },
];

export function MonitorTable({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState<"all" | MonitorStatus>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return monitors.filter((monitor) => {
      const matchesStatus = filter === "all" || monitor.status === filter;
      const matchesQuery =
        !query ||
        monitor.name.toLowerCase().includes(query.toLowerCase()) ||
        monitor.url.toLowerCase().includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [filter, query]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex flex-col gap-4 border-b border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
              Monitored endpoints
            </h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] text-muted-ink">
              {monitors.length}
            </span>
          </div>
          <p className="mt-1 text-[0.72rem] text-muted-ink">
            Every response is checked every 30–300 seconds.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter endpoints…"
              className="h-8 w-full rounded-lg border-line bg-paper pl-8 text-xs sm:w-[190px]"
            />
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5">
            {filters.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setFilter(entry.key)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  filter === entry.key
                    ? "bg-card text-ink shadow-[0_1px_2px_oklch(0_0_0/0.06)]"
                    : "text-muted-ink hover:text-ink",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="h-9 pl-5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink">
                Endpoint
              </TableHead>
              <TableHead className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink">
                Status
              </TableHead>
              <TableHead className="hidden text-right text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink md:table-cell">
                Uptime 24h
              </TableHead>
              <TableHead className="hidden text-right text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink md:table-cell">
                p50 / p95
              </TableHead>
              {!compact && (
                <TableHead className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink md:table-cell">
                  24h signal
                </TableHead>
              )}
              <TableHead className="hidden text-right text-[10px] font-medium uppercase tracking-[0.12em] text-muted-ink md:table-cell">
                Last check
              </TableHead>
              <TableHead className="w-10 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((monitor) => (
              <TableRow
                key={monitor.id}
                className="group border-line/80 transition-colors hover:bg-paper/60"
              >
                <TableCell className="py-3 pl-5">
                  <Link
                    href={`/dashboard/monitors/${monitor.id}`}
                    className="flex items-center gap-2.5"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-paper font-mono text-[10px] uppercase text-muted-ink">
                      {monitor.name.slice(0, 2)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8rem] font-medium">
                        {monitor.name}
                      </span>
                      <span className="block max-w-[220px] truncate font-mono text-[10px] text-muted-ink">
                        {monitor.url.replace("https://", "")}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-muted-ink md:hidden">
                        <span>{formatUptime(monitor.uptime24h)}</span>
                        <span className="text-line">·</span>
                        <span>{formatLatency(monitor.avgLatency)}</span>
                        <span className="text-line">·</span>
                        <span>{formatRelative(monitor.lastCheckedAt)}</span>
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge status={monitor.status} showDot={false} />
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  <span className="tabular text-[0.8rem]">
                    {formatUptime(monitor.uptime24h)}
                  </span>
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  <span className="tabular text-[0.8rem]">
                    {formatLatency(monitor.avgLatency)}
                  </span>
                  <span className="ml-1 tabular font-mono text-[10px] text-muted-ink">
                    / {formatLatency(monitor.p95Latency)}
                  </span>
                </TableCell>
                {!compact && (
                  <TableCell className="hidden md:table-cell">
                    <Sparkline
                      data={monitor.sparkline}
                      className="w-[90px]"
                      width={90}
                      height={26}
                    />
                  </TableCell>
                )}
                <TableCell className="hidden text-right md:table-cell">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-ink">
                    <StatusDot status={monitor.status} />
                    {formatRelative(monitor.lastCheckedAt)}
                  </span>
                </TableCell>
                <TableCell className="pr-5">
                  <Link
                    href={`/dashboard/monitors/${monitor.id}`}
                    aria-label={`Open ${monitor.name}`}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-ink opacity-0 transition-all hover:bg-secondary hover:text-ink group-hover:opacity-100"
                  >
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={compact ? 6 : 7}
                  className="h-28 text-center text-sm text-muted-ink"
                >
                  No endpoints match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
        <span className="font-mono text-[10px] text-muted-ink">
          {rows.length} of {monitors.length} endpoints
        </span>
        <Link
          href="/dashboard/monitors"
          className="text-[11px] font-medium text-ink underline-offset-4 hover:underline"
        >
          View all monitors
        </Link>
      </div>
    </div>
  );
}
