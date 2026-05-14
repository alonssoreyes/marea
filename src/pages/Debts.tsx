import { useState } from "react";
import {
  Plus,
  Wallet,
  TrendingDown,
  Sparkles,
  Trash2,
  Calendar,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import type { Loan, MSIPurchase } from "@/types";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Progress, ProgressRing } from "@/components/ui/Progress";
import { Input, Select } from "@/components/ui/Input";
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
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { loanProgress, msiProgress, projectLoanPayoff } from "@/lib/finance";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";

export default function Debts() {
  return (
    <div className="space-y-6 max-w-7xl">
      <Tabs defaultValue="loans">
        <TabsList>
          <TabsTrigger value="loans">Préstamos bancarios</TabsTrigger>
          <TabsTrigger value="msi">Meses sin intereses</TabsTrigger>
        </TabsList>
        <TabsContent value="loans">
          <Loans />
        </TabsContent>
        <TabsContent value="msi">
          <MSI />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loans() {
  const loans = useFinance((s) => s.loans);
  const addLoan = useFinance((s) => s.addLoan);
  const removeLoan = useFinance((s) => s.removeLoan);
  const registerPayment = useFinance((s) => s.registerLoanPayment);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [extraInput, setExtraInput] = useState<Record<string, number>>({});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-ink-muted">
          Cada pago amortiza tu deuda. Marea proyecta cuándo termina y cuánto puedes ahorrar.
        </p>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo préstamo
            </Button>
          </DialogTrigger>
          <AddLoanDialog onClose={() => setOpenAdd(false)} />
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditLoanDialog loan={editing} onClose={() => setEditing(null)} />}
      </Dialog>

      {loans.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No tienes préstamos registrados"
          description="Agrega tus préstamos para ver tu progreso y proyectar tu liquidación."
          action={
            <Button onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" />
              Agregar préstamo
            </Button>
          }
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {loans.map((loan) => {
            const progress = loanProgress(loan);
            const paid = loan.originalAmount - loan.remainingAmount;
            const baseline = projectLoanPayoff(loan, 0);
            const extra = extraInput[loan.id] ?? 0;
            const projected = projectLoanPayoff(loan, extra);
            const savings =
              extra > 0 && Number.isFinite(baseline.interestPaid) && Number.isFinite(projected.interestPaid)
                ? baseline.interestPaid - projected.interestPaid
                : 0;
            const monthsSaved =
              extra > 0 && Number.isFinite(baseline.months) && Number.isFinite(projected.months)
                ? baseline.months - projected.months
                : 0;
            const liquidationDate = Number.isFinite(baseline.months)
              ? addMonths(new Date(), baseline.months)
              : null;

            return (
              <Card key={loan.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{loan.bank}</CardTitle>
                      <CardDescription>
                        Préstamo personal · {formatPercent(loan.annualRate)} anual
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditing(loan)}
                        className="p-1.5 text-ink-muted hover:bg-surface-muted rounded-lg"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar préstamo ${loan.bank}? También se borrarán todos sus pagos.`)) removeLoan(loan.id);
                        }}
                        className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-5">
                    <ProgressRing value={progress} size={120} stroke={11}>
                      <div>
                        <p className="text-xl font-semibold text-brand-900 tabular-nums">
                          {(progress * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-ink-muted">pagado</p>
                      </div>
                    </ProgressRing>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="stat-label">Restante</p>
                        <p className="text-2xl font-semibold text-brand-900 tabular-nums">
                          {formatCurrency(loan.remainingAmount)}
                        </p>
                        <p className="text-xs text-ink-muted">
                          de {formatCurrency(loan.originalAmount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="soft">
                          {formatCurrency(loan.monthlyPayment)}/mes
                        </Badge>
                        <Badge variant="outline">
                          {loan.payments.length}/{loan.totalPayments} pagos
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-brand-50/50 border border-brand-100 p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-xs text-brand-800 space-y-1">
                        <p>
                          You've paid <strong>{formatCurrency(paid)}</strong> ({(progress * 100).toFixed(0)}%).
                          {liquidationDate && (
                            <>
                              {" "}Al ritmo actual, terminarás en{" "}
                              <strong>{format(liquidationDate, "MMMM yyyy", { locale: es })}</strong>.
                            </>
                          )}
                        </p>
                        <p>
                          Pagarás aprox. <strong>{formatCurrency(baseline.interestPaid)}</strong> en intereses si no aumentas tu mensualidad.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Simular pago extra mensual</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={extra || ""}
                        onChange={(e) =>
                          setExtraInput({ ...extraInput, [loan.id]: Number(e.target.value) })
                        }
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setExtraInput({ ...extraInput, [loan.id]: 0 })}
                      >
                        Limpiar
                      </Button>
                    </div>
                    {extra > 0 && monthsSaved > 0 && (
                      <div className="rounded-lg bg-surface-soft border border-line p-2.5 text-xs">
                        <p className="text-ink">
                          Con <strong>{formatCurrency(extra)}</strong> extra al mes:{" "}
                          terminarías <strong>{monthsSaved} mes{monthsSaved === 1 ? "" : "es"}</strong> antes y ahorrarías{" "}
                          <strong>{formatCurrency(savings)}</strong> en intereses.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-line">
                    <Button
                      onClick={() => registerPayment(loan.id, extra)}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Registrar pago{" "}
                      {extra > 0
                        ? `de ${formatCurrency(loan.monthlyPayment + extra)}`
                        : "del mes"}
                    </Button>
                  </div>

                  {loan.payments.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-ink-soft hover:text-ink py-2">
                        Historial de pagos ({loan.payments.length})
                      </summary>
                      <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                        {[...loan.payments].reverse().map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-surface-muted"
                          >
                            <span className="text-ink-muted">
                              {formatDate(p.date, "d MMM yyyy")}
                            </span>
                            <span className="font-medium text-ink tabular-nums">
                              {formatCurrency(p.amount)}
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
      )}
    </div>
  );
}

function EditLoanDialog({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const updateLoan = useFinance((s) => s.updateLoan);
  const accounts = useFinance((s) => s.accounts);
  const [form, setForm] = useState({
    bank: loan.bank,
    originalAmount: loan.originalAmount,
    remainingAmount: loan.remainingAmount,
    annualRate: loan.annualRate,
    totalPayments: loan.totalPayments,
    monthlyPayment: loan.monthlyPayment,
    startDate: loan.startDate.slice(0, 10),
    sourceAccountId: loan.sourceAccountId ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const res = await updateLoan(loan.id, {
      ...form,
      sourceAccountId: form.sourceAccountId || null,
    });
    setSaving(false);
    if (res) onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar préstamo</DialogTitle>
        <DialogDescription>Modifica los términos. El historial de pagos se conserva.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Banco</Label>
          <Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Monto original</Label>
          <Input type="number" value={form.originalAmount || ""} onChange={(e) => setForm({ ...form, originalAmount: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Monto restante</Label>
          <Input type="number" value={form.remainingAmount || ""} onChange={(e) => setForm({ ...form, remainingAmount: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tasa anual</Label>
          <Input type="number" step={0.01} value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Mensualidad</Label>
          <Input type="number" value={form.monthlyPayment || ""} onChange={(e) => setForm({ ...form, monthlyPayment: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Total de mensualidades</Label>
          <Input type="number" value={form.totalPayments} onChange={(e) => setForm({ ...form, totalPayments: Number(e.target.value) })} />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Se paga desde</Label>
          <Select
            value={form.sourceAccountId}
            onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
          >
            <option value="">— Sin cuenta (no descontará saldo) —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.alias} · {a.bank}</option>
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

function AddLoanDialog({ onClose }: { onClose: () => void }) {
  const addLoan = useFinance((s) => s.addLoan);
  const accounts = useFinance((s) => s.accounts);
  const [form, setForm] = useState({
    bank: "",
    originalAmount: 0,
    remainingAmount: 0,
    annualRate: 0.15,
    totalPayments: 24,
    monthlyPayment: 0,
    startDate: new Date().toISOString().slice(0, 10),
    sourceAccountId: accounts[0]?.id ?? "",
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo préstamo</DialogTitle>
        <DialogDescription>Marea calculará tu proyección automáticamente.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label>Banco</Label>
          <Input
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Monto original</Label>
          <Input
            type="number"
            value={form.originalAmount || ""}
            onChange={(e) =>
              setForm({
                ...form,
                originalAmount: Number(e.target.value),
                remainingAmount: form.remainingAmount || Number(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Monto restante</Label>
          <Input
            type="number"
            value={form.remainingAmount || ""}
            onChange={(e) => setForm({ ...form, remainingAmount: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tasa anual</Label>
          <Input
            type="number"
            step={0.01}
            value={form.annualRate}
            onChange={(e) => setForm({ ...form, annualRate: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Mensualidad</Label>
          <Input
            type="number"
            value={form.monthlyPayment || ""}
            onChange={(e) => setForm({ ...form, monthlyPayment: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Total de mensualidades</Label>
          <Input
            type="number"
            value={form.totalPayments}
            onChange={(e) => setForm({ ...form, totalPayments: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Se paga desde</Label>
          <Select
            value={form.sourceAccountId}
            onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
          >
            <option value="">— Selecciona cuenta —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.alias} · {a.bank}</option>
            ))}
          </Select>
          <p className="text-xs text-ink-muted">
            Cada pago registrado descontará la mensualidad de esta cuenta.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!form.bank || !form.sourceAccountId) return;
            addLoan({ ...form, sourceAccountId: form.sourceAccountId });
            onClose();
          }}
        >
          Agregar préstamo
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MSI() {
  const msi = useFinance((s) => s.msi);
  const addMSI = useFinance((s) => s.addMSI);
  const removeMSI = useFinance((s) => s.removeMSI);
  const registerPayment = useFinance((s) => s.registerMSIPayment);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<MSIPurchase | null>(null);

  const totalMonthly = msi
    .filter((m) => m.monthsPaid < m.totalMonths)
    .reduce((s, m) => s + m.monthlyAmount, 0);
  const activeCount = msi.filter((m) => m.monthsPaid < m.totalMonths).length;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="stat-label">Compromiso mensual</p>
          <p className="stat-value mt-2">{formatCurrency(totalMonthly)}</p>
          <p className="text-xs text-ink-muted mt-1">
            En {activeCount} MSI activo{activeCount === 1 ? "" : "s"}
          </p>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <TrendingDown className="h-10 w-10 text-brand-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-ink">
              {msi.length === 0
                ? "Sin meses sin intereses"
                : `${msi.length} compra${msi.length === 1 ? "" : "s"} con MSI`}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              {activeCount} activa{activeCount === 1 ? "" : "s"} ·{" "}
              {msi.length - activeCount} liquidada{msi.length - activeCount === 1 ? "" : "s"}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nueva compra MSI
            </Button>
          </DialogTrigger>
          <AddMSIDialog onClose={() => setOpenAdd(false)} />
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && <EditMSIDialog msi={editing} onClose={() => setEditing(null)} />}
      </Dialog>

      {msi.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No tienes compras a meses sin intereses"
          description="Agrega tus compras MSI para tener visibilidad de tus compromisos mensuales."
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {msi.map((m) => {
            const progress = msiProgress(m);
            const remaining = m.totalMonths - m.monthsPaid;
            const isDone = m.monthsPaid >= m.totalMonths;
            const endDate = addMonths(new Date(m.startDate), m.totalMonths);
            return (
              <Card key={m.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{m.description}</p>
                    <p className="text-xs text-ink-muted">{m.store}</p>
                  </div>
                  {isDone ? (
                    <Badge variant="soft">Pagada</Badge>
                  ) : (
                    <Badge variant="outline">
                      {m.monthsPaid}/{m.totalMonths}
                    </Badge>
                  )}
                </div>
                <p className="text-xl font-semibold text-brand-900 tabular-nums">
                  {formatCurrency(m.monthlyAmount)}<span className="text-xs font-normal text-ink-muted">/mes</span>
                </p>
                <Progress value={progress * 100} className="mt-3" />
                <p className="text-xs text-ink-muted mt-2">
                  {isDone
                    ? "Liquidada"
                    : `Faltan ${remaining} mes${remaining === 1 ? "" : "es"} · termina ${format(endDate, "MMM yyyy", { locale: es })}`}
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Total: {formatCurrency(m.totalAmount)}
                </p>
                <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => registerPayment(m.id)}
                    disabled={isDone}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Registrar pago
                  </Button>
                  <button
                    onClick={() => setEditing(m)}
                    className="p-2 text-ink-muted hover:bg-surface-muted rounded-lg"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar ${m.description}? También se borrarán los pagos registrados.`)) removeMSI(m.id);
                    }}
                    className="p-2 text-ink-muted hover:text-danger hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditMSIDialog({ msi, onClose }: { msi: MSIPurchase; onClose: () => void }) {
  const updateMSI = useFinance((s) => s.updateMSI);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const [form, setForm] = useState({
    description: msi.description,
    store: msi.store,
    totalAmount: msi.totalAmount,
    totalMonths: msi.totalMonths,
    monthlyAmount: msi.monthlyAmount,
    monthsPaid: msi.monthsPaid,
    sourceKey: msi.source ? `${msi.source.kind}:${msi.source.id}` : "",
  });
  const [saving, setSaving] = useState(false);

  const sources = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.alias} · ${a.bank} (débito)` })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.alias} · ${c.bank} (crédito)` })),
  ];

  const submit = async () => {
    setSaving(true);
    const [kind, id] = form.sourceKey ? form.sourceKey.split(":") : ["", ""];
    const res = await updateMSI(msi.id, {
      description: form.description,
      store: form.store,
      totalAmount: form.totalAmount,
      totalMonths: form.totalMonths,
      monthlyAmount: form.monthlyAmount,
      monthsPaid: form.monthsPaid,
      source: kind && id ? { kind: kind as "account" | "card", id } : null,
    } as any);
    setSaving(false);
    if (res) onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar compra MSI</DialogTitle>
        <DialogDescription>Ajusta los datos. Los pagos ya registrados no se ven afectados.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tienda</Label>
          <Input value={form.store} onChange={(e) => setForm({ ...form, store: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Monto total</Label>
          <Input
            type="number"
            value={form.totalAmount || ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              setForm({ ...form, totalAmount: v, monthlyAmount: form.totalMonths ? v / form.totalMonths : 0 });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Meses totales</Label>
          <Input
            type="number"
            value={form.totalMonths}
            onChange={(e) => {
              const v = Number(e.target.value);
              setForm({ ...form, totalMonths: v, monthlyAmount: form.totalAmount && v ? form.totalAmount / v : 0 });
            }}
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Meses pagados</Label>
          <Input
            type="number"
            min={0}
            max={form.totalMonths}
            value={form.monthsPaid}
            onChange={(e) => setForm({ ...form, monthsPaid: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Se carga a</Label>
          <Select value={form.sourceKey} onChange={(e) => setForm({ ...form, sourceKey: e.target.value })}>
            <option value="">— Sin origen (no afectará saldos) —</option>
            {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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

function AddMSIDialog({ onClose }: { onClose: () => void }) {
  const addMSI = useFinance((s) => s.addMSI);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const [form, setForm] = useState({
    description: "",
    store: "",
    totalAmount: 0,
    totalMonths: 12,
    monthlyAmount: 0,
    startDate: new Date().toISOString().slice(0, 10),
    sourceKey: cards[0] ? `card:${cards[0].id}` : accounts[0] ? `account:${accounts[0].id}` : "",
  });

  const sources = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.alias} · ${a.bank} (débito)` })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.alias} · ${c.bank} (crédito)` })),
  ];

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva compra a meses sin intereses</DialogTitle>
        <DialogDescription>
          La mensualidad se calculará automáticamente.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tienda</Label>
            <Input
              value={form.store}
              onChange={(e) => setForm({ ...form, store: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Monto total</Label>
            <Input
              type="number"
              value={form.totalAmount || ""}
              onChange={(e) => {
                const v = Number(e.target.value);
                setForm({
                  ...form,
                  totalAmount: v,
                  monthlyAmount: form.totalMonths ? v / form.totalMonths : 0,
                });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meses</Label>
            <Input
              type="number"
              value={form.totalMonths}
              onChange={(e) => {
                const v = Number(e.target.value);
                setForm({
                  ...form,
                  totalMonths: v,
                  monthlyAmount: form.totalAmount && v ? form.totalAmount / v : 0,
                });
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Se carga a</Label>
          <Select value={form.sourceKey} onChange={(e) => setForm({ ...form, sourceKey: e.target.value })}>
            <option value="">— Selecciona origen —</option>
            {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </Select>
          <p className="text-xs text-ink-muted">
            Si es tarjeta, cada pago mensual aumentará su deuda. Si es cuenta, descontará el saldo.
          </p>
        </div>
        {form.monthlyAmount > 0 && (
          <div className="rounded-xl bg-brand-50/60 border border-brand-100 p-3 text-sm text-brand-800">
            Mensualidad: <strong>{formatCurrency(form.monthlyAmount)}</strong>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => {
            if (!form.description || !form.sourceKey) return;
            const [kind, id] = form.sourceKey.split(":");
            addMSI({
              description: form.description,
              store: form.store,
              totalAmount: form.totalAmount,
              totalMonths: form.totalMonths,
              monthlyAmount: form.monthlyAmount,
              startDate: form.startDate,
              source: { kind: kind as "account" | "card", id },
            });
            onClose();
          }}
        >
          Agregar MSI
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
