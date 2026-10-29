import { NOW } from "@/lib/monitors";

export function formatRelative(iso: string) {
  const diff = NOW.getTime() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.round(diff / 1000));

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatUptime(value: number) {
  return `${value.toFixed(value === 100 ? 0 : 2)}%`;
}

export function formatLatency(value: number) {
  return `${Math.round(value)}ms`;
}

export function formatDuration(startedAt: string, resolvedAt: string | null) {
  const end = resolvedAt ? new Date(resolvedAt).getTime() : NOW.getTime();
  const minutes = Math.max(
    1,
    Math.round((end - new Date(startedAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}
