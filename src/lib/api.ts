/**
 * Thin fetch wrapper that:
 *  - Attaches the Authorization header from the auth store (if present)
 *  - Parses JSON & surfaces structured errors
 *  - Hits relative /api paths (Vite proxies them to the backend in dev)
 */

import { useAuth } from "@/store/auth";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = useAuth.getState().token;

  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content
  if (res.status === 204) return undefined as T;

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const message =
      (parsed as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ---- Typed helpers per resource ----

type ServerUser = {
  id: string;
  email: string;
  name: string;
  payday: number;
  loanPayday: number;
  monthlyIncome: number | string;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
};

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ user: ServerUser; token: string }>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<{ user: ServerUser; token: string }>("/auth/login", data),
  me: () => api.get<{ user: ServerUser }>("/auth/me"),
  updateMe: (patch: Partial<{ name: string; payday: number; loanPayday: number; monthlyIncome: number; onboardingStep: number }>) =>
    api.patch<{ user: ServerUser }>("/auth/me", patch),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<void>("/auth/change-password", data),
};

type AccountInput = {
  bank: string;
  alias: string;
  balance: number;
  minBalance?: number | null;
};

export const accountsApi = {
  list: () => api.get<{ accounts: unknown[] }>("/accounts"),
  create: (data: AccountInput) => api.post<{ account: unknown }>("/accounts", data),
  update: (id: string, data: Partial<AccountInput>) =>
    api.patch<{ account: unknown }>(`/accounts/${id}`, data),
  remove: (id: string) => api.delete<void>(`/accounts/${id}`),
};

type CardInput = {
  bank: string;
  alias: string;
  cardLimit: number;
  cutoffDay: number;
  dueDay: number;
  balance: number;
};

export const cardsApi = {
  list: () => api.get<{ cards: unknown[] }>("/cards"),
  create: (data: CardInput) => api.post<{ card: unknown }>("/cards", data),
  update: (id: string, data: Partial<CardInput>) =>
    api.patch<{ card: unknown }>(`/cards/${id}`, data),
  remove: (id: string) => api.delete<void>(`/cards/${id}`),
};

type FixedExpenseInput = {
  name: string;
  amount: number;
  payDay: number;
  sourceKind: "account" | "card";
  sourceId: string;
};

export const fixedExpensesApi = {
  list: () => api.get<{ fixedExpenses: unknown[] }>("/fixed-expenses"),
  create: (data: FixedExpenseInput) =>
    api.post<{ fixedExpense: unknown }>("/fixed-expenses", data),
  update: (id: string, data: Partial<FixedExpenseInput>) =>
    api.patch<{ fixedExpense: unknown }>(`/fixed-expenses/${id}`, data),
  togglePaid: (id: string, cycle: string) =>
    api.post<{ fixedExpense: unknown }>(`/fixed-expenses/${id}/toggle-paid`, { cycle }),
  remove: (id: string) => api.delete<void>(`/fixed-expenses/${id}`),
};

export const cardExpensesApi = {
  list: () => api.get<{ cardExpenses: unknown[] }>("/card-expenses"),
  create: (data: {
    cardId: string;
    amount: number;
    description?: string;
    category?: string;
    date: string;
    tags?: string[];
  }) => api.post<{ cardExpense: unknown }>("/card-expenses", data),
  remove: (id: string) => api.delete<void>(`/card-expenses/${id}`),
};

export const debitExpensesApi = {
  list: () => api.get<{ debitExpenses: unknown[] }>("/debit-expenses"),
  create: (data: {
    accountId: string;
    amount: number;
    description?: string;
    category?: string;
    date: string;
    tags?: string[];
  }) => api.post<{ debitExpense: unknown }>("/debit-expenses", data),
  remove: (id: string) => api.delete<void>(`/debit-expenses/${id}`),
};

export const incomeEventsApi = {
  list: () => api.get<{ incomeEvents: unknown[] }>("/income-events"),
  create: (data: {
    accountId: string;
    amount: number;
    source: string;
    description?: string;
    date: string;
  }) => api.post<{ incomeEvent: unknown }>("/income-events", data),
  remove: (id: string) => api.delete<void>(`/income-events/${id}`),
};

export const transfersApi = {
  list: () => api.get<{ transfers: unknown[] }>("/transfers"),
  create: (data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    note?: string;
  }) => api.post<{ transfer: unknown }>("/transfers", data),
  remove: (id: string) => api.delete<void>(`/transfers/${id}`),
};

type LoanInput = {
  bank: string;
  originalAmount: number;
  remainingAmount: number;
  annualRate: number;
  totalPayments: number;
  monthlyPayment: number;
  startDate: string;
};

export const loansApi = {
  list: () => api.get<{ loans: unknown[] }>("/loans"),
  create: (data: LoanInput) => api.post<{ loan: unknown }>("/loans", data),
  update: (id: string, data: Partial<LoanInput>) =>
    api.patch<{ loan: unknown }>(`/loans/${id}`, data),
  registerPayment: (id: string, extra = 0) =>
    api.post<{ payment: unknown }>(`/loans/${id}/payments`, { extra }),
  remove: (id: string) => api.delete<void>(`/loans/${id}`),
};

type MSIInput = {
  description: string;
  store: string;
  totalAmount: number;
  totalMonths: number;
  monthlyAmount: number;
  startDate: string;
};

export const msiApi = {
  list: () => api.get<{ msi: unknown[] }>("/msi"),
  create: (data: MSIInput) => api.post<{ msi: unknown }>("/msi", data),
  update: (id: string, data: Partial<MSIInput & { monthsPaid: number }>) =>
    api.patch<{ msi: unknown }>(`/msi/${id}`, data),
  registerPayment: (id: string) => api.post<{ payment: unknown }>(`/msi/${id}/payments`),
  remove: (id: string) => api.delete<void>(`/msi/${id}`),
};

export const goalsApi = {
  list: () => api.get<{ goals: unknown[] }>("/goals"),
  create: (data: {
    name: string;
    description?: string;
    targetAmount: number;
    targetDate?: string;
    emoji: string;
  }) => api.post<{ goal: unknown }>("/goals", data),
  update: (id: string, data: Partial<{ name: string; description: string; targetAmount: number; targetDate: string; emoji: string }>) =>
    api.patch<{ goal: unknown }>(`/goals/${id}`, data),
  addContribution: (id: string, amount: number, note?: string, accountId?: string) =>
    api.post<{ contribution: unknown }>(`/goals/${id}/contributions`, { amount, note, accountId }),
  remove: (id: string) => api.delete<void>(`/goals/${id}`),
};

export const budgetsApi = {
  list: () => api.get<{ budgets: unknown[] }>("/budgets"),
  upsert: (data: { category: string; amount: number }) =>
    api.put<{ budget: unknown }>("/budgets", data),
  remove: (category: string) => api.delete<void>(`/budgets/${category}`),
};

export const healthApi = {
  check: () => api.get<{ ok: boolean; service: string; env: string }>("/health"),
};
