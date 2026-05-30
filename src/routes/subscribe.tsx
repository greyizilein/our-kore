import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/chrome/site-shell";
import { supabase } from "@/integrations/kore-supabase/client";
import { useAuth } from "@/lib/auth/auth-context";
import { initSubscriptionCheckout } from "@/lib/paystack.functions";

export const Route = createFileRoute("/subscribe")({
  component: Page,
  validateSearch: (s: Record<string, unknown>) => ({
    tier: (["access", "reserve", "atelier", "circle"].includes(s.tier as string)
      ? s.tier
      : "access") as "access" | "reserve" | "atelier" | "circle",
  }),
  head: () => ({ meta: [{ title: "Subscribe — KORE" }] }),
});

const TIER_INFO = {
  access: {
    name: "Access",
    price: "€50",
    period: "/ month",
    blurb: "Your entry into the KORE ecosystem.",
    perks: [
      "Full collection access",
      "Member pricing on all pieces",
      "KORE concierge",
      "Discounted repairs on all clothing",
      "Book 1 piece / 1 colour pre-release",
    ],
    yearly: false,
  },
  reserve: {
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
    yearly: false,
  },
  atelier: {
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
    yearly: false,
  },
  circle: {
    name: "The Circle",
    price: "€2,500",
    period: "/ year",
    blurb: "Exclusive membership. 25 people globally.",
    perks: [
      "Everything in Atelier",
      "One-of-one access",
      "Personal atelier liaison",
      "Circle member events",
      "Commission slots reserved annually",
      "Named in house archives",
    ],
    yearly: true,
  },
} as const;

function Page() {
  const { tier } = Route.useSearch();
  const { session } = useAuth();
  const initCheckout = useServerFn(initSubscriptionCheckout);
  const info = TIER_INFO[tier as keyof typeof TIER_INFO] ?? TIER_INFO.access;

  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setEmail(session.user.email ?? "");
    }
  }, [session]);

  const onAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onPay = async () => {
    if (!session) return;
    setPaying(true);
    setPayError(null);
    try {
      const { authorization_url } = await initCheckout({
        data: {
          token: session.access_token,
          email: session.user.email!,
          tier,
          callback_path: `/subscribe/return?tier=${tier}`,
        },
      });
      window.location.href = authorization_url;
    } catch (err: any) {
      setPayError(err?.message ?? "Could not start payment. Please try again.");
      setPaying(false);
    }
  };

  return (
    <SiteShell>
      <section className="min-h-screen pt-28 pb-24 px-6 lg:px-10 max-w-[1100px] mx-auto">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-start">

          {/* Tier summary */}
          <div className="lg:sticky lg:top-32">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-3">Selected plan</p>
            <h1 className="font-display text-5xl font-light mb-2">{info.name}</h1>
            <div className="mb-2">
              <span className="font-display text-3xl">{info.price}</span>
              <span className="text-sm text-muted-foreground ml-2">{info.period}</span>
            </div>

            {tier === "circle" && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1">
                Capped at 25 members globally
              </p>
            )}

            <p className="text-muted-foreground mb-2 text-sm">{info.blurb}</p>
            <p className="text-[10px] text-muted-foreground/70 mb-8">
              Prices in €. Charged in NGN at the live rate on the day of payment.
            </p>

            <ul className="space-y-3 mb-10 border-t border-border/40 pt-8">
              {(info.perks as readonly string[]).map((p) => (
                <li key={p} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-accent">—</span> {p}
                </li>
              ))}
            </ul>
            <Link to="/membership" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              ← Change plan
            </Link>
          </div>

          {/* Auth + payment */}
          <div>
            {!session ? (
              <div>
                <div className="flex gap-6 mb-8 border-b border-border/40 pb-4">
                  <button
                    className={`text-xs uppercase tracking-[0.2em] pb-1 ${mode === "signup" ? "border-b border-foreground" : "text-muted-foreground"}`}
                    onClick={() => setMode("signup")}
                  >
                    Create account
                  </button>
                  <button
                    className={`text-xs uppercase tracking-[0.2em] pb-1 ${mode === "signin" ? "border-b border-foreground" : "text-muted-foreground"}`}
                    onClick={() => setMode("signin")}
                  >
                    Sign in
                  </button>
                </div>

                <form onSubmit={onAuth} className="space-y-4">
                  {mode === "signup" && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Full name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-transparent border border-border px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent border border-border px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full bg-transparent border border-border px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                  {authError && <p className="text-xs text-destructive">{authError}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-foreground text-background text-xs uppercase tracking-[0.22em] hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                  >
                    {loading ? "Please wait…" : mode === "signup" ? "Create account & continue" : "Sign in & continue"}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="border border-border/40 p-6 mb-8">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1">Signed in as</p>
                  <p className="text-sm">{session.user.email}</p>
                </div>

                <div className="border-t border-border/40 pt-8 mb-6">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{info.name}</span>
                    <span className="font-display text-lg">{info.price} <span className="text-xs text-muted-foreground font-sans">{info.period}</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {info.yearly ? "Annual subscription" : "Recurring subscription"} · Cancel anytime
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    Charged in NGN at the live EUR/NGN rate on the day of payment.
                  </p>
                </div>

                {payError && <p className="text-xs text-destructive mb-4">{payError}</p>}

                <button
                  onClick={onPay}
                  disabled={paying}
                  className="w-full py-4 bg-accent text-accent-foreground text-xs uppercase tracking-[0.22em] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {paying ? "Redirecting to payment…" : `Pay ${info.price} with Paystack →`}
                </button>

                <p className="mt-4 text-[11px] text-muted-foreground text-center">
                  Secure payment via Paystack. You can cancel anytime from your dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
