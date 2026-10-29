import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  className,
  stroke = "var(--signal-deep)",
  fill = "var(--signal)",
  width = 104,
  height = 32,
}: {
  data: number[];
  className?: string;
  stroke?: string;
  fill?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - 3 - ((value - min) / range) * (height - 6);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={area} fill={fill} opacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <circle
        cx={points.at(-1)?.[0]}
        cy={points.at(-1)?.[1]}
        r={2.1}
        fill={stroke}
      />
    </svg>
  );
}
