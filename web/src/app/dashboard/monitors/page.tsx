import {
  Activity,
  CirclePause,
  Plus,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MonitorTable } from "@/components/dashboard/monitor-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { monitors, overviewStats } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Monitors",
};

const summary = [
  {
    label: "Operational",
    value: overviewStats.operational,
    icon: Activity,
    color: "text-positive bg-positive/8",
  },
  {
    label: "Degraded",
    value: overviewStats.degraded,
    icon: TriangleAlert,
    color: "text-warning bg-warning/8",
  },
  {
    label: "Down",
    value: overviewStats.down,
    icon: ShieldAlert,
    color: "text-critical bg-critical/8",
  },
  {
    label: "Paused",
    value: overviewStats.paused,
    icon: CirclePause,
    color: "text-muted-ink bg-secondary",
  },
];

export default function MonitorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Endpoint inventory"
        title={
          <>
            Monitors<span className="serif-accent text-signal-deep">.</span>
          </>
        }
        description="Every API, service, and page you have asked Vigil to watch."
        actions={
          <Link
            href="/dashboard/monitors/new"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 gap-1.5 rounded-lg bg-ink px-3 text-xs text-paper hover:bg-ink/85",
            )}
          >
            <Plus className="size-3.5" />
            New monitor
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                item.color,
              )}
            >
              <item.icon className="size-4" />
            </span>
            <div>
              <div className="text-[1.15rem] font-medium leading-none tabular">
                {item.value}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <MonitorTable />

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[0.78rem] font-medium">
            {monitors.length} endpoints in the sample workspace
          </p>
          <p className="mt-0.5 text-[0.72rem] text-muted-ink">
            Filters and search are interactive. Pause, resume, and create
            actions are preview-only.
          </p>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink">
          collected from 1 region
        </span>
      </div>
    </div>
  );
}
