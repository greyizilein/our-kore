import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { LazyVideo } from "@/components/chrome/lazy-video";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";
import { usePageText } from "@/lib/cms/page-content";

const SUBSCRIPTION_TIERS = [
  {
    slug: "access",
    name: "Access",
    price: "€50",
    period: "/ month",
    perks: ["Full collection access", "Member pricing", "KORE concierge", "Discounted repairs", "Book 1 piece pre-release"],
  },
  {
    slug: "reserve",
    name: "Reserve",
    price: "€75",
    period: "/ month",
    perks: ["Everything in Access", "Book 2 pieces pre-release", "Priority shipping", "Extended holds"],
    featured: true,
  },
  {
    slug: "atelier",
    name: "Atelier",
    price: "€120",
    period: "/ month",
    perks: ["Everything in Reserve", "Book 3 pieces / 2 colours", "Unlimited atelier visits", "Dedicated liaison"],
  },
] as const;

const FORME_PIECES = [
  { src: "/v-theme/reel1.mp4", name: "Field Overcoat", price: "₦ 285,000" },
  { src: "/v-theme/reel2.mp4", name: "Atelier Trouser", price: "₦ 142,000" },
  { src: "/v-theme/reel3.mp4", name: "Considered Knit", price: "₦ 98,000" },
] as const;

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "KORE — Intelligent Casualwear" },
      { name: "description", content: "A small, considered wardrobe that thinks with you." },
    ],
  }),
});

