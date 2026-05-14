import {
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  format,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";
import type { CreditCard, Loan, MSIPurchase } from "@/types";

export interface FinancialCycle {
  start: Date;
  end: Date;
  /** "yyyy-MM" cycle identifier, based on the start month */
  label: string;
}

/**
 * The user's "financial month" runs from payday (default 14) to the day before
 * the next payday. This function calculates the current cycle boundaries
 * given a reference date and the payday.
 */
export function getFinancialCycle(reference: Date, payday: number): FinancialCycle {
  const ref = startOfDay(reference);
  const day = ref.getDate();
  let start: Date;
  let end: Date;
  if (day >= payday) {
    start = new Date(ref.getFullYear(), ref.getMonth(), payday);
    end = endOfDay(addMonths(start, 1));
    end.setDate(end.getDate() - 1);
  } else {
    start = new Date(ref.getFullYear(), ref.getMonth() - 1, payday);
    end = endOfDay(addMonths(start, 1));
    end.setDate(end.getDate() - 1);
  }
  return { start, end, label: format(start, "yyyy-MM") };
}

/** Returns the cycle prior to the given one. */
export function previousCycle(cycle: FinancialCycle, payday: number): FinancialCycle {
  const ref = new Date(cycle.start);
  ref.setDate(ref.getDate() - 1); // last day of previous cycle
  return getFinancialCycle(ref, payday);
}

/** Returns the cycle following the given one. */
export function nextCycle(cycle: FinancialCycle, payday: number): FinancialCycle {
  const ref = new Date(cycle.end);
  ref.setDate(ref.getDate() + 1); // first day of next cycle
  return getFinancialCycle(ref, payday);
}

/**
 * Returns `count` cycles into the past from the reference date's cycle.
 * The first in the array is the most recent.
 */
export function getCyclesInRange(
  reference: Date,
  payday: number,
  count: number
): FinancialCycle[] {
  const cycles: FinancialCycle[] = [];
  let current = getFinancialCycle(reference, payday);
  cycles.push(current);
  for (let i = 1; i < count; i++) {
    current = previousCycle(current, payday);
    cycles.push(current);
  }
  return cycles;
}

/** Checks if a date falls within a cycle. */
export function isInCycle(date: Date | string, cycle: FinancialCycle): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  return d >= cycle.start && d <= cycle.end;
}

/**
 * Given a day of month and a month/year, returns the actual date,
 * capping to the last day if the month is shorter (e.g. day 31 in February).
 */
function safeDate(year: number, month: number, day: number) {
  const last = getDaysInMonth(new Date(year, month, 1));
  return new Date(year, month, Math.min(day, last));
}

/**
 * Key logic: given a card purchase, determines which billing cycle
 * it belongs to and when payment is due.
 *
 * - If purchase is BEFORE cutoff → current cycle, payment on current or next dueDay.
 * - If purchase is AFTER cutoff → next cycle, payment the following month.
 *
 * Also returns a "yyyy-MM" label for grouping.
 */
export function classifyCardExpense(
  date: Date,
  card: Pick<CreditCard, "cutoffDay" | "dueDay">
) {
  const purchase = startOfDay(date);
  const year = purchase.getFullYear();
  const month = purchase.getMonth();
  const day = purchase.getDate();

  // Cutoff date for the purchase month
  const cutoffThisMonth = safeDate(year, month, card.cutoffDay);

  // If purchase occurs strictly before or on cutoff day, goes to current cycle
  const beforeOrOnCutoff =
    isBefore(purchase, cutoffThisMonth) || isSameDay(purchase, cutoffThisMonth);

  let cycleStart: Date;
  let cycleEnd: Date;
  let dueDate: Date;

  if (beforeOrOnCutoff) {
    // current cycle: ends on cutoffThisMonth; payment due on dueDay of same month
    // (unless dueDay < cutoffDay, in which case it's due next month)
    cycleEnd = cutoffThisMonth;
    cycleStart = safeDate(year, month - 1, card.cutoffDay + 1);
    if (card.dueDay > card.cutoffDay) {
      dueDate = safeDate(year, month, card.dueDay);
    } else {
      dueDate = safeDate(year, month + 1, card.dueDay);
    }
  } else {
    // next cycle: starts day after cutoff and ends on next cutoff
    cycleStart = safeDate(year, month, card.cutoffDay + 1);
    cycleEnd = safeDate(year, month + 1, card.cutoffDay);
    // payment due on dueDay of month after cutoff (or two months if dueDay < cutoff)
    if (card.dueDay > card.cutoffDay) {
      dueDate = safeDate(year, month + 1, card.dueDay);
    } else {
      dueDate = safeDate(year, month + 2, card.dueDay);
    }
  }

  return {
    cycleStart,
    cycleEnd,
    dueDate,
    billingCycle: format(cycleEnd, "yyyy-MM"),
  };
}

