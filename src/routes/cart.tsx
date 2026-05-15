import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { useCart, cart, totals } from "@/lib/cart-store";
import { formatPrice } from "@/lib/products";
import { FadeUp } from "@/lib/animation";

export const Route = createFileRoute("/cart")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Bag — KORE" },
      { name: "description", content: "Items waiting for you." },
    ],
  }),
});

function Page() {
  const lines = useCart();
  const { enriched, subtotal, currency } = totals(lines);

  return (
    <SiteShell>
      <section className="pt-28 px-6 lg:px-10 max-w-[1200px] mx-auto pb-32 min-h-screen">
        <div className="border-b border-border/40 pb-8 mb-12 flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-accent mb-2">Your Bag</p>
            <h1 className="font-display text-5xl font-light">
              {enriched.length === 0 ? <em>Empty</em> : <>{enriched.length} <em>piece{enriched.length > 1 ? "s" : ""}</em></>}
            </h1>
          </div>
          {enriched.length > 0 && (
            <button onClick={() => cart.clear()} className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              Clear bag
            </button>
          )}
        </div>

        {enriched.length === 0 ? (
          <motion.div
            className="py-24 text-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          >
            <p className="text-muted-foreground mb-6">Nothing held yet.</p>
            <Link to="/collection" className="inline-block px-8 py-4 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors">
              Browse collection →
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-16">
            <ul className="divide-y divide-border/40">
              <AnimatePresence>
                {enriched.map((l, i) => (
                  <motion.li
                    key={`${l.slug}-${l.size}-${l.color}`}
                    className="flex gap-6 py-8"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
                    transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link to="/product/$slug" params={{ slug: l.slug }} className="group block w-24 sm:w-32 shrink-0">
                      <div className="relative aspect-[3/4] bg-muted/30 overflow-hidden">
                        <img src={l.product.images[0]} alt={l.product.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                      </div>
                    </Link>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">N° {l.product.number}</p>
                          <Link to="/product/$slug" params={{ slug: l.slug }} className="font-display text-xl mt-1 block hover:underline">
                            {l.product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-2">{l.color} · Size {l.size}</p>
                        </div>
                        <p className="tabular-nums font-display">{formatPrice(l.subtotal, l.product.currency)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex items-center border border-border/40">
                          <button onClick={() => cart.setQty(i, l.qty - 1)} className="px-3 py-1 hover:bg-muted transition-colors">−</button>
                          <motion.span
                            key={l.qty}
                            className="px-4 text-sm tabular-nums"
                            initial={{ scale: 1.3 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {l.qty}
                          </motion.span>
                          <button onClick={() => cart.setQty(i, l.qty + 1)} className="px-3 py-1 hover:bg-muted transition-colors">+</button>
                        </div>
                        <button onClick={() => cart.remove(i)} className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-destructive transition-colors">
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <aside className="lg:sticky lg:top-28 self-start border border-border/40 p-8 space-y-6">
              <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatPrice(subtotal, currency)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{subtotal >= 50000 ? "Free" : "From free · select at checkout"}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>Included</span></div>
              </div>
              <div className="border-t border-border/40 pt-4 flex justify-between font-display text-xl">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(subtotal, currency)}</span>
              </div>
              <Link to="/checkout" className="block text-center w-full py-4 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors">
                Checkout →
              </Link>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground text-center">
                Free worldwide shipping over {formatPrice(50000, currency)}
              </p>
            </aside>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
