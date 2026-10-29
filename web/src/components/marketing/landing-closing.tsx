import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Database,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { BrandLink, LogoMark } from "@/components/brand/logo";
import { CopyButton } from "@/components/marketing/copy-button";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, StatusDot } from "@/components/ui/status";
import { UptimeBars } from "@/components/ui/uptime-bars";
import { formatRelative, formatUptime } from "@/lib/format";
import { monitors, publicStatus } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const compose = `services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: vigil
  redis:
    image: redis:8-alpine
  api:
    build: ./backend
    ports: ["8080:8080"]
  worker:
    build: ./backend
    command: ["/usr/local/bin/vigil-worker"]
  web:
    build: ./web
    ports: ["3000:3000"]`;

export function StatusShowcase() {
  const publicMonitors = monitors.filter((monitor) => monitor.isPublic);

  return (
    <section
      id="status-page"
      className="dot-grid scroll-mt-24 border-y border-line bg-paper py-20 sm:py-24"
    >
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <SectionHeading
              eyebrow="Public status"
              title={
                <>
                  The status page your
                  <br />
                  customers{" "}
                  <span className="serif-accent text-signal-deep">
                    deserve.
                  </span>
                </>
              }
              description="A calm, honest page designed to update from the same data your team sees. No separate CMS. No stale copy."
            />
            <div className="mt-7 space-y-3">
              {[
                [
                  "90-day uptime bars",
                  "Per-service history, not a single vanity number.",
                ],
                [
                  "Plain-language incidents",
                  "A timeline customers can actually follow.",
                ],
                [
                  "Custom domain, your TLS",
                  "One route in the Next.js app or a standalone deploy.",
                ],
              ].map(([title, detail]) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-signal/30 text-signal-ink">
                    <Check className="size-3" />
                  </span>
                  <div>
                    <div className="text-[0.8rem] font-medium">{title}</div>
                    <div className="mt-0.5 text-[0.72rem] text-muted-ink">
                      {detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/status/acme-api-live"
              target="_blank"
              className="mt-7 inline-flex items-center gap-1.5 text-[0.8rem] font-medium underline-offset-4 hover:underline"
            >
              Open the sample status page <ArrowUpRight className="size-3.5" />
            </Link>
          </Reveal>

          <Reveal delay={0.08} y={26}>
            <div className="relative">
              <div className="absolute -inset-4 -z-10 rounded-[32px] bg-signal/20 blur-3xl" />
              <div className="overflow-hidden rounded-[22px] border border-ink/15 bg-card p-1.5 shadow-[0_28px_80px_-30px_oklch(0.2_0.02_120/0.35)]">
                <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
                  <div className="flex h-9 items-center gap-2 border-b border-line bg-card/80 px-3">
                    <span className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-line" />
                      <span className="size-1.5 rounded-full bg-line" />
                      <span className="size-1.5 rounded-full bg-line" />
                    </span>
                    <div className="mx-auto flex h-5 items-center gap-1.5 rounded-md border border-line bg-paper px-3 font-mono text-[8px] text-muted-ink">
                      <LockKeyhole className="size-2" /> status.acme.dev
                    </div>
                  </div>

                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <LogoMark className="size-4" />
                          <span className="text-[10px] font-semibold tracking-[-0.03em]">
                            Acme status
                          </span>
                        </div>
                        <h3 className="mt-4 text-[1.2rem] font-medium tracking-[-0.04em] sm:text-[1.45rem]">
                          {publicStatus.headline}
                          <span className="serif-accent text-signal-deep">
                            .
                          </span>
                        </h3>
                        <p className="mt-1 max-w-[330px] text-[8px] leading-4 text-muted-ink">
                          {publicStatus.summary}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.1em] text-warning">
                        <span className="size-1 animate-pulse rounded-full bg-warning" />{" "}
                        partial
                      </span>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-card">
                      <div className="flex items-center justify-between border-b border-line px-3 py-2">
                        <span className="text-[8px] font-medium">
                          Current status
                        </span>
                        <span className="font-mono text-[6px] uppercase tracking-[0.1em] text-muted-ink">
                          updated {formatRelative(publicStatus.updatedAt)}
                        </span>
                      </div>
                      <div className="divide-y divide-line/70">
                        {publicMonitors.slice(0, 4).map((monitor) => (
                          <div
                            key={monitor.id}
                            className="flex items-center gap-2 px-3 py-2.5"
                          >
                            <StatusDot
                              status={monitor.status}
                              pulse={monitor.status !== "up"}
                            />
                            <span className="min-w-0 flex-1 truncate text-[8px] font-medium">
                              {monitor.name}
                            </span>
                            <UptimeBars
                              data={monitor.uptimeBars.slice(-34)}
                              className="hidden w-[90px] sm:block"
                            />
                            <span className="w-[34px] text-right font-mono text-[7px] text-muted-ink">
                              {formatUptime(monitor.uptime90d)}
                            </span>
                            <StatusBadge
                              status={monitor.status}
                              className="hidden scale-90 sm:inline-flex"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-critical/15 bg-critical/[0.035] px-3 py-2.5">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-critical/10 text-critical">
                        <Timer className="size-2.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[8px] font-medium">
                            Webhooks is down
                          </span>
                          <span className="rounded-full bg-critical/10 px-1 py-0.5 font-mono text-[6px] uppercase tracking-[0.1em] text-critical">
                            investigating
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[6.5px] text-muted-ink">
                          Upstream returned 503 for 2 consecutive checks · 18m
                          ago
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line bg-card px-4 py-2">
                    <span className="font-mono text-[6px] uppercase tracking-[0.1em] text-muted-ink">
                      powered by vigil
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 font-mono text-[6px] text-paper">
                      <Mail className="size-2" /> subscribe
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-3 z-20 hidden items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 shadow-[0_12px_40px_oklch(0_0_0/0.1)] sm:flex">
                <span className="flex size-5 items-center justify-center rounded-full bg-signal/25 text-signal-ink">
                  <Check className="size-2.5" />
                </span>
                <span className="font-mono text-[8px] text-muted-ink">
                  status page preview · public access
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function SelfHost() {
  return (
    <section id="self-host" className="scroll-mt-24 py-20 sm:py-24">
      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <Reveal>
            <SectionHeading
              eyebrow="Deployment · preview"
              title={
                <>
                  Your infrastructure.
                  <br />
                  Your data. Your{" "}
                  <span className="serif-accent text-signal-deep">call.</span>
                </>
              }
              description="The target is a $6 VPS or your VPC. The Next.js dashboard, Better Auth, Go API, standalone probe worker, Brevo email notifier, and Compose stack are built. The dashboard is mostly sample data with a live API status card; webhook routing and full UI-to-API wiring are the next milestone."
            />
            <div className="mt-7 grid max-w-md grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
              {[
                { label: "Next.js dashboard", state: "built" },
                { label: "Google OAuth via Better Auth", state: "built" },
                { label: "Go API + probe worker", state: "built" },
                { label: "PostgreSQL + Compose", state: "built" },
                { label: "Email alert pipeline", state: "built" },
                { label: "Dashboard/status API wiring", state: "next" },
                { label: "Webhook routing", state: "next" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-[0.75rem] text-muted-ink"
                >
                  {item.state === "built" ? (
                    <Check className="size-3 shrink-0 text-signal-deep" />
                  ) : item.state === "scaffold" ? (
                    <Database className="size-3 shrink-0 text-signal-deep" />
                  ) : (
                    <Circle className="size-3 shrink-0 text-muted-ink/35" />
                  )}
                  {item.label}
                  <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-muted-ink/55">
                    {item.state}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/settings#data"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 gap-1.5 rounded-lg border-line bg-card px-3 text-xs",
                )}
              >
                See the storage note <ArrowUpRight className="size-3" />
              </Link>
              <span className="font-mono text-[9px] text-muted-ink">
                5 services · worker included
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-[24px] border border-ink/20 bg-ink p-1.5 shadow-[0_24px_80px_-30px_oklch(0.2_0.02_120/0.4)]">
              <div className="overflow-hidden rounded-[17px] border border-paper/10 bg-[#111611]">
                <div className="flex h-9 items-center gap-2 border-b border-paper/10 px-3">
                  <span className="flex gap-1">
                    <span className="size-1.5 rounded-full bg-paper/20" />
                    <span className="size-1.5 rounded-full bg-paper/20" />
                    <span className="size-1.5 rounded-full bg-paper/20" />
                  </span>
                  <span className="ml-1 font-mono text-[9px] text-paper/45">
                    docker-compose.yml · local stack
                  </span>
                  <CopyButton
                    value={compose}
                    className="ml-auto border-paper/10"
                  />
                </div>
                <pre className="overflow-x-auto px-4 py-4 font-mono text-[10px] leading-[1.9] text-paper/60">
                  <code>
                    <span className="text-paper/30">services:</span>
                    {"\n  "}
                    <span className="text-signal">postgres:</span>
                    {"\n    "}
                    <span className="text-paper/30">image:</span>{" "}
                    postgres:17-alpine
                    {"\n    "}
                    <span className="text-paper/30">environment:</span>
                    {"\n      "}
                    <span className="text-violet">POSTGRES_DB:</span> vigil
                    {"\n  "}
                    <span className="text-signal">redis:</span>
                    {"\n    "}
                    <span className="text-paper/30">image:</span> redis:8-alpine
                    {"\n  "}
                    <span className="text-signal">api:</span>
                    {"\n    "}
                    <span className="text-paper/30">build:</span> ./backend
                    {"\n    "}
                    <span className="text-paper/30">ports:</span> [
                    <span className="text-signal">&quot;8080:8080&quot;</span>]
                    {"\n  "}
                    <span className="text-signal">worker:</span>
                    {"\n    "}
                    <span className="text-paper/30">build:</span> ./backend
                    {"\n    "}
                    <span className="text-paper/30">command:</span> vigil-worker
                    {"\n  "}
                    <span className="text-signal">web:</span>
                    {"\n    "}
                    <span className="text-paper/30">build:</span> ./web
                    {"\n    "}
                    <span className="text-paper/30">ports:</span> [
                    <span className="text-signal">&quot;3000:3000&quot;</span>]
                  </code>
                </pre>
                <div className="flex items-center justify-between border-t border-paper/10 px-4 py-2.5">
                  <span className="font-mono text-[8px] text-paper/35">
                    compose local stack · 5 services
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[8px] text-paper/35">
                    <span className="size-1.5 rounded-full bg-paper/30" />{" "}
                    dashboard · sample + live API
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    question: "Is Vigil actually self-hosted?",
    answer:
      "The intended deployment is a Go API, probe worker, alert notifier, PostgreSQL, Redis, and the Next.js app, all running on infrastructure you control. This submission includes the dashboard, Better Auth, the Go API, a standalone scheduled probe worker, a Brevo email notifier backed by an Asynq queue, PostgreSQL migrations, and Docker Compose. The dashboard is mostly sample data with a live API status card; email delivery is implemented behind ALERT_EMAIL_ENABLED, while webhook routing and full UI-to-API wiring are the next implementation phase.",
  },
  {
    question: "What can Vigil monitor?",
    answer:
      "Any HTTP or HTTPS endpoint. You choose the method, expected status, check interval, timeout, and region. The schema records DNS, TCP, TLS, TTFB, status code, latency, and error text separately.",
  },
  {
    question: "How is this different from UptimeRobot or Better Stack?",
    answer:
      "Vigil is not priced per monitor and does not hide your metrics in a proprietary store. The data model is built around Postgres rows, the API exposes windowed SQL rollups, and the status page ships with the app. You trade a little setup for ownership.",
  },
  {
    question: "What is real in this preview?",
    answer:
      "The interface, charts, filters, forms, Better Auth/Google wiring, Go API, standalone probe worker, Brevo email notifier, PostgreSQL schema, and Compose stack are real. The API persists monitors and exposes windowed rollups; the worker writes real checks and incidents to PostgreSQL, and the notifier sends deduplicated email when enabled. The dashboard's live API status card reads real counts; its monitors, checks, incidents, and benchmark labels remain deterministic sample data until full UI-to-API wiring lands. Buttons that would change production state say so and do not pretend to persist.",
  },
  {
    question: "Which sign-in methods are supported?",
    answer:
      "Google only, through Better Auth. There is no email/password fallback by design. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local, set the callback URL, and set AUTH_REQUIRED=true to protect the dashboard.",
  },
  {
    question: "Can I query the data myself?",
    answer:
      "That is the point. The storage uses time-partitioned Postgres tables, and the API exposes windowed p50, p95, and uptime rollups as plain SQL. The dashboard is only partially wired (live API status card); once full wiring lands, you can connect Psql, Metabase, or Grafana to the same database without asking permission.",
  },
  {
    question: "Does it support alerts?",
    answer:
      "The worker creates and resolves incidents in PostgreSQL and, when enabled, queues deduplicated Brevo email alerts through Asynq. Webhook routing is designed but not connected, and the incident shown in the dashboard is still sample data, not a live alert.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-line bg-secondary/20 py-20 sm:py-24"
    >
      <div className="container-page grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <Reveal>
          <div className="lg:sticky lg:top-24">
            <SectionHeading
              eyebrow="FAQ"
              title={
                <>
                  Questions,
                  <br />
                  answered
                  <span className="serif-accent text-signal-deep">.</span>
                </>
              }
              description="The short version: self-hosted, queryable, and honest about what is still being built."
            />
            <div className="mt-7 rounded-xl border border-line bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-md bg-signal/30 text-signal-ink">
                  <Mail className="size-3" />
                </span>
                <span className="text-[0.76rem] font-medium">
                  Still curious?
                </span>
              </div>
              <p className="mt-2 text-[0.7rem] leading-5 text-muted-ink">
                The project report has the schema, API contract, benchmark
                methodology, and build plan.
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
              >
                Explore the dashboard <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <Accordion className="w-full rounded-2xl border border-line bg-card px-5">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`item-${index}`}
                className="border-line"
              >
                <AccordionTrigger className="py-4 text-[0.84rem] font-medium leading-6 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-[0.78rem] leading-6 text-muted-ink">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-3 py-12 sm:px-5 sm:py-16">
      <div className="relative mx-auto max-w-[1360px] overflow-hidden rounded-[28px] bg-signal px-6 py-14 text-signal-ink sm:px-10 sm:py-16 lg:px-16">
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(to_right,var(--signal-ink)_1px,transparent_1px),linear-gradient(to_bottom,var(--signal-ink)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute -right-36 -top-40 size-[520px] rounded-full border border-signal-ink/10" />
        <div className="pointer-events-none absolute -right-20 -top-24 size-[360px] rounded-full border border-signal-ink/10" />
        <div className="pointer-events-none absolute -bottom-52 -left-24 size-[420px] rounded-full border border-signal-ink/10" />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mono-label mb-5 flex items-center gap-2 text-signal-ink/55">
              <span className="size-1.5 rounded-full bg-signal-ink" />
              Know before they notice
            </div>
            <h2 className="display max-w-3xl text-[clamp(2.7rem,7vw,5.8rem)]">
              Stop guessing.
              <br />
              Start <span className="serif-accent">watching.</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-signal-ink/65">
              Open the sample workspace, click through a real monitor, and see
              what an honest status page feels like. No signup required for the
              demo.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-stretch">
            <Link
              href="/dashboard"
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-signal-ink px-5 text-[0.82rem] font-medium text-signal transition-transform hover:-translate-y-px"
            >
              Open the sample dashboard{" "}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/status/acme-api-live"
              target="_blank"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-signal-ink/20 bg-signal-ink/[0.04] px-5 text-[0.82rem] font-medium text-signal-ink transition-colors hover:bg-signal-ink/[0.08]"
            >
              View status page <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="relative mt-12 flex flex-col justify-between gap-3 border-t border-signal-ink/15 pt-5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[8px] uppercase tracking-[0.12em] text-signal-ink/55">
            <span className="flex items-center gap-1.5">
              <Check className="size-3" /> Better Auth + Google
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3" /> Next.js preview
            </span>
            <span className="flex items-center gap-1.5">
              <Circle className="size-3" /> Go API + worker
            </span>
          </div>
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-signal-ink/40">
            v0.2 · 7th semester project
          </span>
        </div>
      </div>
    </section>
  );
}

const footerColumns = [
  {
    label: "Product",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/monitors", label: "Monitors" },
      { href: "/dashboard/incidents", label: "Incidents" },
      { href: "/status/acme-api-live", label: "Status page" },
    ],
  },
  {
    label: "Engineering",
    links: [
      { href: "/#product", label: "Product tour" },
      { href: "/#engineering", label: "Benchmarks" },
      { href: "/docs", label: "Documentation" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    label: "Access",
    links: [
      { href: "/login", label: "Operator sign in" },
      { href: "/dashboard/monitors/new", label: "Add a monitor" },
      { href: "/dashboard/settings", label: "Workspace settings" },
      { href: "/#self-host", label: "Self-hosting" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <BrandLink />
            <p className="mt-4 max-w-xs text-[0.78rem] leading-6 text-muted-ink">
              Self-hosted API performance and uptime monitoring. Know before
              they notice.
            </p>
            <p className="mt-2 max-w-xs text-[10px] leading-4 text-muted-ink/70">
              This submission is a frontend and auth preview with a Go API,
              standalone probe worker, and Brevo email notifier. The dashboard
              is mostly sample data with a live API status card; email delivery
              is built but disabled by default, and webhook routing plus full
              UI-to-API wiring are next.
            </p>
            <div className="mt-5 flex items-center gap-2 font-mono text-[9px] text-muted-ink">
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2 py-1">
                <span className="size-1.5 rounded-full bg-positive" /> api
                operational
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2 py-1">
                <Database className="size-2.5" /> demo data
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {footerColumns.map((column) => (
              <div key={column.label}>
                <div className="mono-label text-[9px] text-muted-ink">
                  {column.label}
                </div>
                <ul className="mt-3 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[0.76rem] text-ink/70 transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-ink">
            <span>© 2026 Vigil</span>
            <span className="text-line">·</span>
            <span>Built in Bengaluru</span>
            <span className="text-line">·</span>
            <span>Next.js preview · Go worker included</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-ink">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3" /> MIT
            </span>
            <span className="flex items-center gap-1.5">
              <Fingerprint className="size-3" /> no telemetry
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
