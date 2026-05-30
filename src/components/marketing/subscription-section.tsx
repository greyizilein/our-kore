import { useState } from "react";

export function SubscriptionSection({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setDone(true);
  };

  return (
    <div className={compact ? "py-16 px-6" : "py-24 px-6 max-w-2xl"}>
      <p className="text-xs tracking-[0.25em] uppercase text-accent mb-4">Subscribe</p>
      <h2 className="font-display text-3xl md:text-4xl font-light mb-3">
        Before the next collection.
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
        Early access, collection notes, and invitations — nothing else. One email per season.
      </p>

      {done ? (
        <p className="text-sm text-accent tracking-[0.1em]">You're on the list. See you next season.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex gap-0 max-w-sm">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-accent text-accent-foreground text-xs tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors border border-accent shrink-0"
          >
            Join
          </button>
        </form>
      )}
    </div>
  );
}
