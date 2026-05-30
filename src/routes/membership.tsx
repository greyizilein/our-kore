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
      { name: "description", content: "The Circle & memberships. Built around you." },
    ],
  }),
});

const TIERS = [
  {
    slug: "access" as const,
    name: "Access",
    price: "€50",
    period: "/ month",
    blurb: "Your entry into the KORE ecosystem.",
    perks: [
      "Full collection access",
      "Member-priced pieces",
      "KORE concierge",
      "Discounted repairs on all clothing",
      "Book 1 piece / 1 colour pre-release",
    ],
    accent: false,
  },
  {
    slug: "reserve" as const,
    name: "Reserve",
    price: "€75",
    period: "/ month",
    blurb: "More access. More flexibility.",
    perks: [
      "Everything in Access",
      "Book 2 pieces / 1 colour pre-release",
      "Priority shipping",
      "Extended hold windows",
    ],
    accent: false,
  },
  {
    slug: "atelier" as const,
    name: "Atelier",
    price: "€120",
    period: "/ month",
    blurb: "Full atelier privileges.",
    perks: [
      "Everything in Reserve",
      "Book 3 pieces / 2 colours pre-release",
      "Unlimited atelier visits",
      "Custom commission priority",
      "Dedicated atelier liaison",
    ],
    accent: false,
  },
];

function Page() {
  const eyebrow  = usePageText("membership", "hero.eyebrow",  "Membership");
  const subtitle = usePageText("membership", "hero.subtitle", "The Circle & memberships. Built around how you wear — and how you want to be known.");

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

        {/* The Circle — featured exclusive membership */}
        <FadeUp className="mb-20">
          <div className="relative bg-foreground text-background p-10 lg:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/10 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-10 items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-background/50 mb-4">Exclusive membership</p>
                <h2 className="font-display text-5xl lg:text-6xl font-light mb-4">The Circle</h2>
                <div className="mb-2">
                  <span className="font-display text-4xl font-light">€2,500</span>
                  <span className="text-sm text-background/50 ml-2">/ year</span>
                </div>
                <p className="text-background/60 text-sm mb-8">
                  Globally capped at 25 members. A seat in The Circle is not bought — it is earned and held.
                </p>
                <ul className="space-y-3 mb-10 columns-1 sm:columns-2 gap-x-12">
                  {[
                    "Everything in Atelier",
                    "One-of-one piece access",
                    "Personal atelier liaison",
                    "Circle member events",
                    "Commission slots reserved annually",
                    "Named in house archives",
                  ].map((p) => (
                    <li key={p} className="flex gap-3 text-sm text-background/80 break-inside-avoid">
                      <span className="text-background/30">—</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0 lg:pt-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.25em] text-background/40 mb-3">
                  25 members · worldwide
                </p>
                <Link
                  to="/subscribe"
                  search={{ tier: "circle" }}
                  className="inline-block px-8 py-4 bg-background text-foreground text-xs tracking-[0.2em] uppercase hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Apply for The Circle →
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Standard memberships */}
        <FadeUp className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Standard memberships</p>
          <h3 className="font-display text-3xl font-light mt-2">Choose your tier.</h3>
        </FadeUp>

        <Stagger className="grid md:grid-cols-3 gap-px bg-border/30">
          {TIERS.map((t, i) => (
            <StaggerChild key={t.slug}>
              <motion.div
                className="p-10 lg:p-14 flex flex-col h-full bg-background"
                whileHover={{ y: -4, transition: { duration: 0.3 } }}
              >
                <p className="text-xs uppercase tracking-[0.25em] mb-3 text-accent">{t.name}</p>
                <div className="mb-2">
                  <span className="font-display text-4xl md:text-5xl font-light">{t.price}</span>
                  <span className="text-xs ml-2 text-muted-foreground">{t.period}</span>
                </div>
                <p className="mb-10 text-sm text-muted-foreground">{t.blurb}</p>
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
                      <span className="text-accent">—</span>
                      <span>{p}</span>
                    </motion.li>
                  ))}
                </ul>
                <Link
                  to="/subscribe"
                  search={{ tier: t.slug }}
                  className="mt-auto inline-block text-center py-4 text-xs tracking-[0.2em] uppercase transition-colors border border-border hover:border-foreground"
                >
                  Join {t.name} →
                </Link>
              </motion.div>
            </StaggerChild>
          ))}
        </Stagger>

        <p className="text-center mt-6 text-xs text-muted-foreground/60">
          Prices in €. Charged in NGN at the live rate on the day of payment.
        </p>

        <FadeUp className="mt-24 border-t border-border/40 pt-16 text-center max-w-3xl mx-auto">
          <p className="font-display italic text-xl md:text-2xl font-light leading-[1.5]">
            "Worth is derived from fit, material intelligence, construction, functional utility, and the KORE experience of ownership."
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-accent">— Founder, KORE</p>
        </FadeUp>
      </section>
    </SiteShell>
  );
}
