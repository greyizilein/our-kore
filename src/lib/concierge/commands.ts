export type SlashCommand = {
  name: string;
  hint: string;
  description: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "/draw", hint: "/draw <prompt>", description: "Force the agent to sketch / render an image." },
  { name: "/clear", hint: "/clear", description: "Reset the conversation." },
  { name: "/save", hint: "/save", description: "Download the chat as a Markdown file." },
  { name: "/help", hint: "/help", description: "Open the shortcuts & commands panel." },
];

export const MENTIONS = [
  { name: "@kore", description: "Address the agent directly." },
  { name: "@me", description: "Reference yourself in the prompt." },
];

export const TAGS = [
  { name: "#fit", description: "Sizing, measurements, body & posture." },
  { name: "#fabric", description: "Material, weight, drape, finish." },
  { name: "#capsule", description: "Multi-piece outfit / wardrobe planning." },
  { name: "#styling", description: "Pairings, colourways, occasion." },
  { name: "#order", description: "About an existing or upcoming order." },
];

export type Suggestion = { value: string; description: string };

export type ActiveTrigger =
  | { kind: "slash"; query: string; start: number }
  | { kind: "mention"; query: string; start: number }
  | { kind: "tag"; query: string; start: number }
  | null;

/** Detect whether the cursor sits inside a /, @ or # token. */
export function detectTrigger(text: string, caret: number): ActiveTrigger {
  const upto = text.slice(0, caret);
  const match = upto.match(/(^|\s)([/@#])([\w-]*)$/);
  if (!match) return null;
  const start = caret - match[2].length - match[3].length;
  const query = match[3].toLowerCase();
  if (match[2] === "/") return { kind: "slash", query, start };
  if (match[2] === "@") return { kind: "mention", query, start };
  return { kind: "tag", query, start };
}

export function suggestionsFor(trigger: ActiveTrigger): Suggestion[] {
  if (!trigger) return [];
  const q = trigger.query;
  if (trigger.kind === "slash") {
    return SLASH_COMMANDS
      .filter((c) => c.name.slice(1).startsWith(q))
      .map((c) => ({ value: c.name, description: c.description }));
  }
  if (trigger.kind === "mention") {
    return MENTIONS
      .filter((m) => m.name.slice(1).startsWith(q))
      .map((m) => ({ value: m.name, description: m.description }));
  }
  return TAGS
    .filter((t) => t.name.slice(1).startsWith(q))
    .map((t) => ({ value: t.name, description: t.description }));
}

/** Replace the active trigger token in `text` with `value` + a trailing space. */
export function applySuggestion(text: string, trigger: ActiveTrigger, value: string): { text: string; caret: number } {
  if (!trigger) return { text, caret: text.length };
  const before = text.slice(0, trigger.start);
  // length of the trigger token in source = sigil + query
  const tokenLen = 1 + trigger.query.length;
  const after = text.slice(trigger.start + tokenLen);
  const inserted = `${value} `;
  const next = before + inserted + after;
  return { text: next, caret: before.length + inserted.length };
}

export function extractTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(?:^|\s)#([\w-]+)/g)) out.add(m[1].toLowerCase());
  return [...out];
}

export function stripLeadingCommand(text: string): { command: string | null; rest: string } {
  const m = text.match(/^\/(\w+)\s*(.*)$/s);
  if (!m) return { command: null, rest: text };
  return { command: "/" + m[1].toLowerCase(), rest: m[2] };
}
