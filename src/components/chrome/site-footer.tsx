import { Link } from "@tanstack/react-router";
import { usePageText } from "@/lib/cms/page-content";

function FooterLink({ to, children }: { to: Parameters<typeof Link>[0]["to"]; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      className="group relative block text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-px bg-foreground group-hover:w-full transition-all duration-300" />
    </Link>
  );
}

export function SiteFooter() {
  const tagline = usePageText(
    "footer",
    "tagline",
    "Intelligent casualwear. A small, considered wardrobe that thinks with you — engineered in Lagos, refined for the world.",
  );
  const legal = usePageText("footer", "copy.legal", `© ${new Date().getFullYear()} KORE Intelligent Casualwear`);
  const signoff = usePageText("footer", "copy.signoff", "Built with discipline.");

  return (
    <footer className="mt-32 border-t border-border/40">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="font-display text-3xl tracking-[0.2em] uppercase">KORE</div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {tagline}
          </p>
        </div>
        <div className="text-sm space-y-3">
          <div className="eyebrow text-muted-foreground mb-3">Discover</div>
          <FooterLink to="/collection">Collection</FooterLink>
          <FooterLink to="/manifesto">Manifesto</FooterLink>
          <FooterLink to="/journal">Journal</FooterLink>
          <FooterLink to="/atelier">Atelier</FooterLink>
          <FooterLink to="/membership">Membership</FooterLink>
        </div>
        <div className="text-sm space-y-3">
          <div className="eyebrow text-muted-foreground mb-3">Account</div>
          <FooterLink to="/dashboard">My Space</FooterLink>
          <FooterLink to="/cart">Bag</FooterLink>
          <FooterLink to="/concierge">Concierge</FooterLink>
          <FooterLink to="/contact">Contact</FooterLink>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10 py-6 flex flex-col md:flex-row gap-3 justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
          <span>{legal}</span>
          <span>{signoff}</span>
        </div>
      </div>
    </footer>
  );
}
