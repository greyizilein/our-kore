import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { ThemeSwitch } from "@/components/chrome/theme-switch";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import {
  adminWhoAmI, adminStats, adminListOrders, adminListMembers,
  adminListProducts, adminUpsertProduct, adminDeleteProduct, adminExportAll,
  adminUpsertInventory, adminDeleteInventoryItem, getInventory,
  adminListMemberPieces, adminUpsertMemberPiece, adminDeleteMemberPiece,
} from "@/lib/admin.functions";
import {
  adminListSiteContent, adminUpsertSiteContent,
  getSiteSettings, adminUpsertSiteSetting,
  adminListAnnouncements, adminUpsertAnnouncement, adminDeleteAnnouncement,
} from "@/lib/cms.functions";
import { COLLECTIONS, DEFAULT_COLLECTIONS, mergeCollections, type CollectionSet } from "@/lib/collections";
import { getSiteContent } from "@/lib/cms.functions";
import {
  adminListJournalPosts, adminUpsertJournalPost, adminDeleteJournalPost,
  adminUploadJournalImage, type JournalPost,
} from "@/lib/journal.functions";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { PagesAdmin } from "@/components/admin/pages-panel";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — KORE" }] }),
});

type Panel = "overview" | "orders" | "members" | "products" | "inventory" | "pieces" | "collections" | "pages" | "site" | "announcements" | "pricing" | "revenue" | "settings" | "journal" | "knowledge" | "whatsapp";

const NAV: { id: Panel; label: string; icon: string; group: string }[] = [
  { id: "overview",     label: "Overview",     icon: "◈", group: "Overview" },
  { id: "products",     label: "Products",     icon: "◻", group: "Store" },
  { id: "inventory",    label: "Inventory",    icon: "▤", group: "Store" },
  { id: "orders",       label: "Orders",       icon: "◎", group: "Store" },
  { id: "members",      label: "Members",      icon: "◯", group: "People" },
  { id: "pieces",       label: "Pieces",       icon: "◫", group: "People" },
  { id: "collections",  label: "Collections",  icon: "▦", group: "Editorial" },
  { id: "pages",        label: "Pages",        icon: "✎", group: "Editorial" },
  { id: "journal",      label: "Journal (Blog)", icon: "✦", group: "Editorial" },
  { id: "site",         label: "Site Content", icon: "✎", group: "Editorial" },
  { id: "announcements",label: "Notices",      icon: "✦", group: "Editorial" },
  { id: "pricing",      label: "Pricing",      icon: "₦", group: "Editorial" },
  { id: "knowledge",    label: "AI Knowledge", icon: "✦", group: "Intelligence" },
  { id: "whatsapp",     label: "WhatsApp",     icon: "✦", group: "Intelligence" },
  { id: "revenue",      label: "Revenue",      icon: "◑", group: "Intelligence" },
  { id: "settings",     label: "Settings",     icon: "⚙", group: "Admin" },
];

function AdminPage() {
  const { user, session, signOut } = useAuth();
  const token = session?.access_token ?? "";
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>("overview");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const whoAmI = useServerFn(adminWhoAmI);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      // Wait briefly for session hydration; if still missing, deny.
      const t = setTimeout(() => { if (!cancelled) { setAllowed(false); setReason("No active session. Please sign in again."); } }, 1500);
      return () => { cancelled = true; clearTimeout(t); };
    }
    whoAmI({ data: { token } })
      .then((r) => { if (cancelled) return; setAllowed(!!r.admin); if (!r.admin) setReason(`Signed in as ${r.email}, but not on the admin list.`); })
      .catch((e) => { if (cancelled) return; setAllowed(false); setReason(e instanceof Error ? e.message : "Verification failed."); });
    return () => { cancelled = true; };
  }, [whoAmI, token]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };
  const onSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  if (allowed === null) {
    return <SiteShell><div className="min-h-[60vh] grid place-items-center text-xs tracking-[0.2em] uppercase text-muted-foreground">Verifying…</div></SiteShell>;
  }

  if (!allowed) {
    return (
      <SiteShell>
        <div className="min-h-[60vh] grid place-items-center px-6 text-center">
          <div className="max-w-md">
            <p className="text-[11px] tracking-[0.25em] uppercase text-accent mb-3">Restricted</p>
            <h1 className="font-display text-3xl font-light mb-4">Admin access required</h1>
            <p className="text-sm text-muted-foreground mb-2">{reason ?? "Your account is not on the admin list."}</p>
            <p className="text-xs text-muted-foreground mb-6">
              The first registered user becomes admin automatically; others are added via the <code className="text-foreground">KORE_ADMIN_EMAILS</code> secret (comma-separated).
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/dashboard" className="inline-block px-6 py-3 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">← My space</Link>
              <button onClick={onSignOut} className="inline-block px-6 py-3 border border-border text-[11px] tracking-[0.2em] uppercase">Sign out</button>
            </div>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell padTop={false}>
      <div className="grid md:grid-cols-[260px_minmax(0,1fr)] min-h-[100svh] pt-14 overflow-x-hidden">
        <aside className="hidden md:flex flex-col border-r border-border bg-muted/20 sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto">
          <div className="px-7 py-7 border-b border-border">
            <div className="font-display text-xl tracking-[0.1em]">KORE</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent mt-1">Atelier Console</div>
          </div>
          <nav className="flex-1 py-4">
            {NAV.map((item, i) => {
              const showGroup = i === 0 || NAV[i - 1].group !== item.group;
              return (
                <div key={item.id}>
                  {showGroup && <p className="px-7 pt-3 pb-1 text-[10px] tracking-[0.25em] uppercase text-muted-foreground/70">{item.group}</p>}
                  <button onClick={() => setPanel(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-7 py-2.5 text-xs tracking-[0.12em] uppercase transition-colors text-left",
                      panel === item.id
                        ? "text-accent border-l-2 border-accent bg-muted/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}>
                    <span>{item.icon}</span> {item.label}
                  </button>
                </div>
              );
            })}
          </nav>
          <div className="px-7 py-5 border-t border-border space-y-2">
            <Link to="/dashboard" className="block text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← My space</Link>
            <Link to="/" className="block text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← Site</Link>
            <button onClick={onSignOut} className="block text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-accent">Sign out</button>
          </div>
        </aside>

        <main className="flex flex-col min-w-0 overflow-x-hidden">
          <div className="hidden md:flex sticky top-14 z-10 bg-background/80 backdrop-blur border-b border-border h-12 items-center justify-between px-6 md:px-10">
            <p className="text-xs tracking-[0.18em] uppercase text-muted-foreground">{NAV.find((n) => n.id === panel)?.label}</p>
            <div className="flex items-center gap-4">
              <ThemeSwitch />
              <span className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
          </div>

          <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-border scrollbar-none max-w-[100vw]">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setPanel(n.id)}
                className={cn("px-3 py-1.5 text-[11px] tracking-[0.12em] uppercase whitespace-nowrap border",
                  panel === n.id ? "border-accent text-accent" : "border-border text-muted-foreground")}>
                {n.label}
              </button>
            ))}
          </div>

          <div className="px-3 sm:px-6 md:px-10 py-5 md:py-10 max-w-6xl w-full min-w-0 overflow-hidden">
            {panel === "overview" && <Overview token={token} setPanel={setPanel} />}
            {panel === "orders" && <Orders token={token} />}
            {panel === "members" && <Members token={token} />}
            {panel === "products" && <Products token={token} flash={flash} />}
            {panel === "inventory" && <Inventory token={token} flash={flash} />}
            {panel === "pieces" && <Pieces token={token} flash={flash} />}
            {panel === "collections" && <CollectionsAdmin token={token} flash={flash} />}
            {panel === "pages" && <PagesAdmin token={token} flash={flash} />}
            {panel === "site" && <SiteContent token={token} flash={flash} />}
            {panel === "announcements" && <Announcements token={token} flash={flash} />}
            {panel === "pricing" && <Pricing token={token} flash={flash} />}
            {panel === "revenue" && <Revenue token={token} />}
            {panel === "journal" && <JournalAdmin token={token} flash={flash} />}
            {panel === "knowledge" && <KnowledgeAdmin token={token} flash={flash} />}
            {panel === "whatsapp" && <WhatsAppAdmin token={token} flash={flash} />}
            {panel === "settings" && <Settings token={token} flash={flash} onSignOut={onSignOut} />}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-foreground text-background text-xs tracking-[0.15em] uppercase shadow-lg">
          {toast}
        </div>
      )}
    </SiteShell>
  );
}

