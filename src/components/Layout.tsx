import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useFinance } from "@/store/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/accounts": "Cuentas y movimientos",
  "/cards": "Tarjetas de crédito",
  "/fixed": "Gastos fijos",
  "/debts": "Deudas y créditos",
  "/goals": "Metas de ahorro",
  "/budgets": "Presupuestos por categoría",
  "/profile": "Mi perfil",
  "/notifications": "Notificaciones",
};

export function Layout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const notifications = useNotifications();
  const user = useFinance((s) => s.user);

  const title = titles[location.pathname] ?? "Marea";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  return (
    <div className="min-h-screen bg-surface-soft flex">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} unread={notifications.length} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md border-b border-line">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-surface-muted"
            >
              <Menu className="h-5 w-5 text-ink" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-brand-900 leading-none">{title}</h2>
              <p className="text-xs text-ink-muted mt-1">
                {greeting}, {user.name || "amigo"} · {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg hover:bg-surface-muted transition-colors inline-flex items-center"
              aria-label="Ver notificaciones"
              title="Ver notificaciones"
            >
              <Bell className="h-5 w-5 text-ink-soft" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-danger animate-pulse" />
                  <span className="absolute -top-0.5 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                </>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