/**
 * Next card payment event given "today": cutoff date and due date.
 */
export function getCardSchedule(
  today: Date,
  card: Pick<CreditCard, "cutoffDay" | "dueDay">
) {
  const ref = startOfDay(today);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  let nextCutoff = safeDate(year, month, card.cutoffDay);
  if (isBefore(nextCutoff, ref)) {
    nextCutoff = safeDate(year, month + 1, card.cutoffDay);
  }
  let nextDue = safeDate(year, month, card.dueDay);
  if (isBefore(nextDue, ref)) {
    nextDue = safeDate(year, month + 1, card.dueDay);
  }
  const daysToCutoff = differenceInCalendarDays(nextCutoff, ref);
  const daysToDue = differenceInCalendarDays(nextDue, ref);
  return { nextCutoff, nextDue, daysToCutoff, daysToDue };
}

/**
 * Calculates one month's amortization for a French loan (fixed monthly payment):
 * principal = monthly payment - month's interest, where interest = balance * (rate / 12).
 */
export function computeLoanAmortization(loan: Pick<Loan, "remainingAmount" | "annualRate" | "monthlyPayment">) {
  const monthlyRate = loan.annualRate / 12;
  const interest = loan.remainingAmount * monthlyRate;
  const principal = Math.max(0, loan.monthlyPayment - interest);
  return {
    interest,
    principal,
    newBalance: Math.max(0, loan.remainingAmount - principal),
  };
}

/**
 * Projects how many months remain to pay off a loan given a monthly payment.
 * If extra > 0, simulates paying more each month and also returns estimated savings.
 */
export function projectLoanPayoff(
  loan: Pick<Loan, "remainingAmount" | "annualRate" | "monthlyPayment">,
  extra = 0
) {
  const monthlyRate = loan.annualRate / 12;
  const payment = loan.monthlyPayment + extra;
  let balance = loan.remainingAmount;
  let months = 0;
  let interestPaid = 0;
  while (balance > 0 && months < 1200) {
    const interest = balance * monthlyRate;
    const principal = Math.min(balance, payment - interest);
    if (principal <= 0) return { months: Infinity, interestPaid: Infinity };
    balance -= principal;
    interestPaid += interest;
    months += 1;
  }
  return { months, interestPaid };
}

export function loanProgress(loan: Pick<Loan, "originalAmount" | "remainingAmount">) {
  if (loan.originalAmount <= 0) return 0;
  return Math.max(
    0,
    Math.min(1, (loan.originalAmount - loan.remainingAmount) / loan.originalAmount)
  );
}

export function msiProgress(msi: Pick<MSIPurchase, "monthsPaid" | "totalMonths">) {
  if (msi.totalMonths <= 0) return 0;
  return Math.max(0, Math.min(1, msi.monthsPaid / msi.totalMonths));
}

/** Days between today and a target date. Negative if the date has passed. */
export function daysUntil(target: string | Date, ref: Date = new Date()) {
  const t = typeof target === "string" ? parseISO(target) : target;
  return differenceInCalendarDays(startOfDay(t), startOfDay(ref));
}

export function isOverdue(target: string, ref: Date = new Date()) {
  return isAfter(startOfDay(ref), startOfDay(parseISO(target)));
}
