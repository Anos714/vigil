import {
  ArrowUpRight,
  Bell,
  Database,
  Globe2,
  KeyRound,
  LockKeyhole,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { SaveButton } from "@/components/dashboard/save-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusDot } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";

export const metadata: Metadata = {
  title: "Settings",
};

const nav = [
  { href: "#workspace", label: "Workspace", icon: Server },
  { href: "#auth", label: "Authentication", icon: KeyRound },
  { href: "#notifications", label: "Notifications", icon: Bell },
  { href: "#status-page", label: "Status page", icon: Globe2 },
  { href: "#data", label: "Data & storage", icon: Database },
];

export default function SettingsPage() {
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace configuration"
        title={
          <>
            Settings<span className="serif-accent text-signal-deep">.</span>
          </>
        }
        description="Workspace identity, sign-in, alert routing, and the public status page."
        actions={
          <Link
            href="/#engineering"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-ink hover:text-ink"
          >
            Configuration docs <ArrowUpRight className="size-3" />
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[190px_1fr]">
        <nav className="h-fit rounded-2xl border border-line bg-card p-2 lg:sticky lg:top-24">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.76rem] text-muted-ink transition-colors hover:bg-secondary/60 hover:text-ink"
            >
              <item.icon className="size-3.5" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 space-y-3">
          <section
            id="workspace"
            className="scroll-mt-24 rounded-2xl border border-line bg-card"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Workspace</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                The name and timezone shown across Vigil.
              </p>
            </div>
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="workspace-name" className="text-[11px]">
                  Workspace name
                </Label>
                <Input
                  id="workspace-name"
                  defaultValue="Acme workspace"
                  className="h-9 rounded-lg border-line bg-paper text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-slug" className="text-[11px]">
                  Slug
                </Label>
                <Input
                  id="workspace-slug"
                  defaultValue="acme"
                  className="h-9 rounded-lg border-line bg-paper font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-timezone" className="text-[11px]">
                  Timezone
                </Label>
                <select
                  id="workspace-timezone"
                  defaultValue="Asia/Kolkata"
                  className="h-9 w-full rounded-lg border border-line bg-paper px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="America/New_York">
                    America/New_York (ET)
                  </option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="workspace-region" className="text-[11px]">
                  Default probe region
                </Label>
                <select
                  id="workspace-region"
                  defaultValue="ap-south-1"
                  className="h-9 w-full rounded-lg border border-line bg-paper px-2.5 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="ap-south-1">ap-south-1 · Mumbai</option>
                  <option value="ap-southeast-1">
                    ap-southeast-1 · Singapore
                  </option>
                  <option value="eu-central-1">eu-central-1 · Frankfurt</option>
                  <option value="us-east-1">us-east-1 · Virginia</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end border-t border-line px-5 py-3">
              <SaveButton message="Workspace saved in the preview." />
            </div>
          </section>

          <section
            id="auth"
            className="scroll-mt-24 rounded-2xl border border-line bg-card"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[0.92rem] font-medium">Authentication</h2>
                <p className="mt-1 text-[0.72rem] text-muted-ink">
                  Better Auth with Google as the only identity provider.
                </p>
              </div>
              <span
                className={
                  googleConfigured
                    ? "flex items-center gap-1.5 rounded-full bg-positive/8 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-positive"
                    : "flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-warning"
                }
              >
                <StatusDot status={googleConfigured ? "up" : "degraded"} />
                {googleConfigured ? "configured" : "keys needed"}
              </span>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-card ring-1 ring-line">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A11.99 11.99 0 0 0 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.09Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
                    />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.8rem] font-medium">Google OAuth</div>
                  <div className="mt-0.5 font-mono text-[9px] text-muted-ink">
                    better-auth 1.7.12 · callback /api/auth/callback/google
                  </div>
                </div>
                <span className="rounded-full border border-line bg-card px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink">
                  only
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-paper/60 px-3 py-2.5">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-muted-ink" />
                <p className="text-[0.7rem] leading-5 text-muted-ink">
                  Add{" "}
                  <code className="font-mono text-[10px] text-ink">
                    GOOGLE_CLIENT_ID
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[10px] text-ink">
                    GOOGLE_CLIENT_SECRET
                  </code>{" "}
                  to{" "}
                  <code className="font-mono text-[10px] text-ink">
                    .env.local
                  </code>
                  . Set{" "}
                  <code className="font-mono text-[10px] text-ink">
                    AUTH_REQUIRED=true
                  </code>{" "}
                  to protect the dashboard.
                </p>
              </div>
            </div>
          </section>

          <section
            id="notifications"
            className="scroll-mt-24 rounded-2xl border border-line bg-card"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Notifications</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Where an incident should land when it opens.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              {[
                ["Email alerts", "rahul@acme.dev", true],
                ["Webhook", "https://hooks.acme.dev/vigil", true],
                ["Incident digest", "Daily at 09:00 IST", false],
              ].map(([label, detail, enabled]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-[0.8rem] font-medium">{label}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-muted-ink">
                      {detail}
                    </div>
                  </div>
                  <Switch
                    defaultChecked={Boolean(enabled)}
                    aria-label={`Toggle ${label}`}
                  />
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-end px-5 py-3">
              <SaveButton message="Alert routing saved in the preview." />
            </div>
          </section>

          <section
            id="status-page"
            className="scroll-mt-24 rounded-2xl border border-line bg-card"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Public status page</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                A quiet, honest page for your customers.
              </p>
            </div>
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="status-title" className="text-[11px]">
                  Page title
                </Label>
                <Input
                  id="status-title"
                  defaultValue="Acme status"
                  className="h-9 rounded-lg border-line bg-paper text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status-domain" className="text-[11px]">
                  Custom domain
                </Label>
                <Input
                  id="status-domain"
                  defaultValue="status.acme.dev"
                  className="h-9 rounded-lg border-line bg-paper font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 font-mono text-[9px] text-muted-ink">
                <ShieldCheck className="size-3 text-positive" />
                TLS managed by your reverse proxy
              </div>
              <Link
                href="/status/acme-api-live"
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
              >
                Preview status page <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </section>

          <section
            id="data"
            className="scroll-mt-24 rounded-2xl border border-line bg-card"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Data & storage</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                This dashboard preview is a static frontend with a local auth
                store. The Go API and worker run separately and are not
                connected to this screen.
              </p>
            </div>
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
              <div className="rounded-xl bg-paper p-3">
                <div className="mono-label text-[8px] text-muted-ink">
                  Auth store
                </div>
                <div className="mt-1.5 font-mono text-[10px]">
                  SQLite · .data/vigil-auth.db
                </div>
              </div>
              <div className="rounded-xl bg-paper p-3">
                <div className="mono-label text-[8px] text-muted-ink">
                  Metrics store
                </div>
                <div className="mt-1.5 font-mono text-[10px]">
                  PostgreSQL · not connected
                </div>
              </div>
              <div className="rounded-xl bg-paper p-3">
                <div className="mono-label text-[8px] text-muted-ink">
                  Probe worker
                </div>
                <div className="mt-1.5 font-mono text-[10px]">
                  Go · built, not wired
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center">
              <span className="text-[10px] text-muted-ink">
                Delete workspace and all sample data
              </span>
              <button
                type="button"
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-critical/20 bg-critical/5 px-2.5 text-[10px] font-medium text-critical hover:bg-critical/10"
              >
                <Trash2 className="size-3" />
                Delete workspace
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
