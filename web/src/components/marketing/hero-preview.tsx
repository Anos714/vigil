"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CircleCheck,
  MoreHorizontal,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import { Sparkline } from "@/components/ui/sparkline";
import { StatusDot } from "@/components/ui/status";
import { formatLatency, formatRelative } from "@/lib/format";
import {
  latencyChartConfig,
  makeLatencySeries,
  monitors,
} from "@/lib/monitors";
import { cn } from "@/lib/utils";

type PreviewWindow = "24h" | "7d";

export function HeroPreview() {
  const [previewWindow, setPreviewWindow] = useState<PreviewWindow>("24h");
  const data = useMemo(
    () => makeLatencySeries(monitors[0], previewWindow),
    [previewWindow],
  );
  const rows = monitors.slice(0, 4);

  return (
    <div className="relative mx-auto w-full max-w-[620px] lg:mx-0">
      <div className="absolute -inset-6 -z-10 rounded-[36px] bg-signal/20 blur-3xl" />
      <div className="absolute -right-5 -top-5 z-20 hidden rounded-xl border border-critical/20 bg-card px-3 py-2.5 shadow-[0_12px_40px_oklch(0_0_0/0.12)] sm:block">
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-full bg-critical/10 text-critical">
            <AlertTriangle className="size-2.5" />
          </span>
          <div>
            <div className="text-[10px] font-medium">Webhooks returned 503</div>
            <div className="mt-0.5 font-mono text-[8px] text-muted-ink">
              18m ago · 1 open incident
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-ink/15 bg-card p-1.5 shadow-[0_24px_80px_-20px_oklch(0.2_0.02_120/0.3)]">
        <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
          <div className="flex h-9 items-center gap-2 border-b border-line bg-card/80 px-3">
            <span className="flex gap-1">
              <span className="size-1.5 rounded-full bg-line" />
              <span className="size-1.5 rounded-full bg-line" />
              <span className="size-1.5 rounded-full bg-line" />
            </span>
            <div className="mx-auto flex h-5 w-[56%] items-center justify-center gap-1.5 rounded-md border border-line bg-paper font-mono text-[8px] text-muted-ink">
              <span className="size-1 rounded-full bg-positive" />
              app.vigil.local/dashboard
            </div>
            <MoreHorizontal className="size-3.5 text-muted-ink" />
          </div>

          <div className="flex">
            <div className="hidden w-[112px] shrink-0 border-r border-line bg-sidebar p-2.5 sm:block">
              <div className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded bg-ink">
                  <span className="size-1.5 rounded-[1px] bg-signal" />
                </span>
                <span className="text-[9px] font-semibold tracking-[-0.03em]">
                  vigil
                </span>
              </div>
              <div className="mt-4 space-y-0.5">
                {["Overview", "Monitors", "Incidents", "Settings"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className={cn(
                        "flex h-5 items-center gap-1.5 rounded px-1.5 font-mono text-[7px]",
                        index === 0
                          ? "bg-secondary text-ink"
                          : "text-muted-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1 rounded-full",
                          index === 0 ? "bg-signal-deep" : "bg-line",
                        )}
                      />
                      {label}
                      {index === 2 && (
                        <span className="ml-auto size-1 rounded-full bg-critical" />
                      )}
                    </div>
                  ),
                )}
              </div>
              <div className="mt-6 rounded-md border border-line bg-card p-1.5">
                <div className="font-mono text-[6px] uppercase tracking-[0.12em] text-muted-ink">
                  Uptime 24h
                </div>
                <div className="mt-1 text-[13px] font-medium leading-none tracking-[-0.03em]">
                  99.94%
                </div>
                <Sparkline
                  data={monitors[0].sparkline}
                  width={78}
                  height={20}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[6px] uppercase tracking-[0.14em] text-muted-ink">
                    Friday, 23 October
                  </div>
                  <div className="mt-1 text-[13px] font-medium tracking-[-0.03em]">
                    Good evening, Rahul
                    <span className="serif-accent text-signal-deep">.</span>
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full border border-line bg-card px-1.5 py-0.5 font-mono text-[6px] uppercase tracking-[0.1em] text-muted-ink">
                  <span className="size-1 animate-pulse rounded-full bg-positive" />
                  sample
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {[
                  { label: "Uptime", value: "99.94%", tone: "text-positive" },
                  { label: "p50", value: "82ms", tone: "text-ink" },
                  { label: "Checks", value: "18.4k", tone: "text-ink" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md border border-line bg-card px-2 py-1.5"
                  >
                    <div className="font-mono text-[6px] uppercase tracking-[0.12em] text-muted-ink">
                      {stat.label}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-[11px] font-medium tabular",
                        stat.tone,
                      )}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded-lg border border-line bg-card">
                <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
                  <span className="text-[8px] font-medium">
                    Latency across all monitors
                  </span>
                  <div className="flex gap-0.5 rounded border border-line bg-paper p-[1px]">
                    {(["24h", "7d"] as const).map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => setPreviewWindow(entry)}
                        className={cn(
                          "rounded-[2px] px-1 py-0.5 font-mono text-[6px] transition-colors",
                          previewWindow === entry
                            ? "bg-card text-ink shadow-sm"
                            : "text-muted-ink",
                        )}
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-1 pb-0.5 pt-1.5">
                  <EvilAreaChart
                    data={data as unknown as Record<string, unknown>[]}
                    config={latencyChartConfig}
                    xDataKey="time"
                    className="h-[112px] w-full"
                    curveType="monotone"
                    animationType="left-to-right"
                  >
                    <EvilAreaChart.Grid
                      vertical={false}
                      strokeDasharray="2 4"
                    />
                    <EvilAreaChart.XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      minTickGap={40}
                      tick={{
                        fill: "var(--muted-ink)",
                        fontSize: 6,
                        fontFamily: "var(--font-geist-mono)",
                      }}
                    />
                    <EvilAreaChart.YAxis
                      width={22}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "var(--muted-ink)",
                        fontSize: 6,
                        fontFamily: "var(--font-geist-mono)",
                      }}
                      tickFormatter={(value: number) => `${value}`}
                    />
                    <EvilAreaChart.Tooltip />
                    <EvilAreaChart.Area
                      dataKey="p50"
                      variant="gradient"
                      strokeVariant="solid"
                      strokeWidth={1.1}
                    />
                    <EvilAreaChart.Area
                      dataKey="p95"
                      variant="gradient"
                      strokeVariant="dashed"
                      strokeWidth={0.9}
                    />
                  </EvilAreaChart>
                </div>
              </div>

              <div className="mt-2 rounded-lg border border-line bg-card">
                <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
                  <span className="text-[8px] font-medium">
                    Monitored endpoints
                  </span>
                  <Search className="size-2.5 text-muted-ink" />
                </div>
                <div className="divide-y divide-line/70">
                  {rows.map((monitor) => (
                    <Link
                      key={monitor.id}
                      href={`/dashboard/monitors/${monitor.id}`}
                      className="flex items-center gap-2 px-2.5 py-[5px] transition-colors hover:bg-paper/70"
                    >
                      <StatusDot status={monitor.status} />
                      <span className="min-w-0 flex-1 truncate text-[7.5px] font-medium">
                        {monitor.name}
                      </span>
                      <span className="font-mono text-[6px] text-muted-ink">
                        {formatLatency(monitor.avgLatency)}
                      </span>
                      <Sparkline
                        data={monitor.sparkline}
                        width={34}
                        height={13}
                      />
                      <span className="hidden font-mono text-[6px] text-muted-ink sm:inline">
                        {formatRelative(monitor.lastCheckedAt)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-4 z-20 hidden items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 shadow-[0_12px_40px_oklch(0_0_0/0.1)] sm:flex">
        <span className="flex size-5 items-center justify-center rounded-full bg-positive/10 text-positive">
          <CircleCheck className="size-2.5" />
        </span>
        <div>
          <div className="text-[10px] font-medium">Checkout recovered</div>
          <div className="mt-0.5 font-mono text-[8px] text-muted-ink">
            resolved in 14m
          </div>
        </div>
        <ArrowUpRight className="ml-2 size-3 text-muted-ink" />
      </div>
    </div>
  );
}