function Index() {
  const eyebrow    = usePageText("home", "hero.eyebrow",        "SS / 26 — The Forme");
  const heroL1     = usePageText("home", "hero.title.1",        "Intelligent");
  const heroL2     = usePageText("home", "hero.title.2",        "casualwear.");
  const subhead    = usePageText("home", "hero.subhead",        "A small, considered wardrobe — engineered for the people who already know what they want, and for the ones learning to.");
  const ctaPrimary = usePageText("home", "hero.cta.primary",    "Enter the collection");
  const ctaSecondary = usePageText("home", "hero.cta.secondary","Speak to KORE");
  const pillars = [
    { n: "01", t: usePageText("home", "pillar.1.title", "Considered"),  d: usePageText("home", "pillar.1.body", "Every garment carries intent. Nothing exists to fill a slot — each piece earns its place.") },
    { n: "02", t: usePageText("home", "pillar.2.title", "Engineered"),  d: usePageText("home", "pillar.2.body", "Cut, fabric and finish are tested for years of wear. Form is the residue of function.") },
    { n: "03", t: usePageText("home", "pillar.3.title", "Intelligent"), d: usePageText("home", "pillar.3.body", "Your wardrobe learns. Members access KORE — an agent that recommends, holds and tailors.") },
  ];
  const founderQuote = usePageText("home", "founder.quote", "Worth is derived from fit, material intelligence, construction, functional utility, and the KORE experience of ownership. Each KORE member owns an exclusive work of art that no one else walking the gallery of this world will ever own. And that is the true meaning of luxury.");
  const memEyebrow = usePageText("home", "membership.eyebrow", "Membership");
  const memTitle   = usePageText("home", "membership.title",   "For the wardrobe you'll keep ten years.");
  const memBody    = usePageText("home", "membership.body",    "Members access new collections first, discounted repairs, and a personal agent — KORE — that holds your sizes, your preferences and your taste.");
  const memCta     = usePageText("home", "membership.cta",     "Become a member");

  return (
    <SiteShell padTop={false}>
      {/* HERO */}
      <section className="relative min-h-[100svh] grid place-items-center overflow-hidden">
        <LazyVideo src="/v-theme/hero.mp4" className="absolute inset-0 h-full w-full opacity-50" preload="auto" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,color-mix(in_oklab,var(--accent)_22%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,var(--background)_85%)]" />

        <div className="relative z-10 mx-auto max-w-[1400px] px-6 lg:px-10 pt-32 pb-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="eyebrow text-muted-foreground"
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="display mt-8 text-[clamp(3rem,11vw,11rem)] leading-[0.92]"
          >
            {heroL1}
            <br />
            <span className="italic font-light">{heroL2}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-10 mx-auto max-w-xl text-base text-muted-foreground leading-relaxed"
          >
            {subhead}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-12 flex justify-center gap-4"
          >
            <Link
              to="/collection"
              className="px-8 py-4 bg-foreground text-background text-xs uppercase tracking-[0.22em] hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {ctaPrimary}
            </Link>
            <Link
              to="/concierge"
              className="px-8 py-4 border border-foreground/40 text-xs uppercase tracking-[0.22em] hover:border-foreground transition-colors"
            >
              {ctaSecondary}
            </Link>
          </motion.div>
        </div>

        {/* Marquee strip */}
        <div className="absolute bottom-0 inset-x-0 border-t border-border/40 overflow-hidden">
          <div className="py-3 flex gap-12 whitespace-nowrap text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground animate-[scroll_40s_linear_infinite]">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="flex gap-12">
                <span>· Considered ·</span>
                <span>· Engineered in Lagos ·</span>
                <span>· Made to outlast trends ·</span>
                <span>· Limited collections ·</span>
                <span>· Members first ·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <Stagger className="mx-auto max-w-[1600px] px-6 lg:px-10 py-32 grid gap-16 lg:grid-cols-3">
        {pillars.map((p) => (
          <StaggerChild key={p.n}>
            <div className="eyebrow text-accent">{p.n}</div>
            <h3 className="mt-6 text-3xl font-display">{p.t}</h3>
            <p className="mt-4 text-muted-foreground leading-relaxed text-sm">{p.d}</p>
          </StaggerChild>
        ))}
      </Stagger>

      {/* FEATURED REELS */}
      <section className="mx-auto max-w-[1600px] px-6 lg:px-10 py-16">
        <FadeUp className="flex justify-between items-end mb-10">
          <div>
            <div className="eyebrow text-muted-foreground">Now showing</div>
            <h2 className="mt-3 text-5xl font-display">The Forme</h2>
          </div>
          <Link to="/collection" className="eyebrow text-accent hover:underline">
            View all →
          </Link>
        </FadeUp>

        {/* Mobile: continuously flowing filmstrip, no interaction needed */}
        <div className="sm:hidden -mx-6 overflow-hidden">
          <div className="flex w-max gap-5 animate-[scroll_38s_linear_infinite]">
            {[...FORME_PIECES, ...FORME_PIECES].map((p, i) => (
              <Link key={`${p.name}-${i}`} to="/collection" className="group block shrink-0 w-[72vw]">
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  <LazyVideo src={p.src} className="absolute inset-0 h-full w-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </div>
                <div className="mt-4 flex justify-between items-baseline">
                  <div className="font-display text-xl">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.price}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Tablet/desktop: static reveal grid */}
        <Stagger className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FORME_PIECES.map((p) => (
            <StaggerChild key={p.name}>
              <Link to="/collection" className="group block">
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  <LazyVideo src={p.src} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.07]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-500" />
                </div>
                <div className="mt-4 flex justify-between items-baseline">
                  <div className="font-display text-xl">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.price}</div>
                </div>
              </Link>
            </StaggerChild>
          ))}
        </Stagger>
      </section>

      {/* MEMBERSHIP TIERS */}
      <section className="mx-auto max-w-[1600px] px-6 lg:px-10 py-24 border-t border-border/40">
        <FadeUp className="mb-16 flex justify-between items-end">
          <div>
            <div className="eyebrow text-accent mb-3">Membership</div>
            <h2 className="font-display text-5xl lg:text-6xl font-light">Choose your <em>circle</em>.</h2>
          </div>
          <Link to="/membership" className="eyebrow text-muted-foreground hover:text-foreground">
            Compare all →
          </Link>
        </FadeUp>

        <Stagger className="grid md:grid-cols-3 gap-px bg-border/30">
          {SUBSCRIPTION_TIERS.map((tier) => (
            <StaggerChild key={tier.slug}>
              <div className={`p-10 flex flex-col h-full ${(tier as any).featured ? "bg-foreground text-background" : "bg-background"}`}>
                <p className={`text-[10px] uppercase tracking-[0.3em] mb-4 ${(tier as any).featured ? "text-background/50" : "text-accent"}`}>{tier.name}</p>
                <div className="mb-1">
                  <span className="font-display text-4xl font-light">{tier.price}</span>
                  <span className={`text-xs ml-2 ${(tier as any).featured ? "text-background/50" : "text-muted-foreground"}`}>{tier.period}</span>
                </div>
                <ul className="mt-8 space-y-3 mb-10 flex-1">
                  {tier.perks.map((p) => (
                    <li key={p} className={`flex gap-3 text-sm ${(tier as any).featured ? "text-background/80" : "text-muted-foreground"}`}>
                      <span className={(tier as any).featured ? "text-background/40" : "text-accent"}>—</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/subscribe"
                  search={{ tier: tier.slug }}
                  className={`mt-auto text-center py-4 text-[11px] uppercase tracking-[0.2em] transition-colors ${
                    (tier as any).featured
                      ? "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      : "border border-border hover:border-foreground"
                  }`}
                >
                  Join {tier.name} →
                </Link>
              </div>
            </StaggerChild>
          ))}
        </Stagger>
      </section>

      {/* FOUNDER QUOTE */}
      <FadeUp className="py-16 px-6 lg:px-10 border-t border-border/40">
        <div className="pl-5 border-l-2 border-accent/60 max-w-xl">
          <p className="font-display italic text-sm md:text-base font-light leading-relaxed text-foreground/80">
            "{founderQuote}"
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-accent">— Founder, KORE</p>
        </div>
      </FadeUp>

      {/* MEMBERSHIP CTA */}
      <FadeUp className="mx-auto max-w-[1600px] px-6 lg:px-10 py-24">
        <div className="border border-border p-12 lg:p-20 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--accent)_8%,transparent),transparent)] transition-shadow duration-700 hover:shadow-[0_0_60px_-10px_color-mix(in_oklab,var(--accent)_20%,transparent)]">
          <div className="eyebrow text-accent">{memEyebrow}</div>
          <h2 className="mt-6 text-5xl lg:text-7xl font-display max-w-3xl whitespace-pre-line">
            {memTitle}
          </h2>
          <p className="mt-8 max-w-xl text-muted-foreground whitespace-pre-line">
            {memBody}
          </p>
          <Link
            to="/membership"
            className="mt-10 inline-block px-8 py-4 bg-accent text-accent-foreground text-xs uppercase tracking-[0.22em] hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            {memCta}
          </Link>
        </div>
      </FadeUp>

      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </SiteShell>
  );
}
