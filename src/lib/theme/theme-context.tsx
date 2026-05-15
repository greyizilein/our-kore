import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEMES = ["void", "bone", "iron", "ember", "jade", "blanc", "terre", "nuit"] as const;
export type ThemeName = (typeof THEMES)[number];
export type Mode = "light" | "dark";
export type Density = "comfortable" | "compact";
export type Typeface = "modern" | "classic";

interface ThemeState {
  theme: ThemeName;
  mode: Mode;
  grain: boolean;
  motion: boolean;
  fontScale: number;
  density: Density;
  typeface: Typeface;
  set: (patch: Partial<Omit<ThemeState, "set">>) => void;
}

const KEY = "kore.theme.v2";
const defaults: Omit<ThemeState, "set"> = {
  theme: "void",
  mode: "dark",
  grain: true,
  motion: true,
  fontScale: 1,
  density: "comfortable",
  typeface: "modern",
};

const Ctx = createContext<ThemeState | null>(null);

function applyToHtml(s: Omit<ThemeState, "set">) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  THEMES.forEach((t) => html.classList.remove(`theme-${t}`));
  html.classList.add(`theme-${s.theme}`);
  html.classList.toggle("dark", s.mode === "dark");
  html.classList.toggle("motion-reduced", !s.motion);
  html.classList.toggle("grain", s.grain);
  html.classList.remove("face-modern", "face-classic");
  html.classList.add(`face-${s.typeface}`);
  html.style.setProperty("--font-scale", String(s.fontScale));
  html.dataset.density = s.density;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<ThemeState, "set">>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = { ...defaults, ...JSON.parse(raw) };
        setState(parsed);
        applyToHtml(parsed);
        return;
      }
    } catch {}
    applyToHtml(defaults);
  }, []);

  const set: ThemeState["set"] = (patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      applyToHtml(next);
      return next;
    });
  };

  return <Ctx.Provider value={{ ...state, set }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
