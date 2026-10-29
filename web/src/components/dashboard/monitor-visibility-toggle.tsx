"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function MonitorVisibilityToggle({
  monitorName,
  defaultChecked,
}: {
  monitorName: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <Switch
      checked={checked}
      onCheckedChange={(value) => {
        setChecked(value);
        toast.success(value ? "Public status enabled" : "Status page hidden", {
          description: `${monitorName} is now ${value ? "visible on" : "hidden from"} the public status page. This preview does not persist changes.`,
        });
      }}
      aria-label="Toggle public status page visibility"
    />
  );
}
