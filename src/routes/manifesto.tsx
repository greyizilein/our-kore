import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { PageHero } from "@/components/chrome/page-hero";
import { FadeUp, SlideLeft } from "@/lib/animation";
import { usePageText } from "@/lib/cms/page-content";

export const Route = createFileRoute("/manifesto")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Manifesto — KORE" },
      { name: "description", content: "Five principles. One garment at a time." },
    ],
  }),
});

const TENETS = [
  { n: "I", t: "Less, is more", b: "We release outfits in collections with minimal choice variants. All are engineered to last, stubbornly." },
  { n: "II", t: "Your body is the standard", b: "Every cut is precise and made to order. It fits. It's balanced. It feels so... so... very cool." },
  { n: "III", t: "Real Material Intelligence", b: "Long-staple fibres, mineral dyes, parts that patinas. The customer is the brand. The name is our business." },
  { n: "IV", t: "Transparent Processes", b: "We favour new artists, a few named ateliers, and provide you full traceability from fibre to finish." },
  { n: "V", t: "Repair, don't replace", b: "Lifetime mending. We don't restock, we re-create. A KORE damaged product returns home." },
];

const SIGN_KEY = "kore.manifesto.signed";

function SignBook() {
  const [signedName, setSignedName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    try { setSignedName(localStorage.getItem(SIGN_KEY)); } catch { /* ssr */ }
  }, []);

  const sign = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSigning(true);
    setTimeout(() => {
      try { localStorage.setItem(SIGN_KEY, n); } catch { /* quota */ }
      setSignedName(n);
      setSigning(false);
    }, 600);
  };

  const unsign = () => {
    try { localStorage.removeItem(SIGN_KEY); } catch { /* */ }
    setSignedName(null);
    setName("");
  };

  if (signedName) {
    return (
      <motion.div
        className="mt-32 border-t border-border/40 pt-16"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">The book</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="font-display text-2xl max-w-md">
              Signed — <em className="italic text-accent">{signedName}</em>
            </p>
            <p className="text-sm text-muted-foreground mt-2">Your name is in the book.</p>
          </div>
          <button
            onClick={unsign}
            className="self-start text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Remove signature
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mt-32 border-t border-border/40 pt-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-[0.25em] text-accent mb-3">Sign the book</p>
          <p className="font-display text-2xl leading-snug whitespace-pre-line">
            {usePageText("manifesto", "sign.title", "Add your name to the principles. Hold the house to them.")}
          </p>
        </div>
        <form onSubmit={sign} className="flex gap-3 items-stretch self-start md:self-end">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none w-52"
          />
          <button
            type="submit"
            disabled={signing || !name.trim()}
            className="px-7 py-3 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {signing ? "Signing…" : "Sign →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Page() {
  const eyebrow = usePageText("manifesto", "hero.eyebrow", "The KORE Manifesto");
  const intro = usePageText(
    "manifesto",
    "intro",
    "We started KORE because we couldn't find the right thing to wear. Most wardrobes are full but we all have our favourites and we like to wear them out until they're literally worn out—especially for guys who just reach and wear. So we decided to start making clothes for those people: the ones who play favourites and the ones who do but don't yet know why.\n\nthe closet was full and nothing fit the life inside it. We make clothes for the people who already know what they want — and for the ones learning to.",
  );
  return (
    <SiteShell padTop={false}>
      <PageHero
        eyebrow={eyebrow}
        title={<>Five principles.<br /><em className="italic">One</em> garment at a time.</>}
        media="/media/couture.mp4"
        align="left"
      />
      <section className="px-6 lg:px-10 max-w-[1100px] mx-auto pb-32 pt-12">
        <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed mb-24 font-display italic whitespace-pre-line">
          {intro}
        </p>

        <ol className="space-y-16 lg:space-y-24">
          {TENETS.map((t, i) => (
            <FadeUp key={t.n} delay={i * 0.04}>
              <li className="grid grid-cols-[80px_1fr] md:grid-cols-[140px_1fr] gap-6 md:gap-12 border-t border-border/40 pt-10">
                <SlideLeft delay={i * 0.04 + 0.05}>
                  <span className="font-display text-5xl md:text-7xl text-accent leading-none">{t.n}</span>
                </SlideLeft>
                <div>
                  <h2 className="font-display text-2xl md:text-4xl font-light mb-4">{t.t}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed max-w-xl">{t.b}</p>
                </div>
              </li>
            </FadeUp>
          ))}
        </ol>

        <SignBook />
      </section>
    </SiteShell>
  );
}
