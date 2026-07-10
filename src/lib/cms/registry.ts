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
      { id: "tagline",       label: "Brand tagline",   multiline: true, wired: true,
        default: "Intelligent casualwear. Architectural tailoring that balances structure with function, precision with comfort. Limited by design. Permanent by intent." },
      { id: "copy.legal",   label: "Copyright line",  default: `© ${new Date().getFullYear()} KORE: Intelligent Casualwear`, wired: true },
      { id: "copy.signoff", label: "Sign-off line",   default: "WARDROBE DESIGN SYSTEMS", wired: true },
    ],
  },
  {
    id: "home",
    label: "Home",
    group: "Marketing",
    blocks: [
      { id: "hero.eyebrow",       label: "Hero eyebrow",              default: "SS / 26 — The Forme", wired: true },
      { id: "hero.title.1",       label: "Hero title — line 1",       default: "Intelligent", wired: true },
      { id: "hero.title.2",       label: "Hero title — line 2",       default: "casualwear.", wired: true },
      { id: "hero.subhead",       label: "Hero subhead",              multiline: true, wired: true,
        default: "Intelligent wardrobe systems: engineered for the people who already know what they want, and for the ones learning to." },
      { id: "hero.cta.primary",   label: "Primary CTA",               default: "Enter the collection", wired: true },
      { id: "hero.cta.secondary", label: "Secondary CTA",             default: "Speak to KORE", wired: true },
      { id: "pillar.1.title",     label: "Pillar 01 — title",         default: "Intelligent", wired: true },
      { id: "pillar.1.body",      label: "Pillar 01 — body",          multiline: true, wired: true,
        default: "Every piece is intentionally functional. Nothing exists for fashion's sake. Each resolves into the next." },
      { id: "pillar.2.title",     label: "Pillar 02 — title",         default: "Engineered", wired: true },
      { id: "pillar.2.body",      label: "Pillar 02 — body",          multiline: true, wired: true,
        default: "Cut, fabric and finish are tested for years of wear. Our form is the residue of function." },
      { id: "pillar.3.title",     label: "Pillar 03 — title",         default: "Luxurious", wired: true },
      { id: "pillar.3.body",      label: "Pillar 03 — body",          multiline: true, wired: true,
        default: "Each collection is released periodically. Each piece is intentional. User-Specific. Non-replicable." },
      { id: "membership.eyebrow", label: "Membership block — eyebrow", default: "Membership", wired: true },
      { id: "membership.title",   label: "Membership block — title",   multiline: true, wired: true,
        default: "For the wardrobe you'll keep ten years." },
      { id: "membership.body",    label: "Membership block — body",    multiline: true, wired: true,
        default: "Members access new collections, discounted repairs, recraftings upon damage, and access to special editions ever open to a global 25-member circle. All in fit sizes, personal preferences and the KORE-class taste." },
      { id: "membership.cta",     label: "Membership block — CTA",     default: "Become a member", wired: true },
      { id: "founder.quote",      label: "Founder quote",              multiline: true, wired: true,
        default: "Worth is derived from fit, material intelligence, construction, functional utility, and the KORE experience of ownership. Only 1 out of every 44 million people on Earth will ever own KORE, and we're fine with that. We don't intend to be popular; we want to sell perfectly good clothes that'll last a really long time." },
    ],
  },
  {
    id: "manifesto",
    label: "Manifesto",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow", label: "Hero eyebrow",        default: "The KORE Manifesto", wired: true },
      { id: "intro",        label: "Intro paragraph",     multiline: true, wired: true,
        default: "We started KORE because we couldn't find the right thing to wear. Most wardrobes are full but we all have our favourites and we like to wear them out until they're literally worn out—especially for guys who just reach and wear. So we decided to start making clothes for those people: the ones who play favourites and the ones who do but don't yet know why." },
      { id: "sign.title",   label: "Sign-the-book title", default: "Add your name to the principles. Hold the house to them.", wired: true },
    ],
  },
  {
    id: "atelier",
    label: "Atelier",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow",   default: "The Atelier", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle",  multiline: true, wired: true,
        default: "Every KORE piece carries its maker. Four houses, three continents, paid above market." },
      { id: "intro",         label: "Intro paragraph", multiline: true, wired: true,
        default: "Every KORE product is designed to fit. One variant of each collection is made available at a thin limit. Only about 1 in 44 million people will ever own a KORE.\n\nThe product information is only accessible to the KORE owner and can be passed down across generations. Once a variant has reached limit production number, we cease creating that KORE. But all created versions can be recreated over and over again with the exact same specifications.\n\nSo, a parent can will their KORE to their child, and the product can continually be redesigned to fit, throughout that child's lifetime." },
      { id: "quote",         label: "Closing quote",   multiline: true, wired: true,
        default: "KORE is ushering in a new era of ownership. Once you own your KORE, no one else will ever own an identical KORE product." },
    ],
  },
  {
    id: "membership",
    label: "Membership",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow", default: "Membership", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "The Circle & KORE memberships. Only for those who want to own their privilege, and want to state how they want to be known." },
    ],
  },
  {
    id: "system",
    label: "System",
    group: "Marketing",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow",   default: "The System — Forme · Collection I", wired: true },
      { id: "hero.title",    label: "Hero title",     multiline: true, wired: true,
        default: "Six pieces.\nOne logic." },
      { id: "hero.subtitle", label: "Hero subtitle",  multiline: true, wired: true,
        default: "A modular wardrobe architecture. Each piece resolves into the next. Built for longevity and permanence." },
      { id: "intro",         label: "Intro paragraph", multiline: true, wired: true,
        default: "Every piece in the Forme collection is resolved against the others — cut, weight, hem. Wear any combination." },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    group: "Marketing",
    blocks: [
      { id: "eyebrow",      label: "Eyebrow",         default: "In conversation", wired: true },
      { id: "title",        label: "Title",            default: "Reach the atelier.", wired: true },
      { id: "response",     label: "Response promise", default: "We answer within a day.", wired: true },
      { id: "form.heading", label: "Form heading",     default: "Send a message", wired: true },
      { id: "form.cta",     label: "Form CTA",         default: "Send", wired: true },
    ],
  },
  {
    id: "journal",
    label: "Journal",
    group: "Editorial",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow",  default: "The Journal", wired: true },
      { id: "hero.title",    label: "Hero title",    default: "Notes from the atelier.", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "Essays, dispatches, and thinking from inside the house." },
    ],
  },
  {
    id: "collection",
    label: "Collection",
    group: "Commerce",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow",  default: "The House — Collections", wired: true },
      { id: "hero.title",    label: "Hero title",    default: "A gallery of art, worn daily.", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "KORE offers four major collections with limited variants under each collection. Each variant is released to complement the other." },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    group: "Commerce",
    blocks: [
      { id: "hero.eyebrow",  label: "Hero eyebrow",  default: "Live Inventory", wired: true },
      { id: "hero.title",    label: "Hero title",    default: "Every unit. Accounted for.", wired: true },
      { id: "hero.subtitle", label: "Hero subtitle", multiline: true, wired: true,
        default: "Real-time stock. No restocks. No surprises." },
    ],
  },
  {
    id: "cart",
    label: "Bag",
    group: "Commerce",
    blocks: [
      { id: "eyebrow",     label: "Page eyebrow",    default: "Your Bag", wired: true },
      { id: "empty.title", label: "Empty bag title", default: "Nothing here yet.", wired: true },
      { id: "empty.body",  label: "Empty bag body",  default: "The collection is waiting.", wired: true },
      { id: "empty.cta",   label: "Empty bag CTA",   default: "Browse the collection", wired: true },
    ],
  },
  {
    id: "checkout",
    label: "Checkout",
    group: "Commerce",
    blocks: [
      { id: "eyebrow",    label: "Eyebrow",    default: "Checkout", wired: true },
      { id: "title",      label: "Title",      default: "Quiet, considered checkout.", wired: true },
      { id: "terms.text", label: "Terms text", multiline: true, wired: true,
        default: "By placing this order you agree to the KORE manifesto and our return policy." },
      { id: "pay.cta",    label: "Pay CTA",    default: "Pay with Paystack", wired: true },
    ],
  },
  {
    id: "concierge",
    label: "Concierge",
    group: "Agent",
    blocks: [
      { id: "welcome",      label: "Welcome message",   default: "Hello,", wired: true },
      { id: "welcome.sub",  label: "Welcome sub",       default: "How can I help you today?", wired: true },
      { id: "placeholder",  label: "Input placeholder", default: "Ask about fit, pieces, or your wardrobe…", wired: true },
    ],
  },
  {
    id: "login",
    label: "Login",
    group: "Account",
    blocks: [
      { id: "eyebrow",     label: "Eyebrow",      default: "Members", wired: true },
      { id: "title",       label: "Title",        default: "Enter here.", wired: true },
      { id: "subtitle",    label: "Subtitle",     multiline: true, wired: true,
        default: "Your space. Your wardrobe. Your KORE." },
      { id: "signin.cta",  label: "Sign in CTA",  default: "Sign in", wired: true },
      { id: "signup.cta",  label: "Sign up CTA",  default: "Create account", wired: true },
    ],
  },
  {
    id: "dashboard",
    label: "My Space",
    group: "Account",
    blocks: [
      { id: "welcome",      label: "Welcome greeting",  default: "Welcome back.", wired: true },
      { id: "overview.sub", label: "Overview subtitle", default: "Your KORE, at a glance.", wired: true },
      { id: "tier.upgrade", label: "Upgrade prompt",    default: "Unlock more with The Circle.", wired: true },
    ],
  },
];

export function pageKeys(): string[] {
  return PAGES.map((p) => `page:${p.id}`);
}

export function findPage(id: string): PageDef | undefined {
  return PAGES.find((p) => p.id === id);
}
