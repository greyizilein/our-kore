import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/chrome/site-shell";
import { VariantStrip } from "@/components/chrome/variant-strip";
import {
  DEFAULT_COLLECTIONS, mergeCollections, findCollection, nextCollection,
  type CollectionSet, type CollectionVariant,
} from "@/lib/collections";
import { getSiteContent } from "@/lib/cms.functions";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";

export const Route = createFileRoute("/collection/$slug/")({
  component: CollectionPage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="min-h-[60vh] grid place-items-center px-6 text-center">
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">Not found</p>
          <h1 className="font-display text-3xl font-light mb-4">No such collection.</h1>
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
        <div>
          <p className="text-sm text-destructive mb-3">{error?.message ?? "Something went wrong."}</p>
          <Link to="/collection" className="text-accent text-sm">← Back to gallery</Link>
        </div>
      </div>
    </SiteShell>
  ),
  beforeLoad: ({ params }) => {
    if (!findCollection(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const c = findCollection(params.slug);
    return {
      meta: [
        { title: `${c?.name ?? "Collection"} — KORE` },
        { name: "description", content: c?.defaultEditorial.intro?.slice(0, 160) ?? "A KORE collection." },
        { property: "og:title", content: `${c?.name ?? "Collection"} — KORE` },
        { property: "og:description", content: c?.defaultEditorial.intro?.slice(0, 160) ?? "" },
        ...(c?.cover ? [{ property: "og:image", content: c.cover }] : []),
      ],
    };
  },
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const fetchContent = useServerFn(getSiteContent);
  const [collections, setCollections] = useState<CollectionSet[]>(DEFAULT_COLLECTIONS);
  const c = findCollection(slug, collections) ?? findCollection(slug)!;
  const next = nextCollection(slug, collections);

  useEffect(() => {
    fetchContent({ data: { keys: ["collections.list"] } })
      .then((r) => {
        const list = (r.content as any)?.["collections.list"];
        if (Array.isArray(list)) setCollections(mergeCollections(list));
      })
      .catch(() => { /* fall back */ });
  }, [fetchContent]);

  const editorial = c.defaultEditorial;

  return (
    <SiteShell>
      {/* Collection switcher */}
      <div className="pt-20 px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto">
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-3 sm:-mx-6 lg:-mx-10 px-3 sm:px-6 lg:px-10 scrollbar-none">
          {collections.map((other) => {
            const active = other.slug === slug;
            return (
              <button
                key={other.slug}
                onClick={() => navigate({ to: "/collection/$slug", params: { slug: other.slug } })}
                className={`px-3 sm:px-4 py-2 text-[10px] tracking-[0.2em] sm:tracking-[0.25em] uppercase whitespace-nowrap border transition-colors ${
                  active
                    ? "border-foreground text-foreground bg-muted/30"
                    : "border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                N° {other.numeral} · {other.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Header — collection story */}
      <FadeUp>
      <section className="pt-8 pb-10 px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto">
        <div className="border-b border-border/40 pb-10">
          <p className="text-xs tracking-[0.25em] uppercase text-accent mb-3">{c.tagline}</p>
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-light leading-[0.9]">
            <em className="italic">{c.name}</em>
          </h1>
          <p className="mt-3 text-[11px] tracking-[0.25em] uppercase text-muted-foreground">{editorial.dates}</p>
          <p className="mt-6 max-w-2xl text-base sm:text-lg font-light italic leading-relaxed text-foreground/90">
            {editorial.intro}
          </p>
          <Link to="/collection" className="inline-block mt-6 text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            ← All collections
          </Link>
          {c.variants.length > 0 && (
            <div className="mt-8">
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-3">Variants</p>
              <VariantStrip collectionSlug={slug} variants={c.variants} palette={c.paletteHex} />
            </div>
          )}
        </div>
      </section>
      </FadeUp>

      {/* Variants gallery — rooms inside the collection */}
      <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-20">
        <p className="text-[11px] tracking-[0.3em] uppercase text-accent mb-6">Inside {c.name}</p>
        {c.variants.length === 0 ? (
          <FadeUp>
            <div className="border border-border/40 p-10 sm:p-16 text-center">
              <p className="font-display text-2xl sm:text-3xl font-light mb-3 italic">In the atelier.</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {c.name} is being constructed. Pattern, fabric, and fit are still being resolved.
              </p>
            </div>
          </FadeUp>
        ) : (
          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
            {c.variants.map((v, i) => (
              <StaggerChild key={v.slug}>
                <VariantTile collectionSlug={slug} variant={v} palette={c.paletteHex} stagger={i % 2 === 1} />
              </StaggerChild>
            ))}
          </Stagger>
        )}
      </section>

      {/* Editorial detail */}
      <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-20">
        <div className="border-t border-border/40 pt-12">
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <p className="text-[11px] tracking-[0.3em] uppercase text-accent mb-4">On this chapter</p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-light leading-tight">
                Why <em className="italic">{c.name}</em>.
              </h2>
            </div>
            <div className="lg:col-span-7 space-y-6 text-sm leading-relaxed text-foreground/90">
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Materials</p>
                <p>{editorial.materials}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Construction</p>
                <p>{editorial.construction}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next collection teaser */}
      {next && (
        <section className="px-3 sm:px-6 lg:px-10 max-w-[1600px] mx-auto pb-24">
          <Link
            to="/collection/$slug"
            params={{ slug: next.slug }}
            className="group block border-t border-border/40 pt-10"
          >
            <p className="text-[11px] tracking-[0.3em] uppercase text-accent mb-3">Next chapter</p>
            <h3 className="font-display text-3xl sm:text-5xl md:text-6xl font-light leading-[0.95]">
              <em className="italic">{next.name}</em>
            </h3>
            <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-foreground/80 group-hover:text-accent transition-colors">
              N° {next.numeral} — Enter the room →
            </p>
          </Link>
        </section>
      )}
    </SiteShell>
  );
}

function VariantTile({
  collectionSlug, variant: v, palette, stagger,
}: { collectionSlug: string; variant: CollectionVariant; palette: string[]; stagger: boolean }) {
  return (
    <Link
      to="/collection/$slug/$variant"
      params={{ slug: collectionSlug, variant: v.slug }}
      className={`group block ${stagger ? "md:mt-12" : ""}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/20 border border-border/30">
        {v.cover ? (
          <img
            src={v.cover}
            alt={v.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center"
            style={{ background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 60%, ${palette[2] ?? palette[1]} 100%)` }}>
            <div className="text-center px-6">
              <div className="font-display text-[18vw] md:text-[8vw] leading-none italic font-light"
                style={{ color: palette[3] ?? "#fff", mixBlendMode: "difference" }}>
                {v.numeral}
              </div>
              <p className="text-[10px] tracking-[0.4em] uppercase mt-2"
                style={{ color: palette[3] ?? "#fff", mixBlendMode: "difference" }}>{v.name}</p>
            </div>
          </div>
        )}
        <span className="absolute top-4 left-4 font-display text-xs text-background mix-blend-difference tracking-[0.2em]">
          N° {v.numeral}
        </span>
        <span className="absolute top-4 right-4 px-2 py-1 text-[9px] tracking-[0.25em] uppercase border border-border/40 bg-background/60 backdrop-blur-sm text-foreground/80">
          {v.status === "showing" && "Now showing"}
          {v.status === "next" && "Next"}
          {v.status === "atelier" && "In the atelier"}
          {v.status === "archived" && "Archive"}
        </span>
      </div>
      <div className="pt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">{v.dates}</p>
          <h3 className="font-display text-2xl sm:text-3xl font-light leading-none">
            <em className="italic">{v.name}</em>
          </h3>
          {v.story && <p className="mt-2 text-xs text-muted-foreground max-w-md line-clamp-2">{v.story}</p>}
        </div>
        <span className="text-[10px] tracking-[0.25em] uppercase text-accent opacity-0 group-hover:opacity-100 transition-opacity pb-1">
          Enter →
        </span>
      </div>
    </Link>
  );
}
