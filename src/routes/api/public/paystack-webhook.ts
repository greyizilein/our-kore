import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";

// Paystack signs webhook bodies with HMAC-SHA512 of the raw body using your
// SECRET key. Header name: x-paystack-signature.
// Configure in Paystack Dashboard → Settings → Webhooks:
//   https://our-kore.lovable.app/api/public/paystack-webhook

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) return new Response("Misconfigured", { status: 500 });

        const signature = request.headers.get("x-paystack-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        try {
          const ok = signature.length === expected.length &&
            timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
          if (!ok) return new Response("Invalid signature", { status: 401 });
        } catch {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(body); } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event = payload?.event as string;
        const tx = payload?.data ?? {};

        if (event === "charge.success" && tx.reference) {
          const { data: existing } = await supabaseAdmin
            .from("orders").select("id").eq("payment_ref", tx.reference).maybeSingle();
          if (!existing) {
            const meta = tx.metadata ?? {};
            await supabaseAdmin.from("orders").insert({
              user_id: meta.user_id ?? null,
              items: meta.items ?? [],
              total_amount: (tx.amount ?? 0) / 100,
              currency: tx.currency ?? "NGN",
              shipping_method: meta.shipping_method ?? "std",
              payment_ref: tx.reference,
              address_json: meta.address ?? {},
              status: "paid",
            });
          }
        }

        if (event === "subscription.create" || event === "subscription.enable") {
          const userId = tx.metadata?.user_id ?? null;
          const tier = tx.metadata?.tier ?? null;
          if (userId && tier) {
            await supabaseAdmin.from("profiles").update({ membership_tier: tier }).eq("id", userId);
            await supabaseAdmin.from("subscriptions").upsert({
              user_id: userId,
              tier,
              payment_ref: tx.reference ?? null,
              status: "active",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          }
        }

        if (event === "subscription.disable" || event === "subscription.not_renew") {
          const userId = tx.metadata?.user_id ?? null;
          if (userId) {
            await supabaseAdmin.from("profiles").update({ membership_tier: null }).eq("id", userId);
            await supabaseAdmin.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("user_id", userId);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
