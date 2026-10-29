import { cn } from "@/lib/utils";

export function UptimeBars({
  data,
  className,
  showLabels = false,
}: {
  data: { date: string; uptime: number }[];
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex h-7 w-full items-end gap-[2px]">
        {data.map((day) => {
          const level =
            day.uptime >= 99.8 ? "high" : day.uptime >= 99 ? "mid" : "low";
          return (
            <span
              key={day.date}
              title={`${day.date} — ${day.uptime.toFixed(2)}% uptime`}
              className={cn(
                "min-w-[1px] flex-1 rounded-[2px] transition-opacity hover:opacity-70",
                level === "high" && "bg-positive/70",
                level === "mid" && "bg-warning/75",
                level === "low" && "bg-critical/80",
              )}
              style={{
                height:
                  level === "high" ? "100%" : level === "mid" ? "72%" : "40%",
              }}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-ink">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
      )}
    </div>
  );
}
