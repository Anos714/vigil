"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SaveButton({
  label = "Save changes",
  message = "Settings saved in the preview.",
}: {
  label?: string;
  message?: string;
}) {
  return (
    <Button
      type="button"
      onClick={() =>
        toast.success(message, {
          description: "This preview does not persist workspace settings yet.",
        })
      }
      className="h-8 gap-1.5 rounded-lg bg-ink px-3 text-xs text-paper hover:bg-ink/85"
    >
      <Check className="size-3.5" />
      {label}
    </Button>
  );
}
