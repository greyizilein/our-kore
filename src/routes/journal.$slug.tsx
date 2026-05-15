import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { marked } from "marked";
import { SiteShell } from "@/components/chrome/site-shell";
import { getJournalPost } from "@/lib/journal.functions";

export const Route = createFileRoute("/journal/$slug")({
  loader: async ({ params }) => {
    const { post } = await getJournalPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  component: Page,
  notFoundComponent: () => (
    <SiteShell>
      <section className="min-h-[60vh] grid place-items-center text-center px-6">
        <div>
          <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">404</p>
          <h1 className="font-display text-3xl font-light mb-4">No such note.</h1>
          <Link to="/journal" className="text-sm text-accent border-b border-accent/30">← Back to the Journal</Link>
        </div>
      </section>
    </SiteShell>
  ),
  errorComponent: ({ error }) => (
    <SiteShell>
      <section className="min-h-[60vh] grid place-items-center text-center px-6">
        <div>
          <p className="text-sm text-destructive mb-2">{error.message}</p>
          <Link to="/journal" className="text-sm text-accent border-b border-accent/30">← Back to the Journal</Link>
        </div>
      </section>
    </SiteShell>
  ),
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Journal — KORE" }] };
    return {
      meta: [
        { title: `${p.title} — KORE Journal` },
        { name: "description", content: p.excerpt || p.title },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt || p.title },
        ...(p.cover_url ? [{ property: "og:image", content: p.cover_url }, { name: "twitter:image", content: p.cover_url }] : []),
      ],
    };
  },
});

function Page() {
  const { post } = Route.useLoaderData();
  const html = marked.parse(post.body_md || "", { gfm: true, breaks: true }) as string;
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

  return (
    <SiteShell>
      <div className="pt-20 md:pt-28 pb-20 md:pb-32 px-5 sm:px-8 lg:px-10">
        <article className="max-w-2xl mx-auto">
          {/* Back + meta */}
          <Link
            to="/journal"
            className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-accent transition-colors"
          >
            ← Journal
          </Link>
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent mt-6 mb-2">
            {[post.category, date].filter(Boolean).join(" · ")}
          </p>

          {/* Title */}
          <h1 className="font-display text-[2rem] sm:text-5xl md:text-6xl font-light leading-[1.05] tracking-[-0.02em] mb-5 mt-1">
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 border-l-2 border-accent/40 pl-4">
              {post.excerpt}
            </p>
          )}

          {/* Cover image */}
          {post.cover_url && (
            <div className="relative aspect-[16/9] overflow-hidden bg-muted/30 mb-10 -mx-5 sm:mx-0">
              <img
                src={post.cover_url}
                alt={post.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          )}

          {/* Body */}
          <div className="kore-prose" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </SiteShell>
  );
}
