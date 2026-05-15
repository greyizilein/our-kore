import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { PageHero } from "@/components/chrome/page-hero";
import { listJournalPosts, type JournalPost } from "@/lib/journal.functions";

export const Route = createFileRoute("/journal/")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Journal — KORE" },
      { name: "description", content: "Notes from the atelier, the road, and the cutting room floor." },
    ],
  }),
});

function fmtDate(s: string | null) {
  if (!s) return "";
  return new Date(s).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function Page() {
  const [posts, setPosts] = useState<JournalPost[] | null>(null);
  useEffect(() => { listJournalPosts({ data: {} as any }).then((r) => setPosts(r.posts)).catch(() => setPosts([])); }, []);

  const feature = posts?.[0];
  const rest = posts?.slice(1) ?? [];

  return (
    <SiteShell padTop={false}>
      <PageHero
        eyebrow="The Journal"
        title={<>Notes from <em className="italic">the atelier</em>.</>}
        media="/media/walk.mp4"
        align="left"
      />
      <section className="px-6 lg:px-10 max-w-[1500px] mx-auto pb-32 pt-12">
        <div className="border-b border-border/40 pb-2 mb-16" />

        {posts === null && <p className="text-sm text-muted-foreground">Loading…</p>}

        {posts !== null && posts.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-display text-2xl mb-3">The Journal is being written.</p>
            <p className="text-sm text-muted-foreground">First notes publish soon.</p>
          </div>
        )}

        {feature && (
          <Link to="/journal/$slug" params={{ slug: feature.slug }} className="group grid lg:grid-cols-2 gap-10 lg:gap-16 mb-24">
            <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
              {feature.cover_url && <img src={feature.cover_url} alt={feature.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-4">{feature.category} · {fmtDate(feature.published_at)}</p>
              <h2 className="font-display text-3xl md:text-5xl font-light leading-tight mb-6 group-hover:text-accent transition-colors">{feature.title}</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">{feature.excerpt}</p>
              <span className="mt-8 text-xs uppercase tracking-[0.2em] text-accent">Read essay →</span>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {rest.map((p) => (
              <Link key={p.slug} to="/journal/$slug" params={{ slug: p.slug }} className="block group">
                <div className="relative aspect-[4/5] overflow-hidden bg-muted/30 mb-5">
                  {p.cover_url && <img src={p.cover_url} alt={p.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                </div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">{p.category} · {fmtDate(p.published_at)}</p>
                <h3 className="font-display text-xl leading-tight mb-2 group-hover:text-accent transition-colors">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}
