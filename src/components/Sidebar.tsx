import { NavLink, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Home,
  Landmark,
  LogOut,
  PiggyBank,
  Receipt,
  Target,
  UserCircle,
  Wallet,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/accounts", label: "Cuentas", icon: Wallet },
  { to: "/cards", label: "Tarjetas", icon: CreditCard },
  { to: "/fixed", label: "Gastos fijos", icon: Receipt },
  { to: "/debts", label: "Deudas", icon: Landmark },
  { to: "/goals", label: "Metas", icon: PiggyBank },
  { to: "/budgets", label: "Presupuestos", icon: Target },
  { to: "/notifications", label: "Notificaciones", icon: Bell },
  { to: "/profile", label: "Perfil", icon: UserCircle },
];

export function Sidebar({
  mobileOpen,
  onClose,
  unread,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  unread: number;
}) {
  const { logout, name, email } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-brand-900/40 backdrop-blur-sm md:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed md:sticky top-0 z-40 h-screen w-64 bg-surface border-r border-line",
          "flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-900 flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="h-6 w-6">
                <path
                  d="M4 20 Q 8 14, 12 20 T 20 20 T 28 20"
                  stroke="#BFDBFE"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M4 25 Q 8 19, 12 25 T 20 25 T 28 25"
                  stroke="#60A5FA"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-brand-900 leading-none">Marea</h1>
              <p className="text-[11px] text-ink-muted leading-tight mt-0.5">Tu flujo financiero</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    "relative",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.to === "/notifications" && unread > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line">
          <div className="flex items-center justify-between mb-3 gap-2">
            <span className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">
              Tema
            </span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
              {(name ?? "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{name ?? "Usuario"}</p>
              <p className="text-xs text-ink-muted truncate">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-ink-muted hover:bg-surface-muted transition-colors"
              title="Salir"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
