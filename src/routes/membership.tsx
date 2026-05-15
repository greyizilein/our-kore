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
      { name: "description", content: "Three tiers. One house. Built around you." },
    ],
  }),
});

const TIERS = [
  {
    slug: "access" as const,
    name: "Access",
    price: "₦15,000",
    period: "/ month",
    blurb: "Your entry into the KORE ecosystem.",
    perks: [
      "Full collection access",
      "Member-priced pieces",
      "KORE concierge access",
      "Standard shipping",
      "30-day returns",
    ],
    accent: false,
  },
  {
    slug: "circle" as const,
    name: "The Circle",
    price: "₦35,000",
    period: "/ month",
    blurb: "Membership.",
    perks: [
      "Hold up to 3 pieces from any drop for 7 days",
      "Free tailoring at any KORE house, for life",
      "Members-only objects and early access",
      "Lifetime repair on every garment",
      "Two atelier visits per year",
    ],
    accent: true,
  },
  {
    slug: "atelier" as const,
    name: "Atelier",
    price: "₦75,000",
    period: "/ month",
    blurb: "Full atelier privileges.",
    perks: [
      "Everything in The Circle",
      "Custom commission priority",
      "Unlimited atelier visits",
      "Dedicated atelier liaison",
      "Exclusive one-of-one access",
    ],
    accent: false,
  },
];

function Page() {
  const eyebrow  = usePageText("membership", "hero.eyebrow",  "Membership");
  const subtitle = usePageText("membership", "hero.subtitle", "Three tiers. One house. Built around how you wear — and how you want to be known.");

  return (
    <SiteShell padTop={false}>
      <PageHero
        eyebrow={eyebrow}
        title={<>The <em className="italic">Circle</em>.</>}
        subtitle={subtitle}
        media="/media/couture.mp4"
      />
      <section className="px-6 lg:px-10 max-w-[1400px] mx-auto pb-32 pt-8">
        <div className="border-b border-border/40 pb-8 mb-16" />

        <Stagger className="grid md:grid-cols-3 gap-px bg-border/30">
          {TIERS.map((t, i) => (
            <StaggerChild key={t.slug}>
              <motion.div
                className={`p-10 lg:p-14 flex flex-col h-full ${t.accent ? "bg-foreground text-background" : "bg-background"}`}
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                <p className={`text-xs uppercase tracking-[0.25em] mb-3 ${t.accent ? "text-background/60" : "text-accent"}`}>{t.name}</p>
                <div className="mb-2">
                  <span className="font-display text-4xl md:text-5xl font-light">{t.price}</span>
                  <span className={`text-xs ml-2 ${t.accent ? "text-background/50" : "text-muted-foreground"}`}>{t.period}</span>
                </div>
                <p className={`mb-10 text-sm ${t.accent ? "text-background/70" : "text-muted-foreground"}`}>{t.blurb}</p>
                <ul className="space-y-4 mb-12 flex-1">
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
                  to="/subscribe"
                  search={{ tier: t.slug }}
                  className={`mt-auto inline-block text-center py-4 text-xs tracking-[0.2em] uppercase transition-colors ${
                    t.accent
                      ? "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      : "border border-border hover:border-foreground"
                  }`}
                >
                  Join {t.name} →
                </Link>
              </motion.div>
            </StaggerChild>
          ))}
        </Stagger>

        <p className="text-center mt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          The Circle is capped at 1,000 members per region.
        </p>

        <FadeUp className="mt-24 border-t border-border/40 pt-16 text-center max-w-3xl mx-auto">
          <p className="font-display italic text-2xl md:text-3xl font-light leading-[1.4]">
            "Worth is derived from fit, material intelligence, construction, functional utility, and the KORE experience of ownership."
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-accent">— Founder, KORE</p>
        </FadeUp>
      </section>
    </SiteShell>
  );
}
