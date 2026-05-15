import { useEffect, useRef, useState } from "react";

type Props = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Re-evaluate when content changes (e.g. messages array length). */
  watch?: unknown;
};

/**
 * Floating arrow that flips direction:
 *  - near top → points down (jump to bottom)
 *  - near bottom → points up (jump to top)
 *  - hidden when content fits without scrolling
 */
export function ScrollJump({ containerRef, watch }: Props) {
  const [direction, setDirection] = useState<"down" | "up" | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const evaluate = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - clientHeight < 24) {
        setDirection(null);
        return;
      }
      const distFromBottom = scrollHeight - clientHeight - scrollTop;
      if (distFromBottom > 80) setDirection("down");
      else setDirection("up");
    };

    const onScroll = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(evaluate);
    };

    evaluate();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(evaluate);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [containerRef, watch]);

  if (!direction) return null;

  const jump = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: direction === "down" ? el.scrollHeight : 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={jump}
      aria-label={direction === "down" ? "Scroll to latest" : "Scroll to top"}
      className="absolute right-4 bottom-24 lg:bottom-28 z-20 h-10 w-10 rounded-full border border-border bg-background/80 backdrop-blur grid place-items-center shadow-md hover:border-foreground transition-colors"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        {direction === "down" ? (
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
