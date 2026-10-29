import {
  Activity,
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Gauge,
  Globe2,
  ShieldAlert,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChecksChart } from "@/components/dashboard/checks-chart";
import { CurrentStatusCard } from "@/components/dashboard/current-status-card";
import { IncidentList } from "@/components/dashboard/incident-list";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { LiveApiCard } from "@/components/dashboard/live-api-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MonitorTable } from "@/components/dashboard/monitor-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatNumber, formatRelative } from "@/lib/format";
import {
  incidents,
  makeChecksPerHour,
  monitors,
  overviewStats,
} from "@/lib/monitors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

export default function DashboardPage() {
  const openIncident = incidents.find((incident) => !incident.resolvedAt);
  const checks = makeChecksPerHour(monitors[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Friday, 23 October · 18:30 IST"
        title={
          <>
            Good evening, Rahul
            <span className="serif-accent text-signal-deep">.</span>
          </>
        }
        description="Here is what your API surface did while you were away. One endpoint needs attention."
        actions={
          <>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 font-mono text-[10px] text-muted-ink">
              <Clock3 className="size-3" /> Last 24 hours
            </span>
            <Link
              href="/status/acme-api-live"
              target="_blank"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1.5 rounded-lg border-line bg-card px-3 text-xs",
              )}
            >
              <Globe2 className="size-3.5" />
              Status page
              <ExternalLink className="size-2.5 opacity-60" />
            </Link>
          </>
        }
      />

      {openIncident && (
        <Link
          href={`/dashboard/incidents#${openIncident.id}`}
          className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-critical/25 bg-critical/[0.045] px-4 py-3.5 transition-colors hover:bg-critical/[0.07] sm:flex-row sm:items-center"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-critical/10 text-critical">
            <TriangleAlert className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.8rem] font-medium">
                {openIncident.monitorName} is down
              </span>
              <span className="rounded-full bg-critical/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-critical">
                open incident
              </span>
            </div>
            <p className="mt-0.5 text-[0.72rem] text-muted-ink">
              Started {formatRelative(openIncident.startedAt)} ·{" "}
              {openIncident.cause}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-critical">
            Investigate{" "}
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Uptime · 24h"
          value="99.94%"
          detail="last 24 hours"
          trend="+0.02%"
          trendDirection="up"
          icon={Activity}
          sparkline={monitors[0].sparkline}
        />
        <MetricCard
          label="Avg response"
          value="82ms"
          detail="p95 146ms"
          trend="−6ms"
          trendDirection="up"
          icon={Gauge}
          accent="violet"
          sparkline={monitors[2].sparkline}
        />
        <MetricCard
          label="Checks completed"
          value={formatNumber(overviewStats.checks24h)}
          detail="every 30s"
          trend="+1.2k"
          trendDirection="up"
          icon={Zap}
          accent="signal"
          sparkline={monitors[1].sparkline}
        />
        <MetricCard
          label="Open incidents"
          value={overviewStats.openIncidents}
          detail="1 critical · 0 degraded"
          trend="needs attention"
          trendDirection="neutral"
          icon={ShieldAlert}
          accent="critical"
        />
      </section>

      <LiveApiCard />

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-line bg-card xl:col-span-8">
          <LatencyChart />
        </div>
        <CurrentStatusCard className="xl:col-span-4" />
      </section>

      <MonitorTable />

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-7">
          <IncidentList limit={3} />
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-card xl:col-span-5">
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
                Checks per hour
              </h3>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Probe volume across every endpoint.
              </p>
            </div>
            <span className="font-mono text-[10px] text-muted-ink">
              18,432 total
            </span>
          </div>
          <div className="px-2 pb-3 pt-5 sm:px-4">
            <ChecksChart data={checks} />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-line px-5 py-3">
            <div>
              <div className="mono-label text-[9px] text-muted-ink">
                Success
              </div>
              <div className="mt-1 text-[0.85rem] tabular">99.8%</div>
            </div>
            <div>
              <div className="mono-label text-[9px] text-muted-ink">
                Failures
              </div>
              <div className="mt-1 text-[0.85rem] tabular text-critical">
                34
              </div>
            </div>
            <div>
              <div className="mono-label text-[9px] text-muted-ink">
                Regions
              </div>
              <div className="mt-1 text-[0.85rem] tabular">1</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[0.78rem] font-medium">
            This is a preview workspace.
          </p>
          <p className="mt-0.5 text-[0.72rem] text-muted-ink">
            Monitors, checks, and incidents on this screen are deterministic
            sample data. The live API card above reads real counts; the rest of
            the dashboard is not wired yet.
          </p>
        </div>
        <Link
          href="/#engineering"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline"
        >
          Read the architecture <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
