import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";

const PAYSTACK_API = "https://api.paystack.co";

async function getAuthedUser(token: string) {
  if (!token) return null;
  const url = process.env.KORE_SUPABASE_URL!;
  const anon = process.env.KORE_SUPABASE_ANON_KEY || process.env.KORE_SUPABASE_PUBLISHABLE_KEY!;
  const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data } = await c.auth.getUser();
  return data.user ?? null;
}

function key() {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY not configured.");
  return k;
}

function siteOrigin(): string {
  const env = process.env.PUBLIC_SITE_URL || process.env.SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return "https://kore-umber-eta.vercel.app";
}

function tierToPlanCode(tier: string): string | undefined {
  const map: Record<string, string | undefined> = {
    access:  process.env.PAYSTACK_PLAN_ACCESS,
    circle:  process.env.PAYSTACK_PLAN_CIRCLE,
    atelier: process.env.PAYSTACK_PLAN_ATELIER,
  };
  return map[tier];
}

function tierToAmount(tier: string): number {
  const map: Record<string, number> = { access: 15000, circle: 35000, atelier: 75000 };
  return map[tier] ?? 15000;
}

// --- Initialize a transaction (returns the hosted Paystack URL) ------------

export const initPaystackCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token?: string;
    email: string;
    amount: number;          // major units (NGN)
    items: Array<{ slug: string; size: string; color: string; qty: number; price: number }>;
    shipping_method: string;
    address_json: Record<string, string>;
    plan_code?: string;      // for subscriptions
    callback_path?: string;  // e.g. "/checkout/return"
  }) => d)
  .handler(async ({ data }) => {
    const user = data.token ? await getAuthedUser(data.token) : null;
    const reference = `kore_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const callback_url = `${siteOrigin()}${data.callback_path || "/checkout/return"}`;

    const body: Record<string, unknown> = {
      email: data.email,
      amount: Math.round(data.amount * 100), // kobo
      currency: "NGN",
      reference,
      callback_url,
      metadata: {
        user_id: user?.id ?? null,
        items: data.items,
        shipping_method: data.shipping_method,
        address: data.address_json,
      },
    };
    if (data.plan_code) body.plan = data.plan_code;

    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Paystack init failed (${res.status}).`);
    }
    return {
      authorization_url: json.data.authorization_url as string,
      reference: json.data.reference as string,
    };
  });

// --- Verify a transaction (called from the return route) -------------------

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string; reference: string }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${key()}` } },
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Verification failed (${res.status}).`);
    }
    const tx = json.data;
    const success = tx.status === "success";

    if (success) {
      // Idempotent: insert order only if not already recorded by webhook.
      const { data: existing } = await supabaseAdmin
        .from("orders").select("id").eq("payment_ref", tx.reference).maybeSingle();
      if (!existing) {
        const meta = tx.metadata ?? {};
        const user = data.token ? await getAuthedUser(data.token) : null;
        await supabaseAdmin.from("orders").insert({
          user_id: user?.id ?? meta.user_id ?? null,
          items: meta.items ?? [],
          total_amount: tx.amount / 100,
          currency: tx.currency ?? "NGN",
          shipping_method: meta.shipping_method ?? "std",
          payment_ref: tx.reference,
          address_json: meta.address ?? {},
          status: "paid",
        });
      }
    }
    return {
      success,
      status: tx.status as string,
      amount: tx.amount / 100,
      currency: tx.currency as string,
      reference: tx.reference as string,
    };
  });

// --- Initialize a subscription checkout -----------------------------------

export const initSubscriptionCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: {
    token: string;
    email: string;
    tier: string;
    callback_path?: string;
  }) => d)
  .handler(async ({ data }) => {
    const user = await getAuthedUser(data.token);
    const reference = `kore_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const callback_url = `${siteOrigin()}${data.callback_path || "/subscribe/return"}`;
    const amount = tierToAmount(data.tier);
    const plan_code = tierToPlanCode(data.tier);

    const body: Record<string, unknown> = {
      email: data.email,
      amount: Math.round(amount * 100),
      currency: "NGN",
      reference,
      callback_url,
      metadata: { user_id: user?.id ?? null, tier: data.tier, type: "subscription" },
    };
    if (plan_code) body.plan = plan_code;

    const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Paystack init failed (${res.status}).`);
    }
    return {
      authorization_url: json.data.authorization_url as string,
      reference: json.data.reference as string,
    };
  });

// --- Verify a subscription payment and update membership tier --------------

export const verifySubscriptionPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { token?: string; reference: string; tier: string }) => d)
  .handler(async ({ data }) => {
    const res = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${key()}` } },
    );
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || !json?.status) {
      throw new Error(json?.message || `Verification failed (${res.status}).`);
    }
    const tx = json.data;
    const success = tx.status === "success";

    if (success) {
      const user = data.token ? await getAuthedUser(data.token) : null;
      const userId = user?.id ?? tx.metadata?.user_id ?? null;
      if (userId) {
        await supabaseAdmin.from("profiles").update({ membership_tier: data.tier }).eq("id", userId);
        await supabaseAdmin.from("subscriptions").upsert({
          user_id: userId,
          tier: data.tier,
          payment_ref: tx.reference,
          status: "active",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }
    return { success, status: tx.status as string };
  });
