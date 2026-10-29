"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLink } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#engineering", label: "Engineering" },
  { href: "#status-page", label: "Status page" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled
          ? "border-line bg-paper/88 backdrop-blur-xl"
          : "border-transparent bg-paper/60 backdrop-blur-sm",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <BrandLink />

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[0.8rem] font-medium text-muted-ink transition-colors hover:bg-secondary/60 hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[0.8rem] font-medium text-muted-ink transition-colors hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ size: "sm" }),
              "h-8 gap-1.5 rounded-lg bg-ink px-3 text-xs text-paper hover:bg-ink/85",
            )}
          >
            Open dashboard
            <span className="font-mono text-[10px] opacity-60">↗</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-card text-ink"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-5 pb-6 pt-3 lg:hidden">
          <nav className="space-y-0.5">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-ink transition-colors hover:bg-secondary hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9 rounded-lg border-line bg-card text-xs",
              )}
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-9 rounded-lg bg-ink text-xs text-paper",
              )}
            >
              Open dashboard
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
