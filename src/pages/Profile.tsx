import { FormEvent, useState } from "react";
import { Download, KeyRound, Save, User as UserIcon } from "lucide-react";
import { useFinance } from "@/store/data";
import { useAuth } from "@/store/auth";
import { ApiError, authApi } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Toaster";
import { formatCurrency } from "@/lib/format";

export default function Profile() {
  const user = useFinance((s) => s.user);
  const updateUser = useFinance((s) => s.updateUser);

  const [form, setForm] = useState({
    name: user.name,
    payday: user.payday,
    loanPayday: user.loanPayday,
    monthlyIncome: user.monthlyIncome,
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authApi.updateMe({
        name: form.name,
        payday: form.payday,
        loanPayday: form.loanPayday,
        monthlyIncome: form.monthlyIncome,
      });
      updateUser({
        name: res.user.name,
        payday: res.user.payday,
        loanPayday: res.user.loanPayday,
        monthlyIncome: Number(res.user.monthlyIncome),
      });
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-brand-700" />
            <CardTitle>Tu perfil financiero</CardTitle>
          </div>
          <CardDescription>
            Cambia tu día de pago, sueldo y nombre. Estos datos definen tu ciclo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Día de pago</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.payday}
                  onChange={(e) => setForm({ ...form, payday: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Día de pago de préstamos</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.loanPayday}
                  onChange={(e) => setForm({ ...form, loanPayday: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Sueldo mensual neto</Label>
                <Input
                  type="number"
                  value={form.monthlyIncome || ""}
                  onChange={(e) => setForm({ ...form, monthlyIncome: Number(e.target.value) })}
                />
                <p className="text-[11px] text-ink-muted">Actual: {formatCurrency(user.monthlyIncome)}</p>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordCard />
      <ExportDataCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("La contraseña nueva debe tener al menos 8 caracteres");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success("Contraseña actualizada");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-700" />
          <CardTitle>Cambiar contraseña</CardTitle>
        </div>
        <CardDescription>
          Necesitas tu contraseña actual para confirmar el cambio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <Label>Contraseña actual</Label>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nueva contraseña</Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Actualizando..." : "Actualizar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ExportDataCard() {
  const state = useFinance();
  const auth = useAuth();

  const doExport = (kind: "json" | "csv") => {
    if (kind === "json") {
      const payload = {
        exportedAt: new Date().toISOString(),
        user: { email: auth.email, name: auth.name },
        accounts: state.accounts,
        cards: state.cards,
        fixedExpenses: state.fixedExpenses,
        cardExpenses: state.cardExpenses,
        debitExpenses: state.debitExpenses,
        incomeEvents: state.incomeEvents,
        transfers: state.transfers,
        loans: state.loans,
        msi: state.msi,
        goals: state.goals,
        budgets: state.budgets,
      };
      download(`marea-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    } else {
      // CSV: combines all movements into a flat file
      const rows: string[] = ["tipo,fecha,monto,descripcion,categoria,cuenta_o_tarjeta,tags"];
      const accountName = (id: string) =>
        state.accounts.find((a) => a.id === id)?.alias ?? id;
      const cardName = (id: string) => state.cards.find((c) => c.id === id)?.alias ?? id;
      state.debitExpenses.forEach((e) =>
        rows.push(
          csvRow(["gasto-debito", e.date, -e.amount, e.description, e.category, accountName(e.accountId), (e.tags ?? []).join("|")])
        )
      );
      state.cardExpenses.forEach((e) =>
        rows.push(
          csvRow(["gasto-tarjeta", e.date, -e.amount, e.description, e.category, cardName(e.cardId), (e.tags ?? []).join("|")])
        )
      );
      state.incomeEvents.forEach((e) =>
        rows.push(
          csvRow(["ingreso", e.date, e.amount, e.description ?? "", e.source, accountName(e.accountId), ""])
        )
      );
      state.transfers.forEach((t) =>
        rows.push(
          csvRow([
            "transferencia",
            t.date,
            t.amount,
            t.note ?? "",
            "transferencia",
            `${accountName(t.fromAccountId)} → ${accountName(t.toAccountId)}`,
            "",
          ])
        )
      );
      download(`marea-${stamp()}.csv`, rows.join("\n"), "text/csv;charset=utf-8;");
    }
    toast.success("Exportación lista. Revisa tu carpeta de descargas.");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-brand-700" />
          <CardTitle>Exportar mis datos</CardTitle>
        </div>
        <CardDescription>
          Descarga una copia de tu información financiera. Útil como respaldo o para tu contador.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => doExport("json")}>
          <Download className="h-4 w-4" />
          Descargar JSON
        </Button>
        <Button variant="secondary" onClick={() => doExport("csv")}>
          <Download className="h-4 w-4" />
          Descargar CSV (movimientos)
        </Button>
      </CardContent>
    </Card>
  );
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function csvRow(values: (string | number)[]) {
  return values
    .map((v) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    })
    .join(",");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
