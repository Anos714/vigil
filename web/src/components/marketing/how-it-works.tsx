import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Code2,
  Database,
  Gauge,
  HardDrive,
  Radar,
  Rows3,
  Server,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

const steps = [
  {
    label: "01 · Create",
    title: "Point it at an endpoint.",
    description:
      "Any URL, any method, any expected status. Choose a region and a cadence. No agents, no code changes.",
    icon: Radar,
    code: (
      <>
        <span className="text-signal">$</span> vigil monitor add{"\n"}
        {"  "}--url https://api.acme.dev/health{"\n"}
        {"  "}--every 30s{"\n"}
        {"  "}--region ap-south-1
      </>
    ),
  },
  {
    label: "02 · Collect",
    title: "Keep the milliseconds.",
    description:
      "Every probe writes a raw row with DNS, TCP, TLS, TTFB, status, and error. Weekly partitions keep the table fast.",
    icon: Database,
    code: (
      <>
        <span className="text-paper/40">SELECT</span> percentile_cont(0.95)
        {"\n"}
        {"  "}
        <span className="text-paper/40">WITHIN GROUP</span> (ORDER BY
        latency_ms){"\n"}
        <span className="text-paper/40">FROM</span> checks{"\n"}
        <span className="text-paper/40">WHERE</span> monitor_id ={" "}
        <span className="text-signal">&apos;api-acme&apos;</span>
        {";"}
      </>
    ),
  },
  {
    label: "03 · Tell",
    title: "Let the right people know.",
    description:
      "Thresholds wait for repeated failures, then route to email or a webhook. Email delivery is built behind ALERT_EMAIL_ENABLED; webhook routing is not connected yet, and the public page is still sample data.",
    icon: BellRing,
    code: (
      <>
        <span className="text-violet">rule</span> api_latency {"{"}
        {"\n"}
        {"  "}p95 &gt; <span className="text-signal">1000ms</span>
        {"\n"}
        {"  "}for 2 checks{"\n"}
        {"  "}notify email, webhook{"\n"}
        {"}"}
      </>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-line bg-secondary/20 py-20 sm:py-24"
    >
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Three moves,
                  <br />
                  then quiet
                  <span className="serif-accent text-signal-deep">.</span>
                </>
              }
              description="No pipeline to assemble. No agent to install. Add a URL, choose how often, and let the boring parts run."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-signal/25 text-signal-ink">
                <Settings2 className="size-3.5" />
              </span>
              <div>
                <div className="text-[0.72rem] font-medium">
                  One config file
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-muted-ink">
                  no sidecars · no SDK
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative mt-12">
          <div className="absolute left-0 right-0 top-[42px] hidden border-t border-dashed border-line md:block" />
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.label} delay={index * 0.06}>
                <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-card p-6 transition-colors hover:border-ink/15">
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full border border-line bg-paper font-mono text-[10px] text-muted-ink shadow-[0_0_0_5px_var(--secondary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-ink">
                      <step.icon className="size-3.5" />
                    </span>
                  </div>
                  <div className="mono-label mt-6 text-[9px] text-muted-ink">
                    {step.label}
                  </div>
                  <h3 className="mt-2 text-[1.02rem] font-medium tracking-[-0.025em]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.78rem] leading-6 text-muted-ink">
                    {step.description}
                  </p>
                  <pre className="mt-5 overflow-x-auto rounded-xl border border-ink/20 bg-ink p-3.5 font-mono text-[9px] leading-5 text-paper/70">
                    {step.code}
                  </pre>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-line px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-[0.72rem] leading-5 text-muted-ink">
              In this preview, steps 01–03 are interactive UI backed by
              deterministic sample data, with a live API status card on the
              dashboard. The probe worker, Postgres writer, and Brevo email
              notifier are built; webhook routing and full UI-to-API wiring are
              the next build step.
            </p>
            <Link
              href="/dashboard/monitors/new"
              className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium hover:underline"
            >
              Try the form <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const benchmarks = [
  {
    value: "0.371s",
    label: "1,000 checks written",
    detail: "batch insert benchmark",
    icon: HardDrive,
  },
  {
    value: "2,695",
    label: "checks per second",
    detail: "collector throughput",
    icon: Gauge,
  },
  {
    value: "38ms",
    label: "30-day aggregate",
    detail: "at 10M stored rows",
    icon: Rows3,
  },
  {
    value: "<140MB",
    label: "RSS at 1,000 monitors",
    detail: "collector memory footprint",
    icon: Server,
  },
];

export function EngineeringBand() {
  return (
    <section id="engineering" className="scroll-mt-24 py-20 sm:py-24">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-12 text-paper sm:px-10 lg:px-14 lg:py-14">
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,var(--paper)_1px,transparent_1px),linear-gradient(to_bottom,var(--paper)_1px,transparent_1px)] [background-size:52px_52px]" />
            <div className="absolute -left-32 -top-40 size-[420px] rounded-full bg-signal/15 blur-3xl" />
            <div className="absolute -bottom-48 right-0 size-[420px] rounded-full bg-violet/10 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
              <div>
                <div className="mono-label mb-4 flex items-center gap-2 text-paper/45">
                  <span className="size-1.5 rounded-full bg-signal" />
                  Engineering notes
                </div>
                <h2 className="display max-w-md text-[clamp(2rem,4.4vw,3.4rem)]">
                  Built like infrastructure, not a demo.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-paper/55">
                  The probe worker is a Go service with a bounded pool and
                  partitioned Postgres writes. The API exposes windowed SQL
                  rollups, and the notifier sends deduplicated Brevo email
                  through an Asynq queue. Webhook routing and full dashboard
                  wiring are the next step. The report benchmarks are
                  deliberately unglamorous — throughput and memory.
                </p>

                <div className="mt-7 rounded-2xl border border-paper/10 bg-paper/[0.035] p-4">
                  <div className="mono-label mb-3 text-[8px] text-paper/35">
                    Request path
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[8px]">
                    {[
                      "Go worker",
                      "probe checks",
                      "Postgres",
                      "rollups (API)",
                      "Next.js UI",
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-md border px-2 py-1.5",
                            index === 2
                              ? "border-signal/30 bg-signal/10 text-signal"
                              : "border-paper/10 bg-paper/[0.04] text-paper/55",
                          )}
                        >
                          {item}
                        </span>
                        {index < 4 && (
                          <ArrowRight className="size-3 text-paper/25" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-paper/35">
                  <Code2 className="size-3" />
                  Reference benchmark from the project report
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {benchmarks.map((benchmark, index) => (
                  <div
                    key={benchmark.label}
                    className={cn(
                      "rounded-2xl border p-4 sm:p-5",
                      index === 0
                        ? "border-signal/25 bg-signal/[0.08]"
                        : "border-paper/10 bg-paper/[0.035]",
                    )}
                  >
                    <benchmark.icon
                      className={cn(
                        "size-4",
                        index === 0 ? "text-signal" : "text-paper/35",
                      )}
                    />
                    <div
                      className={cn(
                        "mt-5 text-[clamp(1.5rem,3vw,2.2rem)] font-medium leading-none tracking-[-0.05em] tabular",
                        index === 0 ? "text-signal" : "text-paper",
                      )}
                    >
                      {benchmark.value}
                    </div>
                    <div className="mt-2 text-[0.72rem] text-paper/65">
                      {benchmark.label}
                    </div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-[0.1em] text-paper/30">
                      {benchmark.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mt-10 flex flex-col justify-between gap-3 border-t border-paper/10 pt-5 sm:flex-row sm:items-center">
              <p className="max-w-lg font-mono text-[8px] leading-4 text-paper/30">
                Measured on the project&apos;s reference machine. These are
                report figures, not live production numbers.
              </p>
              <div className="flex items-center gap-4 font-mono text-[8px] uppercase tracking-[0.12em] text-paper/35">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-signal/60" /> Go
                  1.27
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-violet/60" />{" "}
                  Postgres 17
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
