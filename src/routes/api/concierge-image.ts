import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `You are KORE's design studio — you visualise garments, outfits, and styling boards for the member. When asked to design, sketch, draw, or visualise: produce ONE image. Aesthetic: editorial fashion photography or refined fashion illustration, neutral palette (bone, void, terre, ember, jade, iron, nuit), clean studio or soft natural light, considered composition. No text or logos in the image. Always return an image.`;

async function handle(request: Request) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { prompt, referenceImage } = (await request.json()) as {
      prompt: string;
      referenceImage?: string;
    };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userContent: unknown = referenceImage
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: referenceImage } },
        ]
      : prompt;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("image gen error", upstream.status, t);
      const msg =
        upstream.status === 429
          ? "Too many requests. Try again in a moment."
          : upstream.status === 402
            ? "AI credits exhausted."
            : "Couldn't generate that image.";
      return new Response(JSON.stringify({ error: msg }), {
        status: upstream.status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string; images?: { image_url?: { url?: string } }[] } }[];
    };
    const msg = data.choices?.[0]?.message;
    const imageUrl = msg?.images?.[0]?.image_url?.url ?? null;
    const text = msg?.content ?? "";

    return new Response(JSON.stringify({ imageUrl, text }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("concierge-image route error", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/concierge-image")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      OPTIONS: ({ request }) => handle(request),
    },
  },
});
