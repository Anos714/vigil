import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";

export type MonitorStatus = "up" | "degraded" | "down" | "paused";

export type Monitor = {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  interval: number;
  uptime24h: number;
  uptime90d: number;
  avgLatency: number;
  p95Latency: number;
  lastCheckedAt: string;
  publicKey: string;
  isPublic: boolean;
  sparkline: number[];
  uptimeBars: { date: string; uptime: number; checks: number }[];
  latencyBreakdown: {
    dns: number;
    connect: number;
    tls: number;
    ttfb: number;
  };
  statusCode: number;
  region: string;
  description: string;
};

export type Incident = {
  id: string;
  monitorId: string;
  monitorName: string;
  startedAt: string;
  resolvedAt: string | null;
  cause: string;
  statusCode: number;
  severity: "minor" | "major" | "critical";
};

export type LatencyPoint = {
  iso: string;
  time: string;
  p50: number;
  p95: number;
  checks: number;
  failures: number;
};

export type CheckRow = {
  id: string;
  checkedAt: string;
  statusCode: number;
  latency: number;
  region: string;
  error: string | null;
};

export const NOW = new Date("2026-10-23T18:30:00.000Z");

export const latencyChartConfig = {
  p50: {
    label: "p50",
    colors: { light: ["#2f5d2a"], dark: ["#d6ff7a"] },
  },
  p95: {
    label: "p95",
    colors: { light: ["#8b7cf6"], dark: ["#b8a9ff"] },
  },
} satisfies ChartConfig;

export const checksChartConfig = {
  checks: {
    label: "Checks",
    colors: { light: ["#2f5d2a"], dark: ["#d6ff7a"] },
  },
} satisfies ChartConfig;

export const failuresChartConfig = {
  failures: {
    label: "Failures",
    colors: { light: ["#d64545"], dark: ["#ff8a8a"] },
  },
} satisfies ChartConfig;

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function makeUptimeBars(seed: number, dips: number[] = []) {
  const rand = seeded(seed);
  return Array.from({ length: 90 }, (_, i) => {
    const date = new Date(NOW);
    date.setUTCDate(date.getUTCDate() - (89 - i));
    const dipped = dips.includes(i);
    const uptime = dipped ? 96.4 + rand() * 2.6 : 99.84 + rand() * 0.16;
    return {
      date: date.toISOString().slice(0, 10),
      uptime: Number(Math.min(100, uptime).toFixed(2)),
      checks: 288 + Math.floor(rand() * 18),
    };
  });
}

function makeSparkline(seed: number, base: number) {
  const rand = seeded(seed);
  return Array.from({ length: 26 }, (_, i) =>
    Math.round(
      base * (0.78 + rand() * 0.42) + Math.sin(i / 2.4) * (base * 0.1),
    ),
  );
}

