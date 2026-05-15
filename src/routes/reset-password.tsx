import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell } from "@/components/chrome/site-shell";
import { supabase } from "@/integrations/kore-supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: Page,
  head: () => ({ meta: [{ title: "Reset password — KORE" }] }),
});

function Page() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate({ to: "/account" });
  };

  return (
    <SiteShell>
      <div className="max-w-md mx-auto px-6 py-24">
        <p className="text-xs tracking-[0.2em] uppercase text-accent mb-4">Reset</p>
        <h1 className="font-display text-4xl font-light mb-2">Set new <em>password</em></h1>
        <p className="text-sm text-muted-foreground mb-10">Choose a strong password.</p>

        <form onSubmit={onSubmit} className="space-y-5">
          {error && <div className="px-4 py-3 border border-destructive/30 bg-destructive/10 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-accent text-accent-foreground text-sm tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Update password →"}
          </button>
        </form>
      </div>
    </SiteShell>
  );
}
