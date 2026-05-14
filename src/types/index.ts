export type ID = string;

export type ExpenseCategory =
  | "alimentos"
  | "transporte"
  | "entretenimiento"
  | "salud"
  | "hogar"
  | "ropa"
  | "tecnologia"
  | "servicios"
  | "otros";

export type PaymentSchedule = "monthly" | "biweekly" | "weekly";

export interface User {
  id: ID;
  email: string;
  name: string;
  /** Pay-cycle type: monthly, biweekly (every 14 days), or weekly. */
  paymentSchedule: PaymentSchedule;
  /** Day of month (1-31) when paymentSchedule = "monthly". */
  payday: number;
  /** Day of week (0=Sunday .. 6=Saturday) when paymentSchedule = "weekly". */
  payWeekday: number;
  /** ISO date of any past pay event when paymentSchedule = "biweekly". */
  payAnchorDate?: string | null;
  /** Day of month for loan payments. */
  loanPayday: number;
  monthlyIncome: number;
  onboardingStep: number; // 0..5 (5 = completed)
  createdAt: string;
}

export interface Account {
  id: ID;
  userId: ID;
  bank: string;
  alias: string;
  balance: number;
  /** If balance falls below this threshold, Marea generates an alert. */
  minBalance?: number;
  createdAt: string;
}

export interface CreditCard {
  id: ID;
  userId: ID;
  bank: string;
  alias: string;
  limit: number;
  cutoffDay: number; // day of month for cutoff
  dueDay: number; // payment due day
  balance: number; // current balance owed
  createdAt: string;
}

export type PaymentSource =
  | { kind: "account"; id: ID }
  | { kind: "card"; id: ID };

export interface FixedExpense {
  id: ID;
  userId: ID;
  name: string;
  amount: number;
  payDay: number;
  source: PaymentSource;
  paidCycles: string[]; // e.g. ["2026-05", "2026-06"] from financial cycle
  createdAt: string;
}

export interface DebitExpense {
  id: ID;
  userId: ID;
  accountId: ID;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // ISO
  /** User's free-form tags, e.g. ["vacation-japan", "work"] */
  tags?: string[];
}

export type IncomeSource =
  | "sueldo"
  | "aguinaldo"
  | "bono"
  | "freelance"
  | "reembolso"
  | "regalo"
  | "venta"
  | "intereses"
  | "otro";

export interface IncomeEvent {
  id: ID;
  userId: ID;
  /** If present, the income was deposited to this account and adds to its balance. */
  accountId: ID;
  amount: number;
  source: IncomeSource;
  description?: string;
  date: string; // ISO
}

export interface Transfer {
  id: ID;
  userId: ID;
  fromAccountId: ID;
  toAccountId: ID;
  amount: number;
  date: string; // ISO
  note?: string;
}

export interface CreditCardExpense {
  id: ID;
  userId: ID;
  cardId: ID;
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string; // ISO
  // calculated billing cycle, e.g. "2026-05" means closes in May
  billingCycle: string;
  dueDate: string; // ISO, payment due date
  /** User's free-form tags */
  tags?: string[];
}

export interface Loan {
  id: ID;
  userId: ID;
  bank: string;
  originalAmount: number;
  remainingAmount: number;
  annualRate: number; // e.g. 0.18 for 18%
  totalPayments: number;
  payments: LoanPayment[];
  monthlyPayment: number;
  startDate: string; // ISO
  /** Account that funds the monthly payment. */
  sourceAccountId?: ID | null;
}

export interface LoanPayment {
  id: ID;
  loanId: ID;
  date: string; // ISO
  amount: number;
  principal: number;
  interest: number;
}

export interface MSIPurchase {
  id: ID;
  userId: ID;
  description: string;
  store: string;
  totalAmount: number;
  totalMonths: number;
  monthsPaid: number;
  monthlyAmount: number;
  startDate: string;
  payments: MSIPayment[];
  /** Where each monthly installment is charged. */
  source?: PaymentSource | null;
}

export interface MSIPayment {
  id: ID;
  msiId: ID;
  date: string;
  amount: number;
}

export interface SavingsGoal {
  id: ID;
  userId: ID;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string; // ISO
  emoji: string;
  contributions: SavingsContribution[];
  completedAt?: string;
}

export interface SavingsContribution {
  id: ID;
  goalId: ID;
  /** If contributed from a debit account, its id. */
  accountId?: ID;
  date: string;
  amount: number;
  note?: string;
}

export interface Budget {
  id: ID;
  userId: ID;
  category: ExpenseCategory;
  amount: number;
}

export interface AppNotification {
  id: ID;
  kind:
    | "card-due-soon"
    | "fixed-expense-overdue"
    | "loan-unpaid"
    | "goal-deadline"
    | "min-balance";
  title: string;
  body: string;
  severity: "info" | "warning" | "danger";
  date: string;
  relatedId?: ID;
  read: boolean;
}
