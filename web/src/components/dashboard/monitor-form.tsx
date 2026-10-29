"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  Globe2,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";
import type { Monitor } from "@/lib/monitors";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().trim().min(2, "Give the monitor a name."),
  url: z.string().trim().url("Enter a valid https:// URL."),
  expectedStatus: z.coerce.number().int().min(100).max(599),
  threshold: z.coerce.number().int().min(50).max(30000),
  timeout: z.coerce.number().int().min(1).max(60),
  retries: z.coerce.number().int().min(0).max(5),
});

const intervals = [
  { value: "30", label: "30s" },
  { value: "60", label: "1m" },
  { value: "300", label: "5m" },
  { value: "600", label: "10m" },
];

const regions = ["ap-south-1", "ap-southeast-1", "eu-central-1", "us-east-1"];

export function MonitorForm({ monitor }: { monitor?: Monitor }) {
  const router = useRouter();
  const editing = Boolean(monitor);

  const [name, setName] = useState(monitor?.name ?? "");
  const [url, setUrl] = useState(monitor?.url ?? "");
  const [interval, setIntervalValue] = useState(
    String(monitor?.interval ?? 30),
  );
  const [region, setRegion] = useState(monitor?.region ?? "ap-south-1");
  const [expectedStatus, setExpectedStatus] = useState(
    String(monitor?.statusCode ?? 200),
  );
  const [threshold, setThreshold] = useState("1000");
  const [timeout, setTimeoutValue] = useState("10");
  const [retries, setRetries] = useState("2");
  const [isPublic, setIsPublic] = useState(monitor?.isPublic ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({
      name,
      url,
      expectedStatus,
      threshold,
      timeout,
      retries,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Check the highlighted fields.");
      return;
    }

    setErrors({});
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success(editing ? "Monitor updated" : "Monitor created", {
        description: editing
          ? `${parsed.data.name} was updated in the preview. Changes are not persisted yet.`
          : `${parsed.data.name} was added to the preview. The Go API can persist monitors and the worker can schedule checks, but this form is not wired yet.`,
      });
      router.push(
        editing && monitor
          ? `/dashboard/monitors/${monitor.id}`
          : "/dashboard/monitors",
      );
    }, 550);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Link
        href={
          editing && monitor
            ? `/dashboard/monitors/${monitor.id}`
            : "/dashboard/monitors"
        }
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-ink transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3" />{" "}
        {editing ? "Back to monitor" : "All monitors"}
      </Link>

      <PageHeader
        eyebrow={editing ? "Edit endpoint" : "New endpoint"}
        title={
          <>
            {editing ? "Tune this check" : "Add a monitor"}
            <span className="serif-accent text-signal-deep">.</span>
          </>
        }
        description="Point Vigil at any HTTP endpoint. This preview validates the form and shows a toast; it does not persist changes yet."
      />

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <section className="rounded-2xl border border-line bg-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Endpoint</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                What should Vigil request, and from where?
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[11px] font-medium">
                    Monitor name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme API"
                    aria-invalid={Boolean(errors.name)}
                    className="h-9 rounded-lg border-line bg-paper text-sm"
                  />
                  {errors.name && (
                    <p className="text-[10px] text-critical">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="expectedStatus"
                    className="text-[11px] font-medium"
                  >
                    Expected status
                  </Label>
                  <Input
                    id="expectedStatus"
                    inputMode="numeric"
                    value={expectedStatus}
                    onChange={(event) => setExpectedStatus(event.target.value)}
                    placeholder="200"
                    aria-invalid={Boolean(errors.expectedStatus)}
                    className="h-9 rounded-lg border-line bg-paper font-mono text-sm"
                  />
                  {errors.expectedStatus && (
                    <p className="text-[10px] text-critical">
                      {errors.expectedStatus}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="url" className="text-[11px] font-medium">
                  Health check URL
                </Label>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
                  <Input
                    id="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://api.acme.dev/v1/health"
                    aria-invalid={Boolean(errors.url)}
                    className="h-9 rounded-lg border-line bg-paper pl-9 font-mono text-xs"
                  />
                </div>
                {errors.url && (
                  <p className="text-[10px] text-critical">{errors.url}</p>
                )}
                <p className="text-[10px] leading-4 text-muted-ink">
                  Use an endpoint that returns 2xx quickly. Auth headers and
                  body assertions are next.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-medium">Probe region</Label>
                <div className="flex flex-wrap gap-2">
                  {regions.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setRegion(entry)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] transition-colors",
                        region === entry
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper text-muted-ink hover:border-ink/20 hover:text-ink",
                      )}
                    >
                      <MapPin className="size-3" />
                      {entry}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Behavior</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                Cadence, timeout, and retry posture.
              </p>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-medium">
                  Check interval
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {intervals.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => setIntervalValue(entry.value)}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition-colors",
                        interval === entry.value
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-paper text-muted-ink hover:border-ink/20 hover:text-ink",
                      )}
                    >
                      <Clock3 className="size-3" />
                      {entry.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="threshold"
                    className="text-[11px] font-medium"
                  >
                    Latency alert (ms)
                  </Label>
                  <Input
                    id="threshold"
                    inputMode="numeric"
                    value={threshold}
                    onChange={(event) => setThreshold(event.target.value)}
                    className="h-9 rounded-lg border-line bg-paper font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeout" className="text-[11px] font-medium">
                    Timeout (s)
                  </Label>
                  <Input
                    id="timeout"
                    inputMode="numeric"
                    value={timeout}
                    onChange={(event) => setTimeoutValue(event.target.value)}
                    className="h-9 rounded-lg border-line bg-paper font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="retries" className="text-[11px] font-medium">
                    Retries
                  </Label>
                  <Input
                    id="retries"
                    inputMode="numeric"
                    value={retries}
                    onChange={(event) => setRetries(event.target.value)}
                    className="h-9 rounded-lg border-line bg-paper font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-3 xl:col-span-4">
          <section className="rounded-2xl border border-line bg-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.92rem] font-medium">Preview</h2>
              <p className="mt-1 text-[0.72rem] text-muted-ink">
                How the endpoint will appear.
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5">
                <StatusDot status={monitor?.status ?? "up"} pulse />
                <span className="truncate text-sm font-medium">
                  {name || "Untitled monitor"}
                </span>
                <span className="ml-auto rounded-full border border-line px-2 py-0.5 font-mono text-[9px] text-muted-ink">
                  {interval}s
                </span>
              </div>
              <p className="mt-1.5 truncate font-mono text-[10px] text-muted-ink">
                {url || "https://your-api.dev/health"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-paper p-2.5">
                  <div className="mono-label text-[8px] text-muted-ink">
                    Region
                  </div>
                  <div className="mt-1 font-mono text-[10px]">{region}</div>
                </div>
                <div className="rounded-lg bg-paper p-2.5">
                  <div className="mono-label text-[8px] text-muted-ink">
                    Expected
                  </div>
                  <div className="mt-1 font-mono text-[10px]">
                    HTTP {expectedStatus}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-line px-5 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.78rem] font-medium">
                    Show on status page
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-muted-ink">
                    Publicly visible endpoint.
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-dashed border-line bg-card/60 p-5">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-signal/30 text-signal-ink">
                <Sparkles className="size-3.5" />
              </span>
              <div>
                <p className="text-[0.78rem] font-medium">Preview behavior</p>
                <p className="mt-1 text-[0.7rem] leading-5 text-muted-ink">
                  This preview form validates input and shows a toast. It does
                  not call the API or persist the monitor. The Go API supports
                  persistence and the worker supports scheduling separately.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 w-full gap-1.5 rounded-lg bg-ink text-xs text-paper hover:bg-ink/85"
            >
              <Check className="size-3.5" />
              {saving ? "Saving…" : editing ? "Save changes" : "Create monitor"}
            </Button>
            <Link
              href={
                editing && monitor
                  ? `/dashboard/monitors/${monitor.id}`
                  : "/dashboard/monitors"
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9 w-full rounded-lg border-line bg-card text-xs",
              )}
            >
              Cancel
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink/70">
            <ShieldCheck className="size-3" />
            preview form · not wired
          </div>
        </div>
      </div>
    </form>
  );
}
