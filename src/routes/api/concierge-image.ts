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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY missing" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const parts: unknown[] = [
      { text: `${SYSTEM_PROMPT}\n\n${prompt}` },
    ];
    if (referenceImage) {
      const [meta, b64] = referenceImage.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      parts.push({ inlineData: { mimeType, data: b64 } });
    }

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      },
    );

    if (!upstream.ok) {
      const t = await upstream.text();
      console.error("image gen error", upstream.status, t);
      const msg = upstream.status === 429
        ? "Too many requests. Try again in a moment."
        : "Couldn't generate that image.";
      return new Response(JSON.stringify({ error: msg }), {
        status: upstream.status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = (await upstream.json()) as {
      candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const responseParts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = responseParts.find((p) => p.inlineData);
    const imageUrl = imagePart?.inlineData
      ? `data:${imagePart.inlineData.mimeType ?? "image/png"};base64,${imagePart.inlineData.data}`
      : null;
    const text = responseParts.find((p) => p.text)?.text ?? "";

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
