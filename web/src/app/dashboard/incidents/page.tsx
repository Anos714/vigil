import {
  ArrowUpRight,
  Clock3,
  Mail,
  MessageSquare,
  ShieldAlert,
  Siren,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IncidentLog } from "@/components/dashboard/incident-log";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import { incidents } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Incidents",
};

export default function IncidentsPage() {
  const open = incidents.find((incident) => !incident.resolvedAt);
  const resolved = incidents.filter((incident) => incident.resolvedAt);
  const averageResolution = Math.round(
    resolved.reduce((total, incident) => {
      const end = new Date(incident.resolvedAt as string).getTime();
      return total + (end - new Date(incident.startedAt).getTime());
    }, 0) /
      resolved.length /
      60000,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Incident log"
        title={
          <>
            Incidents<span className="serif-accent text-signal-deep">.</span>
          </>
        }
        description="Every threshold breach, failed check, and recovery — in one chronological trail."
        actions={
          <>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 font-mono text-[10px] text-muted-ink">
              <Clock3 className="size-3" /> Last 7 days
            </span>
            <Link
              href="/dashboard/settings"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 gap-1.5 rounded-lg border-line bg-card px-3 text-xs",
              )}
            >
              Alert routing
              <ArrowUpRight className="size-3" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <div className="mono-label text-[9px] text-muted-ink">Open now</div>
          <div className="mt-1.5 text-[1.3rem] font-medium tabular text-critical">
            {open ? 1 : 0}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <div className="mono-label text-[9px] text-muted-ink">
            Resolved · 7d
          </div>
          <div className="mt-1.5 text-[1.3rem] font-medium tabular">
            {resolved.length}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <div className="mono-label text-[9px] text-muted-ink">MTTR</div>
          <div className="mt-1.5 text-[1.3rem] font-medium tabular">
            {averageResolution}m
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card px-4 py-3">
          <div className="mono-label text-[9px] text-muted-ink">Affected</div>
          <div className="mt-1.5 text-[1.3rem] font-medium tabular">
            2 services
          </div>
        </div>
      </div>

      {open && (
        <div className="overflow-hidden rounded-2xl border border-critical/25 bg-critical/[0.045]">
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-critical/10 text-critical">
                <Siren className="size-4.5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[0.95rem] font-medium">
                    {open.monitorName} is down
                  </h2>
                  <span className="rounded-full bg-critical/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-critical">
                    ongoing
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-[0.76rem] leading-5 text-muted-ink">
                  {open.cause}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[9px] text-muted-ink">
                  <span>
                    Started {formatDuration(open.startedAt, null)} ago
                  </span>
                  <span className="text-line">·</span>
                  <span>HTTP {open.statusCode}</span>
                  <span className="text-line">·</span>
                  <span>1 region affected</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[9px] text-muted-ink">
                <Mail className="size-3" /> email sent
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[9px] text-muted-ink">
                <MessageSquare className="size-3" /> webhook planned
              </span>
            </div>
          </div>
          <div className="border-t border-critical/15 bg-card/40 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5">
                {[
                  "detected",
                  "alerted",
                  "acknowledged",
                  "investigating",
                  "resolved",
                ].map((step, index) => (
                  <div key={step} className="flex flex-1 items-center gap-1.5">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border font-mono text-[8px]",
                        index < 3
                          ? "border-critical/30 bg-critical/15 text-critical"
                          : "border-line bg-card text-muted-ink",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[9px] capitalize sm:block",
                        index < 3 ? "text-ink" : "text-muted-ink",
                      )}
                    >
                      {step}
                    </span>
                    {index < 4 && (
                      <span
                        className={cn(
                          "h-px flex-1",
                          index < 3 ? "bg-critical/25" : "bg-line",
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <ShieldAlert className="size-3.5 text-muted-ink" />
        <h2 className="mono-label text-muted-ink">All incidents</h2>
        <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[9px] text-muted-ink">
          {incidents.length}
        </span>
      </div>

      <IncidentLog />

      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-[0.72rem] leading-5 text-muted-ink">
          Incident entries are sample data in this preview. The Go worker
          persists incident state in PostgreSQL and can send Brevo email alerts
          when enabled, but this page is not wired to the API yet; webhook
          delivery is not implemented.
        </p>
        <Link
          href="/#engineering"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium hover:underline"
        >
          How alerting is designed <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
