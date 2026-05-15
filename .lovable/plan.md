## Goal

Fix the concierge chat so nothing is clipped on mobile or desktop, give users a smart scroll arrow that flips direction, let them download any image/sketch the agent produces, and add a lightweight command system (`/`, `@`, `#`) with the sidebar repurposed as the shortcut/command reference.

## Scope (frontend only — `src/routes/concierge.tsx` + small helpers)

### 1. Scroll behaviour
- Replace the current fixed `h-[100svh]` flex container with a layout that lets the chat scroll container own its overflow on every breakpoint (mobile, tablet, desktop). Header stays sticky, composer stays pinned, message list scrolls.
- Remove auto-scroll-on-every-update. Only auto-scroll when the user is already near the bottom (within ~80px). Otherwise leave their position alone.
- Add a floating scroll-jump button (bottom-right of the chat pane) that:
  - Points **down** when the user has scrolled up away from the latest message — clicking smooth-scrolls to bottom.
  - Points **up** when the user is at/near the bottom — clicking smooth-scrolls to top.
  - Hides while there's nothing to scroll.

### 2. Downloadable assets
- Every assistant message that includes an `imageUrl` (mobile inline + desktop canvas) gets a small "Download" affordance using an `<a download>` link with a generated filename (`kore-{slug}-{timestamp}.png`).
- Add a "Save chat" link in the sidebar that exports the current conversation as a `.md` file via a Blob download (no backend).

### 3. Commands & mentions
- Add a small parser that detects when the draft starts with `/`, contains `@`, or contains `#` and opens an inline popover above the input with filtered suggestions. Arrow keys + Enter to insert; Esc to close.
- Initial command set (client-side only, no new endpoints):
  - `/draw <prompt>` — force image generation (same as draw mode).
  - `/clear` — reset conversation to greeting.
  - `/save` — trigger chat export.
  - `/help` — scroll sidebar shortcuts into view (mobile: open as sheet).
  - `@kore` / `@me` — insert agent or user handle as a tag chip in the message.
  - `#fit`, `#fabric`, `#capsule`, `#styling` — tag the message; tags render as pills on the bubble and are stored on the `Msg` type as `tags: string[]`.
- Tags are visual + included in the outgoing prompt as `[tags: fit, fabric]` so the agent can pick them up; no schema change needed.

### 4. Sidebar repurpose (desktop) + mobile sheet
- Replace the current "Try" suggestion list with a **Shortcuts & Commands** reference grouped into:
  - Slash commands (with description)
  - Mentions (`@kore`, `@me`)
  - Tags (`#fit` etc.)
  - Keyboard (Enter to send, Shift+Enter newline, Cmd/Ctrl+K opens command palette, Esc closes)
- Keep 2–3 example prompts at the bottom under "Try".
- On mobile, expose the same content via a small "?" icon in the chat header that opens a Sheet (`@/components/ui/sheet`) so the help is reachable without a sidebar.

### 5. Polish
- Composer becomes `position: sticky bottom-0` inside the chat column with a subtle background blur so long messages never push it offscreen.
- Ensure the desktop canvas pane also scrolls independently when the image is tall.

## Technical notes

- All work stays in `src/routes/concierge.tsx` plus:
  - `src/components/concierge/scroll-jump.tsx` (new) — the smart arrow button, takes `containerRef` + renders direction.
  - `src/components/concierge/command-menu.tsx` (new) — popover list, pure presentational.
  - `src/lib/concierge/commands.ts` (new) — command/tag definitions + parser helpers.
- No new dependencies; reuse existing `Sheet`, `Popover`, and Tailwind tokens from `src/styles.css`.
- No backend changes, no DB changes, no changes to `/api/concierge` or `/api/concierge-image`. Tags are inlined into the existing prompt string.
- Type extension: `Msg` gets optional `tags?: string[]`.

## Out of scope

- Persisting chats to the database (current behaviour is in-memory; export covers the user's "download" need).
- Voice input, file attachments uploaded by the user, or multi-conversation history — can be follow-ups.
