import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  previous: number;
  /** If true, "going down" is considered good (expenses). If false, "going up" is good (income, savings). */
  lessIsBetter?: boolean;
  /** Text that follows the delta. Default "vs last cycle". */
  suffix?: string;
  className?: string;
}

/**
 * Small badge that shows the percentage difference between two numbers.
 * Colored blue when it's "good" for the user, danger when it's not.
 */
export function DeltaBadge({
  current,
  previous,
  lessIsBetter = true,
  suffix = "vs ciclo pasado",
  className,
}: Props) {
  // no previous data to compare
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className={cn("inline-flex items-center gap-0.5 text-[11px] text-ink-muted", className)}>
        nuevo {suffix}
      </span>
    );
  }

  const diff = current - previous;
  const pct = Math.abs(diff / previous) * 100;
  const isFlat = pct < 1;
  const isDown = diff < 0;
  const isGood = isFlat ? null : (isDown && lessIsBetter) || (!isDown && !lessIsBetter);

  const Icon = isFlat ? Minus : isDown ? ArrowDown : ArrowUp;
  const tone =
    isGood === null
      ? "text-ink-muted"
      : isGood
      ? "text-brand-700"
      : "text-danger";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        tone,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {pct.toFixed(pct < 10 ? 1 : 0)}% {suffix}
    </span>
  );
}
