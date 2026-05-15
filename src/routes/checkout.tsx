import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/chrome/site-shell";
import { useCart, totals } from "@/lib/cart-store";
import { formatPrice } from "@/lib/products";
import { useAuth } from "@/lib/auth/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { initPaystackCheckout } from "@/lib/paystack.functions";
import { WhatsAppHandoffButton } from "@/components/chrome/whatsapp-handoff-button";
import { FadeUp } from "@/lib/animation";

export const Route = createFileRoute("/checkout")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Checkout — KORE" },
      { name: "description", content: "Quiet, considered checkout." },
    ],
  }),
});

const SHIPPING_OPTIONS = [
  { id: "std", label: "Standard", note: "5–7 working days", price: 0 },
  { id: "exp", label: "Express", note: "2–3 working days", price: 1500 },
  { id: "atl", label: "Atelier hand-delivery", note: "Lagos · London — booked", price: 4500 },
];

function Page() {
  const { user, session } = useAuth();
  const lines = useCart();
  const { enriched, subtotal, currency } = totals(lines);
  const [shipping, setShipping] = useState("std");
  const [placing, setPlacing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const initFn = useServerFn(initPaystackCheckout);
  const navigate = useNavigate();

  const ship = SHIPPING_OPTIONS.find((s) => s.id === shipping)!;
  const total = subtotal + ship.price;

  if (enriched.length === 0) {
    return (
      <SiteShell>
        <section className="pt-32 max-w-2xl mx-auto px-6 text-center min-h-[60vh]">
          <p className="text-xs tracking-[0.25em] uppercase text-accent mb-4">Checkout</p>
          <h1 className="font-display text-4xl mb-6">Your bag is empty</h1>
          <Link to="/collection" className="inline-block px-8 py-4 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase">
            Browse collection →
          </Link>
        </section>
      </SiteShell>
    );
  }

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setPlacing(true);

    try {
      const formData = formRef.current ? new FormData(formRef.current) : new FormData();
      const address: Record<string, string> = {};
      formData.forEach((v, k) => { address[k] = String(v); });

      const items = enriched.map((l) => ({
        slug: l.slug, size: l.size, color: l.color, qty: l.qty, price: l.product.price,
      }));

      const { authorization_url } = await initFn({
        data: {
          token: session?.access_token,
          email: user?.email ?? address.email ?? "",
          amount: total,
          items,
          shipping_method: shipping,
          address_json: address,
          callback_path: "/checkout/return",
        },
      });

      if (typeof window !== "undefined") {
        window.location.href = authorization_url;
      } else {
        navigate({ to: authorization_url });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Could not start payment. Please try again.");
      setPlacing(false);
    }
  };

  return (
    <SiteShell>
      <section className="pt-28 px-6 lg:px-10 max-w-[1400px] mx-auto pb-32 min-h-screen">
        <div className="border-b border-border/40 pb-8 mb-12">
          <p className="text-xs tracking-[0.25em] uppercase text-accent mb-2">Checkout</p>
          <h1 className="font-display text-5xl font-light">Almost <em>yours</em>.</h1>
        </div>

        {err && (
          <div className="mb-8 px-4 py-3 border border-destructive/30 bg-destructive/10 text-sm text-destructive">
            {err}
          </div>
        )}

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-16">
          <form ref={formRef} onSubmit={onPay} className="space-y-12">
            {/* Address */}
            <FadeUp>
              <fieldset className="space-y-5">
                <Legend n="01" title="Delivery to" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Field name="full_name" label="Full name" required />
                  <Field name="email" label="Email" type="email" required defaultValue={user?.email} />
                  <Field name="phone" label="Phone" type="tel" />
                  <Field name="country" label="Country" required defaultValue="Nigeria" />
                  <div className="md:col-span-2"><Field name="address" label="Street address" required /></div>
                  <Field name="city" label="City" required />
                  <Field name="postal_code" label="Postal code" />
                </div>
              </fieldset>
            </FadeUp>

            {/* Shipping */}
            <FadeUp delay={0.08}>
              <fieldset className="space-y-5">
                <Legend n="02" title="How it travels" />
                <div className="space-y-2">
                  {SHIPPING_OPTIONS.map((s) => (
                    <motion.label
                      key={s.id}
                      className={`flex items-center justify-between gap-4 px-5 py-4 border cursor-pointer transition-colors ${
                        shipping === s.id ? "border-foreground bg-muted/30" : "border-border/50 hover:border-foreground/60"
                      }`}
                      animate={shipping === s.id ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input type="radio" name="ship" value={s.id} checked={shipping === s.id} onChange={() => setShipping(s.id)} className="sr-only" />
                      <div>
                        <p className="font-display text-lg">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.note}</p>
                      </div>
                      <p className="tabular-nums text-sm">{s.price === 0 ? "Free" : formatPrice(s.price, currency)}</p>
                    </motion.label>
                  ))}
                </div>
              </fieldset>
            </FadeUp>

            {/* Payment */}
            <FadeUp delay={0.14}>
              <fieldset className="space-y-5">
                <Legend n="03" title="Payment" />
                <div className="px-5 py-4 border border-border/60 bg-muted/20 text-sm text-muted-foreground">
                  Secured by <span className="text-foreground">Paystack</span>. You'll be taken to Paystack's hosted page to pay by card, bank transfer, USSD or Apple Pay. We never see your card details.
                </div>
                <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
                  <span
                    onClick={() => setAgreed((v) => !v)}
                    className={`mt-0.5 shrink-0 w-4 h-4 border flex items-center justify-center transition-colors ${
                      agreed ? "border-accent bg-accent" : "border-border bg-transparent"
                    }`}
                    role="checkbox"
                    aria-checked={agreed}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAgreed((v) => !v); } }}
                  >
                    {agreed && <span className="text-accent-foreground text-[10px] leading-none">✓</span>}
                  </span>
                  <span onClick={() => setAgreed((v) => !v)}>
                    I've read the{" "}
                    <Link to="/manifesto" className="text-accent border-b border-accent/30 hover:border-accent" onClick={(e) => e.stopPropagation()}>manifesto</Link>
                    {" "}and accept the terms.
                  </span>
                </label>
              </fieldset>
            </FadeUp>

            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="submit"
                disabled={placing || !agreed}
                className="px-12 py-5 bg-accent text-accent-foreground text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                {placing ? "Opening Paystack…" : `Pay ${formatPrice(total, currency)} →`}
              </motion.button>
              <WhatsAppHandoffButton
                context={`Checkout question — bag total ${formatPrice(total, currency)}, ${enriched.length} item(s)`}
                label="Question? WhatsApp us"
              />
            </div>
          </form>

          <aside className="lg:sticky lg:top-28 self-start border border-border/40 p-8 space-y-6">
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Your bag</h2>
            <ul className="divide-y divide-border/40">
              {enriched.map((l) => (
                <li key={`${l.slug}-${l.size}-${l.color}`} className="flex gap-4 py-4">
                  <div className="relative w-16 aspect-[3/4] bg-muted/30 shrink-0">
                    <img src={l.product.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-display">{l.product.name}</p>
                    <p className="text-xs text-muted-foreground">{l.color} · {l.size} · ×{l.qty}</p>
                  </div>
                  <p className="text-sm tabular-nums">{formatPrice(l.subtotal, l.product.currency)}</p>
                </li>
              ))}
            </ul>
            <div className="space-y-2 text-sm border-t border-border/40 pt-4">
              <Row label="Subtotal" value={formatPrice(subtotal, currency)} />
              <Row label="Shipping" value={ship.price === 0 ? "Free" : formatPrice(ship.price, currency)} />
              <Row label="Tax" value="Inclusive" muted />
            </div>
            <div className="border-t border-border/40 pt-4 flex justify-between font-display text-xl">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total, currency)}</span>
            </div>
            <Link to="/cart" className="block text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              ← Edit bag
            </Link>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

function Legend({ n, title }: { n: string; title: string }) {
  return (
    <legend className="flex items-baseline gap-4 mb-2">
      <span className="font-display text-3xl text-accent">{n}</span>
      <span className="font-display text-2xl">{title}</span>
    </legend>
  );
}
function Field({ name, label, type = "text", required, defaultValue }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}{required && " *"}</label>
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none transition-colors duration-200" />
    </div>
  );
}
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
