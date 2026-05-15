import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/chrome/site-shell";
import { submitContact } from "@/lib/admin.functions";

export const Route = createFileRoute("/contact")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Contact — KORE" },
      { name: "description", content: "Reach the atelier. We answer within a day." },
    ],
  }),
});

const CHANNELS = [
  { label: "Concierge", value: "concierge@kore.studio", note: "Orders, fit, returns." },
  { label: "Atelier", value: "atelier@kore.studio", note: "Custom, repair, press." },
  { label: "Lagos", value: "+234 700 KORE 01", note: "Mon — Fri · 10:00 — 18:00 WAT" },
  { label: "London", value: "+44 20 KORE 0001", note: "Mon — Fri · 10:00 — 18:00 GMT" },
];

function Page() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = useServerFn(submitContact);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setSending(true);
    setErr(null);
    try {
      await send({
        data: {
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          subject: (fd.get("subject") as string) || "",
          message: fd.get("message") as string,
        },
      });
      setSent(true);
      formRef.current.reset();
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong. Please email us directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <SiteShell>
      <section className="pt-28 px-6 lg:px-10 max-w-[1300px] mx-auto pb-32">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-24 border-b border-border/40 pb-16 mb-20">
          <div>
            <p className="text-xs tracking-[0.25em] uppercase text-accent mb-3">In conversation</p>
            <h1 className="font-display text-5xl md:text-7xl font-light leading-[0.92]">
              Write to <em className="italic">us</em>.
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-md">
              We answer every message inside a working day. No bots, no tickets — a person at the atelier.
            </p>
          </div>

          <ul className="space-y-8 self-end">
            {CHANNELS.map((c) => (
              <li key={c.label} className="border-t border-border/40 pt-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-1">{c.label}</p>
                <p className="font-display text-2xl">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
              </li>
            ))}
          </ul>
        </div>

        {sent ? (
          <div className="max-w-3xl border border-accent/30 bg-accent/5 px-8 py-10 text-center">
            <p className="font-display text-2xl mb-2">Received.</p>
            <p className="text-sm text-muted-foreground">We'll reply within a working day.</p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-[10px] uppercase tracking-[0.2em] text-accent hover:underline"
            >
              Send another →
            </button>
          </div>
        ) : (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="grid md:grid-cols-2 gap-6 max-w-3xl"
          >
            <Field label="Name" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <div className="md:col-span-2"><Field label="Subject" name="subject" /></div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Message *</label>
              <textarea
                name="message"
                required
                rows={6}
                className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none resize-none"
              />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {err
                  ? <span className="text-destructive">{err}</span>
                  : "By writing you accept our privacy notice."
                }
              </p>
              <button
                type="submit"
                disabled={sending}
                className="px-10 py-4 bg-accent text-accent-foreground text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send →"}
              </button>
            </div>
          </form>
        )}
      </section>
    </SiteShell>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}{required && " *"}</label>
      <input name={name} type={type} required={required} className="w-full bg-muted/40 border border-border px-4 py-3 text-sm focus:border-accent outline-none" />
    </div>
  );
}
