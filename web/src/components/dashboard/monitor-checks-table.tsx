import { ArrowUpRight, CircleCheck, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { type Monitor, makeChecks } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export function MonitorChecksTable({ monitor }: { monitor: Monitor }) {
  const checks = makeChecks(monitor);
  const maxLatency = Math.max(...checks.map((check) => check.latency));

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
            Recent checks
          </h3>
          <p className="mt-1 text-[0.72rem] text-muted-ink">
            The last 14 probes from ap-south-1.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
          <span className="size-1.5 animate-pulse rounded-full bg-positive" />
          sample
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="h-9 pl-5 text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Result
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Checked at
              </TableHead>
              <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-muted-ink">
                Latency
              </TableHead>
              <TableHead className="hidden text-[10px] uppercase tracking-[0.12em] text-muted-ink md:table-cell">
                Region
              </TableHead>
              <TableHead className="hidden pr-5 text-[10px] uppercase tracking-[0.12em] text-muted-ink lg:table-cell">
                Detail
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {checks.slice(0, 9).map((check) => {
              const failed = Boolean(check.error);
              return (
                <TableRow key={check.id} className="border-line/80">
                  <TableCell className="py-2.5 pl-5">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full",
                          failed
                            ? "bg-critical/10 text-critical"
                            : "bg-positive/10 text-positive",
                        )}
                      >
                        {failed ? (
                          <CircleDot className="size-3" />
                        ) : (
                          <CircleCheck className="size-3" />
                        )}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 border px-1.5 font-mono text-[9px]",
                          failed
                            ? "border-critical/20 bg-critical/5 text-critical"
                            : "border-positive/20 bg-positive/5 text-positive",
                        )}
                      >
                        {check.statusCode || "ERR"}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-ink">
                    {formatDateTime(check.checkedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-secondary sm:block">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            check.latency > 1000
                              ? "bg-warning"
                              : "bg-signal-deep",
                          )}
                          style={{
                            width: `${Math.min(100, (check.latency / maxLatency) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="tabular text-[0.78rem]">
                        {check.latency}ms
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-[10px] text-muted-ink md:table-cell">
                    {check.region}
                  </TableCell>
                  <TableCell className="hidden max-w-[220px] truncate pr-5 text-[10px] text-muted-ink lg:table-cell">
                    {check.error ?? "Handshake and response within threshold"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-2.5">
        <span className="font-mono text-[10px] text-muted-ink">
          Showing 9 of 2,880 checks
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
          Export CSV <ArrowUpRight className="size-3" />
        </span>
      </div>
    </div>
  );
}
