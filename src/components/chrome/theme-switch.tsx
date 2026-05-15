import { useTheme, type ThemeName } from "@/lib/theme/theme-context";

const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: "void",  label: "Void",  swatch: "oklch(0.55 0.2 30)" },
  { id: "bone",  label: "Bone",  swatch: "oklch(0.78 0.07 75)" },
  { id: "iron",  label: "Iron",  swatch: "oklch(0.55 0.04 250)" },
  { id: "ember", label: "Ember", swatch: "oklch(0.62 0.22 40)" },
  { id: "jade",  label: "Jade",  swatch: "oklch(0.58 0.13 165)" },
];

export function ThemeSwitch() {
  const t = useTheme();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => t.set({ mode: t.mode === "dark" ? "light" : "dark" })}
        className="text-[10px] font-mono uppercase tracking-[0.2em] px-2 py-1 border border-border/60 hover:border-foreground transition-colors"
        aria-label="Toggle dark mode"
      >
        {t.mode === "dark" ? "Dark" : "Light"}
      </button>
      <div className="flex items-center gap-1.5">
        {THEMES.map((th) => (
          <button
            key={th.id}
            onClick={() => t.set({ theme: th.id })}
            aria-label={`Theme ${th.label}`}
            className="w-3 h-3 rounded-full ring-1 ring-border transition-transform hover:scale-110"
            style={{
              background: th.swatch,
              outline: t.theme === th.id ? "1px solid currentColor" : undefined,
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
