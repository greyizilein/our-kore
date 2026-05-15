// Lightweight cart store — localStorage + subscribe pattern, no extra deps.
import { useSyncExternalStore } from "react";
import { PRODUCTS, findProduct, type Product } from "./products";

export type CartLine = {
  slug: string;
  size: string;
  color: string;
  qty: number;
};

const KEY = "kore.cart.v1";
const EMPTY_CART: CartLine[] = [];

let state: CartLine[] = load();
const listeners = new Set<() => void>();

function load(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota etc. */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY_CART;

export function useCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartCount() {
  const lines = useCart();
  return lines.reduce((n, l) => n + l.qty, 0);
}

export const cart = {
  add(line: CartLine) {
    const ix = state.findIndex(
      (l) => l.slug === line.slug && l.size === line.size && l.color === line.color,
    );
    if (ix >= 0) {
      state = state.map((l, i) => (i === ix ? { ...l, qty: l.qty + line.qty } : l));
    } else {
      state = [...state, line];
    }
    emit();
  },
  setQty(ix: number, qty: number) {
    state = state
      .map((l, i) => (i === ix ? { ...l, qty: Math.max(0, qty) } : l))
      .filter((l) => l.qty > 0);
    emit();
  },
  remove(ix: number) {
    state = state.filter((_, i) => i !== ix);
    emit();
  },
  clear() {
    state = [];
    emit();
  },
  hydrate(serverItems: CartLine[], merge = true) {
    if (merge) {
      // server is base; if same item exists locally with higher qty, keep higher qty; add any local-only items
      const merged = [...serverItems];
      for (const local of state) {
        const ix = merged.findIndex(s => s.slug === local.slug && s.size === local.size && s.color === local.color);
        if (ix >= 0) {
          merged[ix] = { ...merged[ix], qty: Math.max(merged[ix].qty, local.qty) };
        } else {
          merged.push(local);
        }
      }
      state = merged;
    } else {
      state = [...serverItems];
    }
    persist();
    listeners.forEach(l => l());
  },
};

export type EnrichedLine = CartLine & { product: Product; subtotal: number };

export function enrich(lines: CartLine[]): EnrichedLine[] {
  return lines
    .map((l) => {
      const product = findProduct(l.slug);
      if (!product) return null;
      return { ...l, product, subtotal: product.price * l.qty };
    })
    .filter(Boolean) as EnrichedLine[];
}

export function totals(lines: CartLine[]) {
  const enriched = enrich(lines);
  const subtotal = enriched.reduce((n, l) => n + l.subtotal, 0);
  const currency = enriched[0]?.product.currency ?? "EUR";
  return { enriched, subtotal, currency };
}

export const ALL_PRODUCTS = PRODUCTS;

export { subscribe as subscribeToCart, getSnapshot as getCartSnapshot };
