import { createFileRoute, Link } from "@tanstack/react-router";
import { LazyVideo } from "@/components/chrome/lazy-video";
import { useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { cn } from "@/lib/utils";
import { usePageText } from "@/lib/cms/page-content";

export const Route = createFileRoute("/system")({
  component: SystemPage,
  head: () => ({
    meta: [
      { title: "The System — KORE" },
      { name: "description", content: "A modular wardrobe architecture. Six pieces, one logic, no restocks." },
      { property: "og:title", content: "The System — KORE" },
      { property: "og:description", content: "Six pieces. One wardrobe logic. No restocks." },
    ],
  }),
});

const STATS = [
  { v: "06", em: false, label: "Pieces — Forme · Collection I" },
  { v: "100", em: "%", label: "Cotton Construction" },
  { v: "∞",  em: false, label: "Modular Combinations" },
  { v: "0",  em: "×", label: "Restocks — Ever" },
];

const FOUNDATIONS = [
  { n: "01", t: "Structured Cotton", d: "Dense weave construction providing architectural hold and refined drape. The fabric has memory — it holds the cut." },
  { n: "02", t: "Breathability", d: "Thermal regulation through fiber density and natural airflow channels. Wearable across climates without structural compromise." },
  { n: "03", t: "Durability", d: "Long-life construction methods preserve silhouette integrity. Built for years of wear, not single seasons." },
];

const PRINCIPLES = [
  { n: "01", t: "Modular Layering", d: "Every piece interacts with the next through proportion and geometry. Nothing is designed in isolation — the system is the product, not the individual piece." },
  { n: "02", t: "Precision Cut", d: "Tailored forms designed to create presence without excess. The silhouette is resolved at the pattern stage — not adjusted during production." },
  { n: "03", t: "Timeless Design", d: "Structural silhouettes that outlast trends. The goal is a garment equally relevant five years after purchase as the day it arrived." },
  { n: "04", t: "System Logic", d: "Fabric weight, hem length, and proportion are coordinated across the full collection. Wearing KORE means wearing a system — not an outfit assembled from separate choices." },
];

function SystemPage() {
  const heroEyebrow = usePageText("system", "hero.eyebrow", "The System — Forme · Collection I");
  const heroSubtitle = usePageText("system", "hero.subtitle", "A modular wardrobe architecture. Each piece resolves into the next. Built for longevity, not trends.");
  const [open, setOpen] = useState(0);
  const reveals = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("on")),
      { threshold: 0.1 },
    );
    reveals.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  const addRef = (el: HTMLDivElement | null) => { if (el && !reveals.current.includes(el)) reveals.current.push(el); };

  return (
    <SiteShell padTop={false}>
      {/* HERO */}
      <section className="relative h-[100svh] overflow-hidden flex flex-col justify-end px-6 md:px-12 pb-20">
        <LazyVideo src="/media/walk.mp4" className="absolute inset-0 h-full w-full opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 [writing-mode:vertical-lr] text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Scroll ↓</div>
        <div className="relative">
          <p className="text-[11px] tracking-[0.4em] uppercase text-accent mb-6">— {heroEyebrow}</p>
          <h1 className="font-display text-[clamp(3rem,7vw,7rem)] font-light leading-[0.9] mb-5">Our<br /><em className="text-muted-foreground">Kore</em></h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">{heroSubtitle}</p>
        </div>
      </section>

      {/* STATS */}
      <div ref={addRef} className="reveal grid grid-cols-2 md:grid-cols-4 gap-px bg-border border-y border-border">
        {STATS.map((s) => (
          <div key={s.label} className="bg-background p-8 md:p-10">
            <div className="font-display text-4xl md:text-5xl font-light leading-none mb-3">
              {s.em === "%" || s.em === "×" ? (<>{s.v}<em className="text-accent">{s.em}</em></>) : <em className="text-accent not-italic">{s.v}</em>}
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* TWO COL — material */}
      <div ref={addRef} className="reveal grid md:grid-cols-2 min-h-[80vh]">
        <div className="bg-muted/40 relative overflow-hidden min-h-[60vh]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_70%)]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="font-display text-[20vw] md:text-[14vw] text-foreground/5 select-none">I</div>
          </div>
        </div>
        <div className="flex flex-col justify-center px-8 md:px-16 py-16">
          <p className="text-[11px] tracking-[0.3em] uppercase text-accent mb-4">Material Intelligence</p>
          <h2 className="font-display text-4xl md:text-6xl font-light leading-[1] mb-6">What it's<br /><em className="text-muted-foreground">made of</em></h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md">Every textile is selected for structural performance, tactile quality, and longevity. Fabrics are engineered to work with the cut — not against it. Dense weave. Precise drape. Long-term hold.</p>
          <Link to="/collection" className="text-[11px] tracking-[0.25em] uppercase text-foreground border-b border-foreground self-start pb-1 hover:text-accent hover:border-accent transition-colors">See the Pieces →</Link>
        </div>
      </div>

      {/* FABRIC SYSTEM */}
      <div ref={addRef} className="reveal px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto">
        <p className="text-[11px] tracking-[0.3em] uppercase text-accent mb-4">Three Foundations</p>
        <h2 className="font-display text-4xl md:text-6xl font-light leading-[1] mb-6">The<br /><em className="text-muted-foreground">Fabric System</em></h2>
        <p className="text-sm text-muted-foreground max-w-xl mb-16">Each material choice is deliberate. Nothing is default. The textiles are as considered as the cut.</p>
        <div className="grid md:grid-cols-3 gap-px bg-border">
          {FOUNDATIONS.map((m) => (
            <div key={m.n} className="bg-background p-8 md:p-10">
              <div className="font-display text-2xl text-accent italic mb-4">{m.n}</div>
              <h3 className="font-display text-2xl font-light mb-3">{m.t}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QUOTE BAND */}
      <div ref={addRef} className="reveal bg-foreground text-background py-24 md:py-32 px-6 md:px-12">
        <blockquote className="font-display text-3xl md:text-5xl font-light leading-tight max-w-4xl mx-auto text-center">
          "Engineered for the body that moves with <em className="text-accent">purpose</em>."
        </blockquote>
      </div>

      {/* PRINCIPLES — accordion */}
      <div ref={addRef} className="reveal px-6 md:px-12 py-24 md:py-32 max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-12 border-b border-border pb-6">
          <h2 className="font-display text-4xl md:text-5xl font-light leading-[1]">Architectural<br />Construction</h2>
          <span className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">04 Principles</span>
        </div>
        <div className="divide-y divide-border border-b border-border">
          {PRINCIPLES.map((p, i) => (
            <button key={p.n} onClick={() => setOpen(i === open ? -1 : i)} className="w-full text-left py-6 grid grid-cols-[60px_1fr_40px] gap-6 items-start group">
              <div className="font-display text-base text-accent italic">{p.n}</div>
              <div>
                <h3 className="font-display text-2xl md:text-3xl font-light mb-2 group-hover:text-accent transition-colors">{p.t}</h3>
                <div className={cn("overflow-hidden transition-[max-height,opacity] duration-500", open === i ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0")}>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{p.d}</p>
                </div>
              </div>
              <div className={cn("font-display text-2xl text-muted-foreground transition-transform", open === i && "rotate-45")}>+</div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div ref={addRef} className="reveal relative overflow-hidden text-center py-32 px-6 border-t border-border">
        <div aria-hidden className="absolute inset-0 grid place-items-center pointer-events-none select-none">
          <span className="font-display text-[clamp(8rem,20vw,24rem)] font-light text-transparent [-webkit-text-stroke:1px_var(--border)]">KORE</span>
        </div>
        <div className="relative">
          <p className="text-[11px] tracking-[0.4em] uppercase text-accent mb-6">Forme · Collection I — 2026</p>
          <h2 className="font-display text-5xl md:text-7xl font-light leading-[0.95] mb-4">Explore<br />the Pieces</h2>
          <p className="text-sm text-muted-foreground mb-12">Six pieces. One wardrobe logic. No restocks.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/collection" className="inline-flex items-center gap-3 bg-foreground text-background px-10 py-4 text-[11px] tracking-[0.28em] uppercase hover:bg-accent transition-colors">View Collection →</Link>
            <Link to="/manifesto" className="inline-flex items-center gap-3 border border-border text-muted-foreground px-10 py-4 text-[11px] tracking-[0.26em] uppercase hover:border-foreground hover:text-foreground transition-colors">Read Manifesto</Link>
          </div>
        </div>
      </div>

      <style>{`.reveal{opacity:0;transform:translateY(36px);transition:opacity .9s ease,transform .9s ease}.reveal.on{opacity:1;transform:translateY(0)}`}</style>
    </SiteShell>
  );
}
