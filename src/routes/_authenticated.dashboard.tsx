import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { useTheme, THEMES, type ThemeName, type Typeface } from "@/lib/theme/theme-context";
import { supabase } from "@/integrations/kore-supabase/client";
import { verifyMemberCode, adminWhoAmI, uploadAvatar } from "@/lib/admin.functions";
import { getActiveAnnouncements, markAllAnnouncementsRead } from "@/lib/cms.functions";
import { cn } from "@/lib/utils";
import { useSaved, saved, enrichSaved } from "@/lib/saved-store";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (search: Record<string, unknown>) => ({
    panel: (search.panel as Panel) || undefined,
  }),
  component: Dashboard,
  head: () => ({ meta: [{ title: "My Space — KORE" }] }),
});

type Panel = "overview" | "fit" | "orders" | "saved" | "agent" | "theme" | "account" | "piece";

const NAV: { id: Panel; label: string; icon: string; section: string }[] = [
  { id: "piece",    label: "My Piece",    icon: "▤",  section: "My Piece" },
  { id: "overview", label: "Overview",    icon: "◈",  section: "My Space" },
  { id: "fit",      label: "Fit Studio",  icon: "◎",  section: "My Space" },
  { id: "orders",   label: "My Orders",   icon: "◻",  section: "My Space" },
  { id: "saved",    label: "Saved Pieces",icon: "◇",  section: "My Space" },
  { id: "agent",    label: "My Agent",    icon: "✦",  section: "Intelligence" },
  { id: "theme",    label: "Theme",       icon: "◑",  section: "Preferences" },
  { id: "account",  label: "Account",     icon: "◯",  section: "Preferences" },
];

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  fit_size?: string | null;
  fit_chest?: number | null;
  fit_waist?: number | null;
  fit_hips?: number | null;
  fit_inseam?: number | null;
  fit_shoulder?: number | null;
  fit_height?: number | null;
  fit_notes?: string | null;
  agent_name?: string | null;
  agent_style?: string | null;
}

