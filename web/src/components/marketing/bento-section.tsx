import {
  ArrowUpRight,
  Bell,
  Check,
  Circle,
  Database,
  Gauge,
  Globe2,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { StatusDot } from "@/components/ui/status";
import { UptimeBars } from "@/components/ui/uptime-bars";
import { monitors } from "@/lib/monitors";

const barHeights = Array.from({ length: 56 }, (_, index) => ({
  id: `check-bar-${index}`,
  height: 22 + ((index * 37 + 11) % 72),
}));

export function BentoSection() {
  const breakdown = monitors[0].latencyBreakdown;
  const total =
    breakdown.dns + breakdown.connect + breakdown.tls + breakdown.ttfb;

  return (
    <section id="product" className="relative scroll-mt-24 py-20 sm:py-24">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="The product"
            title={
              <>
                Observability that earns
                <br className="hidden sm:block" /> its{" "}
                <span className="serif-accent text-signal-deep">keep.</span>
              </>
            }
            description="Most monitors tell you something broke. Vigil tells you what happened, where the time went, and exactly which check changed the story."
          />
        </Reveal>

        <div className="mt-10 grid gap-3 md:grid-cols-12">
          <Reveal className="md:col-span-7" delay={0.04}>
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card">
              <div className="p-6 sm:p-7">
                <div className="mono-label flex items-center gap-2 text-muted-ink">
                  <Database className="size-3.5 text-signal-deep" />
                  Storage · PostgreSQL
                </div>
                <h3 className="mt-4 text-[1.45rem] font-medium tracking-[-0.035em]">
                  Every check, kept.
                </h3>
                <p className="mt-2 max-w-md text-[0.82rem] leading-6 text-muted-ink">
                  Raw checks land in weekly partitions. Windowed SQL rollups are
                  exposed by the API; full dashboard wiring is next. No
                  proprietary metric store, no retention paywall — just rows you
                  can query forever.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "10M rows",
                    "38ms aggregate",
                    "30-day window",
                    "SQL native",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[9px] text-muted-ink"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[8px] text-muted-ink/80">
                  Reference figures; rollup API built.
                </p>
              </div>
              <div className="relative mt-auto h-[150px] overflow-hidden border-t border-line bg-paper/60 px-5 pt-5">
                <div className="absolute inset-x-0 top-0 flex h-4 justify-between border-b border-line/60 px-5 font-mono text-[7px] uppercase tracking-[0.1em] text-muted-ink/60">
                  <span>30 days ago</span>
                  <span>checks per hour</span>
                  <span>today</span>
                </div>
                <div className="flex h-[105px] items-end gap-[3px] pt-4">
                  {barHeights.map((bar, index) => (
                    <span
                      key={bar.id}
                      className={
                        index > 43
                          ? "flex-1 rounded-t-[1px] bg-signal-deep/80"
                          : index % 11 === 0
                            ? "flex-1 rounded-t-[1px] bg-signal-deep/35"
                            : "flex-1 rounded-t-[1px] bg-ink/10"
                      }
                      style={{ height: `${bar.height}%` }}
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-paper to-transparent" />
              </div>
            </article>
          </Reveal>

          <Reveal className="md:col-span-5" delay={0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-line bg-card p-6 sm:p-7">
              <div className="mono-label flex items-center gap-2 text-muted-ink">
                <Gauge className="size-3.5 text-violet" />
                Request waterfall
              </div>
              <h3 className="mt-4 text-[1.45rem] font-medium tracking-[-0.035em]">
                Latency you can explain.
              </h3>
              <p className="mt-2 text-[0.82rem] leading-6 text-muted-ink">
                DNS, TCP, TLS, and time-to-first-byte measured separately, so
                "slow" becomes a place to look.
              </p>

              <div className="mt-6 rounded-xl border border-line bg-paper/70 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-ink">
                    p50 total
                  </span>
                  <span className="text-[1.35rem] font-medium leading-none tracking-[-0.04em] tabular">
                    {total}ms
                  </span>
                </div>
                <div className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
                  <span
                    className="rounded-l-full bg-teal"
                    style={{ width: `${(breakdown.dns / total) * 100}%` }}
                  />
                  <span
                    className="bg-violet"
                    style={{ width: `${(breakdown.connect / total) * 100}%` }}
                  />
                  <span
                    className="bg-signal-deep"
                    style={{ width: `${(breakdown.tls / total) * 100}%` }}
                  />
                  <span
                    className="rounded-r-full bg-warning"
                    style={{ width: `${(breakdown.ttfb / total) * 100}%` }}
                  />
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    ["DNS", breakdown.dns, "bg-teal"],
                    ["TCP", breakdown.connect, "bg-violet"],
                    ["TLS", breakdown.tls, "bg-signal-deep"],
                    ["TTFB", breakdown.ttfb, "bg-warning"],
                  ].map(([label, value, color]) => (
                    <div
                      key={String(label)}
                      className="flex items-center gap-2 font-mono text-[9px]"
                    >
                      <span className={`size-1.5 rounded-full ${color}`} />
                      <span className="w-9 text-muted-ink">{label}</span>
                      <span className="h-px flex-1 bg-line" />
                      <span className="tabular text-ink">{value}ms</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/dashboard/monitors/api-acme"
                className="mt-auto inline-flex items-center gap-1 pt-5 text-[11px] font-medium underline-offset-4 hover:underline"
              >
                See the full waterfall <ArrowUpRight className="size-3" />
              </Link>
            </article>
          </Reveal>

          <Reveal className="md:col-span-4" delay={0.04}>
            <article className="flex h-full flex-col rounded-2xl border border-line bg-secondary/35 p-6">
              <div className="mono-label flex items-center gap-2 text-muted-ink">
                <Globe2 className="size-3.5 text-signal-deep" />
                Public trust
              </div>
              <h3 className="mt-4 text-[1.18rem] font-medium tracking-[-0.03em]">
                A status page worth sharing.
              </h3>
              <p className="mt-2 text-[0.78rem] leading-5 text-muted-ink">
                One link, per-service uptime, and plain-language incident
                updates.
              </p>

              <div className="mt-5 overflow-hidden rounded-xl border border-line bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <span className="text-[9px] font-medium">Acme status</span>
                  <span className="flex items-center gap-1 font-mono text-[7px] uppercase tracking-[0.1em] text-warning">
                    <span className="size-1 rounded-full bg-warning" />{" "}
                    disruption
                  </span>
                </div>
                <div className="space-y-2.5 px-3 py-3">
                  {monitors.slice(0, 3).map((monitor) => (
                    <div key={monitor.id} className="flex items-center gap-2">
                      <StatusDot status={monitor.status} />
                      <span className="flex-1 truncate text-[8px] font-medium">
                        {monitor.name}
                      </span>
                      <UptimeBars
                        data={monitor.uptimeBars.slice(-28)}
                        className="w-[72px]"
                      />
                    </div>
                  ))}
                </div>
                <div className="border-t border-line px-3 py-2 font-mono text-[7px] text-muted-ink">
                  updated 8s ago · 90-day window
                </div>
              </div>
              <Link
                href="/status/acme-api-live"
                target="_blank"
                className="mt-auto inline-flex items-center gap-1 pt-5 text-[11px] font-medium underline-offset-4 hover:underline"
              >
                Preview the status page <ArrowUpRight className="size-3" />
              </Link>
            </article>
          </Reveal>

          <Reveal className="md:col-span-4" delay={0.08}>
            <article className="flex h-full flex-col rounded-2xl border border-line bg-card p-6">
              <div className="mono-label flex items-center gap-2 text-muted-ink">
                <Bell className="size-3.5 text-warning" />
                Alerting
              </div>
              <h3 className="mt-4 text-[1.18rem] font-medium tracking-[-0.03em]">
                Alerts, minus the noise.
              </h3>
              <p className="mt-2 text-[0.78rem] leading-5 text-muted-ink">
                Rules that wait for a pattern, not a single bad packet.
              </p>

              <div className="mt-5 rounded-xl border border-line bg-paper p-3 font-mono text-[9px] leading-6">
                <div className="flex gap-2">
                  <span className="w-5 shrink-0 text-muted-ink/50">01</span>
                  <span>
                    <span className="text-violet">when</span> p95 &gt;{" "}
                    <span className="text-signal-deep">1000ms</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 shrink-0 text-muted-ink/50">02</span>
                  <span>
                    <span className="text-violet">for</span> 2 consecutive
                    checks
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 shrink-0 text-muted-ink/50">03</span>
                  <span>
                    <span className="text-violet">then</span> email + webhook
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["2m dedupe", "quiet hours", "recovery notice"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[8px] text-muted-ink"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-2 font-mono text-[8px] text-muted-ink/80">
                Email delivery is built; webhook routing is next.
              </p>
              <Link
                href="/dashboard/incidents"
                className="mt-auto inline-flex items-center gap-1 pt-5 text-[11px] font-medium underline-offset-4 hover:underline"
              >
                See incident routing <ArrowUpRight className="size-3" />
              </Link>
            </article>
          </Reveal>

          <Reveal className="md:col-span-4" delay={0.12}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-ink p-6 text-paper">
              <div className="absolute -right-14 -top-14 size-40 rounded-full bg-signal/20 blur-2xl" />
              <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,var(--paper)_1px,transparent_1px),linear-gradient(to_bottom,var(--paper)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="relative flex items-center justify-between">
                <div className="mono-label flex items-center gap-2 text-paper/45">
                  <Server className="size-3.5 text-signal" />
                  Deployment
                </div>
                <span className="rounded-full border border-paper/15 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-paper/45">
                  Local stack
                </span>
              </div>
              <h3 className="relative mt-4 text-[1.18rem] font-medium tracking-[-0.03em]">
                Self-hosted by design.
              </h3>
              <p className="relative mt-2 text-[0.78rem] leading-5 text-paper/55">
                The Go API, standalone probe worker, email notifier, and Compose
                stack are built. The dashboard has a live API status card; the
                rest of the dashboard and status page still read sample data.
                Webhook routing and full UI wiring are next. Your Postgres. Your
                retention. Your bill.
              </p>

              <div className="relative mt-5 rounded-lg border border-paper/10 bg-paper/[0.04] px-3 py-2.5 font-mono text-[9px] text-paper/60">
                <span className="text-signal">$</span> docker compose up -d
                <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-signal/70 align-middle" />
              </div>
              <div className="relative mt-4 space-y-2">
                {[
                  { label: "Dashboard + status page UI built", built: true },
                  { label: "Probe worker + Postgres built", built: true },
                  {
                    label: "Full dashboard/status API wiring next",
                    built: false,
                  },
                  { label: "No per-monitor pricing", built: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 font-mono text-[9px] text-paper/55"
                  >
                    {item.built ? (
                      <Check className="size-3 text-signal" />
                    ) : (
                      <Circle className="size-3 text-paper/30" />
                    )}
                    {item.label}
                  </div>
                ))}
              </div>
              <a
                href="#self-host"
                className="relative mt-auto inline-flex items-center gap-1 pt-5 text-[11px] font-medium text-paper underline-offset-4 hover:underline"
              >
                Read the deployment note <ArrowUpRight className="size-3" />
              </a>
            </article>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-3 grid gap-3 rounded-2xl border border-line bg-card/60 px-5 py-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                label: "No vendor lock-in",
                detail: "Designed for plain Postgres rows.",
              },
              {
                icon: Sparkles,
                label: "Quiet by default",
                detail: "No confetti. No red badges everywhere.",
              },
              {
                icon: Terminal,
                label: "Built to be read",
                detail: "Open source, typed, and documented.",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/20 text-signal-ink">
                  <item.icon className="size-3.5" />
                </span>
                <div>
                  <div className="text-[0.76rem] font-medium">{item.label}</div>
                  <div className="mt-0.5 text-[0.68rem] text-muted-ink">
                    {item.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
