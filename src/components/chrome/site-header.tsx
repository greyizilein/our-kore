import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth/auth-context";
import { useCartCount } from "@/lib/cart-store";
import { supabase } from "@/integrations/kore-supabase/client";
import { piecesForVariant } from "@/lib/collections";
import { ThemeSwitch } from "./theme-switch";
import { usePageText } from "@/lib/cms/page-content";

const NAV = [
  { to: "/collection", label: "Collection" },
  { to: "/inventory", label: "Inventory" },
  { to: "/system", label: "System" },
  { to: "/manifesto", label: "Manifesto" },
  { to: "/journal", label: "Journal" },
  { to: "/atelier", label: "Atelier" },
  { to: "/membership", label: "Membership" },
] as const;

const FALLBACK_FORME_COUNT = piecesForVariant("forme", "forme-i").length;

function toRoman(num: number): string {
  if (num <= 0) return "—";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

function useInventoryCount() {
  const [count, setCount] = useState<number>(FALLBACK_FORME_COUNT);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = async () => {
    const { data, error } = await supabase.from("inventory").select("total_units,sold_units,booked_units");
    if (error) return;
    if (!data) return;
    if (data.length === 0) { setCount(FALLBACK_FORME_COUNT); return; }
    const total = data.reduce(
      (s: number, r: any) =>
        s + Math.max(0, (r.total_units ?? 0) - (r.sold_units ?? 0) - (r.booked_units ?? 0)),
      0,
    );
    setCount(total);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel("inventory-header")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, fetch)
      .subscribe();
    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, []);

  return count;
}

export function SiteHeader() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";
  const cartCount = useCartCount();
  const inventoryCount = useInventoryCount();
  const romanCount = toRoman(inventoryCount);
  const statusLeft = usePageText("header", "status.left", "SS / 26 — FORME");
  const statusCenter = usePageText("header", "status.center", "LAGOS · LONDON · TOKYO");
  const statusRight = usePageText("header", "status.right", "SHIPPING WORLDWIDE");

  return (
    <header className="fixed inset-x-0 top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/40">
      <div className="mx-auto max-w-[1600px] px-3 sm:px-6 lg:px-10 h-14 flex items-center justify-between gap-2 sm:gap-6 min-w-0">
        <Link to="/" className="font-display text-base sm:text-xl tracking-[0.18em] sm:tracking-[0.3em] uppercase shrink-0">
          KORE
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="relative text-foreground/70 hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          {/* Live inventory chip — desktop only. On mobile this lives inside the menu drawer. */}
          <Link
            to="/inventory"
            aria-label={`${inventoryCount} pieces remaining in Forme`}
            className="hidden md:inline-flex shrink-0 items-center gap-1 px-2 py-1 border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors leading-none"
          >
            <span className="text-[8px] tracking-[0.16em] uppercase text-muted-foreground">Forme</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-accent whitespace-nowrap">N° I · {romanCount}</span>
          </Link>
          <div className="hidden sm:block"><ThemeSwitch /></div>
          <Link
            to={user ? "/dashboard" : "/login"}
            className="inline text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.18em] text-foreground/70 hover:text-foreground whitespace-nowrap"
          >
            {user ? "Space" : "Enter"}
          </Link>
          <Link
            to="/cart"
            className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground tabular-nums"
          >
            Bag{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>
          <button
            className="md:hidden text-xs uppercase tracking-[0.18em]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="md:hidden border-t border-border/40 bg-background overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV.map((n, i) => (
                <motion.div
                  key={n.to}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 + 0.08, duration: 0.3 }}
                >
                  <Link
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="text-lg font-display"
                  >
                    {n.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: NAV.length * 0.04 + 0.08, duration: 0.3 }}
              >
                <Link
                  to="/subscription"
                  onClick={() => setOpen(false)}
                  className="text-lg font-display text-muted-foreground"
                >
                  Subscribe
                </Link>
              </motion.div>

              {/* Live inventory line — opposite My Space, mobile only */}
              <motion.div
                className="flex items-center justify-between pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <Link
                  to={user ? "/dashboard" : "/login"}
                  onClick={() => setOpen(false)}
                  className="text-lg font-display text-accent"
                >
                  {user ? "My Space →" : "Enter →"}
                </Link>
                <Link
                  to="/inventory"
                  onClick={() => setOpen(false)}
                  aria-label={`${inventoryCount} pieces remaining in Forme`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-accent/30 bg-accent/5 leading-none"
                >
                  <span className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground">Forme</span>
                  <span className="font-mono text-[11px] tracking-[0.1em] text-accent whitespace-nowrap">N° I · {romanCount}</span>
                </Link>
              </motion.div>

              <motion.div
                className="pt-6 mt-2 border-t border-border/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Theme</p>
                <ThemeSwitch />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle status line — ode to terminal aesthetic */}
      {isHome && (
        <div className="hidden lg:block border-t border-border/30">
          <div className="mx-auto max-w-[1600px] px-10 py-1 flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <span>{statusLeft}</span>
            <span>{statusCenter}</span>
            <span>{statusRight}</span>
          </div>
        </div>
      )}
    </header>
  );
}
