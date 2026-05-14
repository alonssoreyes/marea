import { useMemo, useState } from "react";
import { CreditCard as CreditCardIcon, Plus, Calendar, ChevronRight, Receipt, Pencil } from "lucide-react";
import type { CreditCard } from "@/types";
import { useFinance } from "@/store/data";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Input, Select } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { TagInput } from "@/components/ui/TagInput";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { classifyCardExpense, getCardSchedule } from "@/lib/finance";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { ExpenseCategory } from "@/types";

const categoryLabels: Record<ExpenseCategory, string> = {
  alimentos: "Alimentos",
  transporte: "Transporte",
  entretenimiento: "Entretenimiento",
  salud: "Salud",
  hogar: "Hogar",
  ropa: "Ropa",
  tecnologia: "Tecnología",
  servicios: "Servicios",
  otros: "Otros",
};

export default function Cards() {
  const cards = useFinance((s) => s.cards);
  const expenses = useFinance((s) => s.cardExpenses);
  const addCard = useFinance((s) => s.addCard);
  const addExpense = useFinance((s) => s.addCardExpense);
  const removeExpense = useFinance((s) => s.removeCardExpense);
  const removeCard = useFinance((s) => s.removeCard);
  const today = new Date();

  const [openAddCard, setOpenAddCard] = useState(false);
  const [openExpense, setOpenExpense] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            Marea clasifica automáticamente cada gasto en el ciclo de facturación correcto.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openExpense} onOpenChange={setOpenExpense}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Receipt className="h-4 w-4" />
                Registrar gasto
              </Button>
            </DialogTrigger>
            <AddExpenseDialog onClose={() => setOpenExpense(false)} />
          </Dialog>
          <Dialog open={openAddCard} onOpenChange={setOpenAddCard}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nueva tarjeta
              </Button>
            </DialogTrigger>
            <AddCardDialog onClose={() => setOpenAddCard(false)} />
          </Dialog>
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="No tienes tarjetas registradas"
          description="Agrega tus tarjetas para empezar a registrar gastos y ver tus ciclos."
          action={
            <Button onClick={() => setOpenAddCard(true)}>
              <Plus className="h-4 w-4" />
              Agregar tarjeta
            </Button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => {
            const sched = getCardSchedule(today, card);
            const usage = card.limit > 0 ? card.balance / card.limit : 0;
            return (
              <Card
                key={card.id}
                className="overflow-hidden cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={() => setActiveCard(activeCard === card.id ? null : card.id)}
              >
                <div className="bg-gradient-to-br from-brand-700 to-brand-900 text-white p-5">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-brand-200">{card.bank}</p>
                      <p className="text-lg font-semibold mt-0.5">{card.alias}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCard(card);
                        }}
                        className="p-1.5 text-brand-200 hover:bg-white/10 rounded-lg transition-colors"
                        title="Editar tarjeta"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <CreditCardIcon className="h-6 w-6 text-brand-200" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatCurrency(card.balance)}
                    </p>
                    <p className="text-sm text-brand-200">/ {formatCurrency(card.limit, { compact: true })}</p>
                  </div>
                  <Progress
                    value={usage * 100}
                    className="mt-3 bg-white/15"
                    indicatorClassName={usage > 0.8 ? "bg-red-300" : "bg-brand-200"}
                  />
                  <div className="flex items-center justify-between mt-3 text-xs text-brand-100">
                    <span>{(usage * 100).toFixed(0)}% used</span>
                    <Badge
                      variant="ink"
                      className="bg-white/20 border-white/20 text-white"
                    >
                      Pago: día {card.dueDay}
                    </Badge>
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-ink-muted">Próximo corte</p>
                      <p className="font-medium text-ink mt-0.5">
                        {format(sched.nextCutoff, "EEE d MMM", { locale: es })}
                      </p>
                      <p className="text-ink-muted mt-0.5">
                        en {sched.daysToCutoff}{" "}
                        día{sched.daysToCutoff === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-muted">Fecha límite</p>
                      <p className="font-medium text-ink mt-0.5">
                        {format(sched.nextDue, "EEE d MMM", { locale: es })}
                      </p>
                      <p
                        className={`mt-0.5 ${
                          sched.daysToDue <= 3 ? "text-danger" : "text-ink-muted"
                        }`}
                      >
                        en {sched.daysToDue} día{sched.daysToDue === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 justify-between"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCard(activeCard === card.id ? null : card.id);
                    }}
                  >
                    {activeCard === card.id ? "Ocultar movimientos" : "Ver movimientos"}
                    <ChevronRight
                      className={`h-3.5 w-3.5 transition-transform ${
                        activeCard === card.id ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Movements for active card */}
      {activeCard && (
        <CardMovements
          cardId={activeCard}
          onClose={() => setActiveCard(null)}
          onRemoveCard={(id) => {
            removeCard(id);
            setActiveCard(null);
          }}
          onEdit={(c) => setEditingCard(c)}
        />
      )}

      <Dialog open={!!editingCard} onOpenChange={(o) => !o && setEditingCard(null)}>
        {editingCard && (
          <CardDialog card={editingCard} onClose={() => setEditingCard(null)} />
        )}
      </Dialog>
    </div>
  );
}

function AddCardDialog({ onClose }: { onClose: () => void }) {
  return <CardDialog onClose={onClose} />;
}

function CardDialog({ onClose, card }: { onClose: () => void; card?: CreditCard }) {
  const addCard = useFinance((s) => s.addCard);
  const updateCard = useFinance((s) => s.updateCard);
  const [form, setForm] = useState({
    bank: card?.bank ?? "",
    alias: card?.alias ?? "",
    limit: card?.limit ?? 0,
    cutoffDay: card?.cutoffDay ?? 5,
    dueDay: card?.dueDay ?? 25,
    balance: card?.balance ?? 0,
  });

  const submit = () => {
    if (!form.bank || !form.alias) return;
    if (card) {
      updateCard(card.id, form);
    } else {
      addCard(form);
    }
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{card ? "Editar tarjeta" : "Nueva tarjeta"}</DialogTitle>
        <DialogDescription>
          {card
            ? "Modifica los datos. El saldo lo manejas tú directamente — los gastos no se re-calcularán."
            : "Asegúrate de capturar bien el día de corte y de pago."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Input
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Alias</Label>
          <Input
            value={form.alias}
            onChange={(e) => setForm({ ...form, alias: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Límite</Label>
          <Input
            type="number"
            value={form.limit || ""}
            onChange={(e) => setForm({ ...form, limit: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Saldo actual</Label>
          <Input
            type="number"
            value={form.balance || ""}
            onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Día de corte</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.cutoffDay}
            onChange={(e) => setForm({ ...form, cutoffDay: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Día límite</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>{card ? "Guardar cambios" : "Agregar tarjeta"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AddExpenseDialog({ onClose }: { onClose: () => void }) {
  const cards = useFinance((s) => s.cards);
  const allDebit = useFinance((s) => s.debitExpenses);
  const allCard = useFinance((s) => s.cardExpenses);
  const addExpense = useFinance((s) => s.addCardExpense);
  const [form, setForm] = useState({
    cardId: cards[0]?.id ?? "",
    amount: 0,
    description: "",
    category: "otros" as ExpenseCategory,
    date: new Date().toISOString().slice(0, 10),
    tags: [] as string[],
  });

  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    allDebit.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    allCard.forEach((e) => e.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [allDebit, allCard]);

  const card = cards.find((c) => c.id === form.cardId);
  const preview = card
    ? classifyCardExpense(new Date(form.date), card)
    : null;

  const submit = () => {
    if (!form.cardId || !form.amount) return;
    addExpense({
      cardId: form.cardId,
      amount: form.amount,
      description: form.description,
      category: form.category,
      date: form.date,
      tags: form.tags.length ? form.tags : undefined,
    });
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Registrar gasto con tarjeta</DialogTitle>
        <DialogDescription>
          Marea calculará automáticamente en qué ciclo cae el cargo.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tarjeta</Label>
            <Select
              value={form.cardId}
              onChange={(e) => setForm({ ...form, cardId: e.target.value })}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.alias}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as ExpenseCategory })
              }
            >
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Cena, gasolina..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Etiquetas</Label>
          <TagInput
            value={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            suggestions={tagSuggestions}
          />
        </div>
        {preview && (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3 text-sm text-brand-800">
            <p className="font-medium flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Este gasto se incluirá en tu estado de cuenta de{" "}
              {format(preview.cycleEnd, "MMMM yyyy", { locale: es })}
            </p>
            <p className="text-xs text-brand-700 mt-1">
              Vencimiento: {format(preview.dueDate, "EEEE d 'de' MMMM", { locale: es })}
            </p>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Registrar gasto</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function CardMovements({
  cardId,
  onClose,
  onRemoveCard,
  onEdit,
}: {
  cardId: string;
  onClose: () => void;
  onRemoveCard: (id: string) => void;
  onEdit: (card: CreditCard) => void;
}) {
  const card = useFinance((s) => s.cards.find((c) => c.id === cardId));
  const allExpenses = useFinance((s) => s.cardExpenses);
  const removeExpense = useFinance((s) => s.removeCardExpense);

  const expenses = useMemo(
    () => allExpenses.filter((e) => e.cardId === cardId),
    [allExpenses, cardId]
  );

  const byCycle = useMemo(() => {
    const map = new Map<string, typeof expenses>();
    expenses.forEach((e) => {
      const list = map.get(e.billingCycle) ?? [];
      list.push(e);
      map.set(e.billingCycle, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  if (!card) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Movimientos · {card.alias}</CardTitle>
          <CardDescription>Agrupados por ciclo de facturación.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(card)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`¿Eliminar la tarjeta ${card.alias}? Sus movimientos seguirán visibles.`)) {
                onRemoveCard(card.id);
              }
            }}
          >
            Eliminar tarjeta
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {byCycle.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-6">
            No has registrado gastos para esta tarjeta.
          </p>
        ) : (
          byCycle.map(([cycle, items]) => {
            const total = items.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={cycle}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="soft">
                    Ciclo {format(new Date(cycle + "-01"), "MMMM yyyy", { locale: es })}
                  </Badge>
                  <p className="text-sm font-semibold text-brand-900 tabular-nums">
                    {formatCurrency(total)}
                  </p>
                </div>
                <div className="rounded-xl border border-line divide-y divide-line bg-surface">
                  {items.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{e.description || categoryLabels[e.category]}</p>
                        <p className="text-xs text-ink-muted">
                          {formatDate(e.date, "d MMM yyyy")} ·{" "}
                          {categoryLabels[e.category]} · Vence{" "}
                          {formatShortDate(e.dueDate)}
                          {e.tags?.length ? ` · ${e.tags.map((t) => `#${t}`).join(" ")}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-ink tabular-nums">
                          {formatCurrency(e.amount)}
                        </p>
                        <button
                          onClick={() => removeExpense(e.id)}
                          className="text-xs text-ink-muted hover:text-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
