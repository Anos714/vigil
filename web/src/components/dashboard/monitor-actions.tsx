"use client";

import { MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Monitor } from "@/lib/monitors";
import { cn } from "@/lib/utils";

export function MonitorActions({ monitor }: { monitor: Monitor }) {
  const paused = monitor.status === "paused";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() =>
          toast.info(paused ? "Resume monitoring" : "Pause monitoring", {
            description: `${monitor.name} would ${paused ? "resume" : "pause"} in a connected workspace. Preview data does not change.`,
          })
        }
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 gap-1.5 rounded-lg border-line bg-card px-2.5 text-xs",
        )}
      >
        {paused ? (
          <Play className="size-3.5" />
        ) : (
          <Pause className="size-3.5" />
        )}
        {paused ? "Resume" : "Pause"}
      </button>
      <Link
        href={`/dashboard/monitors/${monitor.id}/edit`}
        className={cn(
          buttonVariants({ size: "sm" }),
          "h-8 gap-1.5 rounded-lg bg-ink px-2.5 text-xs text-paper hover:bg-ink/85",
        )}
      >
        <Pencil className="size-3.5" />
        Edit
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More monitor actions"
          className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-card text-muted-ink transition-colors hover:bg-secondary hover:text-ink"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Manage monitor</DropdownMenuLabel>
          <DropdownMenuItem>
            <Play className="size-4" />
            Run check now
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Pencil className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              toast.error("Delete is disabled in this preview", {
                description: `${monitor.name} was not deleted.`,
              })
            }
          >
            <Trash2 className="size-4" />
            Delete monitor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
