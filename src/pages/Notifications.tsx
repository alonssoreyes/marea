import { Bell, AlertTriangle, CreditCard as CardIcon, Receipt, Wallet, PiggyBank, Info, CheckCircle2, X, RotateCcw } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useFinance } from "@/store/data";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const iconForKind = {
  "card-due-soon": CardIcon,
  "fixed-expense-overdue": Receipt,
  "loan-unpaid": Wallet,
  "goal-deadline": PiggyBank,
  "min-balance": Wallet,
};

const severityStyles = {
  danger: "bg-red-50 border-red-100 text-danger",
  warning: "bg-orange-50 border-orange-100 text-orange-700",
  info: "bg-brand-50 border-brand-100 text-brand-700",
};

const severityIcon = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export default function Notifications() {
  const notifications = useNotifications();
  const dismiss = useFinance((s) => s.dismissNotification);
  const restoreDismissed = useFinance((s) => s.clearDismissedNotifications);
  const dismissedCount = useFinance((s) => s.dismissedNotifications.length);

  const byKind: Record<string, typeof notifications> = {};
  notifications.forEach((n) => {
    if (!byKind[n.kind]) byKind[n.kind] = [];
    byKind[n.kind].push(n);
  });

  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-3">
        <EmptyState
          icon={CheckCircle2}
          title="¡Todo bajo control!"
          description="No tienes alertas activas. Tus tarjetas, gastos fijos y metas están al día."
        />
        {dismissedCount > 0 && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={restoreDismissed}>
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar {dismissedCount} alerta{dismissedCount === 1 ? "" : "s"} descartada{dismissedCount === 1 ? "" : "s"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            Marea analiza tu actividad y genera alertas para mantenerte al día.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dismissedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={restoreDismissed}>
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar {dismissedCount} descartada{dismissedCount === 1 ? "" : "s"}
            </Button>
          )}
          <Badge variant="ink">{notifications.length} activa{notifications.length === 1 ? "" : "s"}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-line">
            {notifications.map((n) => {
              const Icon = iconForKind[n.kind] ?? Bell;
              const SeverityIcon = severityIcon[n.severity];
              return (
                <li key={n.id} className="p-4 flex items-start gap-3 hover:bg-surface-soft transition-colors">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      severityStyles[n.severity]
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">{n.title}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{n.body}</p>
                      </div>
                      <Badge
                        variant={n.severity === "danger" ? "danger" : n.severity === "warning" ? "warning" : "soft"}
                        className="flex-shrink-0"
                      >
                        <SeverityIcon className="h-3 w-3" />
                        {n.severity === "danger"
                          ? "Urgente"
                          : n.severity === "warning"
                          ? "Atención"
                          : "Info"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1.5">
                      {formatDate(n.date, "EEEE d 'de' MMMM, yyyy")}
                    </p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="p-1.5 text-ink-muted hover:bg-surface-muted rounded-lg"
                    title="Descartar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
