// KORE catalogue seed. Supabase catalogue entries override these records when
// they are edited in Admin; the seed keeps the live release available during
// first deployment and if the catalogue service is temporarily unavailable.

export type Product = {
  slug: string;
  name: string;
  number: string;
  collection: string;
  variant?: string;
  category: "shirt" | "trouser" | "outer" | "knit" | "object" | "set";
  price: number; // minor units: NGN 35,000,000 = ₦350,000
  currency: "EUR" | "USD" | "NGN";
  fabric: string;
  origin: string;
  story: string;
  sizes: string[];
  colorways: { name: string; hex: string }[];
  images: string[];
  hero?: string;
  members_only?: boolean;
  featured?: boolean;
  is_new?: boolean;
};

export const FORMME_I_PRODUCT: Product = {
  slug: "formme-i-full-set",
  number: "001",
  name: "FORMME I — Full Set",
  collection: "forme",
  variant: "forme-i",
  category: "set",
  price: 35_000_000,
  currency: "NGN",
  fabric: "Breathable cotton–lyocell twill",
  origin: "Designed by KORE · made to order",
  story:
    "The first complete KORE wardrobe system: a generously cut outer shirt, inner layer and relaxed cuffed trouser. The outer shirt is designed to sit away from the body like a light jacket, while the trouser falls cleanly and finishes at the ankle.",
  sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  colorways: [
    { name: "KORE Blue", hex: "#173FAE" },
    { name: "Signal Yellow", hex: "#D9A51A" },
    { name: "Yellow / Black", hex: "#D9A51A" },
    { name: "Black", hex: "#111111" },
    { name: "White / Maroon", hex: "#741C2B" },
    { name: "Black / White", hex: "#F5F5F3" },
  ],
  images: [
    "/formme-i/yellow-set.svg",
    "/formme-i/blue-set.svg",
    "/formme-i/yellow-black.svg",
    "/formme-i/white-maroon.svg",
    "/formme-i/black-set.svg",
    "/formme-i/black-white.svg",
  ],
  hero: "/formme-i/blue-set.svg",
  featured: true,
  is_new: true,
};

export const PRODUCTS: Product[] = [FORMME_I_PRODUCT];

export const findProduct = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const productsByCollection = (slug: string) =>
  PRODUCTS.filter((p) => p.collection === slug);

export const formatPrice = (minor: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(0)}`;
  }
};
