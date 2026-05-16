import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LazyVideo } from "@/components/chrome/lazy-video";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/kore-supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/login")({
  component: Page,
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/dashboard",
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — KORE" },
      { name: "description", content: "Members enter here." },
    ],
  }),
});

function Page() {
  const { redirect, mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: redirect });
  }, [session, redirect, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: redirect });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || null },
          },
        });
        if (error) throw error;
        setInfo("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Mobile: full-screen video background */}
      <div className="md:hidden absolute inset-0">
        <LazyVideo src="/media/silhouette.mp4" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-black/65" />
      </div>

      <div className="relative z-10 grid md:grid-cols-2 min-h-screen">
        {/* Desktop left panel: video */}
        <div className="relative hidden md:block bg-black overflow-hidden">
          <LazyVideo src="/media/silhouette.mp4" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-background/40" />
          <div className="absolute top-12 left-12 font-display text-7xl text-foreground/15">{mode === "signup" ? "02" : "01"}</div>
          <div className="absolute bottom-12 left-12 right-12">
            <p className="font-display italic text-2xl text-foreground/85 leading-snug mb-3">
              "Built for the body that moves with purpose."
            </p>
            <p className="text-xs tracking-[0.2em] uppercase text-accent">Forme · Collection I — 2026</p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center px-6 md:px-16 py-16">
          <p className="text-xs tracking-[0.2em] uppercase text-accent mb-4">Member Access</p>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-2">
            {mode === "signin" ? <>Sign <em>In</em></> : <>Create <em>Account</em></>}
          </h1>
          <p className="text-sm text-muted-foreground mb-10">
            {mode === "signin" ? (
              <>New to KORE?{" "}
                <button onClick={() => setMode("signup")} className="text-accent border-b border-accent/30 hover:border-accent pb-px">
                  Create an account →
                </button>
              </>
            ) : (
              <>Already a member?{" "}
                <button onClick={() => setMode("signin")} className="text-accent border-b border-accent/30 hover:border-accent pb-px">
                  Sign in →
                </button>
              </>
            )}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 border border-destructive/30 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 px-4 py-3 border border-accent/30 bg-accent/10 text-sm text-accent">
              {info}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                placeholder="you@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-accent-foreground text-sm tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {loading ? "..." : mode === "signin" ? "Sign In →" : "Create Account →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
