import { useState } from "react";
import { Plus, PiggyBank, Trash2, Sparkles, Trophy, Pencil } from "lucide-react";
import type { SavingsGoal } from "@/types";
import { selectAccountsTotal, useFinance } from "@/store/data";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress, ProgressRing } from "@/components/ui/Progress";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/finance";
import { cn } from "@/lib/utils";

const emojiOptions = ["🎯", "🗾", "🛡️", "🚗", "🏠", "💍", "🎓", "🏖️", "💻", "📱", "👓", "🎁"];

export default function Goals() {
  const goals = useFinance((s) => s.goals);
  const accountsTotal = useFinance(selectAccountsTotal);
  const addContribution = useFinance((s) => s.addContribution);
  const removeGoal = useFinance((s) => s.removeGoal);
  const [openAdd, setOpenAdd] = useState(false);
  const [contributionGoal, setContributionGoal] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  const active = goals.filter((g) => !g.completedAt);
  const completed = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            Define tus metas y Marea te dirá cuánto necesitas apartar para llegar a tiempo.
          </p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nueva meta
            </Button>
          </DialogTrigger>
          <AddGoalDialog onClose={() => setOpenAdd(false)} />
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Aún no tienes metas"
          description="Las metas te ayudan a destinar dinero específico para objetivos concretos."
          action={
            <Button onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" />
              Crear primera meta
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-3">
                Activas · {active.length}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((g) => {
                  const progress =
                    g.targetAmount > 0
                      ? Math.min(1, g.currentAmount / g.targetAmount)
                      : 0;
                  const missing = g.targetAmount - g.currentAmount;
                  const daysLeft = g.targetDate ? daysUntil(g.targetDate) : null;
                  const monthsLeft = daysLeft && daysLeft > 0 ? daysLeft / 30 : null;
                  const monthlyNeeded =
                    monthsLeft && monthsLeft > 0 ? missing / monthsLeft : null;
                  const weeksLeft = daysLeft && daysLeft > 0 ? daysLeft / 7 : null;
                  const weeklyNeeded =
                    weeksLeft && weeksLeft > 0 ? missing / weeksLeft : null;
                  const monthsWithAvailable =
                    accountsTotal > 0 && missing > 0
                      ? Math.ceil(missing / (accountsTotal * 0.1))
                      : null;

                  return (
                    <Card key={g.id} className="overflow-hidden">
                      <div className="bg-gradient-to-br from-brand-50 to-brand-100 p-5 flex items-center justify-between">
                        <div className="text-4xl">{g.emoji}</div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditing(g)}
                            className="p-1.5 text-brand-700/60 hover:bg-white rounded-lg"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar meta "${g.name}"? Se borrarán todas las aportaciones.`)) removeGoal(g.id);
                            }}
                            className="p-1.5 text-brand-700/60 hover:text-danger hover:bg-white rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <CardContent className="pt-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-ink-muted mt-0.5">{g.description}</p>
                          )}
                        </div>
                        <div className="flex items-end gap-1">
                          <p className="text-2xl font-semibold text-brand-900 tabular-nums">
                            {formatCurrency(g.currentAmount)}
                          </p>
                          <p className="text-xs text-ink-muted mb-1">
                            / {formatCurrency(g.targetAmount)}
                          </p>
                        </div>
                        <Progress value={progress * 100} />
                        <p className="text-xs text-ink-muted">
                          You need <strong className="text-ink">{formatCurrency(missing)}</strong> ({(progress * 100).toFixed(0)}%)
                        </p>

                        {(monthlyNeeded || weeklyNeeded || monthsWithAvailable) && (
                          <div className="rounded-lg bg-surface-soft border border-line p-2.5 text-xs space-y-1">
                            <div className="flex items-start gap-1.5 text-brand-700">
                              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span className="font-medium">Recomendación</span>
                            </div>
                            {monthlyNeeded && (
                              <p className="text-ink-soft">
                                Apartando <strong>{formatCurrency(monthlyNeeded)}/mes</strong> llegas a tiempo.
                              </p>
                            )}
                            {weeklyNeeded && weeklyNeeded < monthlyNeeded! && weeklyNeeded > 0 && (
                              <p className="text-ink-soft">
                                O <strong>{formatCurrency(weeklyNeeded)}/semana</strong>.
                              </p>
                            )}
                            {!monthlyNeeded && monthsWithAvailable && (
                              <p className="text-ink-soft">
                                Con tu saldo actual, podrías alcanzar esta meta en aprox.{" "}
                                <strong>{monthsWithAvailable} mes{monthsWithAvailable === 1 ? "" : "es"}</strong>.
                              </p>
                            )}
                          </div>
                        )}

                        {g.targetDate && daysLeft !== null && (
                          <Badge
                            variant={daysLeft < 0 ? "danger" : daysLeft < 30 ? "warning" : "outline"}
                          >
                            {daysLeft >= 0
                              ? `${daysLeft} días para ${formatDate(g.targetDate, "d MMM yyyy")}`
                              : `Vencida hace ${Math.abs(daysLeft)} días`}
                          </Badge>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => setContributionGoal(g.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar aportación
                        </Button>

                        {g.contributions.length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-ink-muted py-1">
                              Historial · {g.contributions.length} aportacion{g.contributions.length === 1 ? "" : "es"}
                            </summary>
                            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                              {g.contributions.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-muted"
                                >
                                  <span className="text-ink-muted">
                                    {formatDate(c.date, "d MMM yyyy")}
                                  </span>
                                  <span className="font-medium text-brand-700 tabular-nums">
                                    +{formatCurrency(c.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-soft mb-3 flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                Completadas · {completed.length}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completed.map((g) => (
                  <Card key={g.id} className="p-4 bg-brand-50/30">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{g.emoji}</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink">{g.name}</p>
                        <p className="text-xs text-ink-muted">
                          {formatCurrency(g.targetAmount)} · Completada{" "}
                          {g.completedAt && formatDate(g.completedAt, "d MMM yyyy")}
                        </p>
                      </div>
                      <Trophy className="h-5 w-5 text-brand-600" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!contributionGoal}
        onOpenChange={(o) => !o && setContributionGoal(null)}
      >
        {contributionGoal && (
          <ContributionDialog
            goalId={contributionGoal}
            onClose={() => setContributionGoal(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditGoalDialog goal={editing} onClose={() => setEditing(null)} />}
      </Dialog>
    </div>
  );
}

function EditGoalDialog({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const updateGoal = useFinance((s) => s.updateGoal);
  const [form, setForm] = useState({
    name: goal.name,
    description: goal.description ?? "",
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    emoji: goal.emoji,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await updateGoal(goal.id, {
      name: form.name,
      description: form.description || undefined,
      targetAmount: form.targetAmount,
      targetDate: form.targetDate || undefined,
      emoji: form.emoji,
    });
    setSaving(false);
    if (res) onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar meta</DialogTitle>
        <DialogDescription>Ajusta los datos. Las aportaciones registradas se conservan.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Icono</Label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {emojiOptions.map((e) => (
              <button
                key={e}
                onClick={() => setForm({ ...form, emoji: e })}
                className={cn(
                  "aspect-square text-2xl rounded-lg border transition-all",
                  form.emoji === e
                    ? "bg-brand-50 border-brand-300 scale-105"
                    : "border-line hover:bg-surface-soft"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto objetivo</Label>
            <Input type="number" value={form.targetAmount || ""} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha meta</Label>
            <Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddGoalDialog({ onClose }: { onClose: () => void }) {
  const addGoal = useFinance((s) => s.addGoal);
  const [form, setForm] = useState({
    name: "",
    description: "",
    targetAmount: 0,
    targetDate: "",
    emoji: emojiOptions[0],
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva meta de ahorro</DialogTitle>
        <DialogDescription>
          Dale un nombre, monto objetivo y, si quieres, una fecha.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Icono</Label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {emojiOptions.map((e) => (
              <button
                key={e}
                onClick={() => setForm({ ...form, emoji: e })}
                className={cn(
                  "aspect-square text-2xl rounded-lg border transition-all",
                  form.emoji === e
                    ? "bg-brand-50 border-brand-300 scale-105"
                    : "border-line hover:bg-surface-soft"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Viaje a Japón"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto objetivo</Label>
            <Input
              type="number"
              value={form.targetAmount || ""}
              onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha meta (opcional)</Label>
            <Input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!form.name || !form.targetAmount) return;
            addGoal({
              name: form.name,
              description: form.description || undefined,
              targetAmount: form.targetAmount,
              targetDate: form.targetDate || undefined,
              emoji: form.emoji,
            });
            onClose();
          }}
        >
          Crear meta
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ContributionDialog({
  goalId,
  onClose,
}: {
  goalId: string;
  onClose: () => void;
}) {
  const goal = useFinance((s) => s.goals.find((g) => g.id === goalId));
  const accounts = useFinance((s) => s.accounts);
  const addContribution = useFinance((s) => s.addContribution);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  // By default debits from main account (first). User can choose "Without deducting".
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  if (!goal) return null;
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const wouldGoNegative = selectedAccount && selectedAccount.balance - amount < 0;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Aportar a {goal.name}</DialogTitle>
        <DialogDescription>
          El monto se descuenta de la cuenta seleccionada y se suma a la meta.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Sin descontar de cuenta</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias} · {formatCurrency(a.balance, { compact: true })}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nota (opcional)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. parte del aguinaldo"
          />
        </div>
        {wouldGoNegative && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
            ⚠️ La cuenta quedará en negativo después de esta aportación.
          </div>
        )}
        {accountId === "" && (
          <p className="text-[11px] text-ink-muted">
            La aportación quedará registrada pero ninguna cuenta se descontará. Útil si ya moviste el dinero manualmente.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          disabled={saving || amount <= 0}
          onClick={async () => {
            if (amount <= 0) return;
            setSaving(true);
            const ok = await addContribution(goalId, amount, note || undefined, accountId || undefined);
            setSaving(false);
            if (ok) onClose();
          }}
        >
          {saving ? "Aportando..." : "Aportar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
