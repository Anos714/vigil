import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  Fingerprint,
  KeyRound,
  Route,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/landing-closing";
import { SiteHeader } from "@/components/marketing/site-header";
import { Reveal } from "@/components/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How to run the Vigil preview, what is built, and what is next.",
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "scope", label: "Demo scope" },
  { id: "routes", label: "Route map" },
  { id: "auth", label: "Authentication" },
  { id: "data", label: "Data & storage" },
  { id: "next", label: "Next build step" },
];

const routeRows = [
  ["/", "Marketing site", "Static"],
  ["/dashboard", "Operator overview", "Sample + live card"],
  ["/dashboard/monitors", "Endpoint inventory", "Sample data"],
  ["/dashboard/monitors/[id]", "Monitor detail", "Sample data"],
  ["/dashboard/incidents", "Incident log", "Sample data"],
  ["/dashboard/settings", "Workspace settings", "Local UI state"],
  ["/status/[key]", "Public status page", "Sample data"],
  ["/login", "Google OAuth + preview entry", "Better Auth"],
];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-ink px-4 py-3 font-mono text-[11px] leading-6 text-paper/70">
      <code>{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" />
          <div className="container-page relative py-16 sm:py-20">
            <Reveal>
              <div className="mono-label flex items-center gap-2 text-muted-ink">
                <span className="size-1.5 rounded-full bg-signal-deep" />
                Documentation · preview build
              </div>
              <h1 className="display mt-5 max-w-3xl text-[clamp(3rem,7vw,5.8rem)]">
                The honest
                <br />
                operator&apos;s{" "}
                <span className="serif-accent text-signal-deep">guide.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[0.98rem] leading-7 text-muted-ink">
                Run the preview, inspect the route map, and see exactly where
                the frontend ends and the Go probe worker begins.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "h-9 gap-1.5 rounded-lg bg-ink px-3.5 text-xs text-paper hover:bg-ink/85",
                  )}
                >
                  Open the sample dashboard
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href="/#engineering"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-9 gap-1.5 rounded-lg border-line bg-card px-3.5 text-xs",
                  )}
                >
                  Read the architecture
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="container-page grid gap-10 py-12 lg:grid-cols-[190px_1fr] lg:gap-16 lg:py-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mono-label text-[9px] text-muted-ink">
              On this page
            </div>
            <nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-[0.78rem] text-muted-ink transition-colors hover:bg-secondary/60 hover:text-ink"
                >
                  {section.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 rounded-xl border border-line bg-card p-3">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                <span className="size-1.5 rounded-full bg-warning" />
                preview only
              </div>
              <p className="mt-2 text-[10px] leading-4 text-muted-ink">
                The probe worker, check writer, incident lifecycle, rollup
                endpoint, worker/notifier health endpoints, and Brevo email
                pipeline are built. The dashboard is mostly sample data with a
                live API status card; webhook routing and full UI-to-API wiring
                are next.
              </p>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section
              id="overview"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <Terminal className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Overview</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-ink">
                Vigil is an API performance and uptime monitor designed to run
                on infrastructure you control. This submission includes a
                complete Next.js dashboard, a public status page, Google-only
                Better Auth wiring, a Go API, a standalone probe worker, an
                email alert notifier, and PostgreSQL/Redis Compose services. The
                worker schedules HTTP checks, writes checks/incidents to
                PostgreSQL, and queues deduplicated alerts; the API exposes
                windowed SQL rollups and persisted alert attempts. The worker
                and notifier serve health endpoints. The dashboard&apos;s live
                API status card reads real counts; every chart and table remains
                deterministic sample data.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  { icon: Check, label: "Frontend built" },
                  { icon: ShieldCheck, label: "Google auth wired" },
                  { icon: Server, label: "Probe worker built" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-[11px] text-muted-ink"
                  >
                    <item.icon className="size-3 text-signal-deep" />
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Code>
                  <span className="text-signal">pnpm</span> install{"\n"}
                  <span className="text-signal">pnpm</span> dev{"\n"}
                  <span className="text-paper/35">
                    # open http://localhost:3000
                  </span>
                </Code>
              </div>
            </section>

            <section
              id="scope"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <Fingerprint className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Demo scope</h2>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Marketing landing page", "Built"],
                  ["Dashboard overview + charts", "Built"],
                  ["Monitor detail + edit", "Built"],
                  ["Incident log + filters", "Built"],
                  ["Public status page", "Built"],
                  ["Better Auth + Google OAuth", "Wired"],
                  ["Go API + probe worker", "Built"],
                  ["PostgreSQL + Redis", "Compose"],
                  ["Scheduled checks + incidents", "Built"],
                  ["SQL uptime/latency rollups", "Built"],
                  ["Worker + notifier health", "Built"],
                  ["Live API status card", "Built"],
                  ["Brevo + Asynq email alerts", "Built"],
                  ["Webhook alert delivery", "Next"],
                  ["Full UI-to-API wiring", "Next"],
                ].map(([label, state]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2.5"
                  >
                    <span className="text-[11px] text-muted-ink">{label}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                        state === "Built" && "bg-positive/10 text-positive",
                        state === "Wired" && "bg-signal/30 text-signal-ink",
                        state === "Scaffold" && "bg-warning/10 text-warning",
                        state === "Compose" && "bg-signal/30 text-signal-ink",
                        state === "Next" && "bg-secondary text-muted-ink",
                      )}
                    >
                      {state}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="routes"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <Route className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Route map</h2>
              </div>
              <div className="mt-4 divide-y divide-line/80 overflow-hidden rounded-xl border border-line">
                {routeRows.map(([route, label, state]) => (
                  <div
                    key={route}
                    className="grid gap-1 bg-paper px-3.5 py-3 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:gap-4"
                  >
                    <code className="font-mono text-[10px] text-ink">
                      {route}
                    </code>
                    <span className="text-[11px] text-muted-ink">{label}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink/70">
                      {state}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="auth"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <KeyRound className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Authentication</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-ink">
                Better Auth is configured with Google as the only provider. The
                local SQLite file keeps sessions and OAuth accounts; there is no
                email/password form. The sample workspace remains reachable
                because{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
                  AUTH_REQUIRED=false
                </code>{" "}
                by default.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-paper p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <Server className="size-3.5 text-muted-ink" />
                    Local preview
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-muted-ink">
                    No Google keys required. The sample dashboard is public and
                    labelled as demo data.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-paper p-3.5">
                  <div className="flex items-center gap-2 text-[11px] font-medium">
                    <ShieldCheck className="size-3.5 text-muted-ink" />
                    Protected mode
                  </div>
                  <p className="mt-1.5 text-[10px] leading-4 text-muted-ink">
                    Add Google credentials and set{" "}
                    <code className="font-mono">AUTH_REQUIRED=true</code> to
                    gate <code className="font-mono">/dashboard</code>.
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <Code>
                  <span className="text-paper/35"># .env.local</span>
                  {"\n"}
                  <span className="text-violet">GOOGLE_CLIENT_ID</span>=
                  your-client-id{"\n"}
                  <span className="text-violet">GOOGLE_CLIENT_SECRET</span>=
                  your-client-secret{"\n"}
                  <span className="text-violet">AUTH_REQUIRED</span>=true
                </Code>
              </div>
            </section>

            <section
              id="data"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <Database className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Data & storage</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-ink">
                Every chart, uptime bar, monitor row, and incident in the
                dashboard is derived from one deterministic dataset in{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
                  src/lib/monitors.ts
                </code>
                . The fixed clock keeps server and client renders identical.
                Separately, the Go API persists monitors, exposes windowed
                rollups over the checks table, and lists alert delivery state.
                The worker writes real checks and incidents to PostgreSQL and
                queues deduplicated alerts; the notifier sends Brevo email and
                records attempts in{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
                  alert_deliveries
                </code>
                . The dashboard&apos;s live API status card calls the API for
                monitor and probe counts; the remaining views do not call these
                services yet.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[
                  ["Auth store", "SQLite", "local"],
                  ["Metrics schema", "Postgres", "built"],
                  ["Workers", "Go", "built"],
                ].map(([label, value, state]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-line bg-paper p-3.5"
                  >
                    <div className="mono-label text-[8px] text-muted-ink">
                      {label}
                    </div>
                    <div className="mt-1 text-[0.8rem] font-medium">
                      {value}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-ink/70">
                      {state}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="next"
              className="scroll-mt-24 rounded-2xl border border-line bg-card p-6 sm:p-7"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-signal/30 text-signal-ink">
                  <ArrowUpRight className="size-3.5" />
                </span>
                <h2 className="text-[1.05rem] font-medium">Next build step</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted-ink">
                The Go API, PostgreSQL migrations, Redis queue, probe worker,
                notifier, and Compose stack live in{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">
                  backend/
                </code>
                . The worker leases due monitors, measures HTTP latency, writes
                checks, opens/resolves incidents, and queues alerts. The
                notifier sends Brevo email through Asynq and records delivery
                state; the API exposes windowed SQL rollups and alert attempts.
                The next milestone is a real Brevo send, webhook routing, an
                alert-history UI, and full UI-to-API wiring.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Real Brevo send",
                  "Webhook routing",
                  "Alert history UI",
                  "Full UI-to-API wiring",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[9px] text-muted-ink"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link
                  href="/#self-host"
                  className="inline-flex items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline"
                >
                  Deployment note <ArrowUpRight className="size-3" />
                </Link>
                <span className="text-line">·</span>
                <Link
                  href="/dashboard/settings#data"
                  className="inline-flex items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline"
                >
                  Storage settings <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
