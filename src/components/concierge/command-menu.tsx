import { useEffect, useRef } from "react";
import type { Suggestion } from "@/lib/concierge/commands";

type Props = {
  open: boolean;
  items: Suggestion[];
  activeIndex: number;
  onSelect: (value: string) => void;
  onHover: (index: number) => void;
  label?: string;
};

export function CommandMenu({ open, items, activeIndex, onSelect, onHover, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const child = ref.current?.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`);
    child?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open || items.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 bottom-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover/95 backdrop-blur shadow-lg p-1"
    >
      {label && (
        <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </p>
      )}
      {items.map((s, i) => (
        <button
          key={s.value}
          type="button"
          data-idx={i}
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s.value);
          }}
          className={`w-full flex items-baseline gap-3 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            i === activeIndex ? "bg-muted text-foreground" : "hover:bg-muted/50"
          }`}
        >
          <span className="font-mono text-accent shrink-0">{s.value}</span>
          <span className="text-xs text-muted-foreground truncate">{s.description}</span>
        </button>
      ))}
    </div>
  );
}
