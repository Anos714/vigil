import {
  ArrowUpRight,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Globe2,
  Link2,
  MapPin,
  ShieldCheck,
  Timer,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LatencyBreakdown } from "@/components/dashboard/latency-breakdown";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MonitorActions } from "@/components/dashboard/monitor-actions";
import { MonitorChecksTable } from "@/components/dashboard/monitor-checks-table";
import { MonitorIncidents } from "@/components/dashboard/monitor-incidents";
import { MonitorVisibilityToggle } from "@/components/dashboard/monitor-visibility-toggle";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status";
import { UptimeBars } from "@/components/ui/uptime-bars";
import { formatLatency, formatRelative, formatUptime } from "@/lib/format";
import { getMonitor, getMonitorIncidents, monitors } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export const instant = false;

export function generateStaticParams() {
  return monitors.map((monitor) => ({ id: monitor.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const monitor = getMonitor(id);
  return {
    title: monitor ? monitor.name : "Monitor",
    description: monitor
      ? `Uptime, latency, and incidents for ${monitor.url}.`
      : undefined,
  };
}

export default async function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monitor = getMonitor(id);

  if (!monitor) notFound();
  const monitorIncidents = getMonitorIncidents(monitor.id);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/monitors"
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink transition-colors hover:text-ink"
      >
        <ChevronLeft className="size-3" /> All monitors
      </Link>

      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-muted-ink">
            <Globe2 className="size-5" strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="display text-[clamp(1.8rem,3.5vw,2.5rem)]">
                {monitor.name}
              </h1>
              <StatusBadge status={monitor.status} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-ink">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="size-3" /> {monitor.url}
              </span>
              <span className="text-line">·</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3" /> {monitor.region}
              </span>
              <span className="text-line">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3" /> every {monitor.interval}s
              </span>
            </div>
          </div>
        </div>
        <MonitorActions monitor={monitor} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Uptime · 24h"
          value={formatUptime(monitor.uptime24h)}
          detail="90d 99.96%"
          trend={monitor.status === "up" ? "nominal" : "below SLO"}
          trendDirection={monitor.status === "up" ? "up" : "down"}
        />
        <MetricCard
          label="p50 response"
          value={formatLatency(monitor.avgLatency)}
          detail="target < 200ms"
          trend={monitor.avgLatency > 200 ? "degraded" : "on target"}
          trendDirection={monitor.avgLatency > 200 ? "down" : "up"}
          sparkline={monitor.sparkline}
        />
        <MetricCard
          label="p95 response"
          value={formatLatency(monitor.p95Latency)}
          detail="last 24h"
          trend={monitor.p95Latency > 500 ? "threshold hit" : "healthy"}
          trendDirection={monitor.p95Latency > 500 ? "down" : "up"}
        />
        <MetricCard
          label="Checks · 24h"
          value="2,880"
          detail={`every ${monitor.interval}s`}
          trend="0 missed"
          trendDirection="neutral"
        />
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-card xl:col-span-8">
          <LatencyChart
            monitor={monitor}
            title={`${monitor.name} latency`}
            description={`Response time from ${monitor.region}, sampled every ${monitor.interval} seconds.`}
          />
        </div>

        <div className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-card xl:col-span-4">
          <div className="flex items-start justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
                Configuration
              </h3>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Demo values from the local seed.
              </p>
            </div>
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
              http
            </span>
          </div>

          <dl className="divide-y divide-line/70 px-5">
            {[
              ["Method", "GET"],
              ["Expected status", `${monitor.statusCode} OK`],
              ["Check interval", `${monitor.interval} seconds`],
              ["Timeout", "10 seconds"],
              ["Retries", "2 before incident"],
              ["Regions", monitor.region],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 py-2.5 text-[0.75rem]"
              >
                <dt className="text-muted-ink">{label}</dt>
                <dd className="font-mono text-[10px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-2 border-t border-line px-5 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.78rem] font-medium">Public status page</p>
                <p className="mt-0.5 text-[0.68rem] text-muted-ink">
                  {monitor.isPublic
                    ? "Visible to anyone with the link."
                    : "Hidden from the public page."}
                </p>
              </div>
              <MonitorVisibilityToggle
                monitorName={monitor.name}
                defaultChecked={monitor.isPublic}
              />
            </div>
            {monitor.isPublic && (
              <Link
                href={`/status/${monitor.publicKey}`}
                target="_blank"
                className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-2.5 py-2 font-mono text-[9px] text-muted-ink transition-colors hover:text-ink"
              >
                <span className="truncate">/status/{monitor.publicKey}</span>
                <ExternalLink className="size-3 shrink-0" />
              </Link>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-line px-5 py-3">
            <span className="flex size-5 items-center justify-center rounded-full bg-positive/10 text-positive">
              <ShieldCheck className="size-3" />
            </span>
            <span className="text-[10px] text-muted-ink">
              Last check {formatRelative(monitor.lastCheckedAt)} ·{" "}
              {monitor.statusCode} in {monitor.avgLatency}ms
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <LatencyBreakdown monitor={monitor} />
        </div>
        <div className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-card xl:col-span-7">
          <div className="flex flex-col justify-between gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-[0.92rem] font-medium tracking-[-0.01em]">
                90-day uptime
              </h3>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Each bar is one day. Hover for the exact percentage.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[1.45rem] font-medium leading-none tracking-[-0.04em] tabular">
                {formatUptime(monitor.uptime90d)}
              </div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink">
                overall
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col justify-center px-5 py-5">
            <UptimeBars data={monitor.uptimeBars} showLabels />
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[9px] text-muted-ink">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-positive/70" />{" "}
                100–99.9%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-warning/75" />{" "}
                99–99.9%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-critical/80" /> below
                99%
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-line" /> no checks
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="font-mono text-[9px] text-muted-ink">
              2,880 checks · {monitorIncidents.length}{" "}
              {monitorIncidents.length === 1 ? "incident" : "incidents"}
            </span>
            <Link
              href={`/status/${monitor.publicKey}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "xs" }),
                "h-6 gap-1 rounded-md border-line bg-transparent text-[10px]",
              )}
            >
              Public view <ArrowUpRight className="size-2.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <MonitorChecksTable monitor={monitor} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <MonitorIncidents monitor={monitor} />
        </div>
      </section>

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-ink">
            <Timer className="size-3.5" />
          </span>
          <div>
            <p className="text-[0.78rem] font-medium">
              Sample monitor, real UI.
            </p>
            <p className="mt-0.5 text-[0.72rem] text-muted-ink">
              Charts, filters, and actions are interactive. The API persists
              monitors, and the worker writes checks and incidents, but this
              screen still reads sample data until full UI wiring lands.
            </p>
          </div>
        </div>
        <Link
          href="/#engineering"
          className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
        >
          Architecture notes <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
