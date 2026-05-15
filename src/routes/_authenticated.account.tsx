import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { getMyProfile, updateMyProfile } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/account")({
  component: Page,
  head: () => ({ meta: [{ title: "Account — KORE" }] }),
});

type Profile = {
  full_name: string;
  phone: string;
  city: string;
  sizing: string;
  agent_name: string;
  agent_tone: string;
};

const EMPTY: Profile = {
  full_name: "",
  phone: "",
  city: "",
  sizing: "",
  agent_name: "KORE",
  agent_tone: "warm, witty, friend-like",
};

function Page() {
  const { user, session, signOut } = useAuth();
  const token = session?.access_token ?? "";
  const navigate = useNavigate();
  const load = useServerFn(getMyProfile);
  const save = useServerFn(updateMyProfile);

  const [p, setP] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    load({ data: { token } })
      .then((r) => {
        const m = (r.metadata ?? {}) as Record<string, string | undefined>;
        setP({
          full_name: m.full_name ?? "",
          phone: m.phone ?? "",
          city: m.city ?? "",
          sizing: m.sizing ?? "",
          agent_name: m.agent_name ?? "KORE",
          agent_tone: m.agent_tone ?? "warm, witty, friend-like",
        });
      })
      .catch(() => setMsg({ kind: "err", text: "Could not load your details." }))
      .finally(() => setLoading(false));
  }, [load, token]);

  const onSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await save({ data: { token, profile: p } });
      const m = (r.metadata ?? {}) as Record<string, string | undefined>;
      setP((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "string")) } as Profile));
      setMsg({ kind: "ok", text: "Saved. Taking you to My Space…" });
      // After saving, send the member into their space.
      setTimeout(() => navigate({ to: "/dashboard" }), 600);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Could not save. Please try again.";
      setMsg({ kind: "err", text });
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  const F = (label: string, key: keyof Profile, placeholder?: string, type: "text" | "tel" = "text") => (
    <div className="space-y-2">
      <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">{label}</label>
      <input
        type={type}
        value={p[key]}
        onChange={(e) => setP({ ...p, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none"
      />
    </div>
  );

  return (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-xs tracking-[0.2em] uppercase text-accent mb-4">Your account</p>
        <h1 className="font-display text-5xl font-light mb-2">Account</h1>
        <p className="text-sm text-muted-foreground mb-12">{user?.email}</p>

        <div className="space-y-10 max-w-lg">
          {msg && (
            <div className={`px-4 py-3 border text-sm ${msg.kind === "ok" ? "border-accent/30 bg-accent/10 text-accent" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
              {msg.text}
            </div>
          )}

          {loading ? (
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Loading…</p>
          ) : (
            <>
              <section className="space-y-5">
                <p className="text-[11px] tracking-[0.25em] uppercase text-accent">You</p>
                {F("Full name", "full_name", "Your name")}
                {F("Phone", "phone", "+234…", "tel")}
                {F("City", "city", "Lagos · London · Tokyo")}
                {F("Sizing", "sizing", "EU 40 · M · 32W")}
              </section>

              <section className="space-y-5 border-t border-border/40 pt-8">
                <p className="text-[11px] tracking-[0.25em] uppercase text-accent">Your Agent</p>
                {F("Agent name", "agent_name", "KORE")}
                {F("Agent tone", "agent_tone", "warm, witty, friend-like")}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This is how your private concierge introduces itself and the voice it uses with you.
                </p>
              </section>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-8 py-3 bg-accent text-accent-foreground text-sm tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={onSignOut}
                  className="px-8 py-3 border border-border text-sm tracking-[0.15em] uppercase hover:border-foreground transition-colors"
                >
                  Sign out
                </button>
              </div>
            </>
          )}

          <div className="pt-8 text-sm">
            <Link to="/collection" className="text-muted-foreground hover:text-foreground">→ Browse the collection</Link>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
