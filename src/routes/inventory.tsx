import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { supabase } from "@/integrations/kore-supabase/client";
import { cn } from "@/lib/utils";
import { FadeUp } from "@/lib/animation";

export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory — KORE" }] }),
});

interface InventoryItem {
  id: string;
  collection_slug: string;
  collection_name: string;
  piece_slug: string;
  piece_name: string;
  piece_number: string;
  total_units: number;
  sold_units: number;
  booked_units: number;
  available_units: number;
  status: string;
  sort_order: number;
  updated_at: string;
}

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

function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) {
      setItems(
        data.map((row: any) => ({
          ...row,
          available_units: Math.max(
            0,
            (row.total_units ?? 0) - (row.sold_units ?? 0) - (row.booked_units ?? 0),
          ),
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();

    const ch = supabase
      .channel("inventory-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        load();
      })
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, []);

  const activeCollection = items.length > 0 ? items[0].collection_name : null;
  const totalAvailable = items.reduce((s, it) => s + it.available_units, 0);
  const totalUnits = items.reduce((s, it) => s + it.total_units, 0);

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 pt-24 pb-24">
        {/* Header */}
        <div className="border-b border-border pb-8 mb-14">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">
                Live Inventory
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-light">
                {activeCollection ?? "Collection"}
              </h1>
              {!loading && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {toRoman(totalAvailable)} of {toRoman(totalUnits)} pieces remaining
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase mt-1">
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  live ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground",
                )}
              />
              <span className={live ? "text-emerald-400" : "text-muted-foreground"}>
                {live ? "Live" : "Connecting…"}
              </span>
            </div>
          </div>
        </div>

        {/* Inventory grid */}
        {loading ? (
          <div className="text-sm text-muted-foreground tracking-[0.15em] uppercase">
            Loading inventory…
          </div>
        ) : items.length === 0 ? (
          <div className="border border-border p-16 text-center">
            <p className="font-display text-3xl font-light mb-3">No active collection</p>
            <p className="text-sm text-muted-foreground">
              Inventory will appear here when a collection is live.
            </p>
          </div>
        ) : (
          <div className="space-y-px bg-border">
            {items.map((item, idx) => {
              const pct =
                item.total_units > 0
                  ? Math.round((item.available_units / item.total_units) * 100)
                  : 0;
              const isSoldOut = item.available_units === 0 || item.status === "sold_out";

              return (
                <motion.div
                  key={item.id}
                  className={cn(
                    "bg-background grid grid-cols-[1fr_auto] gap-6 items-center px-7 py-7 md:py-8",
                    isSoldOut && "opacity-60",
                  )}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: isSoldOut ? 0.6 : 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
                        N° {item.piece_number}
                      </span>
                      {isSoldOut && (
                        <span className="text-[9px] tracking-[0.2em] uppercase border border-muted-foreground/40 px-1.5 py-0.5 text-muted-foreground">
                          Sold out
                        </span>
                      )}
                      {item.status === "coming_soon" && (
                        <span className="text-[9px] tracking-[0.2em] uppercase border border-accent/40 px-1.5 py-0.5 text-accent">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="font-display text-xl md:text-2xl font-light">{item.piece_name}</p>

                    {/* Availability bar — animates width from 0 on mount */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 max-w-[200px] h-0.5 bg-border overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full",
                            pct > 50 ? "bg-accent" : pct > 20 ? "bg-amber-500" : "bg-destructive",
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: idx * 0.06 + 0.3, duration: 0.9, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                        {item.sold_units + item.booked_units} claimed
                      </span>
                    </div>
                  </div>

                  {/* Roman numeral count */}
                  <motion.div
                    className="text-right flex-shrink-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.06 + 0.2, duration: 0.4 }}
                  >
                    <div
                      className={cn(
                        "font-display font-light leading-none tracking-[0.05em]",
                        item.available_units > 9
                          ? "text-3xl md:text-4xl"
                          : "text-4xl md:text-5xl",
                        isSoldOut
                          ? "text-muted-foreground/40"
                          : item.available_units <= 3
                            ? "text-destructive"
                            : "text-accent",
                      )}
                    >
                      {isSoldOut ? "—" : toRoman(item.available_units)}
                    </div>
                    <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mt-1.5">
                      {isSoldOut ? "None left" : "Available"}
                    </p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {items.length > 0 && (
          <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row justify-between gap-4 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            <span>Counts update in real time · booked + sold considered unavailable</span>
            <span>
              Last updated:{" "}
              {items[0]?.updated_at
                ? new Date(items[0].updated_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
