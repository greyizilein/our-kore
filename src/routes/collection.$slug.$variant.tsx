import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/chrome/site-shell";
import {
  DEFAULT_COLLECTIONS, mergeCollections, findCollection, findVariant, piecesForVariant,
  type CollectionSet,
} from "@/lib/collections";
import { formatPrice, type Product } from "@/lib/products";
import { getPublicCatalogueProducts } from "@/lib/catalog.functions";
import { getSiteContent } from "@/lib/cms.functions";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";

export const Route = createFileRoute("/collection/$slug/$variant")({
  component: VariantPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="min-h-[60vh] grid place-items-center px-6 text-center">
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">Not found</p>
          <h1 className="font-display text-3xl font-light mb-4">No such variant.</h1>
          <Link to="/collection" className="text-accent border-b border-accent/30 hover:border-accent text-sm">
            ← Back to gallery
          </Link>
        </div>
      </div>
    </SiteShell>
  ),
  errorComponent: ({ error }) => (
    <SiteShell>
      <div className="min-h-[60vh] grid place-items-center px-6 text-center">
        <p className="text-sm text-destructive">{error?.message ?? "Something went wrong."}</p>
      </div>
    </SiteShell>
  ),
  beforeLoad: ({ params }) => {
    if (!findVariant(params.slug, params.variant)) throw notFound();
  },
  head: ({ params }) => {
    const v = findVariant(params.slug, params.variant);
    return {
      meta: [
        { title: `${v?.name ?? "Variant"} — KORE` },
        { name: "description", content: v?.story?.slice(0, 160) ?? "A KORE collection variant." },
        { property: "og:title", content: `${v?.name ?? "Variant"} — KORE` },
        { property: "og:description", content: v?.story?.slice(0, 160) ?? "" },
        ...(v?.cover ? [{ property: "og:image", content: v.cover }] : []),
      ],
    };
  },
});

function VariantPage() {
  const { slug, variant } = Route.useParams();
  const fetchContent = useServerFn(getSiteContent);
  const fetchProducts = useServerFn(getPublicCatalogueProducts);
  const [collections, setCollections] = useState<CollectionSet[]>(DEFAULT_COLLECTIONS);
  const [catalogue, setCatalogue] = useState<Product[] | null>(null);

  useEffect(() => {
    fetchContent({ data: { keys: ["collections.list"] } })
      .then((r) => {
        const list = (r.content as any)?.["collections.list"];
        if (Array.isArray(list)) setCollections(mergeCollections(list));
      })
      .catch(() => {});
  }, [fetchContent]);

  useEffect(() => {
    fetchProducts({ data: { collection: slug, variant } })
      .then((result) => setCatalogue(result.products))
      .catch(() => setCatalogue([]));
  }, [fetchProducts, slug, variant]);

  const c = findCollection(slug, collections) ?? findCollection(slug)!;
  const v = findVariant(slug, variant, collections) ?? findVariant(slug, variant)!;
  const savedPieces = piecesForVariant(slug, variant, collections);
  const pieces = catalogue && catalogue.length > 0 ? catalogue : savedPieces;

  return (
    <SiteShell>
      {/* Breadcrumb / variant switcher */}
      <div className="pt-20 px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto">
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground flex items-center gap-2 flex-wrap">
          <Link to="/collection" className="hover:text-foreground">Collections</Link>
          <span>/</span>
          <Link to="/collection/$slug" params={{ slug }} className="hover:text-foreground">{c.name}</Link>
          <span>/</span>
          <span className="text-foreground">{v.name}</span>
        </div>
        {c.variants.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-2 mt-4 -mx-3 sm:-mx-6 lg:-mx-10 px-3 sm:px-6 lg:px-10 scrollbar-none">
            {c.variants.map((other) => (
              <Link
                key={other.slug}
                to="/collection/$slug/$variant"
                params={{ slug, variant: other.slug }}
                className={`px-3 sm:px-4 py-2 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap border transition-colors ${
                  other.slug === variant
                    ? "border-foreground text-foreground bg-muted/30"
                    : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {other.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <FadeUp>
      <section className="pt-6 pb-10 px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto">
        <div className="border-b border-border/40 pb-10">
          <p className="text-xs tracking-[0.25em] uppercase text-accent mb-3">{c.name} · N° {v.numeral}</p>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[0.9]">
            <em className="italic">{v.name}</em>
          </h1>
          <p className="mt-3 text-[11px] tracking-[0.25em] uppercase text-muted-foreground">{v.dates}</p>
          {v.story && (
            <p className="mt-6 max-w-2xl text-base sm:text-lg font-light italic leading-relaxed text-foreground/90">
              {v.story}
            </p>
          )}
        </div>
      </section>
      </FadeUp>

      {/* Pieces gallery */}
      <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-20">
        {pieces.length === 0 ? (
          <FadeUp>
            <div className="border border-border/40 p-10 sm:p-16 text-center">
              <p className="font-display text-2xl sm:text-3xl font-light mb-3 italic">In the atelier.</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {v.name} is being constructed. Pattern, fabric, and fit are still being resolved.
              </p>
            </div>
          </FadeUp>
        ) : (
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 sm:gap-x-6 gap-y-12 sm:gap-y-16">
            {pieces.map((p, index) => (
              <StaggerChild key={p.slug}>
                <motion.article
                  initial={{ opacity: 0, y: 36, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  whileHover={{ y: -5 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="group block">
                    <div className="relative aspect-[9/16] sm:aspect-[3/4] overflow-hidden bg-[#f6f3f0]">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-contain object-top transition-opacity duration-700"
                      />
                      {p.images[1] && (
                        <img
                          src={p.images[1]}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-contain object-top opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                        />
                      )}
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(255,255,255,0.16)_50%,transparent_62%)]"
                        initial={{ x: "-120%" }}
                        whileInView={{ x: "120%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.4, delay: 0.35 + index * 0.12, ease: "easeInOut" }}
                      />
                      <span className="absolute top-4 left-4 font-display text-xs text-background/80 mix-blend-difference">
                        N° {p.number}
                      </span>
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500" />
                    </div>
                    <div className="pt-4 sm:pt-5 flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-display text-base sm:text-lg leading-tight truncate">{p.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.fabric.split(",")[0]}</p>
                      </div>
                      <p className="text-sm tabular-nums whitespace-nowrap">{formatPrice(p.price, p.currency)}</p>
                    </div>
                  </Link>
                </motion.article>
              </StaggerChild>
            ))}
          </Stagger>
        )}
      </section>

      {/* Materials */}
      {v.materials && (
        <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-20">
          <div className="border-t border-border/40 pt-10">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Materials</p>
            <p className="text-sm leading-relaxed max-w-2xl">{v.materials}</p>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
