// Registry of editable pages and their blocks.
// Adding a page here makes it appear in the admin Pages panel.
// To make a block actually editable on the live site, wire it via
// `usePageText(pageId, blockId, default)` or `<T page="..." id="..." default="..." />`
// in the corresponding component.

export type Block = {
  id: string;
  label: string;
  default: string;
  multiline?: boolean;
  /** When true, this block is wired to render through the CMS hook. */
  wired?: boolean;
};

export type PageDef = {
  id: string;
  label: string;
  group: "Chrome" | "Marketing" | "Editorial" | "Commerce" | "Account" | "Agent";
  blocks: Block[];
};

export const PAGES: PageDef[] = [
  {
    id: "header",
    label: "Header",
    group: "Chrome",
    blocks: [
      { id: "status.left",   label: "Status line — left",   default: "SS / 26 — FORME", wired: true },
      { id: "status.center", label: "Status line — center", default: "LAGOS · LONDON · TOKYO", wired: true },
      { id: "status.right",  label: "Status line — right",  default: "SHIPPING WORLDWIDE", wired: true },
    ],
  },
  {
    id: "footer",
    label: "Footer",
    group: "Chrome",
    blocks: [
      { id: "tagline",   label: "Brand tagline", multiline: true, wired: true,
        default: "Intelligent casualwear. A small, considered wardrobe that thinks with you — engineered in Lagos, refined for the world." },
      { id: "copy.legal",   label: "Copyright line",  default: `© ${new Date().getFullYear()} KORE Intelligent Casualwear`, wired: true },
      { id: "copy.signoff", label: "Sign-off line",   default: "Built with discipline.", wired: true },
    ],
  },
  {
    id: "home",
    label: "Home",
    group: "Marketing",
    blocks: [
      { id: "hero.eyebrow",   label: "Hero eyebrow",   default: "SS / 26 — The Forme", wired: true },
      { id: "hero.title.1",   label: "Hero title — line 1", default: "Intelligent", wired: true },
      { id: "hero.title.2",   label: "Hero title — line 2 (italic)", default: "casualwear.", wired: true },
      { id: "hero.subhead",   label: "Hero subhead",   multiline: true, wired: true,
        default: "A small, considered wardrobe — engineered for the people who already know what they want, and for the ones learning to." },
      { id: "hero.cta.primary",   label: "Primary CTA",   default: "Enter the collection", wired: true },
      { id: "hero.cta.secondary", label: "Secondary CTA", default: "Speak to KORE", wired: true },
      { id: "pillar.1.title", label: "Pillar 01 — title", default: "Considered", wired: true },
      { id: "pillar.1.body",  label: "Pillar 01 — body",  multiline: true, wired: true,
        default: "Every garment carries intent. Nothing exists to fill a slot — each piece earns its place." },
      { id: "pillar.2.title", label: "Pillar 02 — title", default: "Engineered", wired: true },
      { id: "pillar.2.body",  label: "Pillar 02 — body",  multiline: true, wired: true,
        default: "Cut, fabric and finish are tested for years of wear. Form is the residue of function." },
      { id: "pillar.3.title", label: "Pillar 03 — title", default: "Intelligent", wired: true },
      { id: "pillar.3.body",  label: "Pillar 03 — body",  multiline: true, wired: true,
        default: "Your wardrobe learns. Members access KORE — an agent that recommends, holds and tailors." },
      { id: "membership.eyebrow", label: "Membership block — eyebrow", default: "Membership", wired: true },
      { id: "membership.title",   label: "Membership block — title",   default: "For the wardrobe you'll keep ten years.", wired: true, multiline: true },
      { id: "membership.body",    label: "Membership block — body",    multiline: true, wired: true,
        default: "Members access first drops, complimentary alterations, and a personal agent — KORE — that holds your sizes, your preferences and your taste." },
      { id: "membership.cta",     label: "Membership block — CTA",     default: "Become a member", wired: true },
    ],
  },
  {
    id: "manifesto",
    label: "Manifesto",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow", label: "Hero eyebrow", default: "The KORE Manifesto", wired: true },
      { id: "intro",        label: "Intro paragraph", multiline: true, wired: true,
        default: "We started KORE because the closet was full and nothing fit the life inside it. We make clothes for the people who already know what they want — and for the ones learning to." },
      { id: "sign.title",   label: "Sign-the-book — title", default: "Add your name to the principles. Hold the house to them.", wired: true },
    ],
  },
  {
    id: "atelier",
    label: "Atelier",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow", default: "The Atelier", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "Every KORE piece carries its maker. Four houses, three continents, paid above market." },
      { id: "intro", label: "Intro paragraph", multiline: true, wired: true,
        default: "We work with four houses across three continents — small, family-run. We tell you which one made what." },
      { id: "quote", label: "Closing quote", multiline: true, wired: true,
        default: "We don't subcontract. We don't hide. The address of every workshop is on the inside seam." },
    ],
  },
  {
    id: "membership",
    label: "Membership",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow", default: "Membership", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "A small, private membership for the people who own their wardrobe — and want it to last." },
    ],
  },
  // Pages registered for visibility — wire blocks here as they're requested.
  { id: "collection", label: "Collection", group: "Commerce", blocks: [] },
  { id: "inventory",  label: "Inventory",  group: "Commerce", blocks: [] },
  { id: "system",     label: "System",     group: "Marketing", blocks: [] },
  { id: "journal",    label: "Journal",    group: "Editorial", blocks: [] },
  { id: "concierge",  label: "Concierge",  group: "Agent",     blocks: [] },
  { id: "contact",    label: "Contact",    group: "Marketing", blocks: [] },
  { id: "login",      label: "Login",      group: "Account",   blocks: [] },
  { id: "dashboard",  label: "My Space",   group: "Account",   blocks: [] },
  { id: "cart",       label: "Bag",        group: "Commerce",  blocks: [] },
  { id: "checkout",   label: "Checkout",   group: "Commerce",  blocks: [] },
];

export function pageKeys(): string[] {
  return PAGES.map((p) => `page:${p.id}`);
}

export function findPage(id: string): PageDef | undefined {
  return PAGES.find((p) => p.id === id);
}
