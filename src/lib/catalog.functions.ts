import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/kore-supabase/admin.server";
import type { Product } from "./products";

type CatalogueRecord = {
  slug?: string;
  series?: string;
  name?: string;
  number?: string;
  collection_slug?: string;
  variant_slug?: string;
  category?: Product["category"];
  price_ngn?: number;
  currency?: Product["currency"];
  description?: string;
  material?: string;
  origin?: string;
  sizes?: string[];
  colorways?: Array<{ name: string; hex: string }>;
  images?: string[];
  hero?: string;
  members_only?: boolean;
  featured?: boolean;
  is_new?: boolean;
  status?: string;
  sort_order?: number;
};

const normalise = (row: CatalogueRecord): Product | null => {
  if (!row.slug || !row.name) return null;
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  return {
    slug: row.slug,
    name: row.name,
    number: row.number || "—",
    collection: row.collection_slug || "forme",
    variant: row.variant_slug || "forme-i",
    category: row.category || "set",
    price: Math.round(Number(row.price_ngn || 0) * 100),
    currency: row.currency || "NGN",
    fabric: row.material || "Material specification pending",
    origin: row.origin || "Designed by KORE",
    story: row.description || "",
    sizes: Array.isArray(row.sizes) && row.sizes.length ? row.sizes : ["Made to measure"],
    colorways:
      Array.isArray(row.colorways) && row.colorways.length
        ? row.colorways
        : [{ name: "As shown", hex: "#777777" }],
    images,
    hero: row.hero || images[0],
    members_only: !!row.members_only,
    featured: !!row.featured,
    is_new: !!row.is_new,
  };
};

async function loadCatalogue(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("value")
    .eq("key", "catalog.products")
    .maybeSingle();

  if (error || !Array.isArray(data?.value)) return [];
  return data.value
    .filter((row: CatalogueRecord) => ["live", "active"].includes(row.status || ""))
    .sort((a: CatalogueRecord, b: CatalogueRecord) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map(normalise)
    .filter((item: Product | null): item is Product => !!item && item.images.length > 0);
}

export const getPublicCatalogueProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { collection?: string; variant?: string }) => d)
  .handler(async ({ data }) => {
    const products = (await loadCatalogue()).filter(
      (product) =>
        (!data.collection || product.collection === data.collection) &&
        (!data.variant || !product.variant || product.variant === data.variant),
    );
    return { products };
  });

export const getPublicCatalogueProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const product = (await loadCatalogue()).find((item) => item.slug === data.slug) ?? null;
    return { product };
  });
