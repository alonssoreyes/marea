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
import type { CreditCard, Loan, MSIPurchase, PaymentSchedule, User } from "@/types";

export interface FinancialCycle {
  start: Date;
  end: Date;
  /** Cycle identifier. Monthly = "yyyy-MM"; biweekly/weekly include the day. */
  label: string;
}

/**
 * User's pay-cycle configuration.
 * We also accept a plain `number` for backward compatibility with older callers
 * that only passed `payday` (monthly by default).
 */
export type PaymentConfig =
  | { schedule: "monthly"; payday: number }
  | { schedule: "biweekly"; anchorDate: string | Date }
  | { schedule: "weekly"; weekday: number }
  | number;

function normalizeConfig(cfg: PaymentConfig): Exclude<PaymentConfig, number> {
  return typeof cfg === "number" ? { schedule: "monthly", payday: cfg } : cfg;
}

/** Build a PaymentConfig from the relevant fields on a User. */
export function userPaymentConfig(user: Pick<User, "paymentSchedule" | "payday" | "payWeekday" | "payAnchorDate">): Exclude<PaymentConfig, number> {
  if (user.paymentSchedule === "biweekly" && user.payAnchorDate) {
    return { schedule: "biweekly", anchorDate: user.payAnchorDate };
  }
  if (user.paymentSchedule === "weekly") {
    return { schedule: "weekly", weekday: user.payWeekday };
  }
  return { schedule: "monthly", payday: user.payday };
}

/**
 * The user's "financial cycle" runs from their payday up to (but not including) the next one.
 * Supports three modes: monthly, biweekly (every 14 days), and weekly.
 */
export function getFinancialCycle(reference: Date, config: PaymentConfig): FinancialCycle {
  const cfg = normalizeConfig(config);
  const ref = startOfDay(reference);

  if (cfg.schedule === "monthly") {
    const payday = cfg.payday;
    let start: Date;
    let end: Date;
    if (ref.getDate() >= payday) {
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

  if (cfg.schedule === "biweekly") {
    const anchor = startOfDay(new Date(cfg.anchorDate));
    // Count how many 14-day intervals have passed from the anchor to ref.
    const diff = differenceInCalendarDays(ref, anchor);
    const periods = Math.floor(diff / 14);
    const start = new Date(anchor);
    start.setDate(start.getDate() + periods * 14);
    const end = endOfDay(new Date(start));
    end.setDate(end.getDate() + 13);
    return { start, end, label: `bw-${format(start, "yyyy-MM-dd")}` };
  }

  // weekly
  const weekday = cfg.weekday;
  const start = startOfDay(new Date(ref));
  // Step back to the matching weekday (Sunday = 0).
  const diff = (start.getDay() - weekday + 7) % 7;
  start.setDate(start.getDate() - diff);
  const end = endOfDay(new Date(start));
  end.setDate(end.getDate() + 6);
  return { start, end, label: `wk-${format(start, "yyyy-MM-dd")}` };
}

/** Returns the cycle immediately prior to the given one. */
export function previousCycle(cycle: FinancialCycle, config: PaymentConfig): FinancialCycle {
  const ref = new Date(cycle.start);
  ref.setDate(ref.getDate() - 1);
  return getFinancialCycle(ref, config);
}

/** Returns the cycle immediately after the given one. */
export function nextCycle(cycle: FinancialCycle, config: PaymentConfig): FinancialCycle {
  const ref = new Date(cycle.end);
  ref.setDate(ref.getDate() + 1);
  return getFinancialCycle(ref, config);
}

/** Returns `count` cycles going backwards from the reference date's cycle. */
export function getCyclesInRange(
  reference: Date,
  config: PaymentConfig,
  count: number
): FinancialCycle[] {
  const cycles: FinancialCycle[] = [];
  let current = getFinancialCycle(reference, config);
  cycles.push(current);
  for (let i = 1; i < count; i++) {
    current = previousCycle(current, config);
    cycles.push(current);
  }
  return cycles;
}

/** Human-readable schedule label, for display in the UI. */
export function paymentScheduleLabel(schedule: PaymentSchedule): string {
  return schedule === "monthly" ? "Mensual" : schedule === "biweekly" ? "Quincenal (cada 14 días)" : "Semanal";
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
