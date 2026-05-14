import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CreditCard as CreditCardIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
  Sparkles,
  Trophy,
  Flame,
  CalendarDays,
  Scale,
  Compass,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CycleSelector } from "@/components/CycleSelector";
import { DeltaBadge } from "@/components/DeltaBadge";
import { CategoryPie } from "@/components/CategoryPie";
import {
  selectAccountsTotal,
  selectCardsUsed,
  selectFixedExpensesTotal,
  selectMonthlyLoansTotal,
  selectMonthlyMSITotal,
  useFinance,
} from "@/store/data";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  getCardSchedule,
  getFinancialCycle,
  isInCycle,
  previousCycle,
} from "@/lib/finance";
import { format, isWithinInterval, addDays, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNotifications } from "@/hooks/useNotifications";

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl">
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="analysis">Análisis del ciclo</TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          <TodayTab />
        </TabsContent>
        <TabsContent value="analysis">
          <AnalysisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TodayTab() {
  const state = useFinance();
  const accountsTotal = useFinance(selectAccountsTotal);
  const cardsUsed = useFinance(selectCardsUsed);
  const fixedTotal = useFinance(selectFixedExpensesTotal);
  const loansTotal = useFinance(selectMonthlyLoansTotal);
  const msiTotal = useFinance(selectMonthlyMSITotal);
  const today = new Date();
  const notifications = useNotifications();

  const cycle = getFinancialCycle(today, state.user.payday);
  const isPayday = today.getDate() === state.user.payday;

  const totalMonthlyCommitments = fixedTotal + loansTotal + msiTotal;
  const availableNow = accountsTotal - totalMonthlyCommitments;
  const incomeCommittedPct =
    state.user.monthlyIncome > 0
      ? totalMonthlyCommitments / state.user.monthlyIncome
      : 0;

  // Net worth = balances + savings in goals - active debts - card balances
  const goalsTotal = state.goals.reduce((s, g) => s + g.currentAmount, 0);
  const loansRemaining = state.loans.reduce((s, l) => s + l.remainingAmount, 0);
  const msiRemaining = state.msi.reduce(
    (s, m) => s + Math.max(0, m.totalMonths - m.monthsPaid) * m.monthlyAmount,
    0
  );
  const netWorth = accountsTotal + goalsTotal - cardsUsed - loansRemaining - msiRemaining;

  // Forecast: how much will remain at cycle end if spending at current rate.
  const forecast = useMemo(() => {
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = cycle.start;
    const elapsedDays = Math.max(1, differenceInCalendarDays(today0, start) + 1);
    const totalDays = differenceInCalendarDays(cycle.end, start) + 1;
    const daysLeft = Math.max(0, totalDays - elapsedDays);
    const cycleSpent = [
      ...state.debitExpenses,
      ...state.cardExpenses,
    ]
      .filter((e) => new Date(e.date) >= start && new Date(e.date) <= cycle.end)
      .reduce((s, e) => s + e.amount, 0);
    const dailyAvg = elapsedDays > 0 ? cycleSpent / elapsedDays : 0;
    const projectedSpend = dailyAvg * daysLeft;
    const fixedPending = state.fixedExpenses
      .filter((f) => !f.paidCycles.includes(cycle.label))
      .reduce((s, f) => s + f.amount, 0);
    const projectedEndOfCycle = accountsTotal - projectedSpend - fixedPending;
    return { dailyAvg, daysLeft, projectedSpend, projectedEndOfCycle, fixedPending };
  }, [today, cycle, state.debitExpenses, state.cardExpenses, state.fixedExpenses, accountsTotal]);

  const upcoming = useMemo(() => {
    const end = addDays(today, 7);
    const items: Array<{
      id: string;
      label: string;
      sub: string;
      date: Date;
      amount: number;
      kind: "fixed" | "card";
    }> = [];

    state.fixedExpenses.forEach((f) => {
      const candidates: Date[] = [];
      const m = today.getMonth();
      const y = today.getFullYear();
      [new Date(y, m, f.payDay), new Date(y, m + 1, f.payDay)].forEach((d) => {
        if (isWithinInterval(d, { start: today, end })) candidates.push(d);
      });
      candidates.forEach((d) => {
        items.push({
          id: `f-${f.id}-${d.getTime()}`,
          label: f.name,
          sub: "Gasto fijo",
          date: d,
          amount: f.amount,
          kind: "fixed",
        });
      });
    });

    state.cards.forEach((c) => {
      const sched = getCardSchedule(today, c);
      if (sched.daysToDue <= 7 && c.balance > 0) {
        items.push({
          id: `c-${c.id}`,
          label: c.alias,
          sub: "Tarjeta de crédito",
          date: sched.nextDue,
          amount: c.balance,
          kind: "card",
        });
      }
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [state, today]);

  return (
    <div className="space-y-6">
      {isPayday && (
        <Card className="bg-gradient-to-r from-brand-900 to-brand-700 border-0 text-white animate-fade-in">
          <CardContent className="p-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock className="h-5 w-5" />
                <Badge variant="ink" className="bg-white/15 border-white/20">
                  Hoy es tu día de pago
                </Badge>
              </div>
              <h3 className="text-2xl font-semibold">
                ¡Marea está alta! Tienes pagos por hacer hoy.
              </h3>
              <p className="text-brand-100 text-sm mt-1">
                Suma de compromisos del mes: {formatCurrency(totalMonthlyCommitments)}
              </p>
            </div>
            <Button asChild variant="secondary" className="bg-white text-brand-900 hover:bg-brand-50">
              <Link to="/fixed">
                Ver pagos pendientes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Disponible ahora"
          value={formatCurrency(accountsTotal)}
          sub={`En ${state.accounts.length} cuentas`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Compromisos del mes"
          value={formatCurrency(totalMonthlyCommitments)}
          sub={`Fijos + deudas + MSI`}
          icon={TrendingDown}
          tone="muted"
        />
        <StatCard
          label="Saldo proyectado"
          value={formatCurrency(availableNow)}
          sub="Disponible − compromisos"
          icon={TrendingUp}
          tone={availableNow >= 0 ? "positive" : "danger"}
        />
        <StatCard
          label="Tarjetas usadas"
          value={formatCurrency(cardsUsed)}
          sub={`En ${state.cards.length} tarjetas`}
          icon={CreditCardIcon}
          tone="muted"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-700" />
              <CardTitle>Tu patrimonio neto</CardTitle>
            </div>
            <CardDescription>
              Saldos + ahorros en metas − deudas activas − tarjetas usadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-semibold tabular-nums ${netWorth < 0 ? "text-danger" : "text-brand-900"}`}>
              {formatCurrency(netWorth)}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
              <div className="flex justify-between rounded-lg bg-brand-50/60 p-2">
                <span className="text-ink-soft">+ Cuentas</span>
                <span className="font-medium text-brand-900 tabular-nums">{formatCurrency(accountsTotal, { compact: true })}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-brand-50/60 p-2">
                <span className="text-ink-soft">+ Metas</span>
                <span className="font-medium text-brand-900 tabular-nums">{formatCurrency(goalsTotal, { compact: true })}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-red-500/5 p-2">
                <span className="text-ink-soft">− Tarjetas</span>
                <span className="font-medium text-danger tabular-nums">{formatCurrency(cardsUsed, { compact: true })}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-red-500/5 p-2">
                <span className="text-ink-soft">− Deudas</span>
                <span className="font-medium text-danger tabular-nums">{formatCurrency(loansRemaining + msiRemaining, { compact: true })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-brand-700" />
              <CardTitle>Proyección de fin de ciclo</CardTitle>
            </div>
            <CardDescription>
              Al ritmo actual ({formatCurrency(forecast.dailyAvg, { compact: true })}/día), te quedan {forecast.daysLeft} día{forecast.daysLeft === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-semibold tabular-nums ${forecast.projectedEndOfCycle < 0 ? "text-danger" : "text-brand-900"}`}>
              {formatCurrency(forecast.projectedEndOfCycle)}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              {forecast.projectedEndOfCycle < 0
                ? "Si sigues así, terminarás el ciclo en rojo. Considera ajustar gastos."
                : "Saldo estimado al cierre, si todo sigue igual."}
            </p>
            <div className="mt-4 space-y-1 text-xs text-ink-muted">
              <div className="flex justify-between">
                <span>Gasto proyectado restante</span>
                <span className="tabular-nums text-ink">{formatCurrency(forecast.projectedSpend)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fijos pendientes del ciclo</span>
                <span className="tabular-nums text-ink">{formatCurrency(forecast.fixedPending)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Próximos pagos · 7 días</CardTitle>
              <CardDescription>
                Tus compromisos cronológicos para esta semana.
              </CardDescription>
            </div>
            <Badge variant="soft">{upcoming.length}</Badge>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                No hay pagos en los próximos 7 días. ¡Buen momento para ahorrar!
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-soft transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          u.kind === "card"
                            ? "bg-brand-100 text-brand-700"
                            : "bg-brand-50 text-brand-700"
                        }`}
                      >
                        {u.kind === "card" ? (
                          <CreditCardIcon className="h-5 w-5" />
                        ) : (
                          <CalendarClock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{u.label}</p>
                        <p className="text-xs text-ink-muted">
                          {u.sub} · {format(u.date, "EEE d MMM", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-brand-900 tabular-nums">
                      {formatCurrency(u.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo del ciclo</CardTitle>
            <CardDescription>
              {format(cycle.start, "d MMM", { locale: es })} —{" "}
              {format(cycle.end, "d MMM", { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <FlowChart cycleStart={cycle.start} />
            </div>
            <div className="mt-2 pt-3 border-t border-line">
              <p className="text-xs text-ink-muted">% del sueldo comprometido</p>
              <div className="flex items-end gap-2 mt-1">
                <p className="text-xl font-semibold text-brand-900">
                  {(incomeCommittedPct * 100).toFixed(0)}%
                </p>
                <Progress
                  value={Math.min(100, incomeCommittedPct * 100)}
                  className="flex-1 mb-1.5"
                  indicatorClassName={
                    incomeCommittedPct > 0.7 ? "bg-danger" : "bg-brand-600"
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Resumen de tarjetas</CardTitle>
            <CardDescription>Uso del crédito y próximas fechas.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/cards">
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.cards.length === 0 ? (
            <p className="text-sm text-ink-muted col-span-full py-6 text-center">
              No tienes tarjetas registradas.
            </p>
          ) : (
            state.cards.map((c) => {
              const sched = getCardSchedule(today, c);
              const usage = c.limit > 0 ? c.balance / c.limit : 0;
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-line bg-surface-soft hover:shadow-card transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{c.alias}</p>
                      <p className="text-xs text-ink-muted">{c.bank}</p>
                    </div>
                    <Badge
                      variant={
                        sched.daysToDue <= 3
                          ? "danger"
                          : sched.daysToDue <= 7
                          ? "warning"
                          : "outline"
                      }
                    >
                      {sched.daysToDue}d
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-xl font-semibold text-brand-900 tabular-nums">
                      {formatCurrency(c.balance, { compact: true })}
                    </p>
                    <p className="text-xs text-ink-muted">/ {formatCurrency(c.limit, { compact: true })}</p>
                  </div>
                  <Progress
                    value={usage * 100}
                    className="mt-2"
                    indicatorClassName={
                      usage > 0.8 ? "bg-danger" : usage > 0.5 ? "bg-brand-600" : "bg-brand-500"
                    }
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-ink-muted">
                    <span>Corte: día {c.cutoffDay}</span>
                    <span>Pago: {formatShortDate(sched.nextDue.toISOString())}</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {notifications.length > 0 && (
        <Card className="bg-brand-50/40 border-brand-100">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-900">
                Tienes {notifications.length} alerta{notifications.length === 1 ? "" : "s"} activa{notifications.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-ink-soft mt-0.5">
                {notifications[0].title}
              </p>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/notifications">Ver</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FlowChart({ cycleStart }: { cycleStart: Date }) {
  const incomeMonth = useFinance((s) => s.user.monthlyIncome);
  const cardExpenses = useFinance((s) => s.cardExpenses);
  const fixedTotal = useFinance(selectFixedExpensesTotal);
  const loansTotal = useFinance(selectMonthlyLoansTotal);
  const msiTotal = useFinance(selectMonthlyMSITotal);

  const data = useMemo(() => {
    const cardSpendingMonth = cardExpenses
      .filter((e) => new Date(e.date) >= cycleStart)
      .reduce((sum, e) => sum + e.amount, 0);
    return [
      { name: "Ingreso", value: incomeMonth, fill: "rgb(var(--c-brand-600))" },
      { name: "Fijos", value: fixedTotal, fill: "rgb(var(--c-brand-800))" },
      { name: "Tarjetas", value: cardSpendingMonth, fill: "rgb(var(--c-brand-400))" },
      { name: "Deudas", value: loansTotal + msiTotal, fill: "rgb(var(--c-brand-300))" },
    ];
  }, [cardExpenses, cycleStart, incomeMonth, fixedTotal, loansTotal, msiTotal]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgb(var(--c-line))" vertical={false} />
        <XAxis
          dataKey="name"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          stroke="rgb(var(--c-ink-muted))"
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          stroke="rgb(var(--c-ink-muted))"
          tickFormatter={(v) => formatCurrency(v, { compact: true })}
        />
        <Tooltip
          cursor={{ fill: "rgb(var(--c-brand-50))" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgb(var(--c-line))",
            background: "rgb(var(--c-surface))",
            fontSize: 12,
            color: "rgb(var(--c-ink))",
          }}
          formatter={(v: any) => formatCurrency(Number(v))}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
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
const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;

function AnalysisTab() {
  const payday = useFinance((s) => s.user.payday);
  const debitExpenses = useFinance((s) => s.debitExpenses);
  const cardExpenses = useFinance((s) => s.cardExpenses);
  const incomeEvents = useFinance((s) => s.incomeEvents);
  const budgets = useFinance((s) => s.budgets);

  const today = new Date();
  const currentCycle = useMemo(() => getFinancialCycle(today, payday), [payday]);
  const [cycle, setCycle] = useState(currentCycle);
  const prev = useMemo(() => previousCycle(cycle, payday), [cycle, payday]);

  // Cycle aggregations
  const cycleData = useMemo(() => {
    const debit = debitExpenses.filter((e) => isInCycle(e.date, cycle));
    const card = cardExpenses.filter((e) => isInCycle(e.date, cycle));
    const income = incomeEvents.filter((e) => isInCycle(e.date, cycle));
    const all = [...debit, ...card];
    return {
      debit,
      card,
      income,
      all,
      spent: all.reduce((s, e) => s + e.amount, 0),
      earned: income.reduce((s, e) => s + e.amount, 0),
    };
  }, [debitExpenses, cardExpenses, incomeEvents, cycle]);

  const prevCycleData = useMemo(() => {
    const debit = debitExpenses.filter((e) => isInCycle(e.date, prev));
    const card = cardExpenses.filter((e) => isInCycle(e.date, prev));
    const income = incomeEvents.filter((e) => isInCycle(e.date, prev));
    const all = [...debit, ...card];
    return {
      spent: all.reduce((s, e) => s + e.amount, 0),
      earned: income.reduce((s, e) => s + e.amount, 0),
    };
  }, [debitExpenses, cardExpenses, incomeEvents, prev]);

  const net = cycleData.earned - cycleData.spent;
  const prevNet = prevCycleData.earned - prevCycleData.spent;
  const savingsRate = cycleData.earned > 0 ? Math.max(0, net / cycleData.earned) : 0;

  // Extra insights
  const topDay = useMemo(() => {
    const byDay = new Map<string, number>();
    cycleData.all.forEach((e) => {
      const key = e.date.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + e.amount);
    });
    let topKey: string | null = null;
    let topVal = 0;
    byDay.forEach((v, k) => {
      if (v > topVal) {
        topVal = v;
        topKey = k;
      }
    });
    return { date: topKey, amount: topVal };
  }, [cycleData.all]);

  const noSpendDays = useMemo(() => {
    const start = cycle.start;
    const end = cycle.end > today ? today : cycle.end;
    const totalDays = differenceInCalendarDays(end, start) + 1;
    const spentDays = new Set<string>();
    cycleData.all.forEach((e) => spentDays.add(e.date.slice(0, 10)));
    return Math.max(0, totalDays - spentDays.size);
  }, [cycle, cycleData.all, today]);

  const topMerchants = useMemo(() => {
    const byDesc = new Map<string, number>();
    cycleData.all.forEach((e) => {
      const key = e.description?.trim() || "Sin descripción";
      byDesc.set(key, (byDesc.get(key) ?? 0) + e.amount);
    });
    return Array.from(byDesc.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [cycleData.all]);

  const allTagsMap = useMemo(() => {
    const m = new Map<string, number>();
    cycleData.all.forEach((e) => {
      e.tags?.forEach((t) => m.set(t, (m.get(t) ?? 0) + e.amount));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [cycleData.all]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            Análisis completo del ciclo: gastos por categoría, ingresos, comparativa
            con el ciclo anterior. Navega al pasado con las flechas.
          </p>
        </div>
        <CycleSelector cycle={cycle} onChange={setCycle} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="stat-label">Gastado en el ciclo</p>
          <p className="stat-value mt-2">{formatCurrency(cycleData.spent)}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              {cycleData.all.length} movimiento{cycleData.all.length === 1 ? "" : "s"}
            </p>
            <DeltaBadge current={cycleData.spent} previous={prevCycleData.spent} lessIsBetter />
          </div>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Ingresos del ciclo</p>
          <p className="stat-value mt-2">{formatCurrency(cycleData.earned)}</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              {cycleData.income.length} entrada{cycleData.income.length === 1 ? "" : "s"}
            </p>
            <DeltaBadge current={cycleData.earned} previous={prevCycleData.earned} lessIsBetter={false} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Saldo neto</p>
          <p className={`stat-value mt-2 ${net < 0 ? "text-danger" : ""}`}>
            {net >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(net))}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-ink-muted">ingresos − gastos</p>
            <DeltaBadge current={net} previous={prevNet} lessIsBetter={false} />
          </div>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Savings rate</p>
          <p className="stat-value mt-2">{(savingsRate * 100).toFixed(0)}%</p>
          <Progress
            value={savingsRate * 100}
            className="mt-2"
            indicatorClassName={
              savingsRate > 0.2
                ? "bg-brand-600"
                : savingsRate > 0
                ? "bg-brand-400"
                : "bg-danger"
            }
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por categoría</CardTitle>
            <CardDescription>
              Débito + tarjetas de crédito del ciclo seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryPie expenses={cycleData.all} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tu ciclo en cifras</CardTitle>
            <CardDescription>Lo memorable del periodo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FactRow
              icon={Flame}
              label="Día con mayor gasto"
              value={
                topDay.date
                  ? `${format(new Date(topDay.date), "EEEE d 'de' MMMM", { locale: es })} · ${formatCurrency(topDay.amount)}`
                  : "—"
              }
            />
            <FactRow
              icon={Trophy}
              label="Días sin gastar"
              value={`${noSpendDays} día${noSpendDays === 1 ? "" : "s"}`}
              sub="Calculado hasta hoy"
            />
            <FactRow
              icon={Sparkles}
              label="Diferencia neta vs ciclo anterior"
              value={
                prevNet === 0
                  ? "—"
                  : `${net - prevNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(net - prevNet))}`
              }
              sub={
                prevNet === 0
                  ? "Sin ciclo previo para comparar"
                  : net - prevNet >= 0
                  ? "Mejor que el ciclo anterior"
                  : "Peor que el ciclo anterior"
              }
            />
            <FactRow
              icon={CalendarDays}
              label="Cierre del ciclo"
              value={format(cycle.end, "EEEE d 'de' MMMM", { locale: es })}
            />
          </CardContent>
        </Card>
      </div>

      {budgets.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Presupuestos del ciclo</CardTitle>
              <CardDescription>Tope vs. gasto real del ciclo seleccionado.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/budgets">
                Administrar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgets.map((b) => {
              const spent = cycleData.all
                .filter((e) => e.category === b.category)
                .reduce((s, e) => s + e.amount, 0);
              const pct = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
              const over = spent > b.amount;
              return (
                <div key={b.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink">{categoryLabel(b.category)}</span>
                    <span className={`tabular-nums ${over ? "text-danger font-semibold" : "text-ink"}`}>
                      {formatCurrency(spent)} / {formatCurrency(b.amount)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    indicatorClassName={over ? "bg-danger" : pct > 80 ? "bg-brand-700" : "bg-brand-500"}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tus 5 gastos más grandes</CardTitle>
            <CardDescription>Por descripción del movimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            {topMerchants.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-6">
                Sin gastos en este ciclo.
              </p>
            ) : (
              <ul className="space-y-2">
                {topMerchants.map(([name, amount], i) => (
                  <li
                    key={name + i}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-soft"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-semibold text-ink-muted w-5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-ink truncate">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-900 tabular-nums">
                      {formatCurrency(amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiquetas más usadas</CardTitle>
            <CardDescription>Suma de gastos por etiqueta libre.</CardDescription>
          </CardHeader>
          <CardContent>
            {allTagsMap.length === 0 ? (
              <p className="text-sm text-ink-muted text-center py-6">
                Aún no usas etiquetas. Agrégalas al registrar un gasto para análisis ad-hoc.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allTagsMap.map(([t, amount]) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-100"
                  >
                    #{t}
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(amount, { compact: true })}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-ink mt-0.5">{value}</p>
        {sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "positive" | "danger" | "muted";
}) {
  const tones: Record<typeof tone, string> = {
    primary: "bg-brand-600 text-white",
    positive: "bg-brand-100 text-brand-700",
    danger: "bg-red-500/10 text-danger",
    muted: "bg-surface-muted text-ink-soft",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="stat-value mt-3">{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
    </Card>
  );
}
