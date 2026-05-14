import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePref = "system" | "light" | "dark";

type ThemeState = {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  /** The effective theme applied to the DOM (resolves "system" to light/dark). */
  resolved: () => "light" | "dark";
};

const systemPrefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      pref: "system",
      setPref: (pref) => {
        set({ pref });
        applyToDom(get().resolved());
      },
      resolved: () => {
        const pref = get().pref;
        if (pref === "system") return systemPrefersDark() ? "dark" : "light";
        return pref;
      },
    }),
    {
      name: "marea-theme",
      onRehydrateStorage: () => (state) => {
        state && applyToDom(state.resolved());
      },
    }
  )
);

export function applyToDom(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

/** Apply theme as early as possible to avoid flashing. */
export function initThemeEarly() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("marea-theme");
    let pref: ThemePref = "system";
    if (raw) {
      const parsed = JSON.parse(raw);
      pref = parsed.state?.pref ?? "system";
    }
    const resolved =
      pref === "system" ? (systemPrefersDark() ? "dark" : "light") : pref;
    applyToDom(resolved);
  } catch {
    // ignore
  }
}

/** Reacts to OS preference changes when user is in "system" mode. */
export function watchSystemTheme() {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    const { pref } = useTheme.getState();
    if (pref === "system") applyToDom(mq.matches ? "dark" : "light");
  };
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
