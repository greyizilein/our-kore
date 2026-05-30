// KORE collection registry. The "sets" the user browses on /collection.
// FORME is the live collection with real pieces; later sets are atelier
// placeholders until imagery and pieces are committed.

import { PRODUCTS, type Product } from "./products";

export type CollectionStatus = "showing" | "next" | "atelier" | "archived";

export type CollectionVariant = {
  slug: string;            // sub-slug, unique within collection (e.g. "forme-i")
  numeral: string;         // I, II, III…
  name: string;            // "Forme I"
  status: CollectionStatus;
  cover?: string;
  story: string;
  materials: string;
  dates: string;
  pieceSlugs: string[];    // product slugs that belong to this variant
};

export type CollectionSet = {
  slug: string;
  numeral: string;
  name: string;
  tagline: string;
  status: CollectionStatus;
  cover?: string;
  paletteHex: string[];
  defaultEditorial: {
    intro: string;
    materials: string;
    construction: string;
    dates: string;
  };
  variants: CollectionVariant[];
};

// Default variants for FORME — every clothing piece currently belongs to Forme I.
const FORME_CLOTHING_SLUGS = (PRODUCTS ?? [])
  .filter((p) => ["shirt", "trouser", "outer", "knit"].includes(p.category))
  .map((p) => p.slug);

export const DEFAULT_COLLECTIONS: CollectionSet[] = [
  {
    slug: "forme",
    numeral: "I",
    name: "Forme",
    tagline: "Now showing — SS / 26",
    status: "showing",
    cover: PRODUCTS[0]?.images?.[0],
    paletteHex: ["#EFEAE0", "#0B0B0D", "#3A3D44", "#8B6F4E"],
    defaultEditorial: {
      intro:
        "Forme is the opening statement of the house — a study in everyday silhouettes engineered to outlast the season. Each piece is drawn for the body in motion: articulated, dropped, weighted to fall the same way at six in the morning and ten at night.",
      materials:
        "Long-staple Egyptian poplin (120 gsm), Italian wool–linen (240 gsm), Japanese cotton-canvas (380 gsm), 16-gauge Australian merino. Each fabric chosen to soften with use, age with grace, and refuse to announce itself.",
      construction:
        "Cut and sewn across Porto, Biella, Kyoto, and Bergamo. Mother-of-pearl closures, rolled hems, set-in shoulders. Restraint over novelty — collections are released only when material sourcing, fit, and construction are fully resolved.",
      dates: "Showing May 2026 — August 2026",
    },
    variants: [
      {
        slug: "forme-i",
        numeral: "I",
        name: "Forme I",
        status: "showing",
        cover: PRODUCTS[0]?.images?.[0],
        story:
          "The first chapter of Forme. A complete daily wardrobe — shirt, trouser, outer, knit — released as one resolved set.",
        materials: "Egyptian poplin, Italian wool–linen, Japanese cotton-canvas, Australian merino.",
        dates: "Showing May 2026 — August 2026",
        pieceSlugs: FORME_CLOTHING_SLUGS,
      },
      {
        slug: "forme-ii",
        numeral: "II",
        name: "Forme II",
        status: "atelier",
        story:
          "The second chapter. Currently being drawn — heavier weights, deeper colour, evening cuts.",
        materials: "TBA — in pattern.",
        dates: "Late 2026",
        pieceSlugs: [],
      },
    ],
  },
  {
    slug: "origin",
    numeral: "II",
    name: "Origin",
    tagline: "Next chapter — FW / 26",
    status: "next",
    paletteHex: ["#10131C", "#1F4E45", "#7A4A2A", "#B7401E"],
    defaultEditorial: {
      intro:
        "Origin returns the wardrobe to its source. A reduction to first principles: the cotton t-shirt, the boxed shirt, the structured trouser. Built with the same ceremony usually reserved for tailoring.",
      materials:
        "Performance naturals — silk-blend joggers, brushed Suvin cotton, raw selvedge denim, Egyptian poplin. Material exploration over style imitation.",
      construction:
        "Made-to-order, no excess inventory. Each garment ships in a ceremonial box with QR-authenticated provenance.",
      dates: "Opens September 2026",
    },
    variants: [],
  },
  {
    slug: "ligne",
    numeral: "III",
    name: "Ligne",
    tagline: "In the atelier",
    status: "atelier",
    paletteHex: ["#1a1a1a", "#2d2d2d", "#c9a84c", "#f0d78c"],
    defaultEditorial: {
      intro:
        "Ligne studies the line. A collection drawn in pleat, drape, and length — trousers and overshirts that walk before they sit.",
      materials: "Italian wool–linen blends, Japanese chambray, dry-feel viscose.",
      construction: "Tailored in Biella. Long lines. Quiet hardware.",
      dates: "Currently in pattern",
    },
    variants: [],
  },
  {
    slug: "ombre",
    numeral: "IV",
    name: "Ombre",
    tagline: "In the atelier",
    status: "atelier",
    paletteHex: ["#fafbfc", "#94a3b8", "#3b82f6", "#0a0a1a"],
    defaultEditorial: {
      intro:
        "Ombre is the fourth-season wardrobe — overshirts, knits, and coats engineered for the moment between weathers.",
      materials: "Heavy cotton-canvas, double-faced cashmere, technical wool.",
      construction: "Constructed in Kyoto. Worn open. Worn closed. The same garment, two arguments.",
      dates: "Concept stage",
    },
    variants: [],
  },
];

