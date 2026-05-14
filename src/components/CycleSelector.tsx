import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useFinance } from "@/store/data";
import {
  type FinancialCycle,
  getFinancialCycle,
  nextCycle,
  previousCycle,
} from "@/lib/finance";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  cycle: FinancialCycle;
  onChange: (cycle: FinancialCycle) => void;
  /** If true, disables the "next" button when we're already in the current cycle. */
  disableFuture?: boolean;
  className?: string;
}

export function CycleSelector({
  cycle,
  onChange,
  disableFuture = true,
  className,
}: Props) {
  const payday = useFinance((s) => s.user.payday);
  const currentCycle = getFinancialCycle(new Date(), payday);
  const isCurrent = cycle.label === currentCycle.label;

  const goPrev = () => onChange(previousCycle(cycle, payday));
  const goNext = () => onChange(nextCycle(cycle, payday));
  const goCurrent = () => onChange(currentCycle);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-surface border border-line rounded-xl",
        className
      )}
    >
      <button
        onClick={goPrev}
        className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-muted transition-colors"
        title="Ciclo anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="px-2.5 min-w-[170px] text-center">
        <p className="text-xs text-ink-muted flex items-center justify-center gap-1 leading-none">
          <Calendar className="h-3 w-3" />
          {isCurrent ? "Ciclo actual" : "Ciclo anterior"}
        </p>
        <p className="text-sm font-semibold text-brand-900 mt-0.5 tabular-nums">
          {format(cycle.start, "d MMM", { locale: es })} —{" "}
          {format(cycle.end, "d MMM yyyy", { locale: es })}
        </p>
      </div>
      <button
        onClick={goNext}
        disabled={disableFuture && isCurrent}
        className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Ciclo siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {!isCurrent && (
        <button
          onClick={goCurrent}
          className="ml-1 px-2 py-1 rounded-lg text-[11px] font-medium text-brand-600 hover:bg-brand-50 transition-colors"
        >
          Hoy
        </button>
      )}
    </div>
  );
}
