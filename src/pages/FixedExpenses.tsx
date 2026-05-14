import { useState } from "react";
import { Plus, Receipt, Check, Trash2, Pencil } from "lucide-react";
import type { FixedExpense } from "@/types";
import { findSourceName, useFinance } from "@/store/data";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { formatCurrency } from "@/lib/format";
import { getFinancialCycle } from "@/lib/finance";
import { cn } from "@/lib/utils";

export default function FixedExpenses() {
  const fixed = useFinance((s) => s.fixedExpenses);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const user = useFinance((s) => s.user);
  const addExpense = useFinance((s) => s.addFixedExpense);
  const togglePaid = useFinance((s) => s.toggleFixedExpensePaid);
  const removeExpense = useFinance((s) => s.removeFixedExpense);
  const state = useFinance();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const cycle = getFinancialCycle(new Date(), user.payday);

  const total = fixed.reduce((s, f) => s + f.amount, 0);
  const paid = fixed
    .filter((f) => f.paidCycles.includes(cycle.label))
    .reduce((s, f) => s + f.amount, 0);
  const incomePct = user.monthlyIncome > 0 ? total / user.monthlyIncome : 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="stat-label">Total mensual</p>
          <p className="stat-value mt-2">{formatCurrency(total)}</p>
          <p className="text-xs text-ink-muted mt-1">
            {fixed.length} gasto{fixed.length === 1 ? "" : "s"} fijo{fixed.length === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Pagados este ciclo</p>
          <p className="stat-value mt-2">{formatCurrency(paid)}</p>
          <Progress
            value={total > 0 ? (paid / total) * 100 : 0}
            className="mt-2"
          />
        </Card>
        <Card className="p-5">
          <p className="stat-label">% of salary</p>
          <p className="stat-value mt-2">{(incomePct * 100).toFixed(0)}%</p>
          <Progress
            value={Math.min(100, incomePct * 100)}
            className="mt-2"
            indicatorClassName={
              incomePct > 0.7 ? "bg-danger" : incomePct > 0.5 ? "bg-brand-700" : "bg-brand-500"
            }
          />
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            Marca cada gasto al pagarlo. Los toggles se reinician al día de pago ({user.payday}).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo gasto fijo
            </Button>
          </DialogTrigger>
          <AddDialog onClose={() => setOpen(false)} />
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditDialog expense={editing} onClose={() => setEditing(null)} />}
      </Dialog>

      {fixed.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No tienes gastos fijos"
          description="Agrega tus suscripciones, renta, seguros y otros pagos recurrentes."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar gasto fijo
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-line">
              {fixed.map((f) => {
                const isPaid = f.paidCycles.includes(cycle.label);
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-center gap-3 p-4 transition-colors",
                      isPaid ? "bg-brand-50/40" : "hover:bg-surface-soft"
                    )}
                  >
                    <button
                      onClick={() => togglePaid(f.id, cycle.label)}
                      className={cn(
                        "h-7 w-7 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                        isPaid
                          ? "bg-brand-600 text-white"
                          : "border-2 border-line hover:border-brand-400"
                      )}
                    >
                      {isPaid && <Check className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            isPaid ? "text-ink-muted line-through" : "text-ink"
                          )}
                        >
                          {f.name}
                        </p>
                        <Badge variant="outline" className="hidden sm:inline-flex">
                          Día {f.payDay}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5 truncate">
                        {findSourceName(f.source, state)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          isPaid ? "text-ink-muted" : "text-brand-900"
                        )}
                      >
                        {formatCurrency(f.amount)}
                      </p>
                      {isPaid && (
                        <Badge variant="soft" className="mt-0.5">
                          Pagado
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => setEditing(f)}
                      className="p-1.5 text-ink-muted hover:bg-surface-muted rounded-lg flex-shrink-0"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${f.name}"? Se perderá el historial de pagos por ciclo.`)) removeExpense(f.id);
                      }}
                      className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-500/10 rounded-lg flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EditDialog({ expense, onClose }: { expense: FixedExpense; onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const updateExpense = useFinance((s) => s.updateFixedExpense);

  const [form, setForm] = useState({
    name: expense.name,
    amount: expense.amount,
    payDay: expense.payDay,
    sourceKey: `${expense.source.kind}:${expense.source.id}`,
  });
  const [saving, setSaving] = useState(false);

  const sources = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.alias} · ${a.bank} (débito)` })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.alias} · ${c.bank} (crédito)` })),
  ];

  const submit = async () => {
    if (!form.name) return;
    const [kind, id] = form.sourceKey.split(":");
    setSaving(true);
    const result = await updateExpense(expense.id, {
      name: form.name,
      amount: form.amount,
      payDay: form.payDay,
      source: { kind: kind as "account" | "card", id },
    });
    setSaving(false);
    if (result) onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar gasto fijo</DialogTitle>
        <DialogDescription>
          Cambios futuros toman efecto desde el próximo ciclo. El historial de pagos se mantiene.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Día de pago</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.payDay}
              onChange={(e) => setForm({ ...form, payDay: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Se paga con</Label>
          <Select
            value={form.sourceKey}
            onChange={(e) => setForm({ ...form, sourceKey: e.target.value })}
          >
            {sources.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddDialog({ onClose }: { onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const addExpense = useFinance((s) => s.addFixedExpense);

  const [form, setForm] = useState({
    name: "",
    amount: 0,
    payDay: 1,
    sourceKey: "",
  });

  const sources = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.alias} · ${a.bank} (débito)` })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.alias} · ${c.bank} (crédito)` })),
  ];

  const submit = () => {
    if (!form.name || !form.sourceKey || !form.amount) return;
    const [kind, id] = form.sourceKey.split(":");
    addExpense({
      name: form.name,
      amount: form.amount,
      payDay: form.payDay,
      source: { kind: kind as "account" | "card", id },
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo gasto fijo</DialogTitle>
        <DialogDescription>
          Será un gasto recurrente que se reinicia cada ciclo de pago.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Netflix"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Día de pago</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.payDay}
              onChange={(e) => setForm({ ...form, payDay: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Se paga con</Label>
          <Select
            value={form.sourceKey}
            onChange={(e) => setForm({ ...form, sourceKey: e.target.value })}
          >
            <option value="">Selecciona...</option>
            {sources.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Agregar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
