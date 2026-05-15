import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { PageHero } from "@/components/chrome/page-hero";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";
import { usePageText } from "@/lib/cms/page-content";

export const Route = createFileRoute("/membership")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Membership — KORE" },
      { name: "description", content: "The Circle. Hold pieces, tailor freely, sign the manifesto." },
    ],
  }),
});

const TIERS = [
  {
    name: "Open",
    price: "Free",
    blurb: "Browse. Buy. Wear.",
    perks: ["Public collection access", "Standard shipping", "30-day returns"],
    cta: "Continue browsing",
    href: "/collection" as const,
    accent: false,
  },
  {
    name: "The Circle",
    price: "€280 / year",
    blurb: "Membership.",
    perks: [
      "Hold up to 3 pieces from any drop for 7 days",
      "Free tailoring at any KORE house, for life",
      "Members-only objects and early access",
      "Lifetime repair on every garment",
      "Two atelier visits per year",
    ],
    cta: "Join the Circle →",
    href: "/login" as const,
    accent: true,
  },
];

function Page() {
  const eyebrow = usePageText("membership", "hero.eyebrow", "Membership");
  const subtitle = usePageText("membership", "hero.subtitle", "A small, private membership for the people who own their wardrobe — and want it to last.");
  return (
    <SiteShell padTop={false}>
      <PageHero
        eyebrow={eyebrow}
        title={<>The <em className="italic">Circle</em>.</>}
        subtitle={subtitle}
        media="/media/couture.mp4"
      />
      <section className="px-6 lg:px-10 max-w-[1300px] mx-auto pb-32 pt-8">
        <div className="border-b border-border/40 pb-8 mb-16" />

        <Stagger className="grid md:grid-cols-2 gap-px bg-border/40">
          {TIERS.map((t, i) => (
            <StaggerChild key={t.name}>
              <motion.div
                className={`p-10 lg:p-14 flex flex-col h-full ${t.accent ? "bg-foreground text-background" : "bg-background"}`}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                <p className={`text-xs uppercase tracking-[0.25em] mb-3 ${t.accent ? "text-background/60" : "text-accent"}`}>{t.name}</p>
                <h2 className="font-display text-4xl md:text-5xl font-light mb-2">{t.price}</h2>
                <p className={`mb-10 ${t.accent ? "text-background/70" : "text-muted-foreground"}`}>{t.blurb}</p>
                <ul className="space-y-4 mb-12">
                  {t.perks.map((p, pi) => (
                    <motion.li
                      key={p}
                      className="flex gap-3 text-sm leading-relaxed"
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + pi * 0.06, duration: 0.4 }}
                    >
                      <span className={t.accent ? "text-background/40" : "text-accent"}>—</span>
                      <span>{p}</span>
                    </motion.li>
                  ))}
                </ul>
                <Link
                  to={t.href}
                  className={`mt-auto inline-block text-center py-4 text-xs tracking-[0.2em] uppercase transition-colors ${
                    t.accent
                      ? "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      : "border border-border hover:border-foreground"
                  }`}
                >
                  {t.cta}
                </Link>
              </motion.div>
            </StaggerChild>
          ))}
        </Stagger>

        <p className="text-center mt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          The Circle is capped at 1,000 members per region.
        </p>
      </section>
    </SiteShell>
  );
}