// --- Panels ---------------------------------------------------------------

function Header({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="pb-4 mb-5 md:mb-8 border-b border-border">
      <p className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-accent mb-1.5 sm:mb-2">{eyebrow}</p>
      <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-light leading-tight">{title}</h2>
      {sub && <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">{sub}</p>}
    </div>
  );
}

function Overview({ token, setPanel }: { token: string; setPanel: (p: Panel) => void }) {
  const stats = useServerFn(adminStats);
  const ordersFn = useServerFn(adminListOrders);
  const [s, setS] = useState<{ orders: number; products: number; members: number; revenue: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  useEffect(() => {
    stats({ data: { token } }).then(setS).catch(() => setS({ orders: 0, products: 0, members: 0, revenue: 0 }));
    ordersFn({ data: { token } }).then((r) => setRecent(r.orders.slice(0, 8))).catch(() => setRecent([]));
  }, [stats, ordersFn, token]);
  const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

  const quickActions: { label: string; sub: string; panel: Panel; icon: string }[] = [
    { label: "Add product",     sub: "Catalogue piece",       panel: "products",     icon: "+" },
    { label: "Add inventory",   sub: "Stock units",           panel: "inventory",    icon: "▤" },
    { label: "New collection",  sub: "Gallery chapter",       panel: "collections",  icon: "▦" },
    { label: "Edit site copy",  sub: "Editorial blocks",      panel: "site",         icon: "✎" },
    { label: "Post a notice",   sub: "Member announcement",   panel: "announcements",icon: "✦" },
    { label: "Member piece",    sub: "Provenance record",     panel: "pieces",       icon: "◫" },
    { label: "Set pricing",     sub: "Subs & shipping",       panel: "pricing",      icon: "₦" },
    { label: "View members",    sub: "Roster",                panel: "members",      icon: "◯" },
  ];

  return (
    <div>
      <Header eyebrow="Atelier Console" title={<>Welcome, <em className="text-accent">Curator</em></>} sub="Operational view of the house." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8 md:mb-12">
        <Stat label="Members" value={s ? String(s.members) : "—"} />
        <Stat label="Orders" value={s ? String(s.orders) : "—"} />
        <Stat label="Products" value={s ? String(s.products) : "—"} />
        <Stat label="Revenue" value={s ? fmt(s.revenue) : "—"} />
      </div>

      <p className="text-[11px] tracking-[0.2em] uppercase text-accent mb-3">Quick Actions</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-10">
        {quickActions.map((a) => (
          <button
            key={a.panel + a.label}
            onClick={() => setPanel(a.panel)}
            className="group border border-border bg-muted/10 hover:border-accent hover:bg-muted/30 p-3 sm:p-4 text-left transition-colors min-h-[88px] flex flex-col"
          >
            <span className="text-accent text-base sm:text-lg mb-2">{a.icon}</span>
            <span className="text-[11px] sm:text-xs tracking-[0.12em] uppercase font-medium leading-tight">{a.label}</span>
            <span className="text-[10px] text-muted-foreground mt-auto pt-1">{a.sub}</span>
          </button>
        ))}
      </div>

      <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
        <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Recent Orders</p>
        <button onClick={() => setPanel("orders")} className="text-[11px] tracking-[0.2em] uppercase text-accent hover:underline">View all →</button>
      </div>
      {recent.length === 0 ? <p className="text-sm text-muted-foreground py-6">No orders yet.</p>
        : <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                <tr><th className="text-left p-3">Date</th><th className="text-left p-3">User</th><th className="text-left p-3">Status</th><th className="text-right p-3">Total</th></tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{o.created_at?.slice(0, 10)}</td>
                    <td className="p-3 font-mono text-xs truncate max-w-[200px]">{o.user_id ?? "—"}</td>
                    <td className="p-3"><span className="text-[10px] tracking-[0.18em] uppercase text-accent">{o.status ?? "—"}</span></td>
                    <td className="p-3 text-right">{o.total_amount ?? o.total ?? o.amount ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-6">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{label}</p>
      <div className="font-display text-3xl font-light text-accent italic">{value}</div>
    </div>
  );
}

function Orders({ token }: { token: string }) {
  const fn = useServerFn(adminListOrders);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fn({ data: { token } }).then((r) => setRows(r.orders)).finally(() => setLoading(false)); }, [fn, token]);
  return (
    <div>
      <Header eyebrow="Order Book" title={<>All <em>orders</em></>} />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : rows.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p>
        : <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                <tr><th className="text-left p-3">Date</th><th className="text-left p-3">User</th><th className="text-left p-3">Status</th><th className="text-right p-3">Total</th></tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{o.created_at?.slice(0, 10)}</td>
                    <td className="p-3 font-mono text-xs truncate max-w-[200px]">{o.user_id}</td>
                    <td className="p-3"><span className="text-[10px] tracking-[0.18em] uppercase text-accent">{o.status ?? "—"}</span></td>
                    <td className="p-3 text-right">{o.total_amount ?? o.total ?? o.amount ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

function Members({ token }: { token: string }) {
  const fn = useServerFn(adminListMembers);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fn({ data: { token } }).then((r) => setRows(r.members)).finally(() => setLoading(false)); }, [fn, token]);
  return (
    <div>
      <Header eyebrow="Membership" title={<>All <em>members</em></>} sub={`${rows.length} accounts`} />
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : <div className="border border-border overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                <tr><th className="text-left p-3">Email</th><th className="text-left p-3">Name</th><th className="text-left p-3">Joined</th><th className="text-left p-3">Last seen</th></tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3">{m.email ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.full_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.created_at?.slice(0, 10)}</td>
                    <td className="p-3 text-muted-foreground">{m.last_sign_in_at?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

function Products({ token, flash }: { token: string; flash: (m: string) => void }) {
  const list = useServerFn(adminListProducts);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = () => list({ data: { token } }).then((r) => setRows(r.products));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const save = async (p: any) => {
    try {
      await upsert({ data: { token, product: {
        id: p.id, series: p.series, name: p.name, price_ngn: Number(p.price_ngn),
        status: p.status, sort_order: Number(p.sort_order), description: p.description, material: p.material,
      }}});
      flash("Saved.");
      setEditing(null);
      reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try { await del({ data: { token, id } }); flash("Deleted."); reload(); }
    catch (e: any) { flash(e.message || "Delete failed"); }
  };

  return (
    <div>
      <Header eyebrow="Catalogue" title={<>Edit <em>products</em></>} />
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ series: "", name: "", price_ngn: 0, status: "draft", sort_order: rows.length + 1 })}
          className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">+ New product</button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            <tr><th className="text-left p-3">Series</th><th className="text-left p-3">Name</th><th className="text-right p-3">Price (NGN)</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.series}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right">{Number(p.price_ngn).toLocaleString()}</td>
                <td className="p-3"><span className="text-[10px] tracking-[0.18em] uppercase text-accent">{p.status}</span></td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => setEditing(p)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4">
          <div className="bg-background border border-border max-w-lg w-full p-6">
            <h3 className="font-display text-2xl font-light mb-6">{editing.id ? "Edit product" : "New product"}</h3>
            <div className="space-y-3">
              {(["series", "name", "description", "material"] as const).map((k) => (
                <Field key={k} label={k} value={editing[k] ?? ""} onChange={(v) => setEditing({ ...editing, [k]: v })} />
              ))}
              <Field label="Price (NGN minor)" type="number" value={String(editing.price_ngn ?? 0)} onChange={(v) => setEditing({ ...editing, price_ngn: v })} />
              <Field label="Sort order" type="number" value={String(editing.sort_order ?? 0)} onChange={(v) => setEditing({ ...editing, sort_order: v })} />
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border text-sm">
                  <option value="draft">draft</option>
                  <option value="live">live</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={() => save(editing)} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-border text-sm" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory panel
// ---------------------------------------------------------------------------

function toRoman(num: number): string {
  if (num <= 0) return "—";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) { result += syms[i]; num -= vals[i]; }
  }
  return result;
}

const BLANK_ITEM = {
  collection_slug: "forme-ss26",
  collection_name: "Forme SS/26",
  piece_slug: "",
  piece_name: "",
  piece_number: "",
  total_units: 0,
  sold_units: 0,
  booked_units: 0,
  status: "active",
  sort_order: 0,
};

function Inventory({ token, flash }: { token: string; flash: (m: string) => void }) {
  const getInv = useServerFn(getInventory);
  const upsert = useServerFn(adminUpsertInventory);
  const del = useServerFn(adminDeleteInventoryItem);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = () =>
    getInv({ data: {} as any }).then((r) =>
      setRows(
        r.items.map((it: any) => ({
          ...it,
          available_units: Math.max(0, (it.total_units ?? 0) - (it.sold_units ?? 0) - (it.booked_units ?? 0)),
        })),
      ),
    );

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const save = async (item: any) => {
    try {
      await upsert({
        data: {
          token,
          item: {
            id: item.id,
            collection_slug: item.collection_slug,
            collection_name: item.collection_name,
            piece_slug: item.piece_slug,
            piece_name: item.piece_name,
            piece_number: item.piece_number,
            total_units: Number(item.total_units),
            sold_units: Number(item.sold_units),
            booked_units: Number(item.booked_units),
            status: item.status,
            sort_order: Number(item.sort_order),
          },
        },
      });
      flash("Saved.");
      setEditing(null);
      reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this inventory item?")) return;
    try { await del({ data: { token, id } }); flash("Deleted."); reload(); }
    catch (e: any) { flash(e.message || "Delete failed"); }
  };

  return (
    <div>
      <Header eyebrow="Stock" title={<>Collection <em>inventory</em></>} sub="Track available, booked and sold units per piece. Changes reflect live on the Inventory page." />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ ...BLANK_ITEM, sort_order: rows.length + 1 })}
          className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase"
        >
          + Add piece
        </button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">N°</th>
              <th className="text-left p-3">Piece</th>
              <th className="text-center p-3">Total</th>
              <th className="text-center p-3">Sold</th>
              <th className="text-center p-3">Booked</th>
              <th className="text-center p-3">Available</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs text-muted-foreground">{r.piece_number || "—"}</td>
                <td className="p-3">{r.piece_name}</td>
                <td className="p-3 text-center">{r.total_units}</td>
                <td className="p-3 text-center">{r.sold_units}</td>
                <td className="p-3 text-center">{r.booked_units}</td>
                <td className="p-3 text-center font-mono text-accent tracking-[0.1em]">
                  {toRoman(r.available_units)}
                </td>
                <td className="p-3">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-accent">{r.status}</span>
                </td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => setEditing(r)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                  <button onClick={() => remove(r.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-sm text-muted-foreground text-center">No inventory yet. Add pieces above.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4 overflow-y-auto">
          <div className="bg-background border border-border max-w-lg w-full p-6 my-auto">
            <h3 className="font-display text-2xl font-light mb-6">{editing.id ? "Edit piece" : "Add piece"}</h3>
            <div className="space-y-3">
              <Field label="Collection name" value={editing.collection_name} onChange={(v) => setEditing({ ...editing, collection_name: v })} />
              <Field label="Collection slug" value={editing.collection_slug} onChange={(v) => setEditing({ ...editing, collection_slug: v })} />
              <Field label="Piece number" value={editing.piece_number} onChange={(v) => setEditing({ ...editing, piece_number: v })} />
              <Field label="Piece name" value={editing.piece_name} onChange={(v) => setEditing({ ...editing, piece_name: v })} />
              <Field label="Piece slug" value={editing.piece_slug} onChange={(v) => setEditing({ ...editing, piece_slug: v })} />
              <div className="grid grid-cols-3 gap-3">
                <Field label="Total units" type="number" value={String(editing.total_units)} onChange={(v) => setEditing({ ...editing, total_units: v })} />
                <Field label="Sold" type="number" value={String(editing.sold_units)} onChange={(v) => setEditing({ ...editing, sold_units: v })} />
                <Field label="Booked" type="number" value={String(editing.booked_units)} onChange={(v) => setEditing({ ...editing, booked_units: v })} />
              </div>
              <Field label="Sort order" type="number" value={String(editing.sort_order)} onChange={(v) => setEditing({ ...editing, sort_order: v })} />
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border text-sm">
                  <option value="active">active</option>
                  <option value="sold_out">sold_out</option>
                  <option value="coming_soon">coming_soon</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={() => save(editing)} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member Pieces panel
// ---------------------------------------------------------------------------

const PIECE_FIELDS: { key: string; label: string; type?: string; options?: string[] }[] = [
  { key: "code",              label: "Unique code (printed on label)" },
  { key: "piece_name",        label: "Piece name" },
  { key: "piece_number",      label: "Piece number" },
  { key: "collection",        label: "Collection" },
  { key: "edition_number",    label: "Edition number (e.g. 001 of 100)" },
  { key: "edition_total",     label: "Edition total", type: "number" },
  { key: "colorway",          label: "Colourway" },
  { key: "size",              label: "Size" },
  { key: "material",          label: "Material" },
  { key: "fabric_weight",     label: "Fabric weight" },
  { key: "fabric_composition",label: "Fabric composition" },
  { key: "origin",            label: "Origin" },
  { key: "workshop",          label: "Workshop" },
  { key: "artisan",           label: "Artisan" },
  { key: "thread_color",      label: "Thread colour" },
  { key: "thread_count",      label: "Thread count" },
  { key: "stitching_type",    label: "Stitching type" },
  { key: "stitching_density", label: "Stitching density" },
  { key: "buttons_material",  label: "Buttons material" },
  { key: "buttons_origin",    label: "Button origin" },
  { key: "lining",            label: "Lining" },
  { key: "hardware",          label: "Hardware" },
  { key: "production_date",   label: "Production date" },
  { key: "care_instructions", label: "Care instructions" },
  { key: "quality_notes",     label: "Quality notes" },
  { key: "admin_notes",       label: "Admin notes (internal)" },
];

const BLANK_PIECE = PIECE_FIELDS.reduce<any>((acc, f) => { acc[f.key] = ""; return acc; }, {});

function Pieces({ token, flash }: { token: string; flash: (m: string) => void }) {
  const listFn = useServerFn(adminListMemberPieces);
  const upsert = useServerFn(adminUpsertMemberPiece);
  const del = useServerFn(adminDeleteMemberPiece);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const reload = () => listFn({ data: { token } }).then((r) => setRows(r.pieces));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const save = async (p: any) => {
    try {
      await upsert({ data: { token, piece: p } });
      flash("Saved.");
      setEditing(null);
      reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this member piece record?")) return;
    try { await del({ data: { token, id } }); flash("Deleted."); reload(); }
    catch (e: any) { flash(e.message || "Delete failed"); }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.code?.toLowerCase().includes(q) || r.piece_name?.toLowerCase().includes(q) || r.collection?.toLowerCase().includes(q);
  });

  return (
    <div>
      <Header eyebrow="Member Records" title={<>Piece <em>records</em></>} sub="Each record is unlocked by the unique code printed on the garment label or receipt." />

      <div className="flex gap-3 justify-between mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code, piece, or collection…"
          className="flex-1 min-w-[200px] px-3 py-2 bg-background border border-border text-sm focus:border-accent outline-none"
        />
        <button
          onClick={() => setEditing({ ...BLANK_PIECE })}
          className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase whitespace-nowrap"
        >
          + New record
        </button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Piece</th>
              <th className="text-left p-3">Collection</th>
              <th className="text-left p-3">Edition</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs text-accent">{p.code || "—"}</td>
                <td className="p-3">{p.piece_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{p.collection || "—"}</td>
                <td className="p-3 text-muted-foreground">{p.edition_number || "—"}</td>
                <td className="p-3">
                  <span className={cn(
                    "text-[10px] tracking-[0.18em] uppercase",
                    p.user_id ? "text-emerald-400" : "text-muted-foreground",
                  )}>
                    {p.user_id ? "Claimed" : "Unclaimed"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => setEditing({ ...p })} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                  <button onClick={() => remove(p.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-sm text-muted-foreground text-center">
                {rows.length === 0 ? "No piece records yet. Add one above." : "No results for that search."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4 overflow-y-auto">
          <div className="bg-background border border-border max-w-2xl w-full p-6 my-6">
            <h3 className="font-display text-2xl font-light mb-6">
              {editing.id ? `Edit — ${editing.code || "piece"}` : "New member piece record"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {PIECE_FIELDS.map((f) => (
                f.type === "number" ? (
                  <Field key={f.key} label={f.label} type="number" value={String(editing[f.key] ?? "")} onChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                ) : (
                  <Field key={f.key} label={f.label} value={editing[f.key] ?? ""} onChange={(v) => setEditing({ ...editing, [f.key]: v })} />
                )
              ))}
            </div>
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={() => save(editing)} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">Save record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Revenue({ token }: { token: string }) {
  const stats = useServerFn(adminStats);
  const ordersFn = useServerFn(adminListOrders);
  const [s, setS] = useState<{ revenue: number; orders: number } | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    stats({ data: { token } }).then((r) => setS({ revenue: r.revenue, orders: r.orders })).catch(() => setS({ revenue: 0, orders: 0 }));
    ordersFn({ data: { token } }).then((r) => setRows(r.orders)).catch(() => setRows([]));
  }, [stats, ordersFn, token]);
  const fmt = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
  const paidOnly = rows.filter((o) => (o.payment_status ?? o.status) === "paid" || o.status === "delivered" || o.status === "shipped");
  const paidTotal = paidOnly.reduce<number>((sum, o) => sum + Number(o.total_amount ?? o.total ?? o.amount ?? 0), 0);
  return (
    <div>
      <Header eyebrow="Intelligence" title={<>Revenue <em>signal</em></>} sub="House-wide commercial pulse." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border mb-10">
        <Stat label="Total Revenue" value={s ? fmt(s.revenue) : "—"} />
        <Stat label="Confirmed Paid" value={fmt(paidTotal)} />
        <Stat label="Orders" value={s ? String(s.orders) : "—"} />
      </div>
      <p className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-4">Note</p>
      <p className="text-sm text-muted-foreground max-w-2xl">Revenue is summed from <code className="text-foreground">orders.total_amount</code> when present, falling back to <code className="text-foreground">total</code> or <code className="text-foreground">amount</code>. Wire to a payments provider to graduate this from indicative to authoritative.</p>
    </div>
  );
}

function Settings({ token, flash, onSignOut }: { token: string; flash: (m: string) => void; onSignOut: () => void }) {
  const exportFn = useServerFn(adminExportAll);
  const [busy, setBusy] = useState(false);

  const doExport = async () => {
    if (!confirm("SECURITY WARNING: You are about to export raw house data. Continue?")) return;
    setBusy(true);
    try {
      const data = await exportFn({ data: { token } });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `KORE-Export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      flash("Export downloaded.");
    } catch (e: any) { flash(e.message || "Export failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Header eyebrow="Admin" title={<>House <em>settings</em></>} />
      <div className="space-y-px bg-border">
        <div className="bg-background p-6">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">Session</p>
          <button onClick={onSignOut} className="px-4 py-2 border border-border text-[11px] tracking-[0.2em] uppercase hover:border-accent hover:text-accent">Sign out</button>
        </div>
        <div className="bg-background p-6">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent mb-3">Danger Zone</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-xl">Export every order, product, and member record as a single JSON file. RLS is bypassed via the service role — handle the file accordingly.</p>
          <button disabled={busy} onClick={doExport} className="px-5 py-2.5 border border-destructive text-destructive text-[11px] tracking-[0.2em] uppercase hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50">
            {busy ? "Exporting…" : "Export all database data →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Site Content panel — editorial copy per page (collections, hero, etc.)
// ---------------------------------------------------------------------------

type EditorialDraft = {
  intro: string;
  materials: string;
  construction: string;
  dates: string;
};

const DEFAULT_EDITORIAL: EditorialDraft = { intro: "", materials: "", construction: "", dates: "" };

function SiteContent({ token, flash }: { token: string; flash: (m: string) => void }) {
  const listFn = useServerFn(adminListSiteContent);
  const upsert = useServerFn(adminUpsertSiteContent);
  const [content, setContent] = useState<Record<string, any>>({});
  const [activeKey, setActiveKey] = useState<string>(`collection.${COLLECTIONS[0].slug}`);
  const [draft, setDraft] = useState<EditorialDraft>(DEFAULT_EDITORIAL);
  const [busy, setBusy] = useState(false);

  const reload = () => listFn({ data: { token } }).then((r) => {
    const map: Record<string, any> = {};
    (r.content as any[]).forEach((row: any) => { map[row.key] = row.value; });
    setContent(map);
  });

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  useEffect(() => {
    const v = content[activeKey];
    setDraft(v && typeof v === "object" ? { ...DEFAULT_EDITORIAL, ...v } : { ...DEFAULT_EDITORIAL });
  }, [activeKey, content]);

  const save = async () => {
    setBusy(true);
    try {
      await upsert({ data: { token, key: activeKey, value: draft } });
      flash("Saved — live on site.");
      await reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Header eyebrow="Editorial" title={<>Site <em>copy</em></>} sub="Edit per-collection editorial blocks. Saved values override the defaults shipped in code, live, instantly." />

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2 px-2">Collections</p>
          {COLLECTIONS.map((c) => {
            const key = `collection.${c.slug}`;
            const overridden = !!content[key];
            return (
              <button
                key={c.slug}
                onClick={() => setActiveKey(key)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm text-left border-l-2 transition-colors",
                  activeKey === key ? "border-accent text-accent bg-muted/30" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span>N° {c.numeral} — {c.name}</span>
                {overridden && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Overridden" />}
              </button>
            );
          })}
        </aside>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Dates / season</label>
            <input
              value={draft.dates}
              onChange={(e) => setDraft({ ...draft, dates: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border text-sm"
              placeholder="Showing May 2026 — August 2026"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Intro (Why {activeKey.split(".")[1]})</label>
            <textarea
              value={draft.intro}
              onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Materials</label>
            <textarea
              value={draft.materials}
              onChange={(e) => setDraft({ ...draft, materials: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Construction</label>
            <textarea
              value={draft.construction}
              onChange={(e) => setDraft({ ...draft, construction: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDraft({ ...DEFAULT_EDITORIAL })}
              className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground"
            >Clear</button>
            <button
              onClick={save}
              disabled={busy}
              className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50"
            >{busy ? "Saving…" : "Save & publish"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Announcements panel — drives the member-page notification dot
// ---------------------------------------------------------------------------

const BLANK_ANN: any = { title: "", body: "", audience: "all", published_at: "", expires_at: "" };

function Announcements({ token, flash }: { token: string; flash: (m: string) => void }) {
  const listFn = useServerFn(adminListAnnouncements);
  const upsert = useServerFn(adminUpsertAnnouncement);
  const del = useServerFn(adminDeleteAnnouncement);
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const reload = () => listFn({ data: { token } }).then((r) => setRows(r.announcements));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const save = async () => {
    try {
      const payload = {
        ...editing,
        published_at: editing.published_at || new Date().toISOString(),
        expires_at: editing.expires_at || null,
      };
      await upsert({ data: { token, announcement: payload } });
      flash("Notice published.");
      setEditing(null);
      reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    try { await del({ data: { token, id } }); flash("Deleted."); reload(); }
    catch (e: any) { flash(e.message || "Delete failed"); }
  };

  return (
    <div>
      <Header eyebrow="Notices" title={<>Member <em>announcements</em></>} sub="Each published notice triggers a notification dot on the member dashboard. Use sparingly." />
      <div className="flex justify-end mb-4">
        <button onClick={() => setEditing({ ...BLANK_ANN })} className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">+ New notice</button>
      </div>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/30 text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Audience</th>
              <th className="text-left p-3">Published</th>
              <th className="text-left p-3">Expires</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{a.title}</td>
                <td className="p-3"><span className="text-[10px] tracking-[0.18em] uppercase text-accent">{a.audience}</span></td>
                <td className="p-3 text-muted-foreground">{a.published_at?.slice(0, 10) ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{a.expires_at?.slice(0, 10) ?? "—"}</td>
                <td className="p-3 text-right space-x-3">
                  <button onClick={() => setEditing(a)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
                  <button onClick={() => remove(a.id)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-sm text-muted-foreground text-center">No notices yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-4 overflow-y-auto">
          <div className="bg-background border border-border max-w-lg w-full p-6 my-6">
            <h3 className="font-display text-2xl font-light mb-6">{editing.id ? "Edit notice" : "New notice"}</h3>
            <div className="space-y-3">
              <Field label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Body</label>
                <textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Audience</label>
                <select
                  value={editing.audience}
                  onChange={(e) => setEditing({ ...editing, audience: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border text-sm"
                >
                  <option value="all">All members</option>
                  <option value="members">Verified members only</option>
                  <option value="subscribers">Subscribers only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Publish at (blank = now)</label>
                  <input
                    type="datetime-local"
                    value={editing.published_at?.slice(0, 16) ?? ""}
                    onChange={(e) => setEditing({ ...editing, published_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className="w-full px-3 py-2 bg-background border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Expires (optional)</label>
                  <input
                    type="datetime-local"
                    value={editing.expires_at?.slice(0, 16) ?? ""}
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                    className="w-full px-3 py-2 bg-background border border-border text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={save} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">Publish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pricing panel — subscription, shipping, tax (lives in site_settings)
// ---------------------------------------------------------------------------

const PRICING_KEYS: { key: string; label: string; type: "number" | "text"; hint?: string }[] = [
  { key: "subscription.monthly_ngn",  label: "Subscription — monthly (₦)",  type: "number" },
  { key: "subscription.annual_ngn",   label: "Subscription — annual (₦)",   type: "number" },
  { key: "shipping.nigeria_ngn",      label: "Shipping — within Nigeria (₦)", type: "number" },
  { key: "shipping.international_ngn",label: "Shipping — international (₦)",  type: "number" },
  { key: "tax.percent",               label: "Tax / VAT (%)",               type: "number" },
  { key: "currency.display",          label: "Display currency",            type: "text", hint: "NGN, USD, EUR…" },
  { key: "member_code.prefix",        label: "Member code prefix",          type: "text", hint: "e.g. KORE-" },
];

function Pricing({ token, flash }: { token: string; flash: (m: string) => void }) {
  const getFn = useServerFn(getSiteSettings);
  const upsert = useServerFn(adminUpsertSiteSetting);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getFn({ data: {} as any }).then((r) => {
      const v: Record<string, string> = {};
      Object.entries(r.settings).forEach(([k, val]) => { v[k] = val == null ? "" : String(val); });
      setValues(v);
    });
  }, [getFn]);

  const save = async (key: string, type: "number" | "text") => {
    setBusy(key);
    try {
      const raw = values[key] ?? "";
      const value = type === "number" ? Number(raw) : raw;
      await upsert({ data: { token, key, value } });
      flash(`Saved ${key}.`);
    } catch (e: any) { flash(e.message || "Save failed"); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <Header eyebrow="Commerce" title={<>House <em>pricing</em></>} sub="Subscription, shipping and tax — written straight to Supabase. Wire to checkout in the next pass." />

      <div className="space-y-px bg-border max-w-2xl">
        {PRICING_KEYS.map((p) => (
          <div key={p.key} className="bg-background p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{p.label}</label>
              <input
                type={p.type === "number" ? "number" : "text"}
                value={values[p.key] ?? ""}
                onChange={(e) => setValues({ ...values, [p.key]: e.target.value })}
                placeholder={p.hint}
                className="w-full px-3 py-2 bg-background border border-border text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">{p.key}</p>
            </div>
            <button
              onClick={() => save(p.key, p.type)}
              disabled={busy === p.key}
              className="px-4 py-2 border border-border text-[11px] tracking-[0.2em] uppercase hover:border-accent hover:text-accent disabled:opacity-50"
            >{busy === p.key ? "…" : "Save"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collections admin — manage gallery sets (stored in site_content key
// `collections.list` as an array of override objects merged over defaults).
// ---------------------------------------------------------------------------

const BLANK_COLLECTION: any = {
  slug: "",
  numeral: "V",
  name: "",
  tagline: "",
  status: "atelier",
  cover: "",
  paletteHex: ["#1a1a1a", "#2d2d2d", "#4a4a4a", "#888888"],
  defaultEditorial: { intro: "", materials: "", construction: "", dates: "" },
  variants: [],
};

function CollectionsAdmin({ token, flash }: { token: string; flash: (m: string) => void }) {
  const fetchContent = useServerFn(getSiteContent);
  const upsert = useServerFn(adminUpsertSiteContent);
  const [list, setList] = useState<CollectionSet[]>(DEFAULT_COLLECTIONS);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => fetchContent({ data: { keys: ["collections.list"] } }).then((r) => {
    const v = (r.content as any)?.["collections.list"];
    setList(Array.isArray(v) ? mergeCollections(v) : DEFAULT_COLLECTIONS);
  });

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const persist = async (next: CollectionSet[]) => {
    setBusy(true);
    try {
      await upsert({ data: { token, key: "collections.list", value: next } });
      flash("Collections published.");
      setEditing(null);
      await reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const save = async (item: any) => {
    const palette = typeof item.paletteHex === "string"
      ? item.paletteHex.split(",").map((s: string) => s.trim()).filter(Boolean)
      : item.paletteHex;
    let variants = item.variants;
    if (typeof variants === "string") {
      try { variants = JSON.parse(variants); } catch { flash("Variants JSON is invalid."); return; }
    }
    if (!Array.isArray(variants)) variants = [];
    const cleaned: CollectionSet = {
      slug: item.slug.toLowerCase().trim(),
      numeral: item.numeral || "?",
      name: item.name,
      tagline: item.tagline ?? "",
      status: item.status,
      cover: item.cover || undefined,
      paletteHex: palette.length ? palette : BLANK_COLLECTION.paletteHex,
      defaultEditorial: { ...item.defaultEditorial },
      variants,
    };
    if (!cleaned.slug || !cleaned.name) { flash("Slug and name are required."); return; }
    const others = list.filter((c) => c.slug !== cleaned.slug);
    await persist([...others, cleaned]);
  };

  const remove = async (slug: string) => {
    if (!confirm(`Remove the "${slug}" collection from the site?`)) return;
    await persist(list.filter((c) => c.slug !== slug));
  };

  return (
    <div>
      <Header eyebrow="Gallery" title={<>Manage <em>collections</em></>} sub="Add a new chapter, edit an existing one, or hide one. Changes appear live on /collection." />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ ...BLANK_COLLECTION, paletteHex: BLANK_COLLECTION.paletteHex.join(", ") })}
          className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase"
        >+ New collection</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((c) => (
          <div key={c.slug} className="border border-border bg-muted/10 p-4 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.25em] uppercase text-accent">N° {c.numeral} — {c.status}</p>
                <h3 className="font-display text-xl truncate">{c.name}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">/{c.slug}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {c.paletteHex.slice(0, 4).map((hex) => (
                  <span key={hex} className="w-5 h-5 border border-border" style={{ background: hex }} />
                ))}
              </div>
            </div>
            {c.tagline && <p className="text-xs text-muted-foreground mt-2">{c.tagline}</p>}
            <div className="flex gap-3 mt-4 pt-3 border-t border-border">
              <button
                onClick={() => setEditing({ ...c, paletteHex: c.paletteHex.join(", ") })}
                className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground"
              >Edit</button>
              <button
                onClick={() => remove(c.slug)}
                className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-destructive ml-auto"
              >Remove</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-background border border-border max-w-2xl w-full p-5 sm:p-6 my-4">
            <h3 className="font-display text-xl sm:text-2xl font-light mb-5">{editing.id ? "Edit collection" : "New collection"}</h3>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Slug (e.g. forme)" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} />
                <Field label="Numeral (I, II, III…)" value={editing.numeral} onChange={(v) => setEditing({ ...editing, numeral: v })} />
              </div>
              <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Tagline (eyebrow on gallery wall)" value={editing.tagline} onChange={(v) => setEditing({ ...editing, tagline: v })} />
              <Field label="Cover image URL (optional)" value={editing.cover} onChange={(v) => setEditing({ ...editing, cover: v })} />
              <Field label="Palette hex codes (comma separated, 4 swatches)" value={editing.paletteHex} onChange={(v) => setEditing({ ...editing, paletteHex: v })} />
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border text-sm">
                  <option value="showing">Now showing</option>
                  <option value="next">Next</option>
                  <option value="atelier">In the atelier</option>
                  <option value="archived">Archive</option>
                </select>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-[11px] tracking-[0.2em] uppercase text-accent mb-3">Editorial</p>
                <Field label="Dates / season" value={editing.defaultEditorial.dates}
                  onChange={(v) => setEditing({ ...editing, defaultEditorial: { ...editing.defaultEditorial, dates: v } })} />
                {(["intro", "materials", "construction"] as const).map((k) => (
                  <div key={k} className="mt-3">
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">{k}</label>
                    <textarea
                      value={editing.defaultEditorial[k] ?? ""}
                      onChange={(e) => setEditing({ ...editing, defaultEditorial: { ...editing.defaultEditorial, [k]: e.target.value } })}
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed"
                    />
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] tracking-[0.2em] uppercase text-accent">Variants (sub-collections)</p>
                  <button
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(editing.variants) ? editing.variants : [];
                      const n = current.length + 1;
                      const roman = ["I","II","III","IV","V","VI","VII","VIII","IX","X"][n - 1] ?? String(n);
                      setEditing({
                        ...editing,
                        variants: [...current, {
                          slug: `${editing.slug || "set"}-${roman.toLowerCase()}`,
                          numeral: roman,
                          name: `${editing.name || "Set"} ${roman}`,
                          status: "atelier",
                          cover: "",
                          story: "",
                          materials: "",
                          dates: "",
                          pieceSlugs: [],
                        }],
                      });
                    }}
                    className="text-[10px] tracking-[0.2em] uppercase border border-border px-2 py-1 hover:bg-muted/30"
                  >+ Add variant</button>
                </div>
                <div className="space-y-3">
                  {(Array.isArray(editing.variants) ? editing.variants : []).map((v: any, idx: number) => {
                    const update = (patch: any) => {
                      const next = [...editing.variants];
                      next[idx] = { ...next[idx], ...patch };
                      setEditing({ ...editing, variants: next });
                    };
                    const remove = () => {
                      const next = editing.variants.filter((_: any, i: number) => i !== idx);
                      setEditing({ ...editing, variants: next });
                    };
                    return (
                      <div key={idx} className="border border-border/60 bg-muted/10 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Variant {idx + 1}</p>
                          <button type="button" onClick={remove} className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground hover:text-destructive">Remove</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Field label="Slug" value={v.slug ?? ""} onChange={(x) => update({ slug: x })} />
                          <Field label="Numeral" value={v.numeral ?? ""} onChange={(x) => update({ numeral: x })} />
                          <div>
                            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Status</label>
                            <select value={v.status ?? "atelier"} onChange={(e) => update({ status: e.target.value })}
                              className="w-full px-2 py-2 bg-background border border-border text-xs">
                              <option value="showing">Showing</option>
                              <option value="next">Next</option>
                              <option value="atelier">Atelier</option>
                              <option value="archived">Archive</option>
                            </select>
                          </div>
                        </div>
                        <Field label="Name" value={v.name ?? ""} onChange={(x) => update({ name: x })} />
                        <Field label="Cover image URL" value={v.cover ?? ""} onChange={(x) => update({ cover: x })} />
                        <Field label="Dates / season" value={v.dates ?? ""} onChange={(x) => update({ dates: x })} />
                        <div>
                          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Story</label>
                          <textarea value={v.story ?? ""} onChange={(e) => update({ story: e.target.value })} rows={3}
                            className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed" />
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Materials</label>
                          <textarea value={v.materials ?? ""} onChange={(e) => update({ materials: e.target.value })} rows={2}
                            className="w-full px-3 py-2 bg-background border border-border text-sm leading-relaxed" />
                        </div>
                        <Field
                          label="Piece slugs (comma separated product slugs)"
                          value={Array.isArray(v.pieceSlugs) ? v.pieceSlugs.join(", ") : (v.pieceSlugs ?? "")}
                          onChange={(x) => update({ pieceSlugs: x.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                        />
                      </div>
                    );
                  })}
                  {(!Array.isArray(editing.variants) || editing.variants.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">No variants yet. Add one above.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5 pt-4 border-t border-border">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={() => save(editing)} disabled={busy} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50">
                {busy ? "Saving…" : "Save & publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Journal (Blog) admin ---------------------------------------------------

function JournalAdmin({ token, flash }: { token: string; flash: (m: string) => void }) {
  const list = useServerFn(adminListJournalPosts);
  const upsert = useServerFn(adminUpsertJournalPost);
  const del = useServerFn(adminDeleteJournalPost);
  const upload = useServerFn(adminUploadJournalImage);
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [editing, setEditing] = useState<Partial<JournalPost> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => list({ data: { token } }).then((r) => setPosts(r.posts)).catch(() => setPosts([]));
  useEffect(() => { load(); }, [token]);

  const blank = (): Partial<JournalPost> => ({
    slug: "", title: "", excerpt: "", cover_url: "", category: "Note",
    body_md: "", tags: [], author: "KORE", published: false,
  });

  const save = async () => {
    if (!editing?.slug || !editing.title) { flash("Slug and title required"); return; }
    setBusy(true);
    try {
      await upsert({ data: { token, post: editing as any } });
      setEditing(null); await load(); flash("Saved");
    } catch (e: any) { flash(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const onUploadCover = async (file: File) => {
    const buf = await file.arrayBuffer();
    let bin = ""; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    const { url } = await upload({ data: { token, filename: file.name, data_base64: b64, content_type: file.type } });
    setEditing((p) => ({ ...(p ?? {}), cover_url: url }));
  };

  return (
    <div>
      <Header eyebrow="Editorial · Journal" title={<>The <em>Blog</em></>} sub="Write essays, drop notes, atelier dispatches. Markdown supported. This is the site's blog." />
      <div className="flex justify-between items-center mb-5">
        <p className="text-xs text-muted-foreground">{posts.length} post(s)</p>
        <button onClick={() => setEditing(blank())} className="px-4 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase">+ New post</button>
      </div>
      <div className="border border-border divide-y divide-border">
        {posts.length === 0 && <p className="p-6 text-sm text-muted-foreground">No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-display text-base truncate">{p.title} <span className="text-xs text-muted-foreground">/{p.slug}</span></p>
              <p className="text-xs text-muted-foreground">{p.category} · {p.published ? "Published" : "Draft"}{p.published_at ? ` · ${p.published_at.slice(0,10)}` : ""}</p>
            </div>
            <button onClick={() => setEditing(p)} className="text-[10px] tracking-[0.2em] uppercase text-accent">Edit</button>
            <button onClick={async () => { if (confirm(`Delete "${p.title}"?`)) { await del({ data: { token, id: p.id } }); load(); } }} className="text-[10px] tracking-[0.2em] uppercase text-destructive">Delete</button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto p-4 md:p-8">
          <div className="max-w-3xl mx-auto bg-background border border-border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-display text-2xl">{editing.id ? "Edit post" : "New post"}</h3>
              <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground">✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Title" value={editing.title ?? ""} onChange={(v) => setEditing({ ...editing, title: v })} />
              <Field label="Slug (url)" value={editing.slug ?? ""} onChange={(v) => setEditing({ ...editing, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
              <Field label="Category" value={editing.category ?? "Note"} onChange={(v) => setEditing({ ...editing, category: v })} />
              <Field label="Author" value={editing.author ?? "KORE"} onChange={(v) => setEditing({ ...editing, author: v })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Excerpt</label>
              <textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} rows={2} className="w-full bg-muted/40 border border-border px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Cover image</label>
              {editing.cover_url && <img src={editing.cover_url} alt="" className="w-full max-h-48 object-cover mb-2" />}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadCover(f); }} className="text-xs" />
              <input value={editing.cover_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} placeholder="…or paste a URL" className="w-full bg-muted/40 border border-border px-3 py-2 text-xs mt-1" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Body (Markdown)</label>
              <MarkdownEditor value={editing.body_md ?? ""} onChange={(v) => setEditing({ ...editing, body_md: v })} rows={18} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
              Published (visible on /journal)
            </label>
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">Cancel</button>
              <button onClick={save} disabled={busy} className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- AI Knowledge admin -----------------------------------------------------

function KnowledgeAdmin({ token, flash }: { token: string; flash: (m: string) => void }) {
  const listSC = useServerFn(adminListSiteContent);
  const upsert = useServerFn(adminUpsertSiteContent);
  const [pub, setPub] = useState("");
  const [priv, setPriv] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listSC({ data: { token } }).then((r) => {
      const rows: any[] = (r as any).content ?? [];
      const get = (k: string) => {
        const row = rows.find((x) => x.key === k);
        return (row?.value && typeof row.value === "object" && typeof row.value.body === "string") ? row.value.body : "";
      };
      setPub(get("knowledge:public"));
      setPriv(get("knowledge:private"));
    }).catch(() => {});
  }, [token]);

  const save = async (key: string, body: string) => {
    setBusy(true);
    try { await upsert({ data: { token, key, value: { body } } }); flash("Saved — AI updates within ~60s"); }
    catch (e: any) { flash(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Header eyebrow="Intelligence · Knowledge" title={<>What the <em>concierge</em> knows</>} sub="Public knowledge can be quoted to users. Private knowledge informs tone but is never quoted. The AI re-reads this within 60 seconds of saving." />
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] tracking-[0.2em] uppercase text-accent">Public knowledge</p>
            <button onClick={() => save("knowledge:public", pub)} disabled={busy} className="px-4 py-1.5 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50">Save public</button>
          </div>
          <MarkdownEditor value={pub} onChange={setPub} rows={20} placeholder="# Brand, collections, pieces, prices, policies…" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] tracking-[0.2em] uppercase text-accent">Private knowledge</p>
            <button onClick={() => save("knowledge:private", priv)} disabled={busy} className="px-4 py-1.5 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50">Save private</button>
          </div>
          <MarkdownEditor value={priv} onChange={setPriv} rows={16} placeholder="# Internal context — tone, supplier notes, things AI should know but never repeat" />
        </div>
      </div>
    </div>
  );
}

// --- WhatsApp settings admin -----------------------------------------------

function WhatsAppAdmin({ token, flash }: { token: string; flash: (m: string) => void }) {
  const getSet = useServerFn(getSiteSettings);
  const upsert = useServerFn(adminUpsertSiteSetting);
  const [number, setNumber] = useState("");
  const [greeting, setGreeting] = useState("");
  const [cta, setCta] = useState("Continue on WhatsApp");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSet({ data: {} as any }).then((r: any) => {
      const w = r.settings?.whatsapp ?? {};
      setNumber(w.number ?? ""); setGreeting(w.greeting ?? ""); setCta(w.cta ?? "Continue on WhatsApp");
    }).catch(() => {});
  }, []);

  const save = async () => {
    setBusy(true);
    try { await upsert({ data: { token, key: "whatsapp", value: { number: number.replace(/[^\d]/g, ""), greeting, cta } } }); flash("Saved"); }
    catch (e: any) { flash(e?.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <Header eyebrow="Intelligence · WhatsApp" title={<>WhatsApp <em>handoff</em></>} sub="Free wa.me deep links — no API. The site shows a 'Continue on WhatsApp' button on checkout, the concierge chat, and product pages. Customers tap, WhatsApp opens with a pre-filled message; you reply from your phone." />
      <div className="max-w-xl space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">WhatsApp number (international, digits only — e.g. 2348012345678)</label>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="2348012345678" className="w-full bg-muted/40 border border-border px-4 py-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Default greeting</label>
          <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} placeholder="Hi KORE — I'd like to talk to the atelier." className="w-full bg-muted/40 border border-border px-4 py-3 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Button label</label>
          <input value={cta} onChange={(e) => setCta(e.target.value)} className="w-full bg-muted/40 border border-border px-4 py-3 text-sm" />
        </div>
        <button onClick={save} disabled={busy || !number} className="px-5 py-2.5 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
        {!number && <p className="text-xs text-muted-foreground">Add a number to enable the WhatsApp buttons across the site.</p>}
      </div>
    </div>
  );
}
