// Local KORE catalogue seed — Forme I.
// Replace with Supabase `products` table once provisioned.

export type Product = {
  slug: string;
  name: string;
  number: string;        // "01", "02"…
  collection: string;    // matches Collection.slug
  category: "shirt" | "trouser" | "outer" | "knit" | "object";
  price: number;         // minor units (e.g. cents). 28000 = €280.00
  currency: "EUR" | "USD" | "NGN";
  fabric: string;
  origin: string;
  story: string;
  sizes: string[];
  colorways: { name: string; hex: string }[];
  images: string[];      // public paths or URLs
  hero?: string;
  members_only?: boolean;
};

const stock = (q: string) =>
  `https://images.unsplash.com/${q}?w=1600&q=80&auto=format&fit=crop`;

export const PRODUCTS: Product[] = [
  {
    slug: "forme-01-cotton-shirt",
    number: "01",
    name: "Forme I — Cotton Shirt",
    collection: "forme",
    category: "shirt",
    price: 28000,
    currency: "EUR",
    fabric: "Long-staple Egyptian poplin, 120 gsm",
    origin: "Cut & sewn in Porto",
    story:
      "The opening statement of the Forme. A shirt drawn for the body in motion — articulated yoke, dropped hem, mother-of-pearl closures. It softens with every wash and never asks for attention.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colorways: [
      { name: "Bone", hex: "#EFEAE0" },
      { name: "Void", hex: "#0B0B0D" },
    ],
    images: [
      stock("photo-1490481651871-ab68de25d43d"),
      stock("photo-1602810318383-e386cc2a3ccf"),
      stock("photo-1485518882345-15568b007407"),
    ],
  },
  {
    slug: "ligne-02-wide-trouser",
    number: "02",
    name: "Ligne II — Wide Trouser",
    collection: "forme",
    category: "trouser",
    price: 34000,
    currency: "EUR",
    fabric: "Italian wool–linen, 240 gsm",
    origin: "Tailored in Biella",
    story:
      "A trouser that walks before it sits. Pleated, draped, hemmed long. Engineered to fall the same way at six in the morning and ten at night.",
    sizes: ["28", "30", "32", "34", "36"],
    colorways: [
      { name: "Iron", hex: "#3A3D44" },
      { name: "Terre", hex: "#8B6F4E" },
    ],
    images: [
      stock("photo-1473966968600-fa801b869a1a"),
      stock("photo-1594938298603-c8148c4dae35"),
    ],
  },
  {
    slug: "ombre-03-overshirt",
    number: "03",
    name: "Ombre III — Overshirt",
    collection: "forme",
    category: "outer",
    price: 56000,
    currency: "EUR",
    fabric: "Japanese cotton-canvas, 380 gsm",
    origin: "Constructed in Kyoto",
    story:
      "Worn open over the Forme. Worn closed against weather. The fourth season inside one garment.",
    sizes: ["S", "M", "L", "XL"],
    colorways: [
      { name: "Nuit", hex: "#10131C" },
      { name: "Bone", hex: "#EFEAE0" },
    ],
    images: [
      stock("photo-1591047139829-d91aecb6caea"),
      stock("photo-1620799140408-edc6dcb6d633"),
    ],
  },
  {
    slug: "noeud-04-merino-knit",
    number: "04",
    name: "Nœud IV — Merino Knit",
    collection: "forme",
    category: "knit",
    price: 42000,
    currency: "EUR",
    fabric: "16-gauge Australian merino",
    origin: "Knit in Bergamo",
    story:
      "Crew-set, set-in shoulder, ribbed cuff. The quiet centre of the wardrobe.",
    sizes: ["S", "M", "L", "XL"],
    colorways: [
      { name: "Ember", hex: "#B7401E" },
      { name: "Jade", hex: "#1F4E45" },
      { name: "Void", hex: "#0B0B0D" },
    ],
    images: [
      stock("photo-1620012253295-c15cc3e65df4"),
      stock("photo-1583743814966-8936f5b7be1a"),
    ],
  },
  {
    slug: "objet-05-leather-belt",
    number: "05",
    name: "Objet V — Leather Belt",
    collection: "forme",
    category: "object",
    price: 18000,
    currency: "EUR",
    fabric: "Vegetable-tanned bridle leather, brass hardware",
    origin: "Hand-finished in Florence",
    story: "An object you keep. Patinas with the years. Outlasts the wardrobe it serves.",
    sizes: ["80", "85", "90", "95", "100"],
    colorways: [
      { name: "Cognac", hex: "#7A4A2A" },
      { name: "Void", hex: "#0B0B0D" },
    ],
    images: [stock("photo-1624222247344-550fb60583dc")],
    members_only: true,
  },
];

export const findProduct = (slug: string) =>
  PRODUCTS.find((p) => p.slug === slug);

export const productsByCollection = (slug: string) =>
  PRODUCTS.filter((p) => p.collection === slug);

export const formatPrice = (minor: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toFixed(0)}`;
  }
};
