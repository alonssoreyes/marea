import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  Loan,
  MSIPurchase,
  PaymentSource,
  SavingsGoal,
  Transfer,
  User,
} from "@/types";
import {
  accountsApi,
  budgetsApi,
  cardExpensesApi,
  cardPaymentsApi,
  cardsApi,
  debitExpensesApi,
  fixedExpensesApi,
  goalsApi,
  incomeEventsApi,
  loansApi,
  msiApi,
  transfersApi,
  ApiError,
} from "@/lib/api";
import {
  toAccount,
  toBudget,
  toCard,
  toCardExpense,
  toCardPayment,
  toDebitExpense,
  toFixedExpense,
  toGoal,
  toIncomeEvent,
  toLoan,
  toMSI,
  toTransfer,
} from "@/lib/adapters";
import { toast } from "@/components/ui/Toaster";

/**
 * Marea store
 * ===========
 * Each mutation calls the backend first, and only updates local state
 * when the server confirms. If the API fails, local state is NOT modified
 * and a toast is shown. This ensures what you see always reflects the DB.
 *
 * The `hydrateFromServer` (in useBootstrap) overwrites everything on login.
 */

type FinanceState = {
  user: User;
  accounts: Account[];
  cards: CreditCard[];
  fixedExpenses: FixedExpense[];
  cardExpenses: CreditCardExpense[];
  cardPayments: CardPayment[];
  debitExpenses: DebitExpense[];
  incomeEvents: IncomeEvent[];
  transfers: Transfer[];
  loans: Loan[];
  msi: MSIPurchase[];
  goals: SavingsGoal[];
  budgets: Budget[];
  /** IDs of notifications the user dismissed (client-side only). */
  dismissedNotifications: string[];
  hydrated: boolean;

  // user
  /** Local-only user patch (for step-by-step onboarding). Synchronization
   *  with backend is done by the component via authApi.updateMe() when appropriate. */
  updateUser: (patch: Partial<User>) => void;
  resetToEmpty: () => void;
  hydrateFromServer: (data: {
    user: User;
    accounts: Account[];
    cards: CreditCard[];
    fixedExpenses: FixedExpense[];
    cardExpenses: CreditCardExpense[];
    cardPayments: CardPayment[];
    debitExpenses: DebitExpense[];
    incomeEvents: IncomeEvent[];
    transfers: Transfer[];
    loans: Loan[];
    msi: MSIPurchase[];
    goals: SavingsGoal[];
    budgets: Budget[];
  }) => void;

  // budgets
  upsertBudget: (category: ExpenseCategory, amount: number) => Promise<Budget | null>;
  removeBudget: (category: ExpenseCategory) => Promise<boolean>;

  // notifications
  dismissNotification: (id: string) => void;
  clearDismissedNotifications: () => void;

  // accounts
  addAccount: (data: Omit<Account, "id" | "userId" | "createdAt">) => Promise<Account | null>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<Account | null>;
  removeAccount: (id: string) => Promise<boolean>;

  // cards
  addCard: (data: Omit<CreditCard, "id" | "userId" | "createdAt">) => Promise<CreditCard | null>;
  updateCard: (id: string, patch: Partial<CreditCard>) => Promise<CreditCard | null>;
  removeCard: (id: string) => Promise<boolean>;

  // fixed expenses
  addFixedExpense: (
    data: Omit<FixedExpense, "id" | "userId" | "createdAt" | "paidCycles">
  ) => Promise<FixedExpense | null>;
  updateFixedExpense: (
    id: string,
    patch: Partial<Omit<FixedExpense, "id" | "userId" | "createdAt" | "paidCycles">>
  ) => Promise<FixedExpense | null>;
  removeFixedExpense: (id: string) => Promise<boolean>;
  toggleFixedExpensePaid: (id: string, cycle: string) => Promise<void>;

  // card expenses
  addCardExpense: (
    data: Omit<CreditCardExpense, "id" | "userId" | "billingCycle" | "dueDate">
  ) => Promise<CreditCardExpense | null>;
  removeCardExpense: (id: string) => Promise<boolean>;

  // card payments (paying off a card cycle from a debit account)
  addCardPayment: (
    data: Omit<CardPayment, "id" | "userId">
  ) => Promise<CardPayment | null>;
  removeCardPayment: (id: string) => Promise<boolean>;

  // debit expenses
  addDebitExpense: (
    data: Omit<DebitExpense, "id" | "userId">
  ) => Promise<DebitExpense | null>;
  removeDebitExpense: (id: string) => Promise<boolean>;

  // income events
  addIncomeEvent: (
    data: Omit<IncomeEvent, "id" | "userId">
  ) => Promise<IncomeEvent | null>;
  removeIncomeEvent: (id: string) => Promise<boolean>;

  // transfers
  addTransfer: (
    data: Omit<Transfer, "id" | "userId">
  ) => Promise<Transfer | null>;
  removeTransfer: (id: string) => Promise<boolean>;

  // loans
  addLoan: (data: Omit<Loan, "id" | "userId" | "payments">) => Promise<Loan | null>;
  updateLoan: (
    id: string,
    patch: Partial<Omit<Loan, "id" | "userId" | "payments">>
  ) => Promise<Loan | null>;
  registerLoanPayment: (loanId: string, extra?: number) => Promise<boolean>;
  removeLoan: (id: string) => Promise<boolean>;

  // msi
  addMSI: (
    data: Omit<MSIPurchase, "id" | "userId" | "payments" | "monthsPaid">
  ) => Promise<MSIPurchase | null>;
  updateMSI: (
    id: string,
    patch: Partial<Omit<MSIPurchase, "id" | "userId" | "payments">>
  ) => Promise<MSIPurchase | null>;
  registerMSIPayment: (msiId: string) => Promise<boolean>;
  removeMSI: (id: string) => Promise<boolean>;

  // goals
  addGoal: (
    data: Omit<SavingsGoal, "id" | "userId" | "currentAmount" | "contributions">
  ) => Promise<SavingsGoal | null>;
  updateGoal: (
    id: string,
    patch: Partial<Omit<SavingsGoal, "id" | "userId" | "currentAmount" | "contributions">>
  ) => Promise<SavingsGoal | null>;
  addContribution: (goalId: string, amount: number, note?: string, accountId?: string) => Promise<boolean>;
  removeGoal: (id: string) => Promise<boolean>;
};

