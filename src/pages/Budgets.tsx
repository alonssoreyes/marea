import { useMemo, useState } from "react";
import { Target, Trash2, Save } from "lucide-react";
import { useFinance } from "@/store/data";
import { getFinancialCycle, isInCycle } from "@/lib/finance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import type { ExpenseCategory } from "@/types";

const categoryLabels: Record<ExpenseCategory, string> = {
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

export default function Budgets() {
  const budgets = useFinance((s) => s.budgets);
  const upsertBudget = useFinance((s) => s.upsertBudget);
  const removeBudget = useFinance((s) => s.removeBudget);
  const debit = useFinance((s) => s.debitExpenses);
  const card = useFinance((s) => s.cardExpenses);
  const payday = useFinance((s) => s.user.payday);

  const cycle = useMemo(() => getFinancialCycle(new Date(), payday), [payday]);

  const spendingByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    [...debit, ...card]
      .filter((e) => isInCycle(e.date, cycle))
      .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return map;
  }, [debit, card, cycle]);

  const [draft, setDraft] = useState({ category: "alimentos" as ExpenseCategory, amount: 0 });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.amount) return;
    setSaving(true);
    await upsertBudget(draft.category, draft.amount);
    setDraft({ ...draft, amount: 0 });
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Crear o actualizar presupuesto</CardTitle>
          <CardDescription>
            Define un máximo de gasto por categoría para el ciclo. Marea mide tu progreso
            automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}
              >
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto máximo por ciclo</Label>
              <Input
                type="number"
                value={draft.amount || ""}
                onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
              />
            </div>
            <Button onClick={save} disabled={saving || !draft.amount}>
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar presupuesto"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aún no tienes presupuestos"
          description="Define un tope para una categoría arriba y aparecerá aquí con su progreso del ciclo."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tus presupuestos del ciclo</CardTitle>
            <CardDescription>
              {`Progreso del ${cycle.label} · gastado vs tope`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.map((b) => {
              const spent = spendingByCategory.get(b.category) ?? 0;
              const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
              const over = spent > b.amount;
              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{categoryLabels[b.category]}</p>
                    <div className="flex items-center gap-3">
                      <p className={`text-sm tabular-nums ${over ? "text-danger font-semibold" : "text-ink"}`}>
                        {formatCurrency(spent)} / {formatCurrency(b.amount)}
                      </p>
                      <button
                        onClick={() => removeBudget(b.category)}
                        className="text-ink-muted hover:text-danger"
                        title="Eliminar presupuesto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <Progress
                    value={pct}
                    indicatorClassName={over ? "bg-danger" : pct > 80 ? "bg-brand-700" : "bg-brand-500"}
                  />
                  <p className="text-[11px] text-ink-muted">
                    {over
                      ? `Excediste el presupuesto por ${formatCurrency(spent - b.amount)}`
                      : `Te quedan ${formatCurrency(b.amount - spent)} en este ciclo`}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
