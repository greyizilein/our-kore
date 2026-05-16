import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/chrome/site-header";
import { useAuth } from "@/lib/auth/auth-context";
import { useAgentName } from "@/lib/agent-name";
import { ScrollJump } from "@/components/concierge/scroll-jump";
import { CommandMenu } from "@/components/concierge/command-menu";
import {
  applySuggestion,
  detectTrigger,
  extractTags,
  stripLeadingCommand,
  suggestionsFor,
  SLASH_COMMANDS,
  MENTIONS,
  TAGS,
  type ActiveTrigger,
} from "@/lib/concierge/commands";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/kore-supabase/client";

export const Route = createFileRoute("/concierge")({
  component: Page,
  head: () => ({
    meta: [
      { title: "KORE Concierge — Your private agent" },
      { name: "description", content: "Chat. Design. Visualise. Your private wardrobe agent." },
    ],
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Msg = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  kind?: "text" | "image";
  tags?: string[];
};

type ChatSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ThemeConfig = {
  id: string;
  label: string;
  swatch: string;
  userBg?: string;
  userText?: string;
  agentBg?: string;
  agentText?: string;
  agentBorder?: string;
  accent?: string;
};

// ─── Theme presets ────────────────────────────────────────────────────────────

const CHAT_THEMES: ThemeConfig[] = [
  { id: "default", label: "Noir", swatch: "#27272a" },
  {
    id: "ember", label: "Ember", swatch: "#c2410c",
    userBg: "#7c2d12", userText: "#fff7ed",
    agentBg: "rgba(234,88,12,0.10)", agentText: "#ea580c", agentBorder: "rgba(234,88,12,0.28)",
    accent: "#ea580c",
  },
  {
    id: "sapphire", label: "Sapphire", swatch: "#1d4ed8",
    userBg: "#1e3a8a", userText: "#eff6ff",
    agentBg: "rgba(96,165,250,0.10)", agentText: "#60a5fa", agentBorder: "rgba(96,165,250,0.28)",
    accent: "#60a5fa",
  },
  {
    id: "sage", label: "Sage", swatch: "#15803d",
    userBg: "#14532d", userText: "#f0fdf4",
    agentBg: "rgba(74,222,128,0.10)", agentText: "#4ade80", agentBorder: "rgba(74,222,128,0.28)",
    accent: "#4ade80",
  },
  {
    id: "rose", label: "Rose", swatch: "#be185d",
    userBg: "#831843", userText: "#fdf2f8",
    agentBg: "rgba(244,114,182,0.10)", agentText: "#f472b6", agentBorder: "rgba(244,114,182,0.28)",
    accent: "#f472b6",
  },
  {
    id: "champagne", label: "Champagne", swatch: "#b45309",
    userBg: "#78350f", userText: "#fffbeb",
    agentBg: "rgba(217,119,6,0.10)", agentText: "#d97706", agentBorder: "rgba(217,119,6,0.28)",
    accent: "#d97706",
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const DRAW_TRIGGERS = ["draw", "sketch", "design", "visualise", "visualize", "render", "show me", "picture of", "image of", "generate"];
function detectDrawIntent(t: string) {
  const s = t.toLowerCase();
  return DRAW_TRIGGERS.some((k) => s.includes(k));
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "design";
}

function downloadBlob(filename: string, data: Blob) {
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ThemePicker({ current, onChange }: { current: string; onChange: (id: string) => void }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Chat theme</p>
      <div className="flex gap-2.5 flex-wrap">
        {CHAT_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            title={t.label}
            className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${current === t.id ? "border-foreground scale-110" : "border-border/40"}`}
            style={{ background: t.id === "default" ? "linear-gradient(135deg,#18181b,#3f3f46)" : t.swatch }}
          />
        ))}
      </div>
    </div>
  );
}

function ShortcutsPanel() {
  return (
    <div className="space-y-6 text-sm">
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Slash commands</p>
        <ul className="space-y-1.5">
          {SLASH_COMMANDS.map((c) => (
            <li key={c.name} className="flex items-baseline gap-3">
              <code className="font-mono text-foreground shrink-0">{c.hint}</code>
              <span className="text-xs text-muted-foreground">{c.description}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Mentions</p>
        <ul className="space-y-1.5">
          {MENTIONS.map((m) => (
            <li key={m.name} className="flex items-baseline gap-3">
              <code className="font-mono text-foreground shrink-0">{m.name}</code>
              <span className="text-xs text-muted-foreground">{m.description}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Tags</p>
        <ul className="space-y-1.5">
          {TAGS.map((t) => (
            <li key={t.name} className="flex items-baseline gap-3">
              <code className="font-mono text-foreground shrink-0">{t.name}</code>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent mb-2">Keyboard</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li><kbd className="font-mono text-foreground">Enter</kbd> — send</li>
          <li><kbd className="font-mono text-foreground">Shift + Enter</kbd> — new line</li>
          <li><kbd className="font-mono text-foreground">↑ ↓</kbd> + <kbd className="font-mono text-foreground">Enter</kbd> — pick from menu</li>
          <li><kbd className="font-mono text-foreground">Esc</kbd> — dismiss menu</li>
        </ul>
      </section>
    </div>
  );
}

function ChatHistoryItem({
  chat, isActive, isRenaming, renameValue,
  onRenameValueChange, onLoad, onDelete, onStartRename, onConfirmRename, onCancelRename,
}: {
  chat: ChatSummary; isActive: boolean; isRenaming: boolean; renameValue: string;
  onRenameValueChange: (v: string) => void; onLoad: () => void; onDelete: () => void;
  onStartRename: () => void; onConfirmRename: () => void; onCancelRename: () => void;
}) {
  return (
    <div
      className={`group relative px-4 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors border-l-2 ${isActive ? "bg-muted/60 border-accent" : "border-transparent"}`}
      onClick={!isRenaming ? onLoad : undefined}
    >
      {isRenaming ? (
        <input
          autoFocus value={renameValue}
          onChange={(e) => onRenameValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onConfirmRename(); }
            if (e.key === "Escape") { e.preventDefault(); onCancelRename(); }
          }}
          onBlur={onConfirmRename}
          className="w-full text-sm bg-transparent border-b border-accent outline-none pb-px pr-2"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <p className="text-sm truncate pr-14 leading-snug">{chat.title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(chat.updated_at)}</p>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onStartRename(); }}
              className="h-6 w-6 grid place-items-center text-muted-foreground hover:text-foreground text-xs rounded"
              title="Rename"
            >✎</button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="h-6 w-6 grid place-items-center text-muted-foreground hover:text-destructive text-base rounded"
              title="Delete"
            >×</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Page() {
  const { user } = useAuth();
  const agentName = useAgentName();

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [trigger, setTrigger] = useState<ActiveTrigger>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // UI state
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false); // mobile avatar sheet
  const [themePickerOpen, setThemePickerOpen] = useState(false); // PC gear toggle

  // Theme state (persisted in localStorage)
  const [chatTheme, setChatTheme] = useState("default");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("kore_chat_theme") : null;
    if (saved) setChatTheme(saved);
  }, []);
  const handleThemeChange = (id: string) => {
    setChatTheme(id);
    if (typeof window !== "undefined") localStorage.setItem("kore_chat_theme", id);
  };
  const theme = CHAT_THEMES.find((t) => t.id === chatTheme) ?? CHAT_THEMES[0];

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // Derived user info
  const initials = useMemo(() => {
    const name = (user?.user_metadata as Record<string, string> | undefined)?.full_name || user?.email || "You";
    return name.split(/\s+|@/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  }, [user]);
  const avatarUrl = useMemo(
    () => (user?.user_metadata as Record<string, string> | undefined)?.avatar_url,
    [user],
  );
  const firstName = useMemo(() => {
    const full = (user?.user_metadata as Record<string, string> | undefined)?.full_name;
    if (full) return full.split(/\s+/)[0];
    return user?.email?.split("@")[0] || "there";
  }, [user]);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  const lastImage = useMemo(() => [...messages].reverse().find((m) => m.imageUrl)?.imageUrl, [messages]);
  const suggestions = useMemo(() => suggestionsFor(trigger), [trigger]);
  useEffect(() => { setActiveIdx(0); }, [trigger?.kind, trigger?.query]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.clientHeight - el.scrollTop < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streaming, drawing]);

  // Load chat list on mount
  useEffect(() => {
    supabase
      .from("concierge_chats")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setChats(data as ChatSummary[]); });
  }, []);

  // ── DB helpers ──────────────────────────────────────────────────────────────

  const loadChat = async (id: string) => {
    const { data } = await supabase.from("concierge_chats").select("messages").eq("id", id).single();
    if (data) {
      setMessages((data as any).messages as Msg[]);
      setActiveChatId(id);
      activeChatIdRef.current = id;
      setError(null);
    }
  };

  const newChat = () => {
    setMessages([]);
    setActiveChatId(null);
    activeChatIdRef.current = null;
    setError(null);
  };

  const saveCurrentChat = async (msgs: Msg[]) => {
    const chatId = activeChatIdRef.current;
    if (!chatId) {
      const title = msgs.find((m) => m.role === "user")?.content.slice(0, 60).trim() || "New Chat";
      const { data, error } = await supabase
        .from("concierge_chats").insert({ title, messages: msgs })
        .select("id, title, created_at, updated_at").single();
      if (!error && data) {
        const s = data as ChatSummary;
        activeChatIdRef.current = s.id;
        setActiveChatId(s.id);
        setChats((prev) => [s, ...prev]);
      }
    } else {
      const now = new Date().toISOString();
      await supabase.from("concierge_chats").update({ messages: msgs, updated_at: now }).eq("id", chatId);
      setChats((prev) =>
        [...prev.map((c) => (c.id === chatId ? { ...c, updated_at: now } : c))].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      );
    }
  };

  const deleteChat = async (id: string) => {
    await supabase.from("concierge_chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatIdRef.current === id) newChat();
  };

  const renameChat = async (id: string, newTitle: string) => {
    const title = newTitle.trim() || "New Chat";
    await supabase.from("concierge_chats").update({ title }).eq("id", id);
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const exportChat = () => {
    if (!messages.length) return;
    const lines = messages.map((m) => {
      const who = m.role === "user" ? "You" : agentName;
      const tags = m.tags?.length ? `\n_tags: ${m.tags.join(", ")}_` : "";
      const img = m.imageUrl ? `\n\n![image](${m.imageUrl})` : "";
      return `### ${who}\n\n${m.content}${tags}${img}`;
    });
    downloadBlob(`kore-chat-${Date.now()}.md`, new Blob([`# KORE Concierge\n\n${lines.join("\n\n---\n\n")}\n`], { type: "text/markdown" }));
  };

  // ── Chat functions ──────────────────────────────────────────────────────────

  const generateImage = async (prompt: string, tags: string[], currentMsgs: Msg[]): Promise<Msg[]> => {
    const next: Msg[] = [...currentMsgs, { role: "user", content: prompt, tags }];
    const placeholder: Msg = { role: "assistant", content: "Drawing that for you…", kind: "image" };
    setMessages([...next, placeholder]);
    setDrawing(true);
    try {
      const r = await fetch("/api/concierge-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Couldn't draw that.");
      const final: Msg[] = [...next, { ...placeholder, content: j.text || "Here you go.", imageUrl: j.imageUrl ?? undefined, tags }];
      setMessages(final);
      return final;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draw that.");
      setMessages(currentMsgs);
      return currentMsgs;
    } finally { setDrawing(false); }
  };

  const sendChat = async (text: string, tags: string[], currentMsgs: Msg[]): Promise<Msg[]> => {
    const promptText = tags.length ? `${text}\n\n[tags: ${tags.join(", ")}]` : text;
    const next: Msg[] = [...currentMsgs, { role: "user", content: text, tags }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);
    let assistant = "";
    try {
      const resp = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }, i) => ({ role, content: i === next.length - 1 ? promptText : content })), agentName }),
      });
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({ error: "Concierge unavailable." }));
        throw new Error(j.error ?? "Concierge unavailable.");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistant += delta;
              setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistant } : m)));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      const final: Msg[] = [...next, { role: "assistant", content: assistant }];
      setMessages(final);
      return final;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Concierge unavailable.");
      setMessages(currentMsgs);
      return currentMsgs;
    } finally { setStreaming(false); }
  };

  const send = async (text: string, forceDraw = false) => {
    const trimmed = text.trim();
    if (!trimmed || streaming || drawing) return;
    setError(null); setDraft(""); setTrigger(null);
    const { command, rest } = stripLeadingCommand(trimmed);
    if (command === "/clear") { newChat(); return; }
    if (command === "/save") { exportChat(); return; }
    if (command === "/help") { setHelpOpen(true); return; }
    const isDrawCmd = command === "/draw";
    const body = isDrawCmd ? rest : trimmed;
    if (!body.trim()) return;
    const tags = extractTags(body);
    const wantsImage = forceDraw || drawMode || isDrawCmd || detectDrawIntent(body);
    const currentMsgs = messages;
    const final = wantsImage
      ? await generateImage(body, tags, currentMsgs)
      : await sendChat(body, tags, currentMsgs);
    if (final.some((m) => m.role === "user")) await saveCurrentChat(final);
  };

  // ── Input handlers ──────────────────────────────────────────────────────────

  const onDraftChange = (v: string, caret: number) => { setDraft(v); setTrigger(detectTrigger(v, caret)); };

  const insertSuggestion = (value: string) => {
    if (!trigger) return;
    const caret = inputRef.current?.selectionStart ?? draft.length;
    const { text, caret: nextCaret } = applySuggestion(draft, trigger, value);
    setDraft(text); setTrigger(null);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus(); el.setSelectionRange(nextCaret, nextCaret);
    });
    void caret;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (trigger && suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertSuggestion(suggestions[activeIdx].value); return; }
      if (e.key === "Escape") { e.preventDefault(); setTrigger(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Shared history list (used in both PC sidebar and mobile sheet)
  const historyContent = (onItemLoad?: () => void) => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent">Chats</p>
        <button
          onClick={() => { newChat(); onItemLoad?.(); }}
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >+ New</button>
      </div>
      <div className="flex-1 overflow-y-auto py-1 min-h-0">
        {chats.length === 0 ? (
          <p className="px-4 py-8 text-xs text-muted-foreground text-center">No conversations yet.</p>
        ) : chats.map((chat) => (
          <ChatHistoryItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            isRenaming={renamingId === chat.id}
            renameValue={renameValue}
            onRenameValueChange={setRenameValue}
            onLoad={() => { loadChat(chat.id); onItemLoad?.(); }}
            onDelete={() => deleteChat(chat.id)}
            onStartRename={() => { setRenamingId(chat.id); setRenameValue(chat.title); }}
            onConfirmRename={() => { renameChat(chat.id, renameValue); setRenamingId(null); }}
            onCancelRename={() => setRenamingId(null)}
          />
        ))}
      </div>
    </>
  );

  // Inline styles for themed elements
  const userBubbleStyle: React.CSSProperties = theme.userBg
    ? { backgroundColor: theme.userBg, color: theme.userText }
    : {};
  const agentAvatarStyle: React.CSSProperties = theme.agentBg
    ? { backgroundColor: theme.agentBg, color: theme.agentText, borderColor: theme.agentBorder }
    : {};
  const accentDotStyle: React.CSSProperties = theme.accent ? { backgroundColor: theme.accent } : {};
  const mobileAgentBtnStyle: React.CSSProperties = theme.accent
    ? { backgroundColor: theme.accent, color: theme.userText ?? "#fff" }
    : {};

  // ── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[100svh] flex flex-col overflow-hidden">
      <SiteHeader />
      <section className="flex-1 min-h-0 lg:grid lg:grid-cols-[300px_1fr_minmax(320px,440px)] flex flex-col">

        {/* ── LEFT SIDEBAR: chat history (desktop) ── */}
        <aside className="hidden lg:flex flex-col bg-muted/20 border-r border-border/40 overflow-hidden">
          {historyContent()}

          {/* Theme picker (toggled by gear icon) */}
          {themePickerOpen && (
            <div className="shrink-0 border-t border-border/40 px-4 py-4">
              <ThemePicker current={chatTheme} onChange={handleThemeChange} />
            </div>
          )}

          {/* Sidebar footer */}
          <div className="shrink-0 border-t border-border/40 px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">v1.2 · Chat + Vision</p>
            <button
              onClick={() => setThemePickerOpen((v) => !v)}
              aria-label="Chat settings"
              title="Chat settings"
              className={`h-7 w-7 grid place-items-center transition-colors rounded ${themePickerOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <GearIcon />
            </button>
          </div>
        </aside>

        {/* ── CENTER: chat ── */}
        <div className="relative flex flex-col min-w-0 min-h-0 flex-1 px-4 sm:px-6 lg:px-10 py-4 lg:py-6">

          {/* Mobile header */}
          <div className="lg:hidden shrink-0 flex items-center gap-3 pb-4 border-b border-border/40 mb-3">
            {/* Agent avatar — SheetTrigger opens history + settings */}
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <button
                  aria-label="Chat settings and history"
                  className="h-10 w-10 rounded-full bg-accent text-accent-foreground grid place-items-center text-sm font-medium tracking-wider shrink-0 hover:opacity-80 transition-opacity"
                  style={theme.accent ? mobileAgentBtnStyle : undefined}
                >
                  {agentName.slice(0, 1).toUpperCase() || "K"}
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] sm:max-w-sm p-0 flex flex-col overflow-hidden">
                <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/40 shrink-0">
                  <SheetTitle className="text-sm tracking-[0.2em] uppercase text-left font-normal">{agentName}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  {historyContent(() => setSettingsOpen(false))}
                </div>
                <div className="shrink-0 border-t border-border/40 px-4 py-4">
                  <ThemePicker current={chatTheme} onChange={handleThemeChange} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{greeting}</p>
              <p className="font-display text-base truncate">
                {activeChat ? activeChat.title : `Talking with ${agentName}`}
              </p>
            </div>

            {/* Shortcuts */}
            <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
              <SheetTrigger asChild>
                <button aria-label="Shortcuts" className="h-9 w-9 grid place-items-center rounded-full border border-border hover:border-foreground shrink-0">
                  <span className="text-sm">?</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] sm:max-w-sm overflow-y-auto">
                <SheetHeader><SheetTitle>Shortcuts & Commands</SheetTitle></SheetHeader>
                <div className="mt-6"><ShortcutsPanel /></div>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={() => { exportChat(); setHelpOpen(false); }} className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">↓ Save chat (.md)</button>
                  <button onClick={() => { newChat(); setHelpOpen(false); }} className="text-left text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">↺ New conversation</button>
                </div>
              </SheetContent>
            </Sheet>

            <span className="h-2 w-2 rounded-full bg-accent animate-pulse shrink-0" style={accentDotStyle} />
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4 pr-1">
            {messages.length === 0 ? (
              /* Empty state — left-aligned welcome, blank middle */
              <div className="pt-6 pb-4">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">{greeting},</p>
                <h2 className="font-display text-4xl sm:text-5xl lg:text-4xl xl:text-5xl font-light leading-[1.05] mb-4">
                  {firstName}.
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  Ask anything about fit, pieces, styling — or say "design…" to sketch it.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={i} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                      {isUser ? (
                        avatarUrl ? (
                          <img src={avatarUrl} alt="You" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div
                            className="h-8 w-8 shrink-0 rounded-full bg-foreground text-background grid place-items-center text-[10px] tracking-widest"
                            style={userBubbleStyle}
                          >
                            {initials || "Y"}
                          </div>
                        )
                      ) : (
                        <div
                          className="h-8 w-8 shrink-0 rounded-full bg-accent/20 text-accent border border-accent/40 grid place-items-center text-[10px] tracking-widest"
                          style={agentAvatarStyle}
                        >
                          {agentName.slice(0, 1).toUpperCase() || "K"}
                        </div>
                      )}
                      <div className={`max-w-[85%] sm:max-w-[78%] ${isUser ? "text-right" : ""}`}>
                        <p
                          className={`inline-block px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words ${
                            isUser
                              ? "bg-foreground text-background rounded-2xl rounded-tr-sm"
                              : "bg-muted/40 border border-border/40 rounded-2xl rounded-tl-sm"
                          }`}
                          style={isUser ? userBubbleStyle : undefined}
                        >
                          {m.content}
                          {streaming && i === messages.length - 1 && !isUser && (
                            <span className="inline-block w-1.5 h-4 ml-1 bg-accent animate-pulse align-middle" />
                          )}
                        </p>
                        {m.tags && m.tags.length > 0 && (
                          <div className={`mt-1.5 flex flex-wrap gap-1.5 ${isUser ? "justify-end" : ""}`}>
                            {m.tags.map((t) => (
                              <span key={t} className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border border-border/60 text-muted-foreground">#{t}</span>
                            ))}
                          </div>
                        )}
                        {m.imageUrl && (
                          <div className="mt-3 lg:hidden">
                            <div className="border border-border overflow-hidden rounded-md">
                              <img src={m.imageUrl} alt="KORE design" className="w-full block" />
                            </div>
                            <a href={m.imageUrl} download={`kore-${slugify(m.content)}-${i}.png`} className="inline-block mt-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground">
                              ↓ Download image
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {drawing && <p className="text-[10px] tracking-[0.25em] uppercase text-accent animate-pulse">✶ Sketching on the canvas…</p>}
                {error && (
                  <div className="px-4 py-3 border border-destructive/30 bg-destructive/10 text-sm text-destructive">{error}</div>
                )}
              </div>
            )}
          </div>

          <ScrollJump containerRef={scrollRef} watch={messages.length} />

          {/* Input bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(draft); }}
            className="relative border-t border-border/40 pt-3 mt-1 flex gap-2 items-center"
          >
            <CommandMenu
              open={!!trigger && suggestions.length > 0}
              items={suggestions}
              activeIndex={activeIdx}
              onHover={setActiveIdx}
              onSelect={insertSuggestion}
              label={trigger?.kind === "slash" ? "Commands" : trigger?.kind === "mention" ? "Mentions" : "Tags"}
            />
            <button
              type="button"
              onClick={() => setDrawMode((v) => !v)}
              aria-pressed={drawMode}
              title="Toggle design / draw mode"
              className={`shrink-0 h-10 w-10 grid place-items-center border transition-colors rounded-full ${drawMode ? "bg-accent text-accent-foreground border-accent" : "border-border hover:border-foreground"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="m14.06 6.19 3.75 3.75 2.12-2.12a1.5 1.5 0 0 0 0-2.12l-1.63-1.63a1.5 1.5 0 0 0-2.12 0L14.06 6.19Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
              onKeyDown={onKeyDown}
              onKeyUp={(e) => { const el = e.currentTarget; setTrigger(detectTrigger(el.value, el.selectionStart ?? el.value.length)); }}
              onClick={(e) => { const el = e.currentTarget; setTrigger(detectTrigger(el.value, el.selectionStart ?? el.value.length)); }}
              onBlur={() => setTimeout(() => setTrigger(null), 120)}
              placeholder={drawing ? "Drawing…" : streaming ? `${agentName} is replying…` : drawMode ? "Describe what to design…" : `Ask ${agentName} — try /, @ or #`}
              disabled={streaming || drawing}
              className="min-w-0 flex-1 bg-muted/30 border border-border focus:border-foreground outline-none px-4 py-3 text-base disabled:opacity-50 rounded-full"
            />
            <button
              type="submit"
              disabled={streaming || drawing || !draft.trim()}
              className="shrink-0 px-4 sm:px-6 py-3 bg-accent text-accent-foreground text-[10px] sm:text-xs tracking-[0.2em] uppercase rounded-full disabled:opacity-50"
            >
              {drawMode ? "Draw" : "Send"} →
            </button>
          </form>
        </div>

        {/* ── RIGHT SIDEBAR: canvas (desktop) ── */}
        <aside className="hidden lg:flex flex-col border-l border-border/40 bg-muted/10 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] tracking-[0.25em] uppercase text-accent">Canvas</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              {drawing ? "Drawing…" : lastImage ? "Latest design" : "Empty"}
            </p>
          </div>
          <div className="flex-1 min-h-[300px] border border-border bg-background grid place-items-center overflow-hidden relative">
            {drawing && !lastImage && (
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Composing</p>
                </div>
              </div>
            )}
            {lastImage ? (
              <img src={lastImage} alt="KORE design" className="max-h-full max-w-full object-contain" />
            ) : !drawing && (
              <div className="text-center px-8 max-w-xs">
                <p className="font-display text-2xl mb-3 leading-snug">Your design board.</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Toggle the pencil, type <code className="font-mono">/draw</code>, or say <em>"design…"</em> and KORE will draw it here.
                </p>
              </div>
            )}
          </div>
          {lastImage && (
            <a href={lastImage} download={`kore-design-${Date.now()}.png`} className="mt-3 text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground">
              ↓ Download design
            </a>
          )}
        </aside>
      </section>
    </div>
  );
}
