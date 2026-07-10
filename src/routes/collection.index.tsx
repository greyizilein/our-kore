import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { VariantStrip } from "@/components/chrome/variant-strip";
import { DEFAULT_COLLECTIONS, mergeCollections, type CollectionSet } from "@/lib/collections";
import { getSiteContent } from "@/lib/cms.functions";
import { SubscriptionSection } from "@/components/marketing/subscription-section";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";
import { usePageText } from "@/lib/cms/page-content";

export const Route = createFileRoute("/collection/")({
  component: GalleryPage,
  head: () => ({
    meta: [
      { title: "Collections — KORE" },
      { name: "description", content: "The KORE collections — small sets, considered cuts, released only when fully resolved." },
      { property: "og:title", content: "Collections — KORE" },
      { property: "og:description", content: "Walk the gallery. Each collection is a chapter, not a season." },
    ],
  }),
});

function GalleryPage() {
  const cEyebrow  = usePageText("collection", "hero.eyebrow",  "The House — Collections");
  const cTitle    = usePageText("collection", "hero.title",    "A gallery of art, worn daily.");
  const cSubtitle = usePageText("collection", "hero.subtitle", "KORE offers four major collections with limited variants under each collection. Each variant is released to complement the other.");
  const fetchContent = useServerFn(getSiteContent);
  const [collections, setCollections] = useState<CollectionSet[]>(DEFAULT_COLLECTIONS);

  useEffect(() => {
    fetchContent({ data: { keys: ["collections.list"] } })
      .then((r) => {
        const list = (r.content as any)?.["collections.list"];
        if (Array.isArray(list)) setCollections(mergeCollections(list));
      })
      .catch(() => {});
  }, [fetchContent]);

  return (
    <SiteShell>
      <section className="pt-24 sm:pt-28 pb-8 sm:pb-12 px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto">
        <FadeUp className="border-b border-border/40 pb-8 sm:pb-12">
          <p className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-accent mb-3 sm:mb-4">{cEyebrow}</p>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[0.9] max-w-3xl">
            <em className="italic">{cTitle}</em>
          </h1>
          <p className="mt-4 sm:mt-6 max-w-xl text-sm text-muted-foreground leading-relaxed">
            {cSubtitle}
          </p>
        </FadeUp>
      </section>

      <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-24">
        <div className="space-y-16 sm:space-y-24">
          {collections.map((c, i) => (
            <CollectionBlock key={c.slug} collection={c} eager={i === 0} />
          ))}
        </div>
      </section>
      {/* Desktop subscription section */}
      <section className="hidden md:block border-t border-border/40 max-w-[1600px] mx-auto px-6 lg:px-10">
        <SubscriptionSection />
      </section>
    </SiteShell>
  );
}

function CollectionBlock({ collection: c, eager }: { collection: CollectionSet; eager: boolean }) {
  return (
    <FadeUp>
      <article className="border-t border-border/30 pt-6 sm:pt-8 first:border-t-0 first:pt-0">
        {/* Cover */}
        <Link
          to="/collection/$slug"
          params={{ slug: c.slug }}
          className="group block relative aspect-[4/5] sm:aspect-[16/10] overflow-hidden bg-muted/20 border border-border/30"
        >
          {c.cover ? (
            <img
              src={c.cover}
              alt={`${c.name} collection cover`}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={eager ? "high" : "auto"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.04]"
            />
          ) : (
            <PlaceholderArt collection={c} />
          )}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-700" />
          <span className="absolute top-4 left-4 font-display text-xs text-background mix-blend-difference tracking-[0.2em]">
            N° {c.numeral}
          </span>
          <span className="absolute top-4 right-4 px-2 py-1 text-[9px] tracking-[0.25em] uppercase border border-border/40 bg-background/60 backdrop-blur-sm text-foreground/80">
            {c.status === "showing" && "Now showing"}
            {c.status === "next" && "Next"}
            {c.status === "atelier" && "In the atelier"}
            {c.status === "archived" && "Archive"}
          </span>
          <span className="absolute bottom-6 right-6 text-[10px] tracking-[0.25em] uppercase text-background/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            Enter the room →
          </span>
        </Link>

        {/* Story */}
        <div className="pt-5 sm:pt-6">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">{c.tagline}</p>
          <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-light leading-[0.95]">
            <em className="italic">{c.name}</em>
          </h2>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-foreground/85 leading-relaxed line-clamp-4 max-w-2xl">
            {c.defaultEditorial.intro}
          </p>
          <Link
            to="/collection/$slug"
            params={{ slug: c.slug }}
            className="inline-block mt-4 text-[11px] tracking-[0.25em] uppercase text-accent border-b border-accent/30 hover:border-accent pb-0.5 transition-colors duration-300"
          >
            Enter the room →
          </Link>
        </div>

        {/* Variants strip */}
        {c.variants.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">Inside {c.name}</p>
            <VariantStrip collectionSlug={c.slug} variants={c.variants} palette={c.paletteHex} />
          </div>
        )}
        {c.variants.length === 0 && c.status !== "showing" && (
          <p className="mt-6 text-[10px] tracking-[0.3em] uppercase text-muted-foreground italic">
            In the atelier — variants forthcoming.
          </p>
        )}
      </article>
    </FadeUp>
  );
}

function PlaceholderArt({ collection: c }: { collection: CollectionSet }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{ background: `linear-gradient(135deg, ${c.paletteHex[0]} 0%, ${c.paletteHex[1]} 60%, ${c.paletteHex[2] ?? c.paletteHex[1]} 100%)` }}
    >
      <div className="text-center px-8">
        <div
          className="font-display text-[18vw] sm:text-[10vw] leading-none font-light italic mb-3"
          style={{ color: c.paletteHex[3] ?? "#ffffff", mixBlendMode: "difference" }}
        >
          {c.numeral}
        </div>
        <p
          className="text-[10px] tracking-[0.4em] uppercase"
          style={{ color: c.paletteHex[3] ?? "#ffffff", mixBlendMode: "difference" }}
        >
          {c.name}
        </p>
      </div>
      <div className="absolute bottom-0 inset-x-0 flex h-1.5">
        {c.paletteHex.map((hex) => (
          <div key={hex} className="flex-1" style={{ background: hex }} />
        ))}
      </div>
    </div>
  );
}
