"use client";

import { useMemo, useState } from "react";
import { EvilAreaChart } from "@/components/evilcharts/charts/recharts-area-chart";
import {
  type LatencyPoint,
  latencyChartConfig,
  type Monitor,
  makeLatencySeries,
  monitors,
} from "@/lib/monitors";
import { cn } from "@/lib/utils";

const windows = [
  { key: "1h", label: "1h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
] as const;

type WindowKey = (typeof windows)[number]["key"];

export function LatencyChart({
  monitor,
  className,
  defaultWindow = "24h",
  title = "Latency across all monitors",
  description = "p50 and p95 response time, sampled every 30 seconds.",
  showHeader = true,
}: {
  monitor?: Monitor;
  className?: string;
  defaultWindow?: WindowKey;
  title?: string;
  description?: string;
  showHeader?: boolean;
}) {
  const [window, setWindow] = useState<WindowKey>(defaultWindow);

  const data = useMemo<LatencyPoint[]>(() => {
    if (monitor) return makeLatencySeries(monitor, window);
    const active = monitors.filter((entry) => entry.status !== "paused");
    const series = active.map((entry) => makeLatencySeries(entry, window));
    return series[0].map((point, index) => ({
      ...point,
      p50: Math.round(
        series.reduce((sum, rows) => sum + rows[index].p50, 0) / series.length,
      ),
      p95: Math.round(
        series.reduce((sum, rows) => sum + rows[index].p95, 0) / series.length,
      ),
      failures: series.reduce((sum, rows) => sum + rows[index].failures, 0),
    }));
  }, [monitor, window]);

  return (
    <div className={cn("flex flex-col", className)}>
      {showHeader && (
        <div className="flex flex-col justify-between gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
                {title}
              </h3>
              <span className="rounded-full border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                sample
              </span>
            </div>
            <p className="mt-1 text-[0.72rem] text-muted-ink">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 font-mono text-[10px] text-muted-ink sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-3 rounded-full bg-signal-deep" /> p50
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-[2px] w-3 rounded-full bg-violet" /> p95
              </span>
            </div>
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5">
              {windows.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setWindow(entry.key)}
                  className={cn(
                    "rounded-md px-2 py-1 font-mono text-[10px] transition-colors",
                    window === entry.key
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
      )}

      <div className="px-2 pb-2 pt-4 sm:px-4">
        <EvilAreaChart
          data={data as unknown as Record<string, unknown>[]}
          config={latencyChartConfig}
          xDataKey="time"
          className="h-[248px] w-full"
          curveType="monotone"
          animationType="left-to-right"
        >
          <EvilAreaChart.Grid vertical={false} strokeDasharray="2 5" />
          <EvilAreaChart.XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={34}
            tick={{
              fill: "var(--muted-ink)",
              fontSize: 10,
              fontFamily: "var(--font-geist-mono)",
            }}
          />
          <EvilAreaChart.YAxis
            width={42}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: number) => `${value}ms`}
            tick={{
              fill: "var(--muted-ink)",
              fontSize: 10,
              fontFamily: "var(--font-geist-mono)",
            }}
          />
          <EvilAreaChart.Tooltip />
          <EvilAreaChart.Area
            dataKey="p50"
            variant="gradient"
            strokeVariant="solid"
            strokeWidth={1.6}
          />
          <EvilAreaChart.Area
            dataKey="p95"
            variant="gradient"
            strokeVariant="dashed"
            strokeWidth={1.2}
          />
        </EvilAreaChart>
      </div>
    </div>
  );
}
