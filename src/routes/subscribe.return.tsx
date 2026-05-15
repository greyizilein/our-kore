import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/chrome/site-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { verifySubscriptionPayment } from "@/lib/paystack.functions";

export const Route = createFileRoute("/subscribe/return")({
  component: Page,
  validateSearch: (s: Record<string, unknown>) => ({
    reference: typeof s.reference === "string" ? s.reference : (typeof s.trxref === "string" ? s.trxref : ""),
    tier: typeof s.tier === "string" ? s.tier : "circle",
  }),
  head: () => ({ meta: [{ title: "Confirming membership — KORE" }] }),
});

function Page() {
  const { reference, tier } = Route.useSearch();
  const { session } = useAuth();
  const verify = useServerFn(verifySubscriptionPayment);
  const [state, setState] = useState<"verifying" | "ok" | "fail">("verifying");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!reference) { setState("fail"); setMsg("Missing payment reference."); return; }
    verify({ data: { token: session?.access_token, reference, tier } })
      .then((r) => {
        if (r.success) setState("ok");
        else { setState("fail"); setMsg(`Status: ${r.status}`); }
      })
      .catch((e: any) => { setState("fail"); setMsg(e?.message ?? "Verification failed."); });
  }, [reference, verify, session?.access_token, tier]);

  return (
    <SiteShell>
      <section className="min-h-[60vh] grid place-items-center px-6 text-center pt-32">
        <div className="max-w-lg">
          {state === "verifying" && (
            <>
              <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">One moment</p>
              <h1 className="font-display text-3xl font-light">Confirming your membership…</h1>
            </>
          )}
          {state === "ok" && (
            <>
              <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">Welcome</p>
              <h1 className="font-display text-4xl font-light mb-4">You're in. <em>Finally.</em></h1>
              <p className="text-sm text-muted-foreground mb-8">
                Your membership is confirmed. Head to your space to see your benefits.
              </p>
              <div className="flex gap-3 justify-center">
                <Link to="/dashboard" className="px-6 py-3 bg-accent text-accent-foreground text-[11px] tracking-[0.2em] uppercase">
                  My space →
                </Link>
                <Link to="/collection" className="px-6 py-3 border border-border text-[11px] tracking-[0.2em] uppercase">
                  Browse collection
                </Link>
              </div>
            </>
          )}
          {state === "fail" && (
            <>
              <p className="text-[11px] tracking-[0.25em] uppercase text-destructive mb-3">Not confirmed</p>
              <h1 className="font-display text-3xl font-light mb-4">We couldn't verify the payment.</h1>
              <p className="text-sm text-muted-foreground mb-6">{msg}</p>
              <Link to="/membership" className="inline-block px-6 py-3 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">
                ← Back to membership
              </Link>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
