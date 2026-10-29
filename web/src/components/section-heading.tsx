import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  accent,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  accent?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            "mono-label mb-4 flex items-center gap-2 text-muted-ink",
            align === "center" && "justify-center",
          )}
        >
          <span className="inline-block size-1.5 rounded-full bg-signal-deep" />
          {eyebrow}
        </div>
      )}
      <h2 className="display text-[clamp(2rem,4.5vw,3.4rem)]">{title}</h2>
      {description && (
        <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-muted-ink md:text-base">
          {description}
        </p>
      )}
      {accent}
    </div>
  );
}
