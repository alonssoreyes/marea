import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "@/store/data";
import { authApi } from "@/lib/api";
import { toast } from "@/components/ui/Toaster";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Wallet,
  CreditCard,
  Receipt,
  PiggyBank,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/types";
import { formatCurrency } from "@/lib/format";

const steps = [
  { num: 1, title: "Perfil", icon: CalendarDays },
  { num: 2, title: "Cuentas", icon: Wallet },
  { num: 3, title: "Tarjetas", icon: CreditCard },
  { num: 4, title: "Gastos fijos", icon: Receipt },
  { num: 5, title: "Deudas", icon: PiggyBank },
];

/**
 * Each step can register a "commit pending" function — if the user has
 * a valid draft in the form and clicks Continue/Skip without clicking
 * "Add", the draft is automatically saved before advancing.
 */
type PendingCommit = (() => Promise<void>) | null;

export default function Onboarding() {
  const navigate = useNavigate();
  const updateUser = useFinance((s) => s.updateUser);
  const initialStep = useFinance((s) => s.user.onboardingStep);
  const [step, setStep] = useState(Math.max(1, initialStep || 1));

  const pendingCommitRef = useRef<PendingCommit>(null);
  const setPendingCommit = (fn: PendingCommit) => {
    pendingCommitRef.current = fn;
  };

  /** Persists the user to backend ALWAYS reading the most recent state
   *  (avoids closures with stale values after `updateUser`). */
  const syncUserToServer = async () => {
    const user = useFinance.getState().user;
    try {
      await authApi.updateMe({
        name: user.name,
        payday: user.payday,
        loanPayday: user.loanPayday,
        monthlyIncome: user.monthlyIncome,
        onboardingStep: user.onboardingStep,
      });
    } catch (err) {
      console.error("Failed to sync user to server:", err);
      toast.error("No se pudo sincronizar tu progreso con el servidor");
    }
  };

  const next = async () => {
    // Commit any pending draft from current step (account/card/etc).
    const pending = pendingCommitRef.current;
    if (pending) {
      try {
        await pending();
      } catch (err) {
        console.error("Pending commit failed:", err);
      }
      pendingCommitRef.current = null;
    }

    const newStep = Math.min(6, step + 1);
    const finalStep = newStep > 5 ? 5 : newStep - 1;
    updateUser({ onboardingStep: finalStep });
    await syncUserToServer();

    if (newStep > 5) {
      navigate("/dashboard");
    } else {
      setStep(newStep);
    }
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="min-h-screen bg-surface-soft py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-9 w-9 rounded-xl bg-brand-900 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="h-6 w-6">
              <path d="M4 20 Q 8 14, 12 20 T 20 20 T 28 20" stroke="#BFDBFE" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M4 25 Q 8 19, 12 25 T 20 25 T 28 25" stroke="#60A5FA" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-brand-900">Marea</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center transition-all",
                      isActive && "bg-brand-600 text-white scale-110",
                      isDone && "bg-brand-100 text-brand-700",
                      !isActive && !isDone && "bg-surface border border-line text-ink-muted"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] font-medium truncate",
                      isActive ? "text-brand-700" : "text-ink-muted"
                    )}
                  >
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-2 mb-5",
                      isDone ? "bg-brand-200" : "bg-line"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card className="p-6 md:p-8 animate-fade-in">
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 setPendingCommit={setPendingCommit} />}
          {step === 3 && <Step3 setPendingCommit={setPendingCommit} />}
          {step === 4 && <Step4 setPendingCommit={setPendingCommit} />}
          {step === 5 && <Step5 setPendingCommit={setPendingCommit} />}

          {step > 1 && (
            <p className="mt-6 text-[11px] text-ink-muted">
              💡 Si llenaste un formulario y olvidaste hacer click en "Agregar", al
              avanzar lo guardamos por ti.
            </p>
          )}
          <div className="flex items-center justify-between mt-4 pt-6 border-t border-line">
            <Button variant="ghost" onClick={prev} disabled={step === 1}>
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex gap-2">
              {step > 1 && step < 5 && (
                <Button variant="outline" onClick={next} title="Salta este paso; siempre puedes agregar después">
                  Saltar
                </Button>
              )}
              <Button onClick={next}>
                {step === 5 ? "Finalizar" : "Continuar"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-ink-muted mt-4">
          Puedes pausar en cualquier momento. Tu progreso se guarda automáticamente.
        </p>
      </div>
    </div>
  );
}

