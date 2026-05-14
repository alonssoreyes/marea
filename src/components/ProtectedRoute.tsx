import { Navigate, useLocation } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useFinance } from "@/store/data";
import { useBootstrap } from "@/hooks/useBootstrap";

/**
 * Blocks authenticated routes and routes:
 *   - If no session → /login
 *   - If bootstrap is loading user data → splash (avoids deciding
 *     `onboardingStep` with empty local state before server responds)
 *   - If user hasn't finished onboarding → /onboarding
 *   - Otherwise → renders the route
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuth((s) => s.isAuthenticated);
  const logout = useAuth((s) => s.logout);
  const onboardingStep = useFinance((s) => s.user.onboardingStep);
  const location = useLocation();
  const bootstrap = useBootstrap();

  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Waiting for backend response after login/refresh.
  // If we decide with empty local state, we could send the user to
  // /onboarding mistakenly, so we wait.
  if (bootstrap.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-soft">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-900 mb-4">
            <Loader2 className="h-7 w-7 text-brand-200 animate-spin" />
          </div>
          <p className="text-sm font-medium text-brand-900">Cargando tu información…</p>
        </div>
      </div>
    );
  }

  if (bootstrap.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-soft p-6">
        <div className="max-w-sm w-full bg-surface border border-line rounded-2xl shadow-card p-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-red-500/10 text-danger mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-semibold text-ink">
            No se pudo cargar tu información
          </h2>
          <p className="text-sm text-ink-muted mt-1">{bootstrap.error}</p>
          <div className="mt-5 flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="px-3 py-2 rounded-lg border border-line text-sm font-medium text-ink-soft hover:bg-surface-muted"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (onboardingStep < 5 && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
