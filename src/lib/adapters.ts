/**
 * Adapters: convert server payloads (with Decimal-as-string, ISO date strings,
 * cardLimit/sourceId/sourceKind fields) into the shape the client store expects.
 */

import type {
  Account,
  Budget,
  CardPayment,
  CreditCard,
  CreditCardExpense,
  DebitExpense,
  ExpenseCategory,
  FixedExpense,
  IncomeEvent,
  IncomeSource,
  Loan,
  LoanPayment,
  MSIPayment,
  MSIPurchase,
  PaymentSchedule,
  PaymentSource,
  SavingsContribution,
  SavingsGoal,
  Transfer,
  User,
} from "@/types";

const num = (v: unknown): number => (typeof v === "string" ? Number(v) : (v as number));
const iso = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export function toUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name,
    paymentSchedule: (raw.paymentSchedule ?? "monthly") as PaymentSchedule,
    payday: raw.payday,
    payWeekday: raw.payWeekday ?? 5,
    payAnchorDate: raw.payAnchorDate ? iso(raw.payAnchorDate) : null,
    loanPayday: raw.loanPayday,
    monthlyIncome: num(raw.monthlyIncome),
    onboardingStep: raw.onboardingStep,
    createdAt: iso(raw.createdAt),
  };
}

export function toAccount(raw: any): Account {
  return {
    id: raw.id,
    userId: raw.userId,
    bank: raw.bank,
    alias: raw.alias,
    balance: num(raw.balance),
    minBalance:
      raw.minBalance !== undefined && raw.minBalance !== null
        ? num(raw.minBalance)
        : undefined,
    createdAt: iso(raw.createdAt),
  };
}

export function toCard(raw: any): CreditCard {
  return {
    id: raw.id,
    userId: raw.userId,
    bank: raw.bank,
    alias: raw.alias,
    limit: num(raw.cardLimit),
    cutoffDay: raw.cutoffDay,
    dueDay: raw.dueDay,
    balance: num(raw.balance),
    createdAt: iso(raw.createdAt),
  };
}

export function toFixedExpense(raw: any): FixedExpense {
  const source: PaymentSource =
    raw.sourceKind === "card"
      ? { kind: "card", id: raw.sourceId }
      : { kind: "account", id: raw.sourceId };
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    amount: num(raw.amount),
    payDay: raw.payDay,
    source,
    paidCycles: raw.paidCycles ?? [],
    createdAt: iso(raw.createdAt),
  };
}

export function toCardExpense(raw: any): CreditCardExpense {
  return {
    id: raw.id,
    userId: raw.userId,
    cardId: raw.cardId,
    amount: num(raw.amount),
    description: raw.description ?? "",
    category: raw.category,
    date: iso(raw.date),
    billingCycle: raw.billingCycle,
    dueDate: iso(raw.dueDate),
    tags: raw.tags?.length ? raw.tags : undefined,
  };
}

export function toDebitExpense(raw: any): DebitExpense {
  return {
    id: raw.id,
    userId: raw.userId,
    accountId: raw.accountId,
    amount: num(raw.amount),
    description: raw.description ?? "",
    category: raw.category,
    date: iso(raw.date),
    tags: raw.tags?.length ? raw.tags : undefined,
  };
}

export function toIncomeEvent(raw: any): IncomeEvent {
  return {
    id: raw.id,
    userId: raw.userId,
    accountId: raw.accountId,
    amount: num(raw.amount),
    source: raw.source as IncomeSource,
    description: raw.description ?? undefined,
    date: iso(raw.date),
  };
}

export function toTransfer(raw: any): Transfer {
  return {
    id: raw.id,
    userId: raw.userId,
    fromAccountId: raw.fromAccountId,
    toAccountId: raw.toAccountId,
    amount: num(raw.amount),
    date: iso(raw.date),
    note: raw.note ?? undefined,
  };
}

export function toLoan(raw: any): Loan {
  return {
    id: raw.id,
    userId: raw.userId,
    bank: raw.bank,
    originalAmount: num(raw.originalAmount),
    remainingAmount: num(raw.remainingAmount),
    annualRate: num(raw.annualRate),
    totalPayments: raw.totalPayments,
    monthlyPayment: num(raw.monthlyPayment),
    payments: (raw.payments ?? []).map(toLoanPayment),
    startDate: iso(raw.startDate),
    sourceAccountId: raw.sourceAccountId ?? null,
  };
}

export function toLoanPayment(raw: any): LoanPayment {
  return {
    id: raw.id,
    loanId: raw.loanId,
    date: iso(raw.date),
    amount: num(raw.amount),
    principal: num(raw.principal),
    interest: num(raw.interest),
  };
}

export function toMSI(raw: any): MSIPurchase {
  const source: PaymentSource | null = raw.sourceKind && raw.sourceId
    ? raw.sourceKind === "card"
      ? { kind: "card", id: raw.sourceId }
      : { kind: "account", id: raw.sourceId }
    : null;
  return {
    id: raw.id,
    userId: raw.userId,
    description: raw.description,
    store: raw.store,
    totalAmount: num(raw.totalAmount),
    totalMonths: raw.totalMonths,
    monthsPaid: raw.monthsPaid,
    monthlyAmount: num(raw.monthlyAmount),
    startDate: iso(raw.startDate),
    payments: (raw.payments ?? []).map(toMSIPayment),
    source,
  };
}

export function toMSIPayment(raw: any): MSIPayment {
  return {
    id: raw.id,
    msiId: raw.msiId,
    date: iso(raw.date),
    amount: num(raw.amount),
  };
}

export function toGoal(raw: any): SavingsGoal {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    description: raw.description ?? undefined,
    targetAmount: num(raw.targetAmount),
    currentAmount: num(raw.currentAmount),
    targetDate: raw.targetDate ? iso(raw.targetDate) : undefined,
    emoji: raw.emoji,
    contributions: (raw.contributions ?? []).map(toContribution),
    completedAt: raw.completedAt ? iso(raw.completedAt) : undefined,
  };
}

export function toContribution(raw: any): SavingsContribution {
  return {
    id: raw.id,
    goalId: raw.goalId,
    accountId: raw.accountId ?? undefined,
    date: iso(raw.date),
    amount: num(raw.amount),
    note: raw.note ?? undefined,
  };
}

export function toCardPayment(raw: any): CardPayment {
  return {
    id: raw.id,
    userId: raw.userId,
    cardId: raw.cardId,
    accountId: raw.accountId,
    billingCycle: raw.billingCycle ?? null,
    amount: num(raw.amount),
    date: iso(raw.date),
    note: raw.note ?? null,
  };
}

export function toBudget(raw: any): Budget {
  return {
    id: raw.id,
    userId: raw.userId,
    category: raw.category as ExpenseCategory,
    amount: num(raw.amount),
  };
}
