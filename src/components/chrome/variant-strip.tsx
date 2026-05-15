import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { CollectionVariant } from "@/lib/collections";

type Props = {
  collectionSlug: string;
  variants: CollectionVariant[];
  palette: string[];
  /** px per frame drift speed; 0 disables drift */
  speed?: number;
};

/**
 * Asus-style horizontal variant strip.
 * - Drifts left continuously, loops back to start on overflow
 * - Pauses on touch / hover, resumes after 3s of no interaction
 * - Respects prefers-reduced-motion (no auto drift, still hand-swipeable)
 */
export function VariantStrip({ collectionSlug, variants, palette, speed = 0.4 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || variants.length <= 1) return;
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || speed === 0) return;

    let raf = 0;
    const tick = () => {
      if (Date.now() > pausedUntil.current) {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0) {
          let next = el.scrollLeft + speed;
          if (next >= max) next = 0;
          el.scrollLeft = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => { pausedUntil.current = Date.now() + 3000; };
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("pointerdown", pause);
    el.addEventListener("wheel", pause, { passive: true });
    el.addEventListener("mouseenter", pause);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("wheel", pause);
      el.removeEventListener("mouseenter", pause);
    };
  }, [variants.length, speed]);

  if (variants.length === 0) return null;

  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-3 sm:-mx-6 lg:-mx-10 px-3 sm:px-6 lg:px-10 pb-2"
      style={{ scrollBehavior: "auto" }}
    >
      {variants.map((v) => (
        <Link
          key={v.slug}
          to="/collection/$slug/$variant"
          params={{ slug: collectionSlug, variant: v.slug }}
          className="group flex-shrink-0 snap-start w-[120px] sm:w-[160px]"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-muted/20 border border-border/40">
            {v.cover ? (
              <img
                src={v.cover}
                alt={v.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={{ background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 60%, ${palette[2] ?? palette[1]} 100%)` }}
              >
                <span
                  className="font-display text-5xl sm:text-6xl italic font-light"
                  style={{ color: palette[3] ?? "#fff", mixBlendMode: "difference" }}
                >
                  {v.numeral}
                </span>
              </div>
            )}
          </div>
          <div className="pt-2">
            <p className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground">N° {v.numeral}</p>
            <p className="font-display text-sm sm:text-base italic leading-tight truncate">{v.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