const monitorSeed = [
  {
    id: "api-acme",
    name: "Acme API",
    url: "https://api.acme.dev/v1/health",
    status: "up" as const,
    interval: 30,
    uptime24h: 99.98,
    uptime90d: 99.96,
    avgLatency: 82,
    p95Latency: 146,
    publicKey: "acme-api-live",
    isPublic: true,
    statusCode: 200,
    region: "ap-south-1",
    description: "Core REST API and authentication gateway",
    latencyBreakdown: { dns: 6, connect: 14, tls: 31, ttfb: 27 },
    dips: [] as number[],
  },
  {
    id: "checkout",
    name: "Checkout",
    url: "https://checkout.acme.dev/health",
    status: "degraded" as const,
    interval: 30,
    uptime24h: 99.72,
    uptime90d: 99.84,
    avgLatency: 684,
    p95Latency: 1420,
    publicKey: "checkout-live",
    isPublic: true,
    statusCode: 200,
    region: "ap-south-1",
    description: "Payments and order completion flow",
    latencyBreakdown: { dns: 8, connect: 26, tls: 54, ttfb: 590 },
    dips: [62, 63, 78],
  },
  {
    id: "auth",
    name: "Auth service",
    url: "https://auth.acme.dev/.well-known/health",
    status: "up" as const,
    interval: 60,
    uptime24h: 100,
    uptime90d: 99.99,
    avgLatency: 48,
    p95Latency: 91,
    publicKey: "auth-live",
    isPublic: true,
    statusCode: 200,
    region: "ap-south-1",
    description: "OAuth, sessions and token exchange",
    latencyBreakdown: { dns: 4, connect: 9, tls: 19, ttfb: 14 },
    dips: [],
  },
  {
    id: "cdn",
    name: "Static CDN",
    url: "https://cdn.acme.dev/ping.json",
    status: "up" as const,
    interval: 120,
    uptime24h: 99.99,
    uptime90d: 99.98,
    avgLatency: 21,
    p95Latency: 44,
    publicKey: "cdn-live",
    isPublic: true,
    statusCode: 200,
    region: "global",
    description: "Edge assets, images and downloads",
    latencyBreakdown: { dns: 2, connect: 4, tls: 8, ttfb: 6 },
    dips: [],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    url: "https://hooks.acme.dev/health",
    status: "down" as const,
    interval: 30,
    uptime24h: 97.42,
    uptime90d: 99.21,
    avgLatency: 1204,
    p95Latency: 2980,
    publicKey: "webhooks-live",
    isPublic: true,
    statusCode: 503,
    region: "ap-south-1",
    description: "Outbound event delivery and retries",
    latencyBreakdown: { dns: 11, connect: 42, tls: 68, ttfb: 1060 },
    dips: [88, 89],
  },
  {
    id: "docs",
    name: "Developer docs",
    url: "https://docs.acme.dev/health",
    status: "paused" as const,
    interval: 300,
    uptime24h: 100,
    uptime90d: 100,
    avgLatency: 64,
    p95Latency: 102,
    publicKey: "docs-live",
    isPublic: false,
    statusCode: 200,
    region: "global",
    description: "Documentation and API reference",
    latencyBreakdown: { dns: 5, connect: 12, tls: 22, ttfb: 18 },
    dips: [],
  },
];

export const monitors: Monitor[] = monitorSeed.map((monitor, index) => {
  const lastChecked = new Date(NOW);
  lastChecked.setUTCSeconds(
    lastChecked.getUTCSeconds() -
      (monitor.status === "paused" ? 1820 : 8 + index * 3),
  );

  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    status: monitor.status,
    interval: monitor.interval,
    uptime24h: monitor.uptime24h,
    uptime90d: monitor.uptime90d,
    avgLatency: monitor.avgLatency,
    p95Latency: monitor.p95Latency,
    lastCheckedAt: lastChecked.toISOString(),
    publicKey: monitor.publicKey,
    isPublic: monitor.isPublic,
    sparkline: makeSparkline(120 + index * 17, monitor.avgLatency),
    uptimeBars: makeUptimeBars(300 + index * 31, monitor.dips),
    latencyBreakdown: monitor.latencyBreakdown,
    statusCode: monitor.statusCode,
    region: monitor.region,
    description: monitor.description,
  };
});

export const incidents: Incident[] = [
  {
    id: "inc-01",
    monitorId: "webhooks",
    monitorName: "Webhooks",
    startedAt: "2026-10-23T16:12:00.000Z",
    resolvedAt: null,
    cause: "Upstream returned 503 for 2 consecutive checks",
    statusCode: 503,
    severity: "critical",
  },
  {
    id: "inc-02",
    monitorId: "checkout",
    monitorName: "Checkout",
    startedAt: "2026-10-23T14:05:00.000Z",
    resolvedAt: "2026-10-23T14:19:00.000Z",
    cause: "TTFB crossed the 1,000 ms latency threshold",
    statusCode: 200,
    severity: "major",
  },
  {
    id: "inc-03",
    monitorId: "checkout",
    monitorName: "Checkout",
    startedAt: "2026-10-21T09:41:00.000Z",
    resolvedAt: "2026-10-21T10:04:00.000Z",
    cause: "Connection timeout after 10s",
    statusCode: 0,
    severity: "major",
  },
  {
    id: "inc-04",
    monitorId: "api-acme",
    monitorName: "Acme API",
    startedAt: "2026-10-18T21:02:00.000Z",
    resolvedAt: "2026-10-18T21:09:00.000Z",
    cause: "TLS handshake error during certificate rotation",
    statusCode: 0,
    severity: "minor",
  },
];

export function getMonitor(id: string) {
  return monitors.find((monitor) => monitor.id === id);
}

