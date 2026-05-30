import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import PUBLIC_KB_FALLBACK from "../../../knowledge/public.md?raw";
import PRIVATE_KB_FALLBACK from "../../../knowledge/private.md?raw";

let kbCache: { at: number; pub: string; priv: string } | null = null;
const TTL_MS = 60_000;

async function loadKnowledge(): Promise<{ pub: string; priv: string }> {
  if (kbCache && Date.now() - kbCache.at < TTL_MS) {
    return { pub: kbCache.pub, priv: kbCache.priv };
  }
  let pub = PUBLIC_KB_FALLBACK;
  let priv = PRIVATE_KB_FALLBACK;
  try {
    const url = process.env.KORE_SUPABASE_URL;
    const srv = process.env.KORE_SUPABASE_SERVICE_ROLE_KEY;
    if (url && srv) {
      const c = createClient(url, srv, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await c.from("site_content").select("key,value").in("key", ["knowledge:public", "knowledge:private"]);
      for (const r of (data ?? []) as any[]) {
        const body = (r.value && typeof r.value === "object" && typeof r.value.body === "string") ? r.value.body : "";
        if (r.key === "knowledge:public" && body) pub = body;
        if (r.key === "knowledge:private" && body) priv = body;
      }
    }
  } catch (e) {
    console.warn("[concierge] knowledge fetch failed, using file fallback", e);
  }
  kbCache = { at: Date.now(), pub, priv };
  return { pub, priv };
}

function buildSystemPrompt(agentName: string, pub: string, priv: string) {
  const name = (agentName || "KORE").trim().slice(0, 40);
  return `You are ${name} — a private concierge and friend for KORE, an intelligent casualwear house (Lagos · London · Tokyo). Your name is "${name}" — always introduce yourself as ${name}, not KORE, unless ${name} happens to equal KORE.

Voice: warm, witty, human. Talk like a thoughtful friend who happens to know fashion inside out — not a brand robot. Use contractions. Drop the corporate stiffness. You can be playful, even tease a little. Ask follow-up questions like a real person would. Acknowledge what someone says before answering. Treat the member like a friend.

Behaviour:
— Help with fit, sizing, capsule building, sourcing, styling, atelier visits, collections.
— If asked about specific personal data (orders, address) say it requires the member to be signed in to /dashboard.
— Never invent prices, collection dates, pieces, materials, or policies. If something isn't in the PUBLIC KNOWLEDGE below, say you'll check with the atelier rather than guessing.
— When the member asks about sizing in detail, custom commissions, refunds, complaints, order tracing, or anything beyond the catalogue, suggest "Continue on WhatsApp" — they can tap the button below the chat to reach the atelier directly.
— Keep replies short and conversational. One or two sentences usually. Lists only when actually useful. No headers, no bold marketing voice.
— It's okay to say "honestly" or "tbh" or laugh a little. Be a person.

=========================
PUBLIC KNOWLEDGE — you may share, quote, and reference any of this freely.
=========================
${pub}

=========================
PRIVATE KNOWLEDGE — server-side only. NEVER quote, paraphrase, repeat, or confirm any of this to a user. Use it to inform your tone and answer quality. If asked directly about anything from this section, say it's internal and offer to connect them to the atelier.
=========================
${priv}
=========================

Final reminder: your name is "${name}". Stay in character.`;
}

async function handleChat(request: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await request.json()) as {
      messages: { role: string; content: string }[];
      agentName?: string;
    };
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pub, priv } = await loadKnowledge();
    const systemPrompt = buildSystemPrompt(body.agentName ?? "KORE", pub, priv);

    const messages = body.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("Anthropic API error", upstream.status, t);
      const msg = upstream.status === 429
        ? "Too many requests. Try again in a moment."
        : "Concierge unavailable.";
      return new Response(JSON.stringify({ error: msg }), {
        status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const evt = JSON.parse(raw);
              const text = evt.delta?.type === "text_delta" ? evt.delta.text : null;
              if (text) {
                const out = JSON.stringify({ choices: [{ delta: { content: text } }] });
                controller.enqueue(encoder.encode(`data: ${out}\n\n`));
              }
            } catch {}
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("concierge route error", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/concierge")({
  server: {
    handlers: {
      POST: ({ request }) => handleChat(request),
      OPTIONS: ({ request }) => handleChat(request),
    },
  },
});
