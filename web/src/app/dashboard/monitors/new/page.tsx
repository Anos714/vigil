import type { Metadata } from "next";
import { MonitorForm } from "@/components/dashboard/monitor-form";

export const metadata: Metadata = {
  title: "New monitor",
};

export default function NewMonitorPage() {
  return <MonitorForm />;
}
