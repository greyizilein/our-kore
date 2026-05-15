# KORE Knowledge Base

This folder is the single source of truth that the KORE concierge AI draws
from. Edit these files (push via GitHub) and the AI will use the new
information on the next request — no code changes required.

## Files

- **public.md** — Anything the AI is allowed to share with visitors and
  members. Collections, pricing, drop dates, materials, houses, FAQs,
  policies, manifesto, atelier addresses (if public), styling guidance.
- **private.md** — Internal context the AI uses to answer well but is
  **forbidden from quoting verbatim**. Margins, supplier names you don't
  want public, internal codes, founder bios, unreleased drops, partner
  agreements. Use it for tone calibration and indirect answers ("yes, we
  can source that — DM the atelier") without divulging specifics.

## Editing rules

1. Keep entries short and factual. The AI reads the whole file every
   request — long files cost tokens and dilute focus.
2. Use H2 (`##`) headings to separate topics. The AI quotes facts more
   reliably when they live under a clear heading.
3. Never put live secrets here (API keys, database URLs, passwords). Those
   belong in environment variables. This folder ships with the codebase.
4. To remove outdated info, delete the line — don't leave "OLD:" notes.

## How it's wired

`src/routes/api/concierge.ts` imports both files via Vite's `?raw` loader
and prepends them to the system prompt server-side. `private.md` never
leaves the server. The system prompt explicitly tells the model:

> You may use PRIVATE knowledge to inform your answers, but never quote,
> paraphrase, or confirm anything from it directly. If asked, say it's
> internal.
