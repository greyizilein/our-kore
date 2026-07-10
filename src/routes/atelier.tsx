import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/chrome/site-shell";
import { PageHero } from "@/components/chrome/page-hero";
import { usePageText } from "@/lib/cms/page-content";

export const Route = createFileRoute("/atelier")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Atelier — KORE" },
      { name: "description", content: "Where KORE is made. Named workshops, named hands." },
    ],
  }),
});

const HOUSES = [
  { city: "Porto", craft: "Shirting", years: "Est. 1962", img: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1400&q=80" },
  { city: "Biella", craft: "Tailoring", years: "Est. 1947", img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=1400&q=80" },
  { city: "Kyoto", craft: "Outerwear", years: "Est. 1981", img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1400&q=80" },
  { city: "Florence", craft: "Leather & repair", years: "Est. 1934", img: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=1400&q=80" },
];

function Page() {
  const eyebrow = usePageText("atelier", "hero.eyebrow", "The Atelier");
  const subtitle = usePageText("atelier", "hero.subtitle", "Every KORE piece carries its maker. Four houses, three continents, paid above market.");
  const intro = usePageText(
    "atelier",
    "intro",
    "Every KORE product is designed to fit. One variant of each collection is made available at a thin limit. Only about 1 in 44 million people will ever own a KORE.\n\nThe product information is only accessible to the KORE owner and can be passed down across generations. Once a variant has reached limit production number, we cease creating that KORE. But all created versions can be recreated over and over again with the exact same specifications.\n\nSo, a parent can will their KORE to a child and the product can continually be redesigned throughout that child's lifetime.",
  );
  const quote = usePageText("atelier", "quote", "KORE is ushering in a new era of ownership. Once you own your KORE, no one else will ever own an identical KORE product.");
  return (
    <SiteShell padTop={false}>
      <PageHero
        eyebrow={eyebrow}
        title={<>Named workshops.<br /><em className="italic">Named</em> hands.</>}
        subtitle={subtitle}
        media="/media/tailor.mp4"
        align="left"
      />
      <section className="px-6 lg:px-10 max-w-[1500px] mx-auto pb-32 pt-16">
        <p className="max-w-2xl text-base text-muted-foreground leading-relaxed mb-20 font-display italic whitespace-pre-line">
          {intro}
        </p>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-20">
          {HOUSES.map((h, i) => (
            <article key={h.city} className={i % 2 ? "md:translate-y-24" : ""}>
              <div className="relative aspect-[4/5] overflow-hidden bg-muted/30 mb-6">
                <img src={h.img} alt={h.city} className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute top-6 left-6 font-display text-7xl text-background/30 mix-blend-difference leading-none">0{i + 1}</span>
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">{h.years}</p>
              <h2 className="font-display text-3xl md:text-4xl font-light">{h.city}</h2>
              <p className="text-sm text-muted-foreground mt-2">{h.craft}</p>
            </article>
          ))}
        </div>

        <div className="mt-32 grid lg:grid-cols-[1fr_auto] gap-8 items-end border-t border-border/40 pt-12">
          <p className="font-display italic text-2xl md:text-3xl max-w-2xl leading-snug whitespace-pre-line">
            "{quote}"
          </p>
          <Link to="/contact" className="self-start lg:self-end px-8 py-4 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase">
            Visit a house →
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
