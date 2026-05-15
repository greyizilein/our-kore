import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { supabase } from "@/integrations/kore-supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: Page,
  head: () => ({ meta: [{ title: "Forgot password — KORE" }] }),
});

function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <SiteShell>
      <div className="max-w-md mx-auto px-6 py-24">
        <p className="text-xs tracking-[0.2em] uppercase text-accent mb-4">Reset</p>
        <h1 className="font-display text-4xl font-light mb-2">Forgot <em>Password</em></h1>
        <p className="text-sm text-muted-foreground mb-10">Enter your email and we'll send a reset link.</p>

        {sent ? (
          <div className="px-4 py-3 border border-accent/30 bg-accent/10 text-sm text-accent">
            Check your inbox for a reset link.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            {error && <div className="px-4 py-3 border border-destructive/30 bg-destructive/10 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none"
                placeholder="you@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent text-accent-foreground text-sm tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Send reset link →"}
            </button>
          </form>
        )}

        <div className="mt-8 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">← Back to sign in</Link>
        </div>
      </div>
    </SiteShell>
  );
}
