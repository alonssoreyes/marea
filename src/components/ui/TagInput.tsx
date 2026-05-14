import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

/**
 * Input for free-form tags. Accepts tags via Enter or comma.
 * Optional suggestions to reuse existing tags.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Ej: vacaciones, trabajo…",
  suggestions = [],
  className,
}: Props) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) {
      setInput("");
      return;
    }
    onChange([...value, t]);
    setInput("");
  };

  const removeTag = (t: string) => {
    onChange(value.filter((x) => x !== t));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const matchedSuggestions = suggestions
    .filter((s) => !value.includes(s))
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 6);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 min-h-10 px-2 py-1.5 rounded-xl border bg-surface transition-colors",
          focused
            ? "border-brand-400 ring-2 ring-brand-100"
            : "border-line"
        )}
        onClick={(e) => {
          const inp = (e.currentTarget.querySelector("input") as HTMLInputElement | null);
          inp?.focus();
        }}
      >
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 text-xs font-medium rounded-md px-2 py-0.5"
          >
            #{t}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(t);
              }}
              className="text-brand-500 hover:text-brand-800"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // commit any pending tag on blur
            if (input.trim()) addTag(input);
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[60px] bg-transparent text-sm outline-none placeholder:text-ink-muted"
        />
      </div>
      {focused && matchedSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-xl shadow-elevated p-1">
          {matchedSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="block w-full text-left text-sm px-2 py-1 rounded-lg hover:bg-surface-muted"
            >
              <span className="text-brand-600">#</span>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
