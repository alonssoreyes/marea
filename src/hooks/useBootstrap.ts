import { useEffect, useState } from "react";
import {
  accountsApi,
  authApi,
  budgetsApi,
  cardExpensesApi,
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
  toContribution,
  toDebitExpense,
  toFixedExpense,
  toGoal,
  toIncomeEvent,
  toLoan,
  toMSI,
  toTransfer,
  toUser,
} from "@/lib/adapters";
import { useAuth } from "@/store/auth";
import { useFinance } from "@/store/data";

type BootstrapState = {
  loading: boolean;
  error: string | null;
};

/**
 * On mount: if the auth is in "live" mode with a token, pull /auth/me + every
 * collection in parallel and hydrate the data store. In "demo" mode it's a no-op.
 *
 * Pages keep using `useFinance` exactly the same way — they don't know whether
 * the data came from localStorage or from the API.
 */
export function useBootstrap(): BootstrapState {
  const token = useAuth((s) => s.token);
  const isAuth = useAuth((s) => s.isAuthenticated);
  const logout = useAuth((s) => s.logout);
  const hydrate = useFinance((s) => s.hydrateFromServer);

  const [state, setState] = useState<BootstrapState>({
    loading: isAuth && !!token,
    error: null,
  });

  useEffect(() => {
    if (!isAuth || !token) {
      setState({ loading: false, error: null });
      return;
    }
    let cancelled = false;
    (async () => {
      setState({ loading: true, error: null });
      try {
        const [
          meRes,
          accountsRes,
          cardsRes,
          fixedRes,
          cardExpRes,
          debitExpRes,
          incomeRes,
          transfersRes,
          loansRes,
          msiRes,
          goalsRes,
          budgetsRes,
        ] = await Promise.all([
          authApi.me(),
          accountsApi.list(),
          cardsApi.list(),
          fixedExpensesApi.list(),
          cardExpensesApi.list(),
          debitExpensesApi.list(),
          incomeEventsApi.list(),
          transfersApi.list(),
          loansApi.list(),
          msiApi.list(),
          goalsApi.list(),
          budgetsApi.list(),
        ]);

        if (cancelled) return;

        hydrate({
          user: toUser(meRes.user),
          accounts: (accountsRes.accounts as any[]).map(toAccount),
          cards: (cardsRes.cards as any[]).map(toCard),
          fixedExpenses: (fixedRes.fixedExpenses as any[]).map(toFixedExpense),
          cardExpenses: (cardExpRes.cardExpenses as any[]).map(toCardExpense),
          debitExpenses: (debitExpRes.debitExpenses as any[]).map(toDebitExpense),
          incomeEvents: (incomeRes.incomeEvents as any[]).map(toIncomeEvent),
          transfers: (transfersRes.transfers as any[]).map(toTransfer),
          loans: (loansRes.loans as any[]).map(toLoan),
          msi: (msiRes.msi as any[]).map(toMSI),
          goals: (goalsRes.goals as any[]).map(toGoal),
          budgets: (budgetsRes.budgets as any[]).map(toBudget),
        });
        setState({ loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.status === 401
              ? "Tu sesión expiró. Inicia sesión de nuevo."
              : err.message
            : "No se pudo conectar al servidor. Verifica que esté corriendo.";

        // expired token → kick out
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
        setState({ loading: false, error: message });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, token]);

  // suppress unused-import warning from the helper module
  void toContribution;
  return state;
}
