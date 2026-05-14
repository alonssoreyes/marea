import { create } from "zustand";
import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "error" | "success" | "info";
type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  expiresAt: number;
};

type ToastState = {
  toasts: Toast[];
  push: (kind: ToastKind, message: string, ttlMs?: number) => void;
  dismiss: (id: string) => void;
};

const useToastsStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message, ttlMs = 4500) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = Date.now() + ttlMs;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message, expiresAt }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, ttlMs);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Functional API, no hook — for use from stores or other utilities. */
export const toast = {
  error: (msg: string, ttl?: number) => useToastsStore.getState().push("error", msg, ttl),
  success: (msg: string, ttl?: number) => useToastsStore.getState().push("success", msg, ttl),
  info: (msg: string, ttl?: number) => useToastsStore.getState().push("info", msg, ttl),
};

const tone: Record<ToastKind, string> = {
  error: "bg-red-500/10 border-red-500/30 text-danger",
  success: "bg-brand-50 border-brand-200 text-brand-800",
  info: "bg-surface border-line text-ink",
};

const iconForKind: Record<ToastKind, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function Toaster() {
  const toasts = useToastsStore((s) => s.toasts);
  const dismiss = useToastsStore((s) => s.dismiss);

  useEffect(() => {
    // simple cleanup loop in case the timeout was missed
    const id = setInterval(() => {
      const now = Date.now();
      useToastsStore.setState((s) => ({
        toasts: s.toasts.filter((t) => t.expiresAt > now),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-[100] top-4 right-4 flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100vw-2rem)] md:w-auto">
      {toasts.map((t) => {
        const Icon = iconForKind[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-xl border p-3 shadow-elevated animate-fade-in",
              tone[t.kind]
            )}
          >
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-current/70 hover:text-current"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
