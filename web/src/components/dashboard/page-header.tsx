import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-5 md:flex-row md:items-end",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mono-label mb-3 text-muted-ink">{eyebrow}</div>
        )}
        <h1 className="display text-[clamp(1.8rem,3.5vw,2.65rem)]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-ink">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