export function getMonitorByPublicKey(key: string) {
  return monitors.find(
    (monitor) => monitor.publicKey === key && monitor.isPublic,
  );
}

export function getMonitorIncidents(id: string) {
  return incidents.filter((incident) => incident.monitorId === id);
}

export function makeLatencySeries(
  monitor: Monitor,
  window: "1h" | "24h" | "7d" | "30d",
): LatencyPoint[] {
  const config = {
    "1h": {
      points: 24,
      stepMinutes: 2.5,
      base: monitor.avgLatency,
      spike: 1.26,
    },
    "24h": {
      points: 48,
      stepMinutes: 30,
      base: monitor.avgLatency,
      spike: 1.62,
    },
    "7d": {
      points: 56,
      stepMinutes: 180,
      base: monitor.avgLatency,
      spike: 1.48,
    },
    "30d": {
      points: 60,
      stepMinutes: 720,
      base: monitor.avgLatency,
      spike: 1.74,
    },
  }[window];

  const rand = seeded(monitor.name.length * 97 + config.points);
  const isDown = monitor.status === "down";
  const isDegraded = monitor.status === "degraded";

  return Array.from({ length: config.points }, (_, i) => {
    const date = new Date(NOW);
    date.setUTCMinutes(
      date.getUTCMinutes() - (config.points - 1 - i) * config.stepMinutes,
    );
    const wave = Math.sin(i / 3.2) * 0.18 + Math.cos(i / 6.8) * 0.12;
    const incidentSpike =
      (isDegraded || isDown) && i > config.points - 9 ? config.spike : 1;
    const p50 = Math.max(
      8,
      Math.round(config.base * (1 + wave) * incidentSpike + rand() * 18),
    );
    const p95 = Math.round(p50 * (1.55 + rand() * 0.55));
    const failures =
      (isDegraded || isDown) && i > config.points - 8
        ? Math.round(rand() * 3)
        : 0;

    return {
      iso: date.toISOString(),
      time:
        window === "1h" || window === "24h"
          ? date.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Kolkata",
            })
          : date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              timeZone: "Asia/Kolkata",
            }),
      p50,
      p95,
      checks: 12,
      failures,
    };
  });
}

export function makeChecks(monitor: Monitor): CheckRow[] {
  const rand = seeded(monitor.id.length * 733);
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(NOW);
    date.setUTCMinutes(date.getUTCMinutes() - i * monitor.interval);
    const failed =
      monitor.status === "down"
        ? i < 5
        : monitor.status === "degraded"
          ? i === 2
          : i === 9;
    return {
      id: `${monitor.id}-check-${i}`,
      checkedAt: date.toISOString(),
      statusCode: failed
        ? monitor.status === "down"
          ? 503
          : 200
        : monitor.statusCode,
      latency: Math.max(
        9,
        Math.round(
          monitor.avgLatency * (0.78 + rand() * 0.54) +
            (monitor.status === "down" && i < 5 ? 900 : 0),
        ),
      ),
      region: monitor.region,
      error: failed
        ? monitor.status === "down"
          ? "upstream returned 503 Service Unavailable"
          : "latency threshold exceeded (1,000 ms)"
        : null,
    };
  });
}

export function makeChecksPerHour(monitor: Monitor) {
  const rand = seeded(monitor.id.length * 311);
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(NOW);
    date.setUTCHours(date.getUTCHours() - (11 - i));
    return {
      time: date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
      checks: Math.round(110 + rand() * 28 + (i > 8 ? 14 : 0)),
      failures: monitor.status === "down" && i > 8 ? Math.round(rand() * 4) : 0,
    };
  });
}

export const overviewStats = {
  monitors: monitors.length,
  operational: monitors.filter((m) => m.status === "up").length,
  degraded: monitors.filter((m) => m.status === "degraded").length,
  down: monitors.filter((m) => m.status === "down").length,
  paused: monitors.filter((m) => m.status === "paused").length,
  uptime24h: 99.94,
  avgLatency: 82,
  p95Latency: 146,
  checks24h: 18432,
  openIncidents: 1,
};

export const publicStatus = {
  workspace: "Acme",
  headline: "Partial service disruption",
  summary:
    "Three of five public services are operating normally. Checkout is degraded and Webhooks is unavailable.",
  updatedAt: NOW.toISOString(),
};
