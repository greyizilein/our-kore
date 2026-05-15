// Saved/wishlisted pieces — localStorage, same pattern as cart-store.
import { useSyncExternalStore } from "react";
import { PRODUCTS, findProduct, type Product } from "./products";

export type SavedItem = {
  slug: string;
  size: string;
  color: string;
  savedAt: string; // ISO timestamp
};

const KEY = "kore.saved.v1";
const EMPTY: SavedItem[] = [];

let state: SavedItem[] = load();
const listeners = new Set<() => void>();

function load(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedItem[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
}

function emit() { persist(); listeners.forEach((l) => l()); }

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSaved() {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

export function useSavedCount() {
  return useSaved().length;
}

export const saved = {
  toggle(item: Omit<SavedItem, "savedAt">) {
    const ix = state.findIndex((s) => s.slug === item.slug && s.size === item.size && s.color === item.color);
    if (ix >= 0) {
      state = state.filter((_, i) => i !== ix);
    } else {
      state = [...state, { ...item, savedAt: new Date().toISOString() }];
    }
    emit();
  },
  isSaved(slug: string, size: string, color: string) {
    return state.some((s) => s.slug === slug && s.size === size && s.color === color);
  },
  remove(ix: number) {
    state = state.filter((_, i) => i !== ix);
    emit();
  },
  clear() { state = []; emit(); },
  hydrate(serverItems: SavedItem[], merge = true) {
    if (merge) {
      const merged = [...serverItems];
      for (const local of state) {
        if (!merged.some(s => s.slug === local.slug && s.size === local.size && s.color === local.color)) {
          merged.push(local);
        }
      }
      state = merged;
    } else {
      state = [...serverItems];
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
    listeners.forEach(l => l());
  },
};

export type EnrichedSaved = SavedItem & { product: Product };

export function enrichSaved(items: SavedItem[]): EnrichedSaved[] {
  return items
    .map((s) => { const product = findProduct(s.slug); return product ? { ...s, product } : null; })
    .filter(Boolean) as EnrichedSaved[];
}

export function getSavedSnapshot() { return state; }
export { subscribe as subscribeToSaved };
