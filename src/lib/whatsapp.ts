// Free-tier WhatsApp handoff. Just builds wa.me deep links — no API, no cost.

export type WhatsAppConfig = {
  number: string;   // digits only, no leading +
  greeting?: string;
};

export function buildWhatsAppUrl(cfg: WhatsAppConfig, message?: string): string | null {
  const digits = (cfg.number || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const text = (message ?? cfg.greeting ?? "Hi KORE — I'd like to talk to the atelier.").trim();
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function summarizeForHandoff(opts: {
  context?: string;
  conversation?: { role: string; content: string }[];
  agentName?: string;
}): string {
  const lines: string[] = [];
  lines.push("Hi KORE — handing over from the site.");
  if (opts.context) lines.push("", `Context: ${opts.context}`);
  if (opts.conversation && opts.conversation.length) {
    lines.push("", `Recent chat with ${opts.agentName || "the concierge"}:`);
    for (const m of opts.conversation.slice(-6)) {
      const who = m.role === "user" ? "Me" : (opts.agentName || "Concierge");
      lines.push(`— ${who}: ${m.content.slice(0, 220)}`);
    }
  }
  return lines.join("\n");
}
