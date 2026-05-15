import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import {
  Heading1, Heading2, Heading3, Heading4,
  Bold, Italic, Strikethrough,
  Quote, List, ListOrdered,
  Link, Image, Code, CodeXml,
  Minus, Eye, Pencil,
} from "lucide-react";

// ── helpers ────────────────────────────────────────────────────────────────

type CursorState = { start: number; end: number };

/** Returns new [value, cursorStart, cursorEnd] after wrapping the selection. */
function applyWrap(
  value: string,
  sel: CursorState,
  before: string,
  after = "",
  placeholder = "text",
): [string, number, number] {
  const { start, end } = sel;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + selected.length;
  return [next, cursorStart, cursorEnd];
}

/** Adds/removes a line prefix (e.g. "## ") on every selected line. */
function applyPrefix(
  value: string,
  sel: CursorState,
  prefix: string,
): [string, number, number] {
  const { start, end } = sel;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const block = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

  const lines = block.split("\n");
  const allPrefixed = lines.every((l) => l.startsWith(prefix));
  const newLines = allPrefixed
    ? lines.map((l) => l.slice(prefix.length))
    : lines.map((l) => (l.startsWith(prefix) ? l : prefix + l));
  const newBlock = newLines.join("\n");

  const next =
    value.slice(0, lineStart) +
    newBlock +
    value.slice(lineEnd === -1 ? value.length : lineEnd);

  const delta = newBlock.length - block.length;
  return [next, start + (allPrefixed ? -prefix.length : prefix.length), end + delta];
}

/** Inserts a snippet at the cursor, replacing the selection. */
function applyInsert(
  value: string,
  sel: CursorState,
  snippet: string,
): [string, number, number] {
  const { start, end } = sel;
  const next = value.slice(0, start) + snippet + value.slice(end);
  return [next, start + snippet.length, start + snippet.length];
}

// ── toolbar definition ─────────────────────────────────────────────────────

type ToolAction =
  | { type: "wrap"; before: string; after?: string; placeholder?: string }
  | { type: "prefix"; prefix: string }
  | { type: "insert"; snippet: string };

type Tool = {
  label: string;
  title: string;
  Icon: React.FC<{ size?: number; className?: string }>;
  action: ToolAction;
  dividerAfter?: boolean;
};

const TOOLS: Tool[] = [
  { label: "H1", title: "Heading 1",      Icon: Heading1,    action: { type: "prefix", prefix: "# " },       dividerAfter: false },
  { label: "H2", title: "Heading 2",      Icon: Heading2,    action: { type: "prefix", prefix: "## " } },
  { label: "H3", title: "Heading 3",      Icon: Heading3,    action: { type: "prefix", prefix: "### " } },
  { label: "H4", title: "Heading 4",      Icon: Heading4,    action: { type: "prefix", prefix: "#### " },     dividerAfter: true },
  { label: "B",  title: "Bold",           Icon: Bold,        action: { type: "wrap", before: "**", after: "**", placeholder: "bold text" } },
  { label: "I",  title: "Italic",         Icon: Italic,      action: { type: "wrap", before: "*",  after: "*",  placeholder: "italic text" } },
  { label: "S",  title: "Strikethrough",  Icon: Strikethrough, action: { type: "wrap", before: "~~", after: "~~", placeholder: "struck text" }, dividerAfter: true },
  { label: "\"", title: "Blockquote",     Icon: Quote,       action: { type: "prefix", prefix: "> " } },
  { label: "UL", title: "Bullet list",    Icon: List,        action: { type: "prefix", prefix: "- " } },
  { label: "OL", title: "Numbered list",  Icon: ListOrdered, action: { type: "prefix", prefix: "1. " },       dividerAfter: true },
  { label: "—",  title: "Divider (HR)",   Icon: Minus,       action: { type: "insert", snippet: "\n\n---\n\n" }, dividerAfter: true },
  { label: "``", title: "Inline code",    Icon: Code,        action: { type: "wrap", before: "`", after: "`", placeholder: "code" } },
  { label: "```",title: "Code block",     Icon: CodeXml,     action: { type: "wrap", before: "```\n", after: "\n```", placeholder: "code block" }, dividerAfter: true },
  { label: "[ ]",title: "Link",           Icon: Link,        action: { type: "wrap", before: "[", after: "](url)", placeholder: "link text" } },
  { label: "![]",title: "Image",          Icon: Image,       action: { type: "insert", snippet: "![alt text](https://)" } },
];

// ── component ──────────────────────────────────────────────────────────────

export function MarkdownEditor({
  value,
  onChange,
  rows = 20,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<{ start: number; end: number } | null>(null);

  const html = useMemo(
    () => marked.parse(value || "", { gfm: true, breaks: true }) as string,
    [value],
  );

  // Restore cursor after React re-render triggered by onChange
  useLayoutEffect(() => {
    if (pendingCursor.current && textareaRef.current) {
      textareaRef.current.selectionStart = pendingCursor.current.start;
      textareaRef.current.selectionEnd = pendingCursor.current.end;
      pendingCursor.current = null;
    }
  });

  function getSelection(): CursorState {
    const el = textareaRef.current;
    return el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : { start: 0, end: 0 };
  }

  function applyTool(tool: Tool) {
    const sel = getSelection();
    const a = tool.action;
    let next: string, cs: number, ce: number;
    if (a.type === "wrap") {
      [next, cs, ce] = applyWrap(value, sel, a.before, a.after ?? "", a.placeholder);
    } else if (a.type === "prefix") {
      [next, cs, ce] = applyPrefix(value, sel, a.prefix);
    } else {
      [next, cs, ce] = applyInsert(value, sel, a.snippet);
    }
    pendingCursor.current = { start: cs, end: ce };
    onChange(next);
    // Keep focus on the textarea
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  return (
    <div className="border border-border flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
            tab === "write"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil size={10} />
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
            tab === "preview"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye size={10} />
          Preview
        </button>
      </div>

      {/* Toolbar — only visible in write mode */}
      {tab === "write" && (
        <div className="flex flex-wrap items-center gap-px border-b border-border bg-muted/10 px-2 py-1.5 shrink-0">
          {TOOLS.map((tool, i) => (
            <span key={i} className="flex items-center">
              <button
                type="button"
                title={tool.title}
                onClick={() => applyTool(tool)}
                className="flex items-center justify-center w-7 h-7 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <tool.Icon size={14} />
              </button>
              {tool.dividerAfter && (
                <span className="w-px h-4 bg-border mx-1 inline-block" />
              )}
            </span>
          ))}
        </div>
      )}

      {/* Write / Preview pane */}
      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          spellCheck
          className="w-full bg-background px-4 py-3 text-sm font-mono leading-relaxed outline-none resize-y"
        />
      ) : (
        <div
          className="kore-prose px-6 py-6 min-h-[200px] overflow-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