function Step1() {
  const user = useFinance((s) => s.user);
  const updateUser = useFinance((s) => s.updateUser);
  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-900">Cuéntanos sobre ti</h2>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Estos datos definen tu "ciclo financiero" — el ritmo con el que Marea entiende
        tu dinero.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Día de pago</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={user.payday}
            onChange={(e) => updateUser({ payday: Number(e.target.value) })}
          />
          <p className="text-xs text-ink-muted">
            Día del mes que recibes tu sueldo. Tu ciclo va del día {user.payday} al{" "}
            {user.payday - 1} del mes siguiente.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Día de pago de préstamos</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={user.loanPayday}
            onChange={(e) => updateUser({ loanPayday: Number(e.target.value) })}
          />
          <p className="text-xs text-ink-muted">Si aplica.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Sueldo mensual neto</Label>
          <Input
            type="number"
            min={0}
            value={user.monthlyIncome || ""}
            onChange={(e) => updateUser({ monthlyIncome: Number(e.target.value) })}
            placeholder="38000"
          />
        </div>
      </div>
    </div>
  );
}

function Step2({ setPendingCommit }: { setPendingCommit: (fn: PendingCommit) => void }) {
  const accounts = useFinance((s) => s.accounts);
  const addAccount = useFinance((s) => s.addAccount);
  const removeAccount = useFinance((s) => s.removeAccount);
  const [draft, setDraft] = useState({ bank: "", alias: "", balance: 0 });

  const submit = async () => {
    if (!draft.bank || !draft.alias) return;
    const result = await addAccount(draft);
    if (result) setDraft({ bank: "", alias: "", balance: 0 });
  };

  // If user filled the form and didn't click "Add", we save it when advancing.
  useEffect(() => {
    if (draft.bank && draft.alias) {
      setPendingCommit(async () => {
        await addAccount(draft);
      });
    } else {
      setPendingCommit(null);
    }
    return () => setPendingCommit(null);
  }, [draft, addAccount, setPendingCommit]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-900">Cuentas de débito</h2>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Agrega las cuentas donde tienes tu dinero. Puedes registrar varias.
      </p>

      {accounts.length > 0 && (
        <div className="space-y-2 mb-4">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-line"
            >
              <div>
                <p className="font-medium text-sm text-ink">{a.alias}</p>
                <p className="text-xs text-ink-muted">
                  {a.bank} · {formatCurrency(a.balance)}
                </p>
              </div>
              <button
                onClick={() => removeAccount(a.id)}
                className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Input
            placeholder="BBVA"
            value={draft.bank}
            onChange={(e) => setDraft((d) => ({ ...d, bank: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alias</Label>
          <Input
            placeholder="Cuenta principal"
            value={draft.alias}
            onChange={(e) => setDraft((d) => ({ ...d, alias: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo actual</Label>
          <Input
            type="number"
            placeholder="0"
            value={draft.balance || ""}
            onChange={(e) => setDraft((d) => ({ ...d, balance: Number(e.target.value) }))}
          />
        </div>
      </div>
      <Button variant="secondary" className="mt-3" onClick={submit}>
        <Plus className="h-4 w-4" />
        Agregar cuenta
      </Button>
    </div>
  );
}

function Step3({ setPendingCommit }: { setPendingCommit: (fn: PendingCommit) => void }) {
  const cards = useFinance((s) => s.cards);
  const addCard = useFinance((s) => s.addCard);
  const removeCard = useFinance((s) => s.removeCard);
  const [draft, setDraft] = useState({
    bank: "",
    alias: "",
    limit: 0,
    cutoffDay: 5,
    dueDay: 25,
    balance: 0,
  });

  const submit = async () => {
    if (!draft.bank || !draft.alias) return;
    const result = await addCard(draft);
    if (result) setDraft({ bank: "", alias: "", limit: 0, cutoffDay: 5, dueDay: 25, balance: 0 });
  };

  useEffect(() => {
    if (draft.bank && draft.alias) {
      setPendingCommit(async () => { await addCard(draft); });
    } else {
      setPendingCommit(null);
    }
    return () => setPendingCommit(null);
  }, [draft, addCard, setPendingCommit]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-900">Tarjetas de crédito</h2>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Marea usa tu fecha de corte y de pago para clasificar cada gasto en el ciclo correcto.
      </p>

      {cards.length > 0 && (
        <div className="space-y-2 mb-4">
          {cards.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-line"
            >
              <div>
                <p className="font-medium text-sm text-ink">{c.alias}</p>
                <p className="text-xs text-ink-muted">
                  {c.bank} · Corte día {c.cutoffDay} · Pago día {c.dueDay} ·{" "}
                  {formatCurrency(c.balance)} / {formatCurrency(c.limit)}
                </p>
              </div>
              <button
                onClick={() => removeCard(c.id)}
                className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Input
            value={draft.bank}
            onChange={(e) => setDraft({ ...draft, bank: e.target.value })}
            placeholder="BBVA"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alias</Label>
          <Input
            value={draft.alias}
            onChange={(e) => setDraft({ ...draft, alias: e.target.value })}
            placeholder="BBVA Oro"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Límite de crédito</Label>
          <Input
            type="number"
            value={draft.limit || ""}
            onChange={(e) => setDraft({ ...draft, limit: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo adeudado actual</Label>
          <Input
            type="number"
            value={draft.balance || ""}
            onChange={(e) => setDraft({ ...draft, balance: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Día de corte</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={draft.cutoffDay}
            onChange={(e) => setDraft({ ...draft, cutoffDay: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Día límite de pago</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={draft.dueDay}
            onChange={(e) => setDraft({ ...draft, dueDay: Number(e.target.value) })}
          />
        </div>
      </div>
      <Button variant="secondary" className="mt-3" onClick={submit}>
        <Plus className="h-4 w-4" />
        Agregar tarjeta
      </Button>
    </div>
  );
}

function Step4({ setPendingCommit }: { setPendingCommit: (fn: PendingCommit) => void }) {
  const fixed = useFinance((s) => s.fixedExpenses);
  const accounts = useFinance((s) => s.accounts);
  const cards = useFinance((s) => s.cards);
  const addFixedExpense = useFinance((s) => s.addFixedExpense);
  const removeFixedExpense = useFinance((s) => s.removeFixedExpense);

  const [draft, setDraft] = useState({
    name: "",
    amount: 0,
    payDay: 1,
    sourceKey: "",
  });

  const submit = async () => {
    if (!draft.name || !draft.sourceKey) return;
    const [kind, id] = draft.sourceKey.split(":");
    const result = await addFixedExpense({
      name: draft.name,
      amount: draft.amount,
      payDay: draft.payDay,
      source: { kind: kind as "account" | "card", id },
    });
    if (result) setDraft({ name: "", amount: 0, payDay: 1, sourceKey: "" });
  };

  useEffect(() => {
    if (draft.name && draft.sourceKey && draft.amount > 0) {
      setPendingCommit(async () => {
        const [kind, id] = draft.sourceKey.split(":");
        await addFixedExpense({
          name: draft.name,
          amount: draft.amount,
          payDay: draft.payDay,
          source: { kind: kind as "account" | "card", id },
        });
      });
    } else {
      setPendingCommit(null);
    }
    return () => setPendingCommit(null);
  }, [draft, addFixedExpense, setPendingCommit]);

  const sources: { key: string; label: string }[] = [
    ...accounts.map((a) => ({ key: `account:${a.id}`, label: `${a.alias} (débito)` })),
    ...cards.map((c) => ({ key: `card:${c.id}`, label: `${c.alias} (crédito)` })),
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-900">Gastos fijos mensuales</h2>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Renta, suscripciones, seguros... lo que pagas mes con mes sin falta.
      </p>

      {fixed.length > 0 && (
        <div className="space-y-2 mb-4">
          {fixed.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-line"
            >
              <div>
                <p className="font-medium text-sm text-ink">{f.name}</p>
                <p className="text-xs text-ink-muted">
                  {formatCurrency(f.amount)} · día {f.payDay}
                </p>
              </div>
              <button
                onClick={() => removeFixedExpense(f.id)}
                className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Netflix"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Monto</Label>
          <Input
            type="number"
            value={draft.amount || ""}
            onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Día de pago</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={draft.payDay}
            onChange={(e) => setDraft({ ...draft, payDay: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Se paga con</Label>
          <Select
            value={draft.sourceKey}
            onChange={(e) => setDraft({ ...draft, sourceKey: e.target.value })}
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
      <Button variant="secondary" className="mt-3" onClick={submit}>
        <Plus className="h-4 w-4" />
        Agregar gasto fijo
      </Button>
    </div>
  );
}

function Step5({ setPendingCommit }: { setPendingCommit: (fn: PendingCommit) => void }) {
  const loans = useFinance((s) => s.loans);
  const msi = useFinance((s) => s.msi);
  const addLoan = useFinance((s) => s.addLoan);
  const addMSI = useFinance((s) => s.addMSI);
  const removeLoan = useFinance((s) => s.removeLoan);
  const removeMSI = useFinance((s) => s.removeMSI);

  const [tab, setTab] = useState<"loan" | "msi">("loan");
  const [loanDraft, setLoanDraft] = useState({
    bank: "",
    originalAmount: 0,
    remainingAmount: 0,
    annualRate: 0.15,
    totalPayments: 24,
    monthlyPayment: 0,
    startDate: new Date().toISOString().slice(0, 10),
  });
  const [msiDraft, setMsiDraft] = useState({
    description: "",
    store: "",
    totalAmount: 0,
    totalMonths: 12,
    monthlyAmount: 0,
    startDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (tab === "loan" && loanDraft.bank && loanDraft.originalAmount > 0 && loanDraft.monthlyPayment > 0) {
      setPendingCommit(async () => { await addLoan(loanDraft); });
    } else if (tab === "msi" && msiDraft.description && msiDraft.totalAmount > 0 && msiDraft.totalMonths > 0) {
      setPendingCommit(async () => { await addMSI(msiDraft); });
    } else {
      setPendingCommit(null);
    }
    return () => setPendingCommit(null);
  }, [tab, loanDraft, msiDraft, addLoan, addMSI, setPendingCommit]);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-brand-900">Deudas activas</h2>
      <p className="text-sm text-ink-muted mt-1 mb-6">
        Préstamos bancarios y compras a meses sin intereses. Marea proyecta tu liquidación.
      </p>

      <div className="inline-flex p-1 bg-surface-muted rounded-xl mb-4">
        <button
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            tab === "loan" ? "bg-surface text-brand-700 shadow-sm" : "text-ink-muted"
          )}
          onClick={() => setTab("loan")}
        >
          Préstamos
        </button>
        <button
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
            tab === "msi" ? "bg-surface text-brand-700 shadow-sm" : "text-ink-muted"
          )}
          onClick={() => setTab("msi")}
        >
          Meses sin intereses
        </button>
      </div>

      {tab === "loan" ? (
        <>
          {loans.length > 0 && (
            <div className="space-y-2 mb-4">
              {loans.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-line"
                >
                  <div>
                    <p className="font-medium text-sm text-ink">{l.bank}</p>
                    <p className="text-xs text-ink-muted">
                      {formatCurrency(l.remainingAmount)} restante ·{" "}
                      {formatCurrency(l.monthlyPayment)}/mes
                    </p>
                  </div>
                  <button
                    onClick={() => removeLoan(l.id)}
                    className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Input
                value={loanDraft.bank}
                onChange={(e) => setLoanDraft({ ...loanDraft, bank: e.target.value })}
                placeholder="BBVA"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto original</Label>
              <Input
                type="number"
                value={loanDraft.originalAmount || ""}
                onChange={(e) =>
                  setLoanDraft({
                    ...loanDraft,
                    originalAmount: Number(e.target.value),
                    remainingAmount: loanDraft.remainingAmount || Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto restante</Label>
              <Input
                type="number"
                value={loanDraft.remainingAmount || ""}
                onChange={(e) =>
                  setLoanDraft({ ...loanDraft, remainingAmount: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tasa anual (ej. 0.18)</Label>
              <Input
                type="number"
                step={0.01}
                value={loanDraft.annualRate}
                onChange={(e) =>
                  setLoanDraft({ ...loanDraft, annualRate: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mensualidades totales</Label>
              <Input
                type="number"
                value={loanDraft.totalPayments}
                onChange={(e) =>
                  setLoanDraft({ ...loanDraft, totalPayments: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mensualidad</Label>
              <Input
                type="number"
                value={loanDraft.monthlyPayment || ""}
                onChange={(e) =>
                  setLoanDraft({ ...loanDraft, monthlyPayment: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              if (!loanDraft.bank) return;
              addLoan(loanDraft);
              setLoanDraft({
                bank: "",
                originalAmount: 0,
                remainingAmount: 0,
                annualRate: 0.15,
                totalPayments: 24,
                monthlyPayment: 0,
                startDate: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar préstamo
          </Button>
        </>
      ) : (
        <>
          {msi.length > 0 && (
            <div className="space-y-2 mb-4">
              {msi.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-soft border border-line"
                >
                  <div>
                    <p className="font-medium text-sm text-ink">{m.description}</p>
                    <p className="text-xs text-ink-muted">
                      {m.store} · {m.monthsPaid}/{m.totalMonths} meses ·{" "}
                      {formatCurrency(m.monthlyAmount)}/mes
                    </p>
                  </div>
                  <button
                    onClick={() => removeMSI(m.id)}
                    className="p-1.5 text-ink-muted hover:text-danger hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={msiDraft.description}
                onChange={(e) => setMsiDraft({ ...msiDraft, description: e.target.value })}
                placeholder="MacBook Air"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tienda</Label>
              <Input
                value={msiDraft.store}
                onChange={(e) => setMsiDraft({ ...msiDraft, store: e.target.value })}
                placeholder="Apple Store"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monto total</Label>
              <Input
                type="number"
                value={msiDraft.totalAmount || ""}
                onChange={(e) =>
                  setMsiDraft({
                    ...msiDraft,
                    totalAmount: Number(e.target.value),
                    monthlyAmount: msiDraft.totalMonths
                      ? Number(e.target.value) / msiDraft.totalMonths
                      : 0,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Meses totales</Label>
              <Input
                type="number"
                value={msiDraft.totalMonths}
                onChange={(e) =>
                  setMsiDraft({
                    ...msiDraft,
                    totalMonths: Number(e.target.value),
                    monthlyAmount: msiDraft.totalAmount
                      ? msiDraft.totalAmount / Number(e.target.value)
                      : 0,
                  })
                }
              />
            </div>
          </div>
          {msiDraft.monthlyAmount > 0 && (
            <Badge className="mt-3" variant="soft">
              Mensualidad: {formatCurrency(msiDraft.monthlyAmount)}
            </Badge>
          )}
          <div>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => {
                if (!msiDraft.description) return;
                addMSI(msiDraft);
                setMsiDraft({
                  description: "",
                  store: "",
                  totalAmount: 0,
                  totalMonths: 12,
                  monthlyAmount: 0,
                  startDate: new Date().toISOString().slice(0, 10),
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Agregar MSI
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
