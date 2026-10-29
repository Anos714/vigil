"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard access is unavailable.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border border-paper/15 bg-paper/5 px-2 font-mono text-[9px] text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper",
        className,
      )}
    >
      {copied ? <Check className="size-2.5" /> : <Copy className="size-2.5" />}
      {copied ? "copied" : "copy"}
    </button>
  );
}
