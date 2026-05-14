import { useMemo, useState } from "react";
import {
  Plus,
  Wallet,
  Receipt,
  Trash2,
  Pencil,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  ArrowLeftRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useFinance } from "@/store/data";
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
import { TagInput } from "@/components/ui/TagInput";
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
import { CycleSelector } from "@/components/CycleSelector";
import { DeltaBadge } from "@/components/DeltaBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getFinancialCycle,
  isInCycle,
  previousCycle,
  type FinancialCycle,
} from "@/lib/finance";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Account, ExpenseCategory, IncomeSource } from "@/types";

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

const incomeSourceLabels: Record<IncomeSource, string> = {
  sueldo: "Sueldo",
  aguinaldo: "Aguinaldo",
  bono: "Bono",
  freelance: "Freelance",
  reembolso: "Reembolso",
  regalo: "Regalo",
  venta: "Venta",
  intereses: "Intereses",
  otro: "Otro",
};

export default function Accounts() {
  const accounts = useFinance((s) => s.accounts);
  const debitExpenses = useFinance((s) => s.debitExpenses);
  const incomeEvents = useFinance((s) => s.incomeEvents);
  const transfers = useFinance((s) => s.transfers);
  const payday = useFinance((s) => s.user.payday);
  const removeAccount = useFinance((s) => s.removeAccount);

  const [openAdd, setOpenAdd] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [openIncome, setOpenIncome] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  const currentCycle = useMemo(() => getFinancialCycle(new Date(), payday), [payday]);
  const [cycle, setCycle] = useState<FinancialCycle>(currentCycle);
  const prev = useMemo(() => previousCycle(cycle, payday), [cycle, payday]);

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const cycleExpenses = useMemo(
    () => debitExpenses.filter((e) => isInCycle(e.date, cycle)),
    [debitExpenses, cycle]
  );
  const prevCycleExpenses = useMemo(
    () => debitExpenses.filter((e) => isInCycle(e.date, prev)),
    [debitExpenses, prev]
  );

  const cycleIncome = useMemo(
    () => incomeEvents.filter((e) => isInCycle(e.date, cycle)),
    [incomeEvents, cycle]
  );
  const prevCycleIncome = useMemo(
    () => incomeEvents.filter((e) => isInCycle(e.date, prev)),
    [incomeEvents, prev]
  );

  const spent = cycleExpenses.reduce((s, e) => s + e.amount, 0);
  const prevSpent = prevCycleExpenses.reduce((s, e) => s + e.amount, 0);
  const income = cycleIncome.reduce((s, e) => s + e.amount, 0);
  const prevIncome = prevCycleIncome.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-ink-muted">
          Tus cuentas de débito y los movimientos del ciclo. Las transferencias entre
          cuentas no cuentan como gasto.
        </p>
        <CycleSelector cycle={cycle} onChange={setCycle} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="stat-label">Disponible total</p>
          <p className="stat-value mt-2">{formatCurrency(total)}</p>
          <p className="text-xs text-ink-muted mt-1">
            En {accounts.length} cuenta{accounts.length === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Gastado este ciclo</p>
          <p className="stat-value mt-2">{formatCurrency(spent)}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              {cycleExpenses.length} movimiento{cycleExpenses.length === 1 ? "" : "s"}
            </p>
            <DeltaBadge current={spent} previous={prevSpent} lessIsBetter />
          </div>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Ingresos del ciclo</p>
          <p className="stat-value mt-2">{formatCurrency(income)}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              {cycleIncome.length} entrada{cycleIncome.length === 1 ? "" : "s"}
            </p>
            <DeltaBadge
              current={income}
              previous={prevIncome}
              lessIsBetter={false}
            />
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-3">
          <ArrowUpDown className="h-10 w-10 text-brand-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink">Gastos variables</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Lo que pagas con débito o efectivo. Suscripciones y rentas viven en
              "Gastos fijos".
            </p>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Dialog open={openIncome} onOpenChange={setOpenIncome}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={accounts.length === 0}>
              <TrendingUp className="h-4 w-4" />
              Registrar ingreso
            </Button>
          </DialogTrigger>
          {openIncome && <AddIncomeDialog onClose={() => setOpenIncome(false)} />}
        </Dialog>
        <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={accounts.length < 2}>
              <ArrowLeftRight className="h-4 w-4" />
              Transferir
            </Button>
          </DialogTrigger>
          {openTransfer && <AddTransferDialog onClose={() => setOpenTransfer(false)} />}
        </Dialog>
        <Dialog open={openExpense} onOpenChange={setOpenExpense}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={accounts.length === 0}>
              <Receipt className="h-4 w-4" />
              Registrar gasto
            </Button>
          </DialogTrigger>
          {openExpense && <AddDebitExpenseDialog onClose={() => setOpenExpense(false)} />}
        </Dialog>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nueva cuenta
            </Button>
          </DialogTrigger>
          {openAdd && <AccountDialog onClose={() => setOpenAdd(false)} />}
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No tienes cuentas de débito"
          description="Agrega tu cuenta principal para empezar a registrar gastos e ingresos."
          action={
            <Button onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" />
              Agregar cuenta
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const accountExpenses = cycleExpenses.filter((e) => e.accountId === a.id);
            const accountSpent = accountExpenses.reduce((s, e) => s + e.amount, 0);
            const belowMin =
              a.minBalance !== undefined && a.balance < a.minBalance;
            return (
              <Card
                key={a.id}
                className={`cursor-pointer hover:shadow-elevated transition-shadow ${
                  activeAccount === a.id ? "ring-2 ring-brand-300" : ""
                }`}
                onClick={() => setActiveAccount(activeAccount === a.id ? null : a.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{a.alias}</CardTitle>
                      <CardDescription>{a.bank}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(a);
                        }}
                        className="p-1.5 text-ink-muted hover:bg-surface-muted rounded-lg"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `¿Eliminar ${a.alias}? Los gastos asociados quedarán huérfanos.`
                            )
                          )
                            removeAccount(a.id);
                        }}
                        className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold text-brand-900 tabular-nums">
                    {formatCurrency(a.balance)}
                  </p>
                  {belowMin && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-danger">
                      <AlertTriangle className="h-3 w-3" />
                      Bajo el mínimo de {formatCurrency(a.minBalance!)}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-ink-muted">
                    <span>{accountExpenses.length} este ciclo</span>
                    {accountSpent > 0 && (
                      <Badge variant="outline">
                        <TrendingDown className="h-3 w-3" />
                        {formatCurrency(accountSpent)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeAccount && (
        <AccountMovements
          accountId={activeAccount}
          cycle={cycle}
          onClose={() => setActiveAccount(null)}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <AccountDialog onClose={() => setEditing(null)} account={editing} />
        )}
      </Dialog>
    </div>
  );
}

function AccountDialog({
  onClose,
  account,
}: {
  onClose: () => void;
  account?: Account;
}) {
  const addAccount = useFinance((s) => s.addAccount);
  const updateAccount = useFinance((s) => s.updateAccount);
  const [form, setForm] = useState({
    bank: account?.bank ?? "",
    alias: account?.alias ?? "",
    balance: account?.balance ?? 0,
    minBalance: account?.minBalance ?? 0,
  });

  const submit = () => {
    if (!form.bank || !form.alias) return;
    const payload = {
      bank: form.bank,
      alias: form.alias,
      balance: form.balance,
      minBalance: form.minBalance > 0 ? form.minBalance : undefined,
    };
    if (account) {
      updateAccount(account.id, payload);
    } else {
      addAccount(payload);
    }
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{account ? "Editar cuenta" : "Nueva cuenta de débito"}</DialogTitle>
        <DialogDescription>
          El saldo se actualiza automáticamente con gastos, ingresos y transferencias.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Input
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
            placeholder="BBVA"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alias</Label>
          <Input
            value={form.alias}
            onChange={(e) => setForm({ ...form, alias: e.target.value })}
            placeholder="Cuenta principal"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo actual</Label>
          <Input
            type="number"
            value={form.balance || ""}
            onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo mínimo (alerta)</Label>
          <Input
            type="number"
            value={form.minBalance || ""}
            onChange={(e) => setForm({ ...form, minBalance: Number(e.target.value) })}
            placeholder="0 = sin alerta"
          />
        </div>
      </div>
      <p className="text-xs text-ink-muted mt-1">
        Si configuras un mínimo, Marea te avisará cuando tu saldo caiga por debajo.
      </p>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit}>{account ? "Guardar cambios" : "Agregar cuenta"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddDebitExpenseDialog({ onClose }: { onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const allDebit = useFinance((s) => s.debitExpenses);
  const allCard = useFinance((s) => s.cardExpenses);
  const addExpense = useFinance((s) => s.addDebitExpense);
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? "",
    amount: 0,
    description: "",
    category: "otros" as ExpenseCategory,
    date: new Date().toISOString().slice(0, 10),
    tags: [] as string[],
  });

  // tag suggestions: all existing tags from past expenses
  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    allDebit.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    allCard.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allDebit, allCard]);

  const account = accounts.find((a) => a.id === form.accountId);
  const willBeNegative = account && account.balance - form.amount < 0;

  const submit = () => {
    if (!form.accountId || !form.amount) return;
    addExpense({
      accountId: form.accountId,
      amount: form.amount,
      description: form.description,
      category: form.category,
      date: form.date,
      tags: form.tags.length ? form.tags : undefined,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar gasto con débito</DialogTitle>
        <DialogDescription>
          Se descontará del saldo de la cuenta seleccionada.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cuenta</Label>
            <Select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias} · {formatCurrency(a.balance, { compact: true })}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as ExpenseCategory })
              }
            >
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Súper, gasolina, taxi..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Etiquetas</Label>
          <TagInput
            value={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            suggestions={tagSuggestions}
          />
          <p className="text-[11px] text-ink-muted">
            Etiquetas libres para clasificar este gasto (ej. <code>vacaciones</code>,
            <code> trabajo</code>).
          </p>
        </div>
        {willBeNegative && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
            ⚠️ Tu cuenta quedaría con saldo negativo después de este gasto.
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit}>Registrar gasto</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddIncomeDialog({ onClose }: { onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const addIncome = useFinance((s) => s.addIncomeEvent);
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? "",
    amount: 0,
    source: "freelance" as IncomeSource,
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const submit = () => {
    if (!form.accountId || !form.amount) return;
    addIncome({
      accountId: form.accountId,
      amount: form.amount,
      source: form.source,
      description: form.description || undefined,
      date: form.date,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar ingreso</DialogTitle>
        <DialogDescription>
          Aguinaldo, freelance, reembolso… se depositará en la cuenta que elijas y
          sumará a tu saldo.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Cuenta destino</Label>
            <Select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select
              value={form.source}
              onChange={(e) =>
                setForm({ ...form, source: e.target.value as IncomeSource })
              }
            >
              {Object.entries(incomeSourceLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ej: aguinaldo trimestral, proyecto cliente X..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit}>Registrar ingreso</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddTransferDialog({ onClose }: { onClose: () => void }) {
  const accounts = useFinance((s) => s.accounts);
  const addTransfer = useFinance((s) => s.addTransfer);
  const [form, setForm] = useState({
    fromAccountId: accounts[0]?.id ?? "",
    toAccountId: accounts[1]?.id ?? "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const from = accounts.find((a) => a.id === form.fromAccountId);
  const sameAccount = form.fromAccountId === form.toAccountId;
  const insufficient = from && from.balance < form.amount;

  const submit = () => {
    if (!form.fromAccountId || !form.toAccountId || !form.amount || sameAccount) return;
    addTransfer({
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount: form.amount,
      date: form.date,
      note: form.note || undefined,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Transferir entre cuentas</DialogTitle>
        <DialogDescription>
          Mueve dinero entre tus propias cuentas. No cuenta como gasto ni como ingreso.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <Select
              value={form.fromAccountId}
              onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias} · {formatCurrency(a.balance, { compact: true })}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hacia</Label>
            <Select
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alias}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Nota (opcional)</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Ej: pase mensual a ahorro"
          />
        </div>
        {sameAccount && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
            ⚠️ Las cuentas origen y destino son la misma.
          </div>
        )}
        {!sameAccount && insufficient && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-danger">
            ⚠️ La cuenta de origen quedará en negativo.
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={sameAccount}>
          Transferir
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AccountMovements({
  accountId,
  cycle,
  onClose,
}: {
  accountId: string;
  cycle: FinancialCycle;
  onClose: () => void;
}) {
  const account = useFinance((s) => s.accounts.find((a) => a.id === accountId));
  const allDebit = useFinance((s) => s.debitExpenses);
  const allIncome = useFinance((s) => s.incomeEvents);
  const allTransfers = useFinance((s) => s.transfers);
  const accountsAll = useFinance((s) => s.accounts);
  const removeExpense = useFinance((s) => s.removeDebitExpense);
  const removeIncome = useFinance((s) => s.removeIncomeEvent);
  const removeTransfer = useFinance((s) => s.removeTransfer);

  /** Unifies expenses + income + transfers for this account within the cycle. */
  type Movement = {
    id: string;
    kind: "expense" | "income" | "transfer-in" | "transfer-out";
    date: string;
    amount: number;
    label: string;
    sub?: string;
    onRemove: () => void;
  };

  const movements = useMemo<Movement[]>(() => {
    const items: Movement[] = [];

    allDebit
      .filter((e) => e.accountId === accountId && isInCycle(e.date, cycle))
      .forEach((e) => {
        items.push({
          id: e.id,
          kind: "expense",
          date: e.date,
          amount: e.amount,
          label: e.description || categoryLabels[e.category],
          sub:
            categoryLabels[e.category] +
            (e.tags?.length ? ` · ${e.tags.map((t) => `#${t}`).join(" ")}` : ""),
          onRemove: () => removeExpense(e.id),
        });
      });

    allIncome
      .filter((e) => e.accountId === accountId && isInCycle(e.date, cycle))
      .forEach((e) => {
        items.push({
          id: e.id,
          kind: "income",
          date: e.date,
          amount: e.amount,
          label: e.description || incomeSourceLabels[e.source],
          sub: incomeSourceLabels[e.source],
          onRemove: () => removeIncome(e.id),
        });
      });

    allTransfers
      .filter(
        (t) =>
          (t.fromAccountId === accountId || t.toAccountId === accountId) &&
          isInCycle(t.date, cycle)
      )
      .forEach((t) => {
        const isOut = t.fromAccountId === accountId;
        const other = isOut
          ? accountsAll.find((a) => a.id === t.toAccountId)
          : accountsAll.find((a) => a.id === t.fromAccountId);
        items.push({
          id: t.id,
          kind: isOut ? "transfer-out" : "transfer-in",
          date: t.date,
          amount: t.amount,
          label: isOut ? `Hacia ${other?.alias ?? "otra cuenta"}` : `Desde ${other?.alias ?? "otra cuenta"}`,
          sub: t.note ?? "Transferencia entre cuentas propias",
          onRemove: () => removeTransfer(t.id),
        });
      });

    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [allDebit, allIncome, allTransfers, accountsAll, accountId, cycle, removeExpense, removeIncome, removeTransfer]);

  if (!account) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Movimientos · {account.alias}</CardTitle>
          <CardDescription>
            {format(cycle.start, "d MMM", { locale: es })} —{" "}
            {format(cycle.end, "d MMM yyyy", { locale: es })}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </CardHeader>
      <CardContent>
        {movements.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">
            No hay movimientos en este ciclo.
          </p>
        ) : (
          <div className="rounded-xl border border-line divide-y divide-line bg-surface">
            {movements.map((m) => (
              <MovementRow key={`${m.kind}-${m.id}`} m={m} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MovementRow({
  m,
}: {
  m: {
    kind: "expense" | "income" | "transfer-in" | "transfer-out";
    date: string;
    amount: number;
    label: string;
    sub?: string;
    onRemove: () => void;
  };
}) {
  const isPositive = m.kind === "income" || m.kind === "transfer-in";
  const Icon =
    m.kind === "income"
      ? TrendingUp
      : m.kind === "expense"
      ? TrendingDown
      : m.kind === "transfer-out"
      ? ArrowLeftRight
      : Sparkles;
  const iconTone =
    m.kind === "income"
      ? "bg-brand-100 text-brand-700"
      : m.kind === "expense"
      ? "bg-red-500/10 text-danger"
      : "bg-brand-50 text-brand-600";
  return (
    <div className="flex items-center justify-between p-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{m.label}</p>
          <p className="text-xs text-ink-muted truncate">
            {formatDate(m.date, "d MMM yyyy")}
            {m.sub && ` · ${m.sub}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <p
          className={`text-sm font-semibold tabular-nums ${
            isPositive ? "text-brand-700" : "text-ink"
          }`}
        >
          {isPositive ? "+" : "−"}
          {formatCurrency(m.amount)}
        </p>
        <button
          onClick={m.onRemove}
          className="text-xs text-ink-muted hover:text-danger"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
