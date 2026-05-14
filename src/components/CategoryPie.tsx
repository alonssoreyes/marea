import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ExpenseCategory } from "@/types";
import { formatCurrency } from "@/lib/format";

const labels: Record<ExpenseCategory, string> = {
  alimentos: "Alimentos",
  transporte: "Transporte",
  entretenimiento: "Entretenimiento",
  salud: "Salud",
  hogar: "Hogar",
  ropa: "Ropa",
  tecnologia: "Tecnología",
  servicios: "Servicios",
  otros: "Otros",
};

// palette limited to blues and derivatives (no greens/yellows)
const colors: Record<ExpenseCategory, string> = {
  alimentos: "#1E3A5F",
  transporte: "#2563EB",
  entretenimiento: "#3B82F6",
  salud: "#60A5FA",
  hogar: "#1D4ED8",
  ropa: "#93C5FD",
  tecnologia: "#1E40AF",
  servicios: "#BFDBFE",
  otros: "#94A3B8",
};

interface Props {
  expenses: Array<{ category: ExpenseCategory; amount: number }>;
  size?: number;
  showLegend?: boolean;
}

export function CategoryPie({ expenses, size = 220, showLegend = true }: Props) {
  const totals = new Map<ExpenseCategory, number>();
  expenses.forEach((e) => {
    totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
  });
  const data = Array.from(totals.entries())
    .map(([category, value]) => ({
      category,
      value,
      label: labels[category],
      color: colors[category],
    }))
    .sort((a, b) => b.value - a.value);

  const grandTotal = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div
        style={{ height: size }}
        className="flex items-center justify-center text-sm text-ink-muted"
      >
        Sin gastos en este ciclo.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div style={{ width: size, height: size }} className="relative flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={size * 0.32}
              outerRadius={size * 0.48}
              paddingAngle={2}
              animationDuration={500}
            >
              {data.map((d) => (
                <Cell key={d.category} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                fontSize: 12,
              }}
              formatter={(v: any, n: any) => [formatCurrency(Number(v)), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Total</p>
          <p className="text-lg font-semibold text-brand-900 tabular-nums">
            {formatCurrency(grandTotal, { compact: true })}
          </p>
        </div>
      </div>
      {showLegend && (
        <ul className="flex-1 space-y-1.5 w-full">
          {data.map((d) => {
            const pct = (d.value / grandTotal) * 100;
            return (
              <li key={d.category} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-ink-soft flex-1 truncate">{d.label}</span>
                <span className="text-ink-muted text-xs tabular-nums">
                  {pct.toFixed(0)}%
                </span>
                <span className="text-ink font-medium tabular-nums w-20 text-right">
                  {formatCurrency(d.value, { compact: true })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
