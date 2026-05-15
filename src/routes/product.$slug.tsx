import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { findProduct, formatPrice } from "@/lib/products";
import { findCollection } from "@/lib/collections";
import { useCart, cart } from "@/lib/cart-store";
import { useSaved, saved } from "@/lib/saved-store";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = findProduct(params.slug);
    if (!product) throw notFound();
    const col = findCollection(product.collection);
    const variant = col?.variants.find((v) => v.pieceSlugs.includes(params.slug)) ?? null;
    return { product, col, variant };
  },
  component: Page,
  notFoundComponent: () => (
    <SiteShell>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">404</p>
        <h1 className="font-display text-4xl">Garment not found</h1>
        <Link to="/collection" className="text-sm underline">Back to collection</Link>
      </div>
    </SiteShell>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.name} — KORE` },
          { name: "description", content: loaderData.product.story },
          { property: "og:image", content: loaderData.product.images[0] },
        ]
      : [],
  }),
});

function Page() {
  const { product, col, variant } = Route.useLoaderData();
  const lines = useCart();
  const savedItems = useSaved();
  const [size, setSize] = useState(product.sizes[Math.floor(product.sizes.length / 2)]);
  const [color, setColor] = useState(product.colorways[0].name);
  const [activeImg, setActiveImg] = useState(0);

  const lineIndex = lines.findIndex(
    (l) => l.slug === product.slug && l.size === size && l.color === color,
  );
  const qty = lineIndex >= 0 ? lines[lineIndex].qty : 0;

  const increment = () => {
    if (lineIndex >= 0) {
      cart.setQty(lineIndex, qty + 1);
    } else {
      cart.add({ slug: product.slug, size, color, qty: 1 });
    }
  };

  const decrement = () => {
    if (lineIndex >= 0) cart.setQty(lineIndex, qty - 1);
  };

  const isBookmarked = saved.isSaved(product.slug, size, color);
  const book = () => {
    saved.toggle({ slug: product.slug, size, color });
  };

  return (
    <SiteShell>
      <section className="pt-24 grid lg:grid-cols-[1.4fr_1fr] gap-0 min-h-screen">
        {/* Gallery */}
        <div className="bg-muted/20 px-4 lg:px-12 py-12 flex flex-col gap-4">
          <div className="relative aspect-[4/5] overflow-hidden group">
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImg}
                src={product.images[activeImg]}
                alt={product.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            </AnimatePresence>
            <span className="absolute top-6 left-6 font-display text-7xl text-background/15 mix-blend-difference leading-none pointer-events-none">
              {product.number}
            </span>
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((src: string, i: number) => (
                <button
                  key={src}
                  onClick={() => setActiveImg(i)}
                  className={`relative aspect-square w-20 overflow-hidden border transition-all duration-300 ${
                    i === activeImg ? "border-foreground scale-[1.04]" : "border-border/40 hover:border-foreground/50"
                  }`}
                >
                  <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <Stagger className="px-6 lg:px-12 py-12 lg:py-20 flex flex-col">
          {/* Breadcrumb */}
          <StaggerChild>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8 flex-wrap">
              <Link to="/collection" className="hover:text-foreground transition-colors">Collection</Link>
              {col && (
                <>
                  <span>/</span>
                  <Link to="/collection/$slug" params={{ slug: col.slug }} className="hover:text-foreground transition-colors">
                    {col.name}
                  </Link>
                </>
              )}
              {col && variant && (
                <>
                  <span>/</span>
                  <Link to="/collection/$slug/$variant" params={{ slug: col.slug, variant: variant.slug }} className="hover:text-foreground transition-colors">
                    {variant.name}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-foreground truncate max-w-[120px]">{product.name}</span>
            </div>
          </StaggerChild>

          <StaggerChild>
            <p className="text-xs tracking-[0.25em] uppercase text-accent mb-3">N° {product.number} · {product.category}</p>
            <h1 className="font-display text-4xl md:text-5xl font-light leading-tight">{product.name}</h1>
            <p className="mt-4 text-2xl tabular-nums font-display">{formatPrice(product.price, product.currency)}</p>
          </StaggerChild>

          <StaggerChild>
            <p className="mt-8 text-sm leading-relaxed text-foreground/80 max-w-md">{product.story}</p>
          </StaggerChild>

          <StaggerChild>
            <dl className="mt-8 grid grid-cols-2 gap-y-4 text-xs max-w-md border-t border-border/40 pt-6">
              <dt className="uppercase tracking-[0.2em] text-muted-foreground">Fabric</dt>
              <dd>{product.fabric}</dd>
              <dt className="uppercase tracking-[0.2em] text-muted-foreground">Origin</dt>
              <dd>{product.origin}</dd>
            </dl>
          </StaggerChild>

          <div className="mt-10 space-y-6 max-w-md">
            {/* Colour */}
            <StaggerChild>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Colour — {color}</p>
                <div className="flex gap-2">
                  {product.colorways.map((c: { name: string; hex: string }) => (
                    <button
                      key={c.name}
                      onClick={() => setColor(c.name)}
                      aria-label={c.name}
                      className={`w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                        color === c.name ? "border-foreground scale-[1.18] shadow-[0_0_0_2px_var(--background)]" : "border-border/40 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            </StaggerChild>

            {/* Size */}
            <StaggerChild>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Size</p>
                  <Link to="/dashboard" search={{ panel: "fit" }} className="text-[10px] uppercase tracking-[0.2em] text-accent">Fit guide</Link>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {product.sizes.map((s: string) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`py-3 text-xs border transition-all duration-200 ${
                        size === s
                          ? "border-foreground text-foreground"
                          : "border-border/40 text-muted-foreground hover:text-foreground hover:border-foreground/40"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </StaggerChild>

            {/* Add / qty control */}
            <StaggerChild>
              <AnimatePresence mode="wait">
                {qty === 0 ? (
                  <motion.button
                    key="add"
                    onClick={increment}
                    className="w-full py-4 bg-accent text-accent-foreground text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors active:scale-[0.98]"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Add to bag
                  </motion.button>
                ) : (
                  <motion.div
                    key="qty"
                    className="flex items-center gap-0 border border-foreground"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={decrement}
                      className="px-5 py-4 text-lg hover:bg-muted/40 transition-colors"
                      aria-label="Remove one"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center text-sm tabular-nums">{qty} in bag</span>
                    <button
                      onClick={increment}
                      className="px-5 py-4 text-lg hover:bg-muted/40 transition-colors"
                      aria-label="Add one"
                    >
                      +
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </StaggerChild>

            {/* Book / save */}
            <StaggerChild>
              <motion.button
                onClick={book}
                className={`w-full py-3 border text-xs tracking-[0.2em] uppercase transition-colors ${
                  isBookmarked
                    ? "border-accent text-accent"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <AnimatePresence mode="wait">
                  {isBookmarked ? (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="block"
                    >
                      Saved to My Space ✓
                    </motion.span>
                  ) : (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="block"
                    >
                      Save this piece →
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </StaggerChild>
          </div>
        </Stagger>
      </section>
    </SiteShell>
  );
}
