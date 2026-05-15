import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { LazyVideo } from "@/components/chrome/lazy-video";
import { FadeUp, Stagger, StaggerChild } from "@/lib/animation";
import { usePageText } from "@/lib/cms/page-content";

const QUOTES = [
  "Built for the body that moves with purpose.",
  "A wardrobe that thinks with you.",
  "Fewer pieces. More wear. Longer story.",
  "Cut once. Worn for a decade.",
  "Worth is derived from fit, material intelligence, construction, functional utility, and the KORE experience of ownership. Each KORE member owns an exclusive work of art that no one else walking the gallery of this world will ever own.",
];

function TypingQuote() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "hold" | "deleting">("typing");

  useEffect(() => {
    const full = QUOTES[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (text.length < full.length) {
        t = setTimeout(() => setText(full.slice(0, text.length + 1)), 55);
      } else {
        t = setTimeout(() => setPhase("hold"), 1800);
      }
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("deleting"), 1200);
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(full.slice(0, text.length - 1)), 25);
      } else {
        setIdx((i) => (i + 1) % QUOTES.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx]);

  return (
    <p className="font-display italic text-3xl md:text-5xl text-center px-6 max-w-3xl min-h-[1.5em]">
      "{text}<span className="inline-block w-[2px] h-[0.9em] ml-1 bg-accent align-middle animate-pulse" />"
    </p>
  );
}

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
  const t = (id: string, def: string) => usePageText("home", id, def);
  const eyebrow = t("hero.eyebrow", "SS / 26 — The Forme");
  const heroL1 = t("hero.title.1", "Intelligent");
  const heroL2 = t("hero.title.2", "casualwear.");
  const subhead = t("hero.subhead", "A small, considered wardrobe — engineered for the people who already know what they want, and for the ones learning to.");
  const ctaPrimary = t("hero.cta.primary", "Enter the collection");
  const ctaSecondary = t("hero.cta.secondary", "Speak to KORE");
  const pillars = [
    { n: "01", t: t("pillar.1.title", "Considered"),  d: t("pillar.1.body", "Every garment carries intent. Nothing exists to fill a slot — each piece earns its place.") },
    { n: "02", t: t("pillar.2.title", "Engineered"),  d: t("pillar.2.body", "Cut, fabric and finish are tested for years of wear. Form is the residue of function.") },
    { n: "03", t: t("pillar.3.title", "Intelligent"), d: t("pillar.3.body", "Your wardrobe learns. Members access KORE — an agent that recommends, holds and tailors.") },
  ];
  const memEyebrow = t("membership.eyebrow", "Membership");
  const memTitle   = t("membership.title", "For the wardrobe you'll keep ten years.");
  const memBody    = t("membership.body", "Members access first drops, complimentary alterations, and a personal agent — KORE — that holds your sizes, your preferences and your taste.");
  const memCta     = t("membership.cta", "Become a member");
  return (
    <SiteShell padTop={false}>
      {/* HERO */}
      <section className="relative min-h-[100svh] grid place-items-center overflow-hidden">
        {/* Background video — lazy mounted */}
        <LazyVideo src="/v-theme/hero.mp4" className="absolute inset-0 h-full w-full opacity-50" />
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
                <span>· Limited drops ·</span>
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

        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { src: "/v-theme/reel1.mp4", name: "Field Overcoat", price: "₦ 285,000" },
            { src: "/v-theme/reel2.mp4", name: "Atelier Trouser", price: "₦ 142,000" },
            { src: "/v-theme/reel3.mp4", name: "Considered Knit", price: "₦ 98,000" },
          ].map((p) => (
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

      {/* TYPING QUOTE BAND — full-bleed video */}
      <section className="relative w-full h-[100svh] overflow-hidden">
        <LazyVideo src="/media/wardrobe.mp4" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,color-mix(in_oklab,var(--background)_35%,transparent)_60%,var(--background)_100%)]" />
        <div className="absolute inset-0 grid place-items-center">
          <TypingQuote />
        </div>
      </section>

      {/* MEMBERSHIP CTA */}
      <FadeUp className="mx-auto max-w-[1600px] px-6 lg:px-10 py-32">
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
            className="mt-10 inline-block px-8 py-4 bg-accent text-accent-foreground text-xs uppercase tracking-[0.22em] hover:opacity-90 transition-opacity active:scale-[0.98] transition-transform"
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
