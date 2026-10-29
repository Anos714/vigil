import { ArrowRight, Check, CircleDot } from "lucide-react";
import Link from "next/link";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { Reveal } from "@/components/reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="grid-backdrop absolute inset-0 opacity-70" />
        <div className="signal-wash absolute inset-0" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-signal/20 blur-[110px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-paper to-transparent" />
      </div>

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10">
          <div className="max-w-[650px]">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 py-1 pl-1.5 pr-3 text-[10px] backdrop-blur-sm">
                <span className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-paper">
                  <span className="size-1 animate-pulse rounded-full bg-signal" />
                  v0.1
                </span>
                <span className="font-medium text-muted-ink">
                  Self-hosted observability
                </span>
                <span className="text-line">/</span>
                <span className="font-mono text-[9px] text-muted-ink">
                  Next.js preview
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="display mt-6 text-[clamp(3.6rem,8vw,6.8rem)]">
                Know before
                <br />
                they{" "}
                <span className="relative inline-block">
                  <span className="serif-accent text-signal-deep">notice.</span>
                  <svg
                    viewBox="0 0 260 18"
                    className="absolute -bottom-1 left-0 w-[95%] text-signal-deep"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 12.5C48 5.5 106 3.5 150 7.5c32 3 73 2.5 106-1.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                  </svg>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-7 max-w-[520px] text-[0.98rem] leading-7 text-muted-ink sm:text-[1.04rem]">
                An API monitor designed to probe every 30 seconds and keep every
                millisecond in PostgreSQL. The Go API and standalone probe
                worker are built; the dashboard is labelled sample data with a
                live API status card, and full UI wiring is next.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[0.82rem] font-medium text-paper transition-all hover:-translate-y-px hover:bg-ink/90 hover:shadow-[0_8px_28px_-12px_oklch(0.2_0.02_120/0.55)]"
                >
                  Open the sample workspace
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-card/75 px-4 text-[0.82rem] font-medium text-ink backdrop-blur-sm transition-colors hover:border-ink/20 hover:bg-card"
                >
                  See how it works
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3 text-signal-deep" />
                  No signup for the sample workspace
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3 text-signal-deep" />
                  Google-only auth
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-8 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-ink">
                <span className="size-1.5 rounded-full bg-signal-deep" />
                Sample data snapshot
              </div>
              <div className="mt-2 grid max-w-[510px] grid-cols-3 divide-x divide-line border-y border-line/80 py-4">
                {[
                  ["99.94%", "24h uptime"],
                  ["82ms", "p50 response"],
                  ["18.4k", "checks today"],
                ].map(([value, label], index) => (
                  <div key={label} className={index === 0 ? "pr-4" : "px-4"}>
                    <div className="text-[1.25rem] font-medium leading-none tracking-[-0.04em] tabular">
                      {value}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-ink">
                      <CircleDot className="size-2" />
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.12} y={28} className="relative">
            <HeroPreview />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const protocols = [
  "HTTP/2",
  "REST",
  "GraphQL",
  "gRPC",
  "WebSocket",
  "TLS 1.3",
  "DNS",
  "JSON",
  "GET /health",
  "POST /webhooks",
  "200 OK",
  "p95",
];

const marqueeProtocols = [...protocols, ...protocols].map(
  (protocol, index) => ({
    id: `protocol-${index}-${protocol}`,
    label: protocol,
  }),
);

export function ProtocolStrip() {
  return (
    <section className="relative border-y border-line bg-card/55 py-3.5">
      <div className="container-page flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="mono-label shrink-0 text-muted-ink">
          Works with any HTTP endpoint
        </div>
        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
          <div className="flex w-max animate-marquee items-center gap-2">
            {marqueeProtocols.map((protocol) => (
              <span
                key={protocol.id}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[9px] text-muted-ink"
              >
                <span className="size-1 rounded-full bg-signal-deep/60" />
                {protocol.label}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/dashboard/monitors/new"
          className="hidden shrink-0 text-[10px] font-medium text-muted-ink hover:text-ink lg:block"
        >
          Add an endpoint ↗
        </Link>
      </div>
    </section>
  );
}