function Dashboard() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { panel: initialPanel } = Route.useSearch();
  const [panel, setPanel] = useState<Panel>(initialPanel ?? "overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notices, setNotices] = useState<{ items: any[]; unread: number }>({ items: [], unread: 0 });
  const [showNotices, setShowNotices] = useState(false);
  const savedItems = useSaved();
  const enrichedSaved = enrichSaved(savedItems);
  const whoAmI = useServerFn(adminWhoAmI);
  const fetchNotices = useServerFn(getActiveAnnouncements);
  const markRead = useServerFn(markAllAnnouncementsRead);
  const doUploadAvatar = useServerFn(uploadAvatar);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
    supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data ?? []); setOrderCount((data ?? []).length); });
  }, [user]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    whoAmI({ data: { token } }).then((r) => setIsAdmin(!!r.admin)).catch(() => setIsAdmin(false));
  }, [whoAmI, session?.access_token]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    fetchNotices({ data: { token } })
      .then((r) => setNotices({ items: r.announcements, unread: r.unread }))
      .catch(() => { /* table may not exist yet */ });
  }, [fetchNotices, session?.access_token]);

  const openNotices = async () => {
    setShowNotices(true);
    const token = session?.access_token;
    if (token && notices.unread > 0) {
      try { await markRead({ data: { token } }); setNotices((n) => ({ ...n, unread: 0 })); } catch { /* noop */ }
    }
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const onSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  // Advance to the next panel after a successful save (or wrap to overview).
  const advancePanel = () => {
    const idx = NAV.findIndex((n) => n.id === panel);
    const next = NAV[idx + 1] ?? NAV[0];
    setPanel(next.id);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const update = async (patch: Partial<Profile>) => {
    if (!user) return;
    const row = { id: user.id, email: user.email ?? null, ...patch };
    const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
    if (error) { flash(error.message); return; }
    setProfile((p) => ({ ...(p ?? { id: user.id, full_name: null, phone: null }), ...patch }));
    flash("Saved — next ↓");
    setTimeout(advancePanel, 700);
  };

  const handleAvatarUpload = async (file: File) => {
    const token = session?.access_token;
    if (!token) return;
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const b64 = btoa(binary);
    try {
      const res = await doUploadAvatar({ data: { token, filename: file.name, data_base64: b64, content_type: file.type } });
      setProfile((p) => ({ ...(p ?? { id: user!.id, full_name: null, phone: null }), avatar_url: res.url }));
      await supabase.auth.refreshSession();
      flash("Avatar updated");
    } catch (e: any) {
      flash(e.message ?? "Upload failed");
    }
  };

  const avatarUrl = profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined);
  const name = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Member";
  const initial = (name[0] || "K").toUpperCase();

  return (
    <SiteShell padTop={false}>
      <div className="grid md:grid-cols-[260px_minmax(0,1fr)] min-h-[100svh] pt-14 overflow-x-hidden">
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col border-r border-border bg-muted/20 sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto">
          <div className="px-7 py-7 border-b border-border">
            <div className="font-display text-xl tracking-[0.1em]">KORE</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-accent mt-1">My Space</div>
          </div>
          <div className="px-7 py-5 border-b border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent text-accent-foreground grid place-items-center font-display overflow-hidden flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                : initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{profile?.full_name || name}</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-accent flex items-center gap-2">
                Member
                {isAdmin && (
                  <Link to="/admin" className="px-1.5 py-0.5 border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors text-[9px]">ADMIN</Link>
                )}
              </div>
            </div>
            <NotifBell unread={notices.unread} onClick={openNotices} />
          </div>

          <nav className="flex-1 py-4">
            {NAV.map((item, i) => {
              const showHeader = i === 0 || NAV[i - 1].section !== item.section;
              return (
                <div key={item.id}>
                  {showHeader && (
                    <p className="px-7 pt-4 pb-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      {item.section}
                    </p>
                  )}
                  <button
                    onClick={() => setPanel(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-7 py-2.5 text-xs tracking-[0.12em] uppercase transition-colors text-left",
                      panel === item.id
                        ? "text-accent border-l-2 border-accent bg-muted/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                    )}
                  >
                    <span>{item.icon}</span> {item.label}
                  </button>
                </div>
              );
            })}
          </nav>
          <div className="px-7 py-5 border-t border-border space-y-2">
            {isAdmin && (
              <Link to="/admin" className="block text-[11px] tracking-[0.15em] uppercase text-accent hover:text-foreground">⌬ Atelier console</Link>
            )}
            <Link to="/" className="block text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← Back to site</Link>
            <button onClick={onSignOut} className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-accent">Sign out</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex flex-col min-w-0 overflow-x-hidden">
          {/* Mobile header — avatar + admin badge */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="h-9 w-9 rounded-full bg-accent text-accent-foreground grid place-items-center font-display text-sm overflow-hidden flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                : initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{profile?.full_name || name}</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-accent">Member</div>
            </div>
            <NotifBell unread={notices.unread} onClick={openNotices} />
            {isAdmin && (
              <Link to="/admin" className="px-2 py-1 border border-accent text-accent text-[10px] tracking-[0.18em] uppercase">⌬ Admin</Link>
            )}
          </div>

          {/* Mobile nav pills */}
          <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-3 border-b border-border scrollbar-none max-w-[100vw]">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setPanel(n.id)}
                className={cn(
                  "px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase whitespace-nowrap border",
                  panel === n.id ? "border-accent text-accent" : "border-border text-muted-foreground",
                )}>
                {n.label}
              </button>
            ))}
          </div>

          <div className="px-3 sm:px-6 md:px-10 py-5 md:py-10 max-w-5xl w-full min-w-0 overflow-hidden">
            {panel === "piece" && (
              <MemberPiecePanel token={session?.access_token ?? ""} />
            )}

            {panel === "overview" && (
              <Section eyebrow="Dashboard" title={<>Welcome, <em className="text-accent">{name}</em></>} sub={user?.email ?? ""}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
                  <button onClick={() => setPanel("orders")} className="text-left hover:bg-muted/40 transition-colors">
                    <Card label="Orders" value={String(orderCount)} sub="Total placed" />
                  </button>
                  <button onClick={() => setPanel("account")} className="text-left hover:bg-muted/40 transition-colors">
                    <Card label="Tier" value="Free" sub="Current plan" />
                  </button>
                  <button onClick={() => setPanel("fit")} className="text-left hover:bg-muted/40 transition-colors">
                    <Card label="Fit Profile" value={profile?.fit_size ?? "—"} sub="Standard size" />
                  </button>
                </div>
                {orderCount === 0 && enrichedSaved.length === 0 && (
                  <div className="mt-10 text-sm text-muted-foreground">
                    No activity yet.{" "}
                    <Link to="/collection" className="text-accent border-b border-accent/30 hover:border-accent">Start by exploring the collection →</Link>
                  </div>
                )}
                {enrichedSaved.length > 0 && (
                  <div className="mt-10">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                      Saved pieces — <button onClick={() => setPanel("saved")} className="text-accent hover:underline">view all →</button>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {enrichedSaved.slice(0, 3).map((s) => (
                        <Link key={`${s.slug}-${s.size}-${s.color}`} to="/product/$slug" params={{ slug: s.slug }} className="group block">
                          <div className="relative aspect-[3/4] bg-muted/30 overflow-hidden">
                            <img src={s.product.images[0]} alt={s.product.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                          </div>
                          <p className="mt-2 text-xs font-display truncate">{s.product.name}</p>
                          <p className="text-[10px] text-muted-foreground">{s.color} · {s.size}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {panel === "fit" && (
              <FitPanel profile={profile} onSave={update} />
            )}

            {panel === "orders" && (
              <Section eyebrow="Order History" title={<>My <em>Orders</em></>}>
                {orders.length === 0 ? (
                  <Empty icon="◻" title="No orders yet" cta={{ to: "/collection", label: "Explore collection →" }} />
                ) : (
                  <div className="space-y-px bg-border">
                    {orders.map((o: any) => {
                      const items: any[] = Array.isArray(o.items) ? o.items : [];
                      const date = o.created_at ? new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
                      return (
                        <div key={o.id} className="bg-background px-6 py-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-1">{date}</p>
                              <p className="font-display text-base">{items.length} piece{items.length !== 1 ? "s" : ""}</p>
                              {items.slice(0, 2).map((it: any, i: number) => (
                                <p key={i} className="text-xs text-muted-foreground mt-0.5">{it.slug ?? "—"} · {it.size} · {it.color}</p>
                              ))}
                              {items.length > 2 && <p className="text-xs text-muted-foreground">+{items.length - 2} more</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`inline-block px-2 py-0.5 text-[9px] tracking-[0.15em] uppercase border ${
                                o.status === "paid" ? "border-accent/40 text-accent" : "border-border text-muted-foreground"
                              }`}>
                                {o.status ?? "—"}
                              </span>
                              <p className="text-sm tabular-nums mt-2">
                                {o.currency ?? "EUR"} {((o.total_amount ?? 0) / 100).toFixed(0)}
                              </p>
                            </div>
                          </div>
                          {o.payment_ref && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-2">Ref: {o.payment_ref}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            )}

            {panel === "saved" && (
              <Section eyebrow="Saved Pieces" title={<>My <em>Wishlist</em></>}>
                {enrichedSaved.length === 0 ? (
                  <Empty icon="◇" title="Nothing saved yet" cta={{ to: "/collection", label: "Browse collection →" }} />
                ) : (
                  <div className="space-y-px bg-border">
                    {enrichedSaved.map((s, ix) => (
                      <div key={`${s.slug}-${s.size}-${s.color}`} className="bg-background flex items-center gap-4 px-5 py-4">
                        <Link to="/product/$slug" params={{ slug: s.slug }} className="relative w-14 aspect-[3/4] shrink-0 overflow-hidden bg-muted/30 block">
                          <img src={s.product.images[0]} alt={s.product.name} className="absolute inset-0 h-full w-full object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to="/product/$slug" params={{ slug: s.slug }} className="font-display text-base leading-tight hover:text-accent transition-colors">
                            {s.product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.color} · {s.size}</p>
                          <p className="text-xs tabular-nums mt-1">{formatPrice(s.product.price, s.product.currency)}</p>
                        </div>
                        <button
                          onClick={() => saved.remove(ix)}
                          className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          aria-label="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {panel === "agent" && (
              <AgentPanel profile={profile} onSave={update} />
            )}

            {panel === "theme" && (
              <ThemePanel theme={theme} flash={flash} />
            )}

            {panel === "account" && (
              <AccountPanel profile={profile} email={user?.email} avatarUrl={avatarUrl} onSave={update} onSignOut={onSignOut} onAvatarUpload={handleAvatarUpload} />
            )}
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-foreground text-background text-xs tracking-[0.15em] uppercase shadow-lg">
          {toast}
        </div>
      )}

      {showNotices && (
        <NoticeDrawer items={notices.items} onClose={() => setShowNotices(false)} />
      )}
    </SiteShell>
  );
}

function NotifBell({ unread, onClick }: { unread: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Notifications"
      className="relative h-9 w-9 grid place-items-center border border-border hover:border-accent hover:text-accent transition-colors text-sm"
    >
      ✦
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-accent text-accent-foreground text-[9px] font-mono leading-4 text-center rounded-full">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

function NoticeDrawer({ items, onClose }: { items: any[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md h-full bg-background border-l border-border overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-accent">Notices</p>
            <h3 className="font-display text-xl">From the atelier</h3>
          </div>
          <button onClick={onClose} className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">Close</button>
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">No notices.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((n: any) => (
              <li key={n.id} className="px-6 py-5">
                <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
                  {n.published_at ? new Date(n.published_at).toLocaleDateString() : ""} · {n.audience}
                </p>
                <p className="font-display text-base mt-1">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{n.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member Piece Panel
// ---------------------------------------------------------------------------

type PieceResult =
  | { type: "piece"; piece: any; pieces: any[] }
  | { type: "admin"; piece: null; pieces: any[] };

function MemberPiecePanel({ token }: { token: string }) {
  const verify = useServerFn(verifyMemberCode);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PieceResult | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<any | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await verify({ data: { token, code } });
      setResult(r as PieceResult);
      if (r.type === "piece") setSelectedPiece(r.piece);
    } catch (err: any) {
      setError(err.message ?? "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setSelectedPiece(null); setCode(""); setError(null); };

  if (!result) {
    return (
      <Section eyebrow="My Piece" title={<>Member <em>Record</em></>} sub="Enter the unique code from your garment label or receipt to access your piece record.">
        <form onSubmit={submit} className="max-w-md space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Piece Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. KORE-A1B2C3"
              className="w-full bg-muted/30 border border-border px-4 py-3 text-sm font-mono tracking-[0.1em] uppercase focus:border-accent outline-none"
              autoCapitalize="characters"
            />
            <p className="text-[10px] tracking-[0.15em] text-muted-foreground">
              Found beneath the barcode on your garment label or on your delivery documentation.
            </p>
          </div>
          {error && (
            <p className="text-xs text-destructive tracking-[0.1em]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-7 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "Verifying…" : "Unlock piece record →"}
          </button>
        </form>

        <div className="mt-12 border border-border/50 bg-muted/10 p-6 max-w-md">
          <p className="text-[11px] tracking-[0.2em] uppercase text-accent mb-3">How to find your code</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-accent">—</span> Scan the barcode on your garment's care label</li>
            <li className="flex gap-2"><span className="text-accent">—</span> Or type the code printed beneath the barcode</li>
            <li className="flex gap-2"><span className="text-accent">—</span> Alternatively, find it on your delivery card or receipt</li>
          </ul>
        </div>
      </Section>
    );
  }

  if (result.type === "admin") {
    return (
      <Section eyebrow="Admin View" title={<>All <em>Pieces</em></>} sub={`${result.pieces.length} member records`}>
        <button onClick={reset} className="mb-6 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← Back</button>
        {result.pieces.length === 0 ? (
          <p className="text-sm text-muted-foreground">No member pieces registered yet.</p>
        ) : selectedPiece ? (
          <>
            <button onClick={() => setSelectedPiece(null)} className="mb-6 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← All pieces</button>
            <PieceRecord piece={selectedPiece} />
          </>
        ) : (
          <div className="space-y-px bg-border">
            {result.pieces.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedPiece(p)}
                className="w-full bg-background px-6 py-4 text-left hover:bg-muted/30 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-display">{p.piece_name || "—"}</p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-0.5">
                    {p.collection} · {p.edition_number ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-accent">{p.code}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.user_id ? "Claimed" : "Unclaimed"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>
    );
  }

  return (
    <Section eyebrow="My Piece" title={<><em className="text-accent">{result.piece.piece_name}</em></>}>
      <button onClick={reset} className="mb-6 text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground">← Enter a different code</button>
      <PieceRecord piece={result.piece} />
    </Section>
  );
}

function PieceRecord({ piece }: { piece: any }) {
  const fields: { group: string; rows: { label: string; key: string }[] }[] = [
    {
      group: "Identity",
      rows: [
        { label: "Piece", key: "piece_name" },
        { label: "Number", key: "piece_number" },
        { label: "Collection", key: "collection" },
        { label: "Edition", key: "edition_number" },
        { label: "Edition size", key: "edition_total" },
      ],
    },
    {
      group: "Material & Fabrication",
      rows: [
        { label: "Colourway", key: "colorway" },
        { label: "Size", key: "size" },
        { label: "Material", key: "material" },
        { label: "Fabric weight", key: "fabric_weight" },
        { label: "Fabric composition", key: "fabric_composition" },
        { label: "Origin", key: "origin" },
        { label: "Workshop", key: "workshop" },
        { label: "Artisan", key: "artisan" },
      ],
    },
    {
      group: "Construction",
      rows: [
        { label: "Thread colour", key: "thread_color" },
        { label: "Thread count", key: "thread_count" },
        { label: "Stitching type", key: "stitching_type" },
        { label: "Stitching density", key: "stitching_density" },
        { label: "Buttons", key: "buttons_material" },
        { label: "Button origin", key: "buttons_origin" },
        { label: "Lining", key: "lining" },
        { label: "Hardware", key: "hardware" },
      ],
    },
    {
      group: "Provenance & Care",
      rows: [
        { label: "Production date", key: "production_date" },
        { label: "Care instructions", key: "care_instructions" },
        { label: "Quality notes", key: "quality_notes" },
      ],
    },
  ];

  return (
    <div>
      {/* Piece header card */}
      <div className="border border-border bg-muted/10 p-6 mb-8 flex flex-col sm:flex-row gap-6 sm:items-start">
        <div className="flex-1">
          <p className="text-[10px] tracking-[0.25em] uppercase text-accent mb-1">{piece.collection}</p>
          <h3 className="font-display text-2xl font-light mb-1">{piece.piece_name}</h3>
          <p className="text-sm text-muted-foreground">{piece.edition_number ?? ""}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-mono text-xs text-muted-foreground tracking-[0.12em]">{piece.code}</p>
          {piece.unlocked_at && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Registered{" "}
              {new Date(piece.unlocked_at).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Details sections */}
      <div className="space-y-8">
        {fields.map((group) => {
          const visible = group.rows.filter((r) => piece[r.key] != null && piece[r.key] !== "");
          if (visible.length === 0) return null;
          return (
            <div key={group.group}>
              <p className="text-[11px] tracking-[0.2em] uppercase text-accent mb-3">{group.group}</p>
              <div className="border border-border divide-y divide-border">
                {visible.map((row) => (
                  <div key={row.key} className="flex justify-between items-start px-5 py-3 gap-4">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground flex-shrink-0">
                      {row.label}
                    </span>
                    <span className="text-sm text-right">{String(piece[row.key])}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function Section({ eyebrow, title, sub, children }: { eyebrow: string; title: React.ReactNode; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="pb-4 mb-5 md:mb-8 border-b border-border">
        <p className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-accent mb-1.5 sm:mb-2">{eyebrow}</p>
        <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-light leading-tight">{title}</h2>
        {sub && <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-background p-6">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{label}</p>
      <div className="font-display text-3xl font-light"><em className="not-italic text-accent italic">{value}</em></div>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function Empty({ icon, title, cta }: { icon: string; title: string; cta: { to: string; label: string } }) {
  return (
    <div className="border border-border p-12 text-center">
      <div className="text-3xl text-accent font-display mb-3">{icon}</div>
      <p className="font-display text-xl mb-6">{title}</p>
      <Link to={cta.to} className="inline-block px-6 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90">
        {cta.label}
      </Link>
    </div>
  );
}

function FitPanel({ profile, onSave }: { profile: Profile | null; onSave: (p: Partial<Profile>) => void }) {
  const [f, setF] = useState({
    fit_size: profile?.fit_size ?? "M",
    fit_chest: profile?.fit_chest ?? null,
    fit_waist: profile?.fit_waist ?? null,
    fit_hips: profile?.fit_hips ?? null,
    fit_inseam: profile?.fit_inseam ?? null,
    fit_shoulder: profile?.fit_shoulder ?? null,
    fit_height: profile?.fit_height ?? null,
    fit_notes: profile?.fit_notes ?? "",
  });
  useEffect(() => {
    if (profile) setF({
      fit_size: profile.fit_size ?? "M",
      fit_chest: profile.fit_chest ?? null,
      fit_waist: profile.fit_waist ?? null,
      fit_hips: profile.fit_hips ?? null,
      fit_inseam: profile.fit_inseam ?? null,
      fit_shoulder: profile.fit_shoulder ?? null,
      fit_height: profile.fit_height ?? null,
      fit_notes: profile.fit_notes ?? "",
    });
  }, [profile]);

  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value === "" ? null : Number(e.target.value) }));

  const rows: { key: keyof typeof f; label: string }[] = [
    { key: "fit_chest", label: "Chest (cm)" },
    { key: "fit_waist", label: "Waist (cm)" },
    { key: "fit_hips", label: "Hips (cm)" },
    { key: "fit_inseam", label: "Inseam (cm)" },
    { key: "fit_shoulder", label: "Shoulder (cm)" },
    { key: "fit_height", label: "Height (cm)" },
  ];

  return (
    <Section eyebrow="Fit Studio" title={<>Your <em>Measurements</em></>} sub="Stored for every order. Update anytime — we use the latest version.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-border p-6 bg-muted/20">
          <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-5">Body Measurements</p>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-xs tracking-[0.1em] uppercase text-muted-foreground">Standard size</span>
            <select value={f.fit_size ?? "M"} onChange={(e) => setF((s) => ({ ...s, fit_size: e.target.value }))}
              className="bg-background border border-border px-2 py-1 text-sm">
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {rows.map((r) => (
            <div key={r.key} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
              <span className="text-xs tracking-[0.1em] uppercase text-muted-foreground">{r.label}</span>
              <input type="number" value={(f[r.key] as number | null) ?? ""} onChange={num(r.key)}
                className="w-24 bg-background border border-border px-2 py-1 text-sm text-right" placeholder="—" />
            </div>
          ))}
        </div>
        <div className="border border-border p-6 bg-muted/20">
          <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-5">Fit Preferences</p>
          <textarea value={f.fit_notes ?? ""} onChange={(e) => setF((s) => ({ ...s, fit_notes: e.target.value }))}
            placeholder="e.g. relaxed shoulder, longer hem, slim through torso..."
            className="w-full min-h-[180px] bg-background border border-border p-3 text-sm resize-none focus:border-accent outline-none" />
        </div>
      </div>
      <div className="mt-6">
        <button onClick={() => onSave(f)} className="px-7 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90">
          Save measurements →
        </button>
      </div>
    </Section>
  );
}

function AgentPanel({ profile, onSave }: { profile: Profile | null; onSave: (p: Partial<Profile>) => void }) {
  const [name, setName] = useState(profile?.agent_name ?? "KORE");
  const [style, setStyle] = useState(profile?.agent_style ?? "balanced");
  useEffect(() => {
    if (profile) {
      const n = profile.agent_name ?? "KORE";
      setName(n);
      setStyle(profile.agent_style ?? "balanced");
      // Sync the canonical agent name into localStorage so the concierge picks it up.
      import("@/lib/agent-name").then((m) => m.setAgentName(n));
    }
  }, [profile]);

  return (
    <Section eyebrow="My Agent" title={<>AI <em>Personalisation</em></>} sub="Your agent is a private KORE intelligence. Name it and tune its responses.">
      <div className="border border-border bg-muted/20 p-6 mb-6">
        <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-3">Agent Name</p>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="w-full bg-background border border-border px-3 py-2 text-sm focus:border-accent outline-none" />
        <div className="font-display text-3xl text-accent mt-4 tracking-[0.05em]">{name || "KORE"}</div>
      </div>
      <div className="border border-border bg-muted/20 p-6 mb-6">
        <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-3">Response Style</p>
        {["concise", "balanced", "detailed"].map((s) => (
          <label key={s} className="flex items-center gap-3 py-2 cursor-pointer">
            <input type="radio" name="style" value={s} checked={style === s} onChange={() => setStyle(s)} className="accent-accent" />
            <span className="text-sm capitalize">{s}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={() => {
          // Mirror to localStorage so concierge + chat widget pick up the new name instantly.
          import("@/lib/agent-name").then((m) => m.setAgentName(name));
          onSave({ agent_name: name, agent_style: style });
        }}
          className="px-7 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90">
          Save agent settings →
        </button>
        <Link to="/concierge" className="px-7 py-3 border border-border text-xs tracking-[0.15em] uppercase hover:border-foreground">
          Open agent ↗
        </Link>
      </div>
    </Section>
  );
}

function ThemePanel({ theme, flash }: { theme: ReturnType<typeof useTheme>; flash: (m: string) => void }) {
  const labels: Record<ThemeName, string> = {
    void: "VOID", bone: "BONE", iron: "IRON", ember: "EMBER", jade: "JADE",
    blanc: "BLANC", terre: "TERRE", nuit: "NUIT",
  };
  return (
    <Section eyebrow="Appearance" title={<>Choose your <em>Theme</em></>} sub="Switches accent, mode, typeface, and grain across the entire site. Saved to your browser.">
      <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-3">Accent</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
        {THEMES.map((t) => (
          <button key={t}
            onClick={() => { theme.set({ theme: t }); flash(`Theme: ${labels[t]}`); }}
            className={cn(
              "border p-4 text-left transition-colors relative",
              theme.theme === t ? "border-accent" : "border-border hover:border-foreground/50",
            )}>
            <div className={cn("h-14 mb-3 flex", `theme-${t}`)}>
              <div className="flex-1 bg-foreground" />
              <div className="flex-1 bg-background border-l border-border flex flex-col gap-1.5 p-2">
                <div className="h-1.5 bg-foreground/30" />
                <div className="h-1.5 bg-foreground/30 w-3/5" />
                <div className="h-2 w-2 rounded-full bg-accent mt-auto" />
              </div>
            </div>
            <p className="text-xs tracking-[0.18em] font-display">{labels[t]}</p>
            {theme.theme === t && <span className="absolute top-2 right-2 text-accent text-sm">✦</span>}
          </button>
        ))}
      </div>

      <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-3">Typeface</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {(["modern", "classic"] as Typeface[]).map((tf) => (
          <button key={tf} onClick={() => { theme.set({ typeface: tf }); flash(`Typeface: ${tf}`); }}
            className={cn(
              "border p-5 text-left transition-colors",
              theme.typeface === tf ? "border-accent" : "border-border hover:border-foreground/50",
            )}>
            <div className={cn("face-" + tf)}>
              <div className="font-display text-3xl mb-1">Aa — KORE</div>
              <div className="font-body text-xs text-muted-foreground tracking-wide">
                {tf === "modern" ? "Fraunces · Inter Tight" : "Bodoni Moda · Syne (V-Theme)"}
              </div>
            </div>
            <p className="mt-3 text-xs tracking-[0.18em] uppercase">
              {tf === "modern" ? "Modern" : "Classic"}
            </p>
          </button>
        ))}
      </div>

      <p className="text-[11px] tracking-[0.18em] uppercase text-accent mb-3">Settings</p>
      <div className="border border-border divide-y divide-border">
        <ThemeRow label="Dark mode" on={theme.mode === "dark"} onToggle={() => theme.set({ mode: theme.mode === "dark" ? "light" : "dark" })} />
        <ThemeRow label="Grain texture" on={theme.grain} onToggle={() => theme.set({ grain: !theme.grain })} />
        <ThemeRow label="Motion" on={theme.motion} onToggle={() => theme.set({ motion: !theme.motion })} />
      </div>
    </Section>
  );
}

function ThemeRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm">{label}</span>
      <button onClick={onToggle} className={cn(
        "w-11 h-6 rounded-full relative transition-colors",
        on ? "bg-accent" : "bg-muted border border-border",
      )}>
        <span className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background transition-transform",
          on && "translate-x-5",
        )} />
      </button>
    </div>
  );
}

function AccountPanel({ profile, email, avatarUrl, onSave, onSignOut, onAvatarUpload }: {
  profile: Profile | null;
  email?: string;
  avatarUrl?: string;
  onSave: (p: Partial<Profile>) => void;
  onSignOut: () => void;
  onAvatarUpload: (file: File) => void;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onAvatarUpload(file); } finally { setUploading(false); }
    e.target.value = "";
  };

  const name = profile?.full_name?.split(" ")[0] || email?.split("@")[0] || "K";
  const initial = (name[0] || "K").toUpperCase();

  return (
    <Section eyebrow="Your Account" title={<>My <em>Account</em></>} sub={email}>
      <div className="space-y-5 max-w-lg">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group">
            <div className="h-16 w-16 rounded-full bg-accent text-accent-foreground grid place-items-center font-display text-xl overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                : initial}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] tracking-widest uppercase">
              {uploading ? "…" : "Upload"}
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} disabled={uploading} />
          </label>
          <div>
            <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">Profile photo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to upload</p>
          </div>
        </div>
        <Field label="Full name" value={fullName} onChange={setFullName} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <div className="flex gap-3 pt-3">
          <button onClick={() => onSave({ full_name: fullName, phone })}
            className="px-7 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:opacity-90">
            Save
          </button>
          <button onClick={onSignOut}
            className="px-7 py-3 border border-border text-xs tracking-[0.15em] uppercase hover:border-foreground">
            Sign out
          </button>
        </div>
      </div>
    </Section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-muted/30 border border-border px-4 py-3 text-sm focus:border-accent outline-none" />
    </div>
  );
}
