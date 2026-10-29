import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6", className)}
      fill="none"
    >
      <rect x="1" y="1" width="22" height="22" rx="6" className="fill-ink" />
      <circle cx="7" cy="7" r="1.15" className="fill-paper/45" />
      <circle cx="12" cy="7" r="1.15" className="fill-paper/45" />
      <circle cx="17" cy="7" r="1.15" className="fill-paper/45" />
      <circle cx="7" cy="12" r="1.15" className="fill-paper/45" />
      <circle
        cx="12"
        cy="12"
        r="2.15"
        className={cn("fill-signal", animated && "animate-signal-pulse")}
        style={{ transformOrigin: "12px 12px" }}
      />
      <circle cx="17" cy="12" r="1.15" className="fill-paper/45" />
      <circle cx="7" cy="17" r="1.15" className="fill-paper/45" />
      <circle cx="12" cy="17" r="1.15" className="fill-paper/45" />
      <circle cx="17" cy="17" r="1.15" className="fill-paper/45" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="font-semibold tracking-[-0.045em]">vigil</span>
      <span className="mb-[0.18em] size-1.5 rounded-full bg-signal" />
    </span>
  );
}

export function BrandLink({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <LogoMark
        animated
        className="transition-transform duration-300 group-hover:rotate-6"
      />
      <Wordmark className="text-[1.15rem]" />
    </Link>
  );
}
