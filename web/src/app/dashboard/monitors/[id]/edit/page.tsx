import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonitorForm } from "@/components/dashboard/monitor-form";
import { getMonitor, monitors } from "@/lib/monitors";

export const instant = false;

export function generateStaticParams() {
  return monitors.map((monitor) => ({ id: monitor.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const monitor = getMonitor(id);
  return { title: monitor ? `Edit ${monitor.name}` : "Edit monitor" };
}

export default async function EditMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monitor = getMonitor(id);
  if (!monitor) notFound();

  return <MonitorForm monitor={monitor} />;
}
