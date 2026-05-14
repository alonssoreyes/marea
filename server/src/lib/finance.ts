/**
 * Server-side mirror of the client's finance helpers.
 * Keeps cycle classification authoritative on the API.
 */

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function safeDate(year: number, month: number, day: number) {
  const last = getDaysInMonth(year, month);
  return new Date(year, month, Math.min(day, last));
}

export function classifyCardExpense(
  date: Date,
  card: { cutoffDay: number; dueDay: number }
) {
  const purchase = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const year = purchase.getFullYear();
  const month = purchase.getMonth();

  const cutoffThisMonth = safeDate(year, month, card.cutoffDay);
  const beforeOrOnCutoff = purchase.getTime() <= cutoffThisMonth.getTime();

  let cycleEnd: Date;
  let dueDate: Date;

  if (beforeOrOnCutoff) {
    cycleEnd = cutoffThisMonth;
    dueDate =
      card.dueDay > card.cutoffDay
        ? safeDate(year, month, card.dueDay)
        : safeDate(year, month + 1, card.dueDay);
  } else {
    cycleEnd = safeDate(year, month + 1, card.cutoffDay);
    dueDate =
      card.dueDay > card.cutoffDay
        ? safeDate(year, month + 1, card.dueDay)
        : safeDate(year, month + 2, card.dueDay);
  }

  const billingCycle = `${cycleEnd.getFullYear()}-${String(cycleEnd.getMonth() + 1).padStart(2, "0")}`;
  return { dueDate, billingCycle };
}

export function computeLoanAmortization(loan: {
  remainingAmount: number;
  annualRate: number;
  monthlyPayment: number;
}) {
  const monthlyRate = loan.annualRate / 12;
  const interest = loan.remainingAmount * monthlyRate;
  const principal = Math.max(0, loan.monthlyPayment - interest);
  return {
    interest,
    principal,
    newBalance: Math.max(0, loan.remainingAmount - principal),
  };
}
