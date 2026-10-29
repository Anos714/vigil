"use client";

import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import { checksChartConfig } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export function ChecksChart({
  data,
  className,
  height = "h-[196px]",
}: {
  data: { time: string; checks: number; failures: number }[];
  className?: string;
  height?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <EvilBarChart
        data={data as unknown as Record<string, unknown>[]}
        config={checksChartConfig}
        xDataKey="time"
        className={cn("w-full", height)}
        barRadius={4}
        barCategoryGap={28}
        animationType="none"
      >
        <EvilBarChart.Grid vertical={false} strokeDasharray="2 5" />
        <EvilBarChart.XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{
            fill: "var(--muted-ink)",
            fontSize: 10,
            fontFamily: "var(--font-geist-mono)",
          }}
        />
        <EvilBarChart.YAxis
          width={30}
          tickLine={false}
          axisLine={false}
          tick={{
            fill: "var(--muted-ink)",
            fontSize: 10,
            fontFamily: "var(--font-geist-mono)",
          }}
        />
        <EvilBarChart.Tooltip />
        <EvilBarChart.Bar dataKey="checks" variant="gradient" />
      </EvilBarChart>
    </div>
  );
}