const emptyUser: User = {
  id: "u_local",
  email: "",
  name: "",
  paymentSchedule: "monthly",
  payday: 14,
  payWeekday: 5,
  payAnchorDate: null,
  loanPayday: 1,
  monthlyIncome: 0,
  onboardingStep: 0,
  createdAt: new Date().toISOString(),
};

const emptyState = () => ({
  user: { ...emptyUser, createdAt: new Date().toISOString() },
  accounts: [],
  cards: [],
  fixedExpenses: [],
  cardExpenses: [],
  cardPayments: [],
  debitExpenses: [],
  incomeEvents: [],
  transfers: [],
  loans: [],
  msi: [],
  goals: [],
  budgets: [],
  dismissedNotifications: [],
});

/** Reports an API error consistently. */
function handleError(err: unknown, fallback: string): void {
  if (err instanceof ApiError) toast.error(err.message);
  else if (err instanceof Error) toast.error(err.message);
  else toast.error(fallback);
  console.error(fallback, err);
}

export const useFinance = create<FinanceState>()(
  persist(
    (set, get) => ({
      ...emptyState(),
      hydrated: false,

      updateUser: (patch) =>
        set((s) => ({ user: { ...s.user, ...patch } })),

      resetToEmpty: () => set({ ...emptyState(), hydrated: true }),

      hydrateFromServer: (data) =>
        set({
          user: data.user,
          accounts: data.accounts,
          cards: data.cards,
          fixedExpenses: data.fixedExpenses,
          cardExpenses: data.cardExpenses,
          cardPayments: data.cardPayments,
          debitExpenses: data.debitExpenses,
          incomeEvents: data.incomeEvents,
          transfers: data.transfers,
          loans: data.loans,
          msi: data.msi,
          goals: data.goals,
          budgets: data.budgets,
          hydrated: true,
        }),

      upsertBudget: async (category, amount) => {
        try {
          const res = await budgetsApi.upsert({ category, amount });
          const budget = toBudget(res.budget);
          set((s) => {
            const idx = s.budgets.findIndex((b) => b.category === category);
            if (idx >= 0) {
              const next = [...s.budgets];
              next[idx] = budget;
              return { budgets: next };
            }
            return { budgets: [...s.budgets, budget] };
          });
          return budget;
        } catch (err) {
          handleError(err, "No se pudo guardar el presupuesto");
          return null;
        }
      },
      removeBudget: async (category) => {
        try {
          await budgetsApi.remove(category);
          set((s) => ({ budgets: s.budgets.filter((b) => b.category !== category) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el presupuesto");
          return false;
        }
      },

      dismissNotification: (id) =>
        set((s) => ({
          dismissedNotifications: s.dismissedNotifications.includes(id)
            ? s.dismissedNotifications
            : [...s.dismissedNotifications, id],
        })),
      clearDismissedNotifications: () => set({ dismissedNotifications: [] }),

      // ---- Accounts ----
      addAccount: async (data) => {
        try {
          const res = await accountsApi.create({
            bank: data.bank,
            alias: data.alias,
            balance: data.balance,
            minBalance: data.minBalance ?? null,
          });
          const account = toAccount(res.account);
          set((s) => ({ accounts: [...s.accounts, account] }));
          return account;
        } catch (err) {
          handleError(err, "No se pudo crear la cuenta");
          return null;
        }
      },
      updateAccount: async (id, patch) => {
        try {
          const res = await accountsApi.update(id, {
            bank: patch.bank,
            alias: patch.alias,
            balance: patch.balance,
            minBalance: patch.minBalance ?? null,
          });
          const account = toAccount(res.account);
          set((s) => ({
            accounts: s.accounts.map((a) => (a.id === id ? account : a)),
          }));
          return account;
        } catch (err) {
          handleError(err, "No se pudo actualizar la cuenta");
          return null;
        }
      },
      removeAccount: async (id) => {
        try {
          await accountsApi.remove(id);
          set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar la cuenta");
          return false;
        }
      },

      // ---- Cards ----
      addCard: async (data) => {
        try {
          const res = await cardsApi.create({
            bank: data.bank,
            alias: data.alias,
            cardLimit: data.limit,
            cutoffDay: data.cutoffDay,
            dueDay: data.dueDay,
            balance: data.balance,
          });
          const card = toCard(res.card);
          set((s) => ({ cards: [...s.cards, card] }));
          return card;
        } catch (err) {
          handleError(err, "No se pudo crear la tarjeta");
          return null;
        }
      },
      updateCard: async (id, patch) => {
        try {
          const res = await cardsApi.update(id, {
            bank: patch.bank,
            alias: patch.alias,
            cardLimit: patch.limit,
            cutoffDay: patch.cutoffDay,
            dueDay: patch.dueDay,
            balance: patch.balance,
          });
          const card = toCard(res.card);
          set((s) => ({
            cards: s.cards.map((c) => (c.id === id ? card : c)),
          }));
          return card;
        } catch (err) {
          handleError(err, "No se pudo actualizar la tarjeta");
          return null;
        }
      },
      removeCard: async (id) => {
        try {
          await cardsApi.remove(id);
          set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar la tarjeta");
          return false;
        }
      },

      // ---- Fixed expenses ----
      addFixedExpense: async (data) => {
        try {
          const res = await fixedExpensesApi.create({
            name: data.name,
            amount: data.amount,
            payDay: data.payDay,
            sourceKind: data.source.kind,
            sourceId: data.source.id,
          });
          const fixed = toFixedExpense(res.fixedExpense);
          set((s) => ({ fixedExpenses: [...s.fixedExpenses, fixed] }));
          return fixed;
        } catch (err) {
          handleError(err, "No se pudo crear el gasto fijo");
          return null;
        }
      },
      updateFixedExpense: async (id, patch) => {
        try {
          const apiPatch: any = {};
          if (patch.name !== undefined) apiPatch.name = patch.name;
          if (patch.amount !== undefined) apiPatch.amount = patch.amount;
          if (patch.payDay !== undefined) apiPatch.payDay = patch.payDay;
          if (patch.source) {
            apiPatch.sourceKind = patch.source.kind;
            apiPatch.sourceId = patch.source.id;
          }
          const res = await fixedExpensesApi.update(id, apiPatch);
          const fixed = toFixedExpense(res.fixedExpense);
          set((s) => ({
            fixedExpenses: s.fixedExpenses.map((f) => (f.id === id ? fixed : f)),
          }));
          return fixed;
        } catch (err) {
          handleError(err, "No se pudo actualizar el gasto fijo");
          return null;
        }
      },
      removeFixedExpense: async (id) => {
        try {
          await fixedExpensesApi.remove(id);
          set((s) => ({
            fixedExpenses: s.fixedExpenses.filter((f) => f.id !== id),
          }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el gasto fijo");
          return false;
        }
      },
      toggleFixedExpensePaid: async (id, cycle) => {
        try {
          const prev = get().fixedExpenses.find((f) => f.id === id);
          const wasPaid = prev?.paidCycles.includes(cycle) ?? false;
          const res = await fixedExpensesApi.togglePaid(id, cycle);
          const updated = toFixedExpense(res.fixedExpense);
          // sign: paying now = -1 for accounts (balance down) / +1 for cards (debt up);
          // unpaying reverses it.
          const sign = wasPaid ? -1 : 1;
          set((s) => ({
            fixedExpenses: s.fixedExpenses.map((f) => (f.id === id ? updated : f)),
            accounts:
              updated.source.kind === "account"
                ? s.accounts.map((a) =>
                    a.id === updated.source.id
                      ? { ...a, balance: a.balance - sign * updated.amount }
                      : a
                  )
                : s.accounts,
            cards:
              updated.source.kind === "card"
                ? s.cards.map((c) =>
                    c.id === updated.source.id
                      ? { ...c, balance: c.balance + sign * updated.amount }
                      : c
                  )
                : s.cards,
          }));
        } catch (err) {
          handleError(err, "No se pudo actualizar el estado del gasto");
        }
      },

      // ---- Card expenses ----
      addCardExpense: async (data) => {
        try {
          const res = await cardExpensesApi.create({
            cardId: data.cardId,
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            tags: data.tags,
          });
          const expense = toCardExpense(res.cardExpense);
          set((s) => ({
            cardExpenses: [expense, ...s.cardExpenses],
            cards: s.cards.map((c) =>
              c.id === data.cardId ? { ...c, balance: c.balance + data.amount } : c
            ),
          }));
          return expense;
        } catch (err) {
          handleError(err, "No se pudo registrar el gasto con tarjeta");
          return null;
        }
      },
      removeCardExpense: async (id) => {
        try {
          await cardExpensesApi.remove(id);
          set((s) => {
            const exp = s.cardExpenses.find((e) => e.id === id);
            if (!exp) return s;
            return {
              cardExpenses: s.cardExpenses.filter((e) => e.id !== id),
              cards: s.cards.map((c) =>
                c.id === exp.cardId
                  ? { ...c, balance: Math.max(0, c.balance - exp.amount) }
                  : c
              ),
            };
          });
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el gasto");
          return false;
        }
      },

      // ---- Card payments ----
      addCardPayment: async (data) => {
        try {
          const res = await cardPaymentsApi.create({
            cardId: data.cardId,
            accountId: data.accountId,
            amount: data.amount,
            billingCycle: data.billingCycle,
            date: data.date,
            note: data.note,
          });
          const payment = toCardPayment(res.cardPayment);
          set((s) => ({
            cardPayments: [payment, ...s.cardPayments],
            accounts: s.accounts.map((a) =>
              a.id === data.accountId ? { ...a, balance: a.balance - data.amount } : a
            ),
            cards: s.cards.map((c) =>
              c.id === data.cardId
                ? { ...c, balance: Math.max(0, c.balance - data.amount) }
                : c
            ),
          }));
          return payment;
        } catch (err) {
          handleError(err, "No se pudo registrar el pago de la tarjeta");
          return null;
        }
      },
      removeCardPayment: async (id) => {
        try {
          await cardPaymentsApi.remove(id);
          set((s) => {
            const p = s.cardPayments.find((x) => x.id === id);
            if (!p) return s;
            return {
              cardPayments: s.cardPayments.filter((x) => x.id !== id),
              accounts: s.accounts.map((a) =>
                a.id === p.accountId ? { ...a, balance: a.balance + p.amount } : a
              ),
              cards: s.cards.map((c) =>
                c.id === p.cardId ? { ...c, balance: c.balance + p.amount } : c
              ),
            };
          });
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el pago");
          return false;
        }
      },

      // ---- Debit expenses ----
      addDebitExpense: async (data) => {
        try {
          const res = await debitExpensesApi.create({
            accountId: data.accountId,
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: data.date,
            tags: data.tags,
          });
          const expense = toDebitExpense(res.debitExpense);
          set((s) => ({
            debitExpenses: [expense, ...s.debitExpenses],
            accounts: s.accounts.map((a) =>
              a.id === data.accountId ? { ...a, balance: a.balance - data.amount } : a
            ),
          }));
          return expense;
        } catch (err) {
          handleError(err, "No se pudo registrar el gasto");
          return null;
        }
      },
      removeDebitExpense: async (id) => {
        try {
          await debitExpensesApi.remove(id);
          set((s) => {
            const exp = s.debitExpenses.find((e) => e.id === id);
            if (!exp) return s;
            return {
              debitExpenses: s.debitExpenses.filter((e) => e.id !== id),
              accounts: s.accounts.map((a) =>
                a.id === exp.accountId ? { ...a, balance: a.balance + exp.amount } : a
              ),
            };
          });
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el gasto");
          return false;
        }
      },

      // ---- Income events ----
      addIncomeEvent: async (data) => {
        try {
          const res = await incomeEventsApi.create({
            accountId: data.accountId,
            amount: data.amount,
            source: data.source,
            description: data.description,
            date: data.date,
          });
          const event = toIncomeEvent(res.incomeEvent);
          set((s) => ({
            incomeEvents: [event, ...s.incomeEvents],
            accounts: s.accounts.map((a) =>
              a.id === data.accountId ? { ...a, balance: a.balance + data.amount } : a
            ),
          }));
          return event;
        } catch (err) {
          handleError(err, "No se pudo registrar el ingreso");
          return null;
        }
      },
      removeIncomeEvent: async (id) => {
        try {
          await incomeEventsApi.remove(id);
          set((s) => {
            const ev = s.incomeEvents.find((e) => e.id === id);
            if (!ev) return s;
            return {
              incomeEvents: s.incomeEvents.filter((e) => e.id !== id),
              accounts: s.accounts.map((a) =>
                a.id === ev.accountId ? { ...a, balance: a.balance - ev.amount } : a
              ),
            };
          });
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el ingreso");
          return false;
        }
      },

      // ---- Transfers ----
      addTransfer: async (data) => {
        try {
          const res = await transfersApi.create({
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            amount: data.amount,
            date: data.date,
            note: data.note,
          });
          const transfer = toTransfer(res.transfer);
          set((s) => ({
            transfers: [transfer, ...s.transfers],
            accounts: s.accounts.map((a) => {
              if (a.id === data.fromAccountId)
                return { ...a, balance: a.balance - data.amount };
              if (a.id === data.toAccountId)
                return { ...a, balance: a.balance + data.amount };
              return a;
            }),
          }));
          return transfer;
        } catch (err) {
          handleError(err, "No se pudo registrar la transferencia");
          return null;
        }
      },
      removeTransfer: async (id) => {
        try {
          await transfersApi.remove(id);
          set((s) => {
            const t = s.transfers.find((x) => x.id === id);
            if (!t) return s;
            return {
              transfers: s.transfers.filter((x) => x.id !== id),
              accounts: s.accounts.map((a) => {
                if (a.id === t.fromAccountId)
                  return { ...a, balance: a.balance + t.amount };
                if (a.id === t.toAccountId)
                  return { ...a, balance: a.balance - t.amount };
                return a;
              }),
            };
          });
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar la transferencia");
          return false;
        }
      },

      // ---- Loans ----
      addLoan: async (data) => {
        try {
          const res = await loansApi.create({
            bank: data.bank,
            originalAmount: data.originalAmount,
            remainingAmount: data.remainingAmount,
            annualRate: data.annualRate,
            totalPayments: data.totalPayments,
            monthlyPayment: data.monthlyPayment,
            startDate: data.startDate,
            sourceAccountId: data.sourceAccountId ?? null,
          });
          const loan = toLoan(res.loan);
          set((s) => ({ loans: [...s.loans, loan] }));
          return loan;
        } catch (err) {
          handleError(err, "No se pudo registrar el préstamo");
          return null;
        }
      },
      updateLoan: async (id, patch) => {
        try {
          const res = await loansApi.update(id, patch as any);
          const loan = toLoan(res.loan);
          set((s) => ({ loans: s.loans.map((l) => (l.id === id ? loan : l)) }));
          return loan;
        } catch (err) {
          handleError(err, "No se pudo actualizar el préstamo");
          return null;
        }
      },
      registerLoanPayment: async (loanId, extra = 0) => {
        try {
          const loan = get().loans.find((l) => l.id === loanId);
          await loansApi.registerPayment(loanId, extra);
          const list = await loansApi.list();
          const loans = (list.loans as any[]).map(toLoan);
          set((s) => ({
            loans,
            accounts: loan?.sourceAccountId
              ? s.accounts.map((a) =>
                  a.id === loan.sourceAccountId
                    ? { ...a, balance: a.balance - (loan.monthlyPayment + extra) }
                    : a
                )
              : s.accounts,
          }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo registrar el pago");
          return false;
        }
      },
      removeLoan: async (id) => {
        try {
          await loansApi.remove(id);
          set((s) => ({ loans: s.loans.filter((l) => l.id !== id) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar el préstamo");
          return false;
        }
      },

      // ---- MSI ----
      addMSI: async (data) => {
        try {
          const res = await msiApi.create({
            description: data.description,
            store: data.store,
            totalAmount: data.totalAmount,
            totalMonths: data.totalMonths,
            monthlyAmount: data.monthlyAmount,
            startDate: data.startDate,
            sourceKind: data.source?.kind ?? null,
            sourceId: data.source?.id ?? null,
          });
          const msi = toMSI(res.msi);
          set((s) => ({ msi: [...s.msi, msi] }));
          return msi;
        } catch (err) {
          handleError(err, "No se pudo registrar la compra MSI");
          return null;
        }
      },
      updateMSI: async (id, patch) => {
        try {
          const { source, ...rest } = patch as any;
          const apiPatch: any = { ...rest };
          if (source !== undefined) {
            apiPatch.sourceKind = source?.kind ?? null;
            apiPatch.sourceId = source?.id ?? null;
          }
          const res = await msiApi.update(id, apiPatch);
          const msi = toMSI(res.msi);
          set((s) => ({ msi: s.msi.map((m) => (m.id === id ? msi : m)) }));
          return msi;
        } catch (err) {
          handleError(err, "No se pudo actualizar la compra MSI");
          return null;
        }
      },
      registerMSIPayment: async (msiId) => {
        try {
          const prev = get().msi.find((m) => m.id === msiId);
          await msiApi.registerPayment(msiId);
          const list = await msiApi.list();
          const msi = (list.msi as any[]).map(toMSI);
          set((s) => ({
            msi,
            accounts:
              prev?.source?.kind === "account"
                ? s.accounts.map((a) =>
                    a.id === prev.source!.id
                      ? { ...a, balance: a.balance - prev.monthlyAmount }
                      : a
                  )
                : s.accounts,
            cards:
              prev?.source?.kind === "card"
                ? s.cards.map((c) =>
                    c.id === prev.source!.id
                      ? { ...c, balance: c.balance + prev.monthlyAmount }
                      : c
                  )
                : s.cards,
          }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo registrar el pago MSI");
          return false;
        }
      },
      removeMSI: async (id) => {
        try {
          await msiApi.remove(id);
          set((s) => ({ msi: s.msi.filter((m) => m.id !== id) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar la compra MSI");
          return false;
        }
      },

      // ---- Goals ----
      addGoal: async (data) => {
        try {
          const res = await goalsApi.create({
            name: data.name,
            description: data.description,
            targetAmount: data.targetAmount,
            targetDate: data.targetDate,
            emoji: data.emoji,
          });
          const goal = toGoal(res.goal);
          set((s) => ({ goals: [...s.goals, goal] }));
          return goal;
        } catch (err) {
          handleError(err, "No se pudo crear la meta");
          return null;
        }
      },
      updateGoal: async (id, patch) => {
        try {
          const res = await goalsApi.update(id, patch as any);
          const goal = toGoal(res.goal);
          set((s) => ({ goals: s.goals.map((g) => (g.id === id ? goal : g)) }));
          return goal;
        } catch (err) {
          handleError(err, "No se pudo actualizar la meta");
          return null;
        }
      },
      addContribution: async (goalId, amount, note, accountId) => {
        try {
          await goalsApi.addContribution(goalId, amount, note, accountId);
          // Re-fetch goals for currentAmount + completedAt; and accounts if debited.
          const goalsRes = await goalsApi.list();
          set({ goals: (goalsRes.goals as any[]).map(toGoal) });
          if (accountId) {
            set((s) => ({
              accounts: s.accounts.map((a) =>
                a.id === accountId ? { ...a, balance: a.balance - amount } : a
              ),
            }));
          }
          return true;
        } catch (err) {
          handleError(err, "No se pudo agregar la aportación");
          return false;
        }
      },
      removeGoal: async (id) => {
        try {
          await goalsApi.remove(id);
          set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
          return true;
        } catch (err) {
          handleError(err, "No se pudo eliminar la meta");
          return false;
        }
      },
    }),
    {
      name: "marea-data",
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        // Defensive defaults for fields added after the initial release
        if (!Array.isArray(state.cardPayments)) state.cardPayments = [];
      },
    }
  )
);

// ---- Selectors ----
export const selectAccountsTotal = (s: FinanceState) =>
  s.accounts.reduce((acc, a) => acc + a.balance, 0);

export const selectCardsUsed = (s: FinanceState) =>
  s.cards.reduce((acc, c) => acc + c.balance, 0);

export const selectCardsLimit = (s: FinanceState) =>
  s.cards.reduce((acc, c) => acc + c.limit, 0);

export const selectFixedExpensesTotal = (s: FinanceState) =>
  s.fixedExpenses.reduce((acc, f) => acc + f.amount, 0);

export const selectMonthlyLoansTotal = (s: FinanceState) =>
  s.loans.reduce((acc, l) => acc + l.monthlyPayment, 0);

export const selectMonthlyMSITotal = (s: FinanceState) =>
  s.msi
    .filter((m) => m.monthsPaid < m.totalMonths)
    .reduce((acc, m) => acc + m.monthlyAmount, 0);

export const findSourceName = (source: PaymentSource, s: FinanceState) => {
  if (source.kind === "account") {
    const a = s.accounts.find((x) => x.id === source.id);
    return a ? `${a.alias} · ${a.bank}` : "Cuenta";
  }
  const c = s.cards.find((x) => x.id === source.id);
  return c ? `${c.alias} · ${c.bank}` : "Tarjeta";
};
