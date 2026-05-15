import { useEffect, useRef } from "react";
import { useAuth } from "./auth/auth-context";
import { supabase } from "@/integrations/kore-supabase/client";
import { cart, subscribeToCart, getCartSnapshot, type CartLine } from "./cart-store";
import { saved, subscribeToSaved, getSavedSnapshot, type SavedItem } from "./saved-store";
import { setAgentName } from "./agent-name";

const DEBOUNCE_MS = 1200;

async function pushCart(userId: string, items: CartLine[]) {
  await supabase.from("user_carts").upsert(
    { user_id: userId, items, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

async function pushSaved(userId: string, items: SavedItem[]) {
  await supabase.from("user_saved").upsert(
    { user_id: userId, items, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
}

export function useUserSync() {
  const { user } = useAuth();
  const prevUserIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const cartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last-pushed snapshots to avoid re-push loops from realtime events
  const lastCartPushRef = useRef<string>("");
  const lastSavedPushRef = useRef<string>("");

  useEffect(() => {
    if (!user) {
      // If previously signed in, clear local state
      if (prevUserIdRef.current) {
        cart.clear();
        saved.clear();
        lastCartPushRef.current = "";
        lastSavedPushRef.current = "";
      }
      prevUserIdRef.current = null;
      if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null; }
      return;
    }

    const userId = user.id;
    const isNewUser = prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    // --- 1. Load initial state from server on login ---
    if (isNewUser) {
      Promise.all([
        supabase.from("user_carts").select("items").eq("user_id", userId).maybeSingle(),
        supabase.from("user_saved").select("items").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("agent_name").eq("id", userId).maybeSingle(),
      ]).then(([cartRes, savedRes, profileRes]) => {
        if (cartRes.data?.items) {
          cart.hydrate(cartRes.data.items as CartLine[], true);
          lastCartPushRef.current = JSON.stringify(cartRes.data.items);
        } else {
          // No server cart yet — push local items to server
          const local = getCartSnapshot();
          if (local.length > 0) {
            pushCart(userId, local).catch(() => {});
            lastCartPushRef.current = JSON.stringify(local);
          }
        }

        if (savedRes.data?.items) {
          saved.hydrate(savedRes.data.items as SavedItem[], true);
          lastSavedPushRef.current = JSON.stringify(savedRes.data.items);
        } else {
          const local = getSavedSnapshot();
          if (local.length > 0) {
            pushSaved(userId, local).catch(() => {});
            lastSavedPushRef.current = JSON.stringify(local);
          }
        }

        if (profileRes.data?.agent_name) {
          setAgentName(profileRes.data.agent_name);
        }
      }).catch(() => { /* table may not exist yet */ });
    }

    // --- 2. Subscribe to local store changes and debounce-push to server ---
    const unsubCart = subscribeToCart(() => {
      const snapshot = JSON.stringify(getCartSnapshot());
      if (snapshot === lastCartPushRef.current) return; // came from a realtime hydrate — skip
      if (cartTimerRef.current) clearTimeout(cartTimerRef.current);
      cartTimerRef.current = setTimeout(() => {
        const items = getCartSnapshot();
        const snap = JSON.stringify(items);
        lastCartPushRef.current = snap;
        pushCart(userId, items).catch(() => {});
      }, DEBOUNCE_MS);
    });

    const unsubSaved = subscribeToSaved(() => {
      const snapshot = JSON.stringify(getSavedSnapshot());
      if (snapshot === lastSavedPushRef.current) return;
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        const items = getSavedSnapshot();
        const snap = JSON.stringify(items);
        lastSavedPushRef.current = snap;
        pushSaved(userId, items).catch(() => {});
      }, DEBOUNCE_MS);
    });

    // --- 3. Supabase realtime: pull in changes from other devices ---
    if (channelRef.current) { channelRef.current.unsubscribe(); }
    const ch = supabase
      .channel(`user-sync-${userId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "user_carts",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const items = (payload.new as any).items as CartLine[];
        const snap = JSON.stringify(items);
        if (snap === lastCartPushRef.current) return; // our own push — ignore
        lastCartPushRef.current = snap;
        cart.hydrate(items, false); // replace entirely with server state
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "user_saved",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const items = (payload.new as any).items as SavedItem[];
        const snap = JSON.stringify(items);
        if (snap === lastSavedPushRef.current) return;
        lastSavedPushRef.current = snap;
        saved.hydrate(items, false);
      })
      .subscribe();
    channelRef.current = ch;

    return () => {
      unsubCart();
      unsubSaved();
      if (cartTimerRef.current) clearTimeout(cartTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current = null; }
    };
  }, [user?.id]);
}
