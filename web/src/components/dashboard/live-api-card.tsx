"use client";

import { Activity, CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProbeSummary = {
  checksLastHour: number;
  checksTotal: number;
  openIncidents: number;
  lastCheckAt?: string;
};

type LiveState =
  | { status: "loading" }
  | { status: "connected"; summary: ProbeSummary; monitors: number }
  | { status: "offline"; detail: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function LiveApiCard() {
  const [state, setState] = useState<LiveState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const [probesResponse, monitorsResponse] = await Promise.all([
          fetch(`${API_URL}/api/v1/probes`, { cache: "no-store" }),
          fetch(`${API_URL}/api/v1/monitors`, { cache: "no-store" }),
        ]);
        if (!probesResponse.ok || !monitorsResponse.ok) {
          throw new Error(
            `API returned ${probesResponse.status}/${monitorsResponse.status}`,
          );
        }

        const probes = (await probesResponse.json()) as {
          summary: ProbeSummary;
        };
        const monitors = (await monitorsResponse.json()) as { count: number };
        if (!cancelled) {
          setState({
            status: "connected",
            summary: probes.summary,
            monitors: monitors.count,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "offline",
            detail: error instanceof Error ? error.message : "API unreachable",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const connected = state.status === "connected";
  const offline = state.status === "offline";

  return (
    <section
      aria-label="Live API status"
      className="rounded-2xl border border-line bg-card px-4 py-3.5 sm:px-5"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              connected
                ? "bg-positive/10 text-positive"
                : offline
                  ? "bg-warning/10 text-warning"
                  : "bg-secondary text-muted-ink",
            )}
          >
            {offline ? (
              <CircleAlert className="size-4" />
            ) : connected ? (
              <CircleCheck className="size-4" />
            ) : (
              <Activity className="size-4" />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.8rem] font-medium">Live API</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em]",
                  connected
                    ? "bg-positive/10 text-positive"
                    : offline
                      ? "bg-warning/10 text-warning"
                      : "bg-secondary text-muted-ink",
                )}
              >
                {connected ? "connected" : offline ? "offline" : "checking"}
              </span>
            </div>
            <p className="mt-0.5 max-w-xl text-[0.72rem] leading-5 text-muted-ink">
              {state.status === "connected"
                ? "Real worker data from the Go API. The charts and tables below are still labelled sample data."
                : state.status === "offline"
                  ? `API unavailable (${state.detail}). The sample workspace is unaffected.`
                  : "Checking the Go API and PostgreSQL worker..."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {state.status === "connected" && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              <LiveStat label="Monitors" value={formatNumber(state.monitors)} />
              <LiveStat
                label="Checks · 1h"
                value={formatNumber(state.summary.checksLastHour)}
              />
              <LiveStat
                label="Checks total"
                value={formatNumber(state.summary.checksTotal)}
              />
              <LiveStat
                label="Open incidents"
                value={formatNumber(state.summary.openIncidents)}
                critical={state.summary.openIncidents > 0}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {state.status === "connected" && state.summary.lastCheckAt && (
              <span className="hidden font-mono text-[9px] text-muted-ink xl:block">
                last {formatDateTime(state.summary.lastCheckAt)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="inline-flex size-7 items-center justify-center rounded-lg border border-line bg-paper text-muted-ink transition-colors hover:text-ink"
              aria-label="Refresh live API status"
            >
              <RefreshCw
                className={cn(
                  "size-3",
                  state.status === "loading" && "animate-spin",
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveStat({
  label,
  value,
  critical = false,
}: {
  label: string;
  value: string;
  critical?: boolean;
}) {
  return (
    <div>
      <div className="mono-label text-[8px] text-muted-ink">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-[0.82rem] tabular",
          critical && "text-critical",
        )}
      >
        {value}
      </div>
    </div>
  );
}
