"use client";

import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StatusSubscribe() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setSubscribed(true);
    toast.success("Subscription saved in the preview", {
      description: `${email} would receive incident updates from Vigil.`,
    });
  }

  if (subscribed) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-positive/20 bg-positive/[0.045] px-3 py-3">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-positive/10 text-positive">
          <Check className="size-3" />
        </span>
        <div>
          <p className="text-[0.76rem] font-medium">You are on the list.</p>
          <p className="mt-0.5 text-[0.68rem] leading-4 text-muted-ink">
            Preview only — no email will be sent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="relative">
        <Bell className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-ink" />
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-label="Email for status updates"
          className="h-9 rounded-lg border-line bg-paper pl-8 text-xs"
        />
      </div>
      <Button
        type="submit"
        className="h-9 w-full rounded-lg bg-ink text-xs text-paper hover:bg-ink/85"
      >
        Subscribe to updates
      </Button>
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-muted-ink/70">
        Preview form · no email is sent
      </p>
    </form>
  );
}
