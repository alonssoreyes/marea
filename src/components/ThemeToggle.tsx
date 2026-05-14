import { useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, watchSystemTheme } from "@/store/theme";
import { cn } from "@/lib/utils";

const options: Array<{ value: "system" | "light" | "dark"; icon: typeof Sun; label: string }> = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
];

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const pref = useTheme((s) => s.pref);
  const setPref = useTheme((s) => s.setPref);

  useEffect(() => watchSystemTheme(), []);

  if (compact) {
    // compact version: cycles between light → dark → system
    const next: Record<typeof pref, typeof pref> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    const Icon = options.find((o) => o.value === pref)!.icon;
    return (
      <button
        onClick={() => setPref(next[pref])}
        className="p-2 rounded-lg text-ink-muted hover:bg-surface-muted transition-colors"
        title={`Tema: ${options.find((o) => o.value === pref)!.label}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="inline-flex p-1 bg-surface-muted rounded-xl gap-0.5">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setPref(value)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
            pref === value
              ? "bg-surface text-brand-700 shadow-sm"
              : "text-ink-muted hover:text-ink"
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only md:not-sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
