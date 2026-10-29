import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Globe2,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLink, LogoMark } from "@/components/brand/logo";
import { StatusSubscribe } from "@/components/status/status-subscribe";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import { UptimeBars } from "@/components/ui/uptime-bars";
import {
  formatDateTime,
  formatDuration,
  formatRelative,
  formatUptime,
} from "@/lib/format";
import {
  getMonitorByPublicKey,
  type Incident,
  incidents,
  monitors,
  publicStatus,
} from "@/lib/monitors";
import { cn } from "@/lib/utils";

export const instant = false;

export function generateStaticParams() {
  return monitors
    .filter((monitor) => monitor.isPublic)
    .map((monitor) => ({ key: monitor.publicKey }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const monitor = getMonitorByPublicKey(key);
  return {
    title: monitor ? `${publicStatus.workspace} status` : "Status",
    description: monitor ? publicStatus.summary : undefined,
    robots: { index: true, follow: true },
  };
}

function PublicIncidentRow({ incident }: { incident: Incident }) {
  const open = !incident.resolvedAt;
  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card px-5 py-4",
        open ? "border-critical/20" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
              open
                ? "bg-critical/10 text-critical"
                : "bg-positive/10 text-positive",
            )}
          >
            {open ? (
              <TriangleAlert className="size-3.5" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[0.82rem] font-medium">{incident.cause}</h3>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                  open
                    ? "bg-critical/10 text-critical"
                    : "bg-positive/10 text-positive",
                )}
              >
                {open ? "investigating" : "resolved"}
              </span>
            </div>
            <p className="mt-1 text-[0.7rem] leading-5 text-muted-ink">
              {incident.monitorName} · {formatDateTime(incident.startedAt)}
              {incident.resolvedAt
                ? ` → ${formatDateTime(incident.resolvedAt)}`
                : " · ongoing"}
              {" · "}
              {formatDuration(incident.startedAt, incident.resolvedAt)}
            </p>
          </div>
        </div>
        <span className="font-mono text-[9px] text-muted-ink">
          {incident.statusCode ? `HTTP ${incident.statusCode}` : "no response"}
        </span>
      </div>
    </div>
  );
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const selected = getMonitorByPublicKey(key);
  if (!selected) notFound();

  const publicMonitors = monitors.filter((monitor) => monitor.isPublic);
  const publicIncidents = incidents.filter((incident) =>
    publicMonitors.some((monitor) => monitor.id === incident.monitorId),
  );
  const down = publicMonitors.filter(
    (monitor) => monitor.status === "down",
  ).length;
  const degraded = publicMonitors.filter(
    (monitor) => monitor.status === "degraded",
  ).length;
  const overallTone =
    down > 0 ? "critical" : degraded > 0 ? "warning" : "positive";

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLink href="/" />
            <span className="hidden h-4 w-px bg-line sm:block" />
            <span className="hidden text-xs font-medium text-muted-ink sm:block">
              {publicStatus.workspace} status
            </span>
            <span className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-ink">
              demo data
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="#subscribe"
              className="hidden h-8 items-center rounded-lg bg-ink px-3 text-[11px] font-medium text-paper transition-colors hover:bg-ink/85 sm:inline-flex"
            >
              Subscribe to updates
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page max-w-[1060px] py-10 sm:py-14">
        <div className="max-w-2xl">
          <div className="mono-label mb-4 flex items-center gap-2 text-muted-ink">
            <span
              className={cn(
                "size-1.5 rounded-full",
                overallTone === "critical" && "bg-critical",
                overallTone === "warning" && "bg-warning",
                overallTone === "positive" && "bg-positive",
              )}
            />
            {publicStatus.workspace} · system status
          </div>
          <h1 className="display text-[clamp(2.2rem,5vw,3.7rem)]">
            {publicStatus.headline}
            <span className="serif-accent text-signal-deep">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-ink">
            {publicStatus.summary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-positive" />
              sample
            </span>
            <span className="text-line">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3" /> updated{" "}
              {formatRelative(publicStatus.updatedAt)}
            </span>
            <span className="text-line">·</span>
            <span>all times IST</span>
          </div>
        </div>

        <section className="mt-9 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex flex-col justify-between gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[0.92rem] font-medium">Current status</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Public endpoints checked every 30 seconds.
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink">
              {publicMonitors.length - down - degraded}/{publicMonitors.length}{" "}
              operational
            </span>
          </div>

          <div className="divide-y divide-line/75">
            {publicMonitors.map((monitor) => (
              <div
                key={monitor.id}
                className="group px-5 py-4 transition-colors hover:bg-paper/40"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot
                      status={monitor.status}
                      pulse={monitor.status !== "up"}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[0.83rem] font-medium">
                          {monitor.name}
                        </span>
                        <StatusBadge status={monitor.status} />
                      </div>
                      <div className="mt-1 flex min-w-0 items-center gap-2 font-mono text-[9px] text-muted-ink">
                        <Globe2 className="size-2.5 shrink-0" />
                        <span className="truncate">
                          {monitor.url.replace("https://", "")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden w-[260px] sm:block">
                      <UptimeBars data={monitor.uptimeBars} />
                    </div>
                    <div className="text-right">
                      <div className="tabular text-[0.78rem]">
                        {formatUptime(monitor.uptime90d)}
                      </div>
                      <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-ink">
                        90d uptime
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 sm:hidden">
                  <UptimeBars data={monitor.uptimeBars} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-2 border-t border-line px-5 py-3 sm:flex-row sm:items-center">
            <span className="flex items-center gap-1.5 font-mono text-[9px] text-muted-ink">
              <ShieldCheck className="size-3 text-positive" /> TLS verified · 1
              probe region
            </span>
            <span className="font-mono text-[9px] text-muted-ink">
              90-day uptime window
            </span>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_310px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[0.98rem] font-medium tracking-[-0.01em]">
                  Incident history
                </h2>
                <p className="mt-1 text-[0.72rem] text-muted-ink">
                  The last 7 days.
                </p>
              </div>
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] text-muted-ink">
                {publicIncidents.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {publicIncidents.map((incident) => (
                <PublicIncidentRow key={incident.id} incident={incident} />
              ))}
            </div>
            <p className="mt-4 text-[0.68rem] leading-5 text-muted-ink">
              Incident entries are sample data in this preview. The Go worker
              can create and resolve incidents in PostgreSQL, but this status
              page is not wired to the API yet.
            </p>
          </section>

          <aside className="space-y-3">
            <section
              id="subscribe"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-5"
            >
              <h2 className="text-[0.88rem] font-medium">
                Get incident updates
              </h2>
              <p className="mt-1 text-[0.7rem] leading-5 text-muted-ink">
                In production, Vigil emails you when a service changes state.
                This preview only validates the address and sends no email.
              </p>
              <div className="mt-4">
                <StatusSubscribe />
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-2">
                <LogoMark className="size-5" />
                <span className="text-[0.8rem] font-medium">
                  About this page
                </span>
              </div>
              <p className="mt-3 text-[0.7rem] leading-5 text-muted-ink">
                This is the built status page frontend for Vigil, rendered with
                deterministic sample data. The Go probe worker, incident
                lifecycle, and Brevo email notifier are built; webhook routing
                and full UI-to-API wiring are the next build step.
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline"
              >
                Learn about Vigil <ArrowUpRight className="size-3" />
              </Link>
            </section>

            <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-4 py-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink">
                powered by
              </span>
              <span className="flex items-center gap-1.5 text-[0.78rem] font-semibold tracking-[-0.04em]">
                <span className="size-1.5 rounded-full bg-signal" /> vigil
              </span>
            </div>
          </aside>
        </div>

        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] text-muted-ink">
            <span>© 2026 {publicStatus.workspace}</span>
            <span className="text-line">·</span>
            <span>Status page</span>
            <span className="text-line">·</span>
            <span>Last updated {formatRelative(publicStatus.updatedAt)}</span>
          </div>
          <Link
            href="/login"
            className="text-[10px] font-medium text-muted-ink underline-offset-4 hover:text-ink hover:underline"
          >
            Operator sign in
          </Link>
        </footer>
      </main>
    </div>
  );
}
