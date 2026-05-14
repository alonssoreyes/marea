import { useMemo } from "react";
import { useFinance } from "@/store/data";
import { daysUntil, getCardSchedule, getFinancialCycle } from "@/lib/finance";
import type { AppNotification } from "@/types";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/format";

export function useNotifications() {
  const state = useFinance();
  const today = new Date();
  const dismissed = state.dismissedNotifications;

  return useMemo<AppNotification[]>(() => {
    const notifications: AppNotification[] = [];

    // cards with upcoming cutoff or payment
    state.cards.forEach((card) => {
      const { daysToDue, nextDue } = getCardSchedule(today, card);
      if (daysToDue <= 3 && card.balance > 0) {
        notifications.push({
          id: `n_card_${card.id}`,
          kind: "card-due-soon",
          title: `Tu ${card.alias} vence en ${daysToDue} día${daysToDue === 1 ? "" : "s"}`,
          body: `Saldo: ${formatCurrency(card.balance)} · Fecha límite: ${format(nextDue, "d MMM")}`,
          severity: daysToDue <= 1 ? "danger" : "warning",
          date: nextDue.toISOString(),
          relatedId: card.id,
          read: false,
        });
      }
    });

    // fixed expenses with day already passed in cycle and not marked as paid
    const cycle = getFinancialCycle(today, state.user.payday);
    state.fixedExpenses.forEach((fixed) => {
      const dayPassed = today.getDate() > fixed.payDay || today.getMonth() > cycle.start.getMonth();
      const isPaid = fixed.paidCycles.includes(cycle.label);
      if (dayPassed && !isPaid && fixed.payDay >= cycle.start.getDate()) {
        notifications.push({
          id: `n_fixed_${fixed.id}`,
          kind: "fixed-expense-overdue",
          title: `${fixed.name} pendiente`,
          body: `Su día de pago era el ${fixed.payDay} (${formatCurrency(fixed.amount)})`,
          severity: "warning",
          date: today.toISOString(),
          relatedId: fixed.id,
          read: false,
        });
      }
    });

    // loans without payment this month
    state.loans.forEach((loan) => {
      const thisMonth = format(today, "yyyy-MM");
      const paidThisMonth = loan.payments.some(
        (p) => format(new Date(p.date), "yyyy-MM") === thisMonth
      );
      if (!paidThisMonth && loan.remainingAmount > 0) {
        notifications.push({
          id: `n_loan_${loan.id}`,
          kind: "loan-unpaid",
          title: `Préstamo ${loan.bank} sin registrar`,
          body: `Mensualidad pendiente: ${formatCurrency(loan.monthlyPayment)}`,
          severity: "info",
          date: today.toISOString(),
          relatedId: loan.id,
          read: false,
        });
      }
    });

    // accounts below configured minimum balance
    state.accounts.forEach((account) => {
      if (account.minBalance === undefined) return;
      if (account.balance < account.minBalance) {
        const gap = account.minBalance - account.balance;
        notifications.push({
          id: `n_minbal_${account.id}`,
          kind: "min-balance",
          title: `${account.alias} bajo el mínimo`,
          body: `Balance ${formatCurrency(account.balance)} · ${formatCurrency(gap)} below your threshold`,
          severity: account.balance < account.minBalance * 0.5 ? "danger" : "warning",
          date: today.toISOString(),
          relatedId: account.id,
          read: false,
        });
      }
    });

    // goals nearing deadline without funds
    state.goals.forEach((goal) => {
      if (!goal.targetDate || goal.completedAt) return;
      const left = daysUntil(goal.targetDate, today);
      const missing = goal.targetAmount - goal.currentAmount;
      if (left <= 30 && left > 0 && missing > 0) {
        notifications.push({
          id: `n_goal_${goal.id}`,
          kind: "goal-deadline",
          title: `Meta "${goal.name}" cerca`,
          body: `Te faltan ${formatCurrency(missing)} y ${left} día${left === 1 ? "" : "s"}`,
          severity: "info",
          date: goal.targetDate,
          relatedId: goal.id,
          read: false,
        });
      }
    });

    return notifications
      .filter((n) => !dismissed.includes(n.id))
      .sort((a, b) => {
        const sevOrder = { danger: 0, warning: 1, info: 2 };
        return sevOrder[a.severity] - sevOrder[b.severity];
      });
  }, [state, dismissed]);
}