// Backwards-compat alias.
export const COLLECTIONS = DEFAULT_COLLECTIONS;

export const findCollection = (slug: string, list: CollectionSet[] = DEFAULT_COLLECTIONS) =>
  list.find((c) => c.slug === slug);

export const findVariant = (collectionSlug: string, variantSlug: string, list: CollectionSet[] = DEFAULT_COLLECTIONS) => {
  const c = findCollection(collectionSlug, list);
  return c?.variants.find((v) => v.slug === variantSlug) ?? null;
};

const CLOTHING: Product["category"][] = ["shirt", "trouser", "outer", "knit"];

// Pieces for a variant — looks up products by slug. Falls back (FORME only)
// to all clothing pieces if the variant has no explicit pieceSlugs.
export const piecesForVariant = (collectionSlug: string, variantSlug: string, list: CollectionSet[] = DEFAULT_COLLECTIONS): Product[] => {
  const v = findVariant(collectionSlug, variantSlug, list);
  if (!v) return [];
  if (v.pieceSlugs.length === 0 && collectionSlug === "forme" && variantSlug === "forme-i") {
    return PRODUCTS.filter((p) => CLOTHING.includes(p.category));
  }
  return v.pieceSlugs
    .map((s) => PRODUCTS.find((p) => p.slug === s))
    .filter((p): p is Product => !!p);
};

// Legacy helper kept for compatibility.
export const piecesFor = (slug: string): Product[] => {
  if (slug === "forme") return PRODUCTS.filter((p) => CLOTHING.includes(p.category));
  return [];
};

export const nextCollection = (slug: string, list: CollectionSet[] = DEFAULT_COLLECTIONS): CollectionSet | null => {
  const i = list.findIndex((c) => c.slug === slug);
  if (i < 0) return null;
  return list[(i + 1) % list.length];
};

export function mergeCollections(overrides: Partial<CollectionSet>[] | null | undefined): CollectionSet[] {
  if (!overrides || !Array.isArray(overrides) || overrides.length === 0) return DEFAULT_COLLECTIONS;
  const bySlug = new Map(DEFAULT_COLLECTIONS.map((c) => [c.slug, c]));
  overrides.forEach((o) => {
    if (!o.slug) return;
    const base = bySlug.get(o.slug);
    if (base) {
      bySlug.set(o.slug, {
        ...base,
        ...o,
        defaultEditorial: { ...base.defaultEditorial, ...(o.defaultEditorial ?? {}) },
        paletteHex: o.paletteHex && o.paletteHex.length ? o.paletteHex : base.paletteHex,
        variants: Array.isArray(o.variants) && o.variants.length ? o.variants : base.variants,
      } as CollectionSet);
    } else {
      bySlug.set(o.slug, {
        slug: o.slug,
        numeral: o.numeral ?? "?",
        name: o.name ?? o.slug,
        tagline: o.tagline ?? "",
        status: o.status ?? "atelier",
        cover: o.cover,
        paletteHex: o.paletteHex ?? ["#1a1a1a", "#2d2d2d", "#4a4a4a", "#888888"],
        defaultEditorial: {
          intro: o.defaultEditorial?.intro ?? "",
          materials: o.defaultEditorial?.materials ?? "",
          construction: o.defaultEditorial?.construction ?? "",
          dates: o.defaultEditorial?.dates ?? "",
        },
        variants: Array.isArray(o.variants) ? o.variants : [],
      });
    }
  });
  return Array.from(bySlug.values());
}

