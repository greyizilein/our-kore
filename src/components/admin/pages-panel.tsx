import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListSiteContent, adminUpsertSiteContent } from "@/lib/cms.functions";
import { PAGES, findPage, type Block } from "@/lib/cms/registry";
import { cn } from "@/lib/utils";

type Drafts = Record<string, string>; // blockId -> text

export function PagesAdmin({ token, flash }: { token: string; flash: (m: string) => void }) {
  const listFn = useServerFn(adminListSiteContent);
  const upsert = useServerFn(adminUpsertSiteContent);

  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [activeId, setActiveId] = useState<string>(PAGES[0].id);
  const [draft, setDraft] = useState<Drafts>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const reload = async () => {
    const r = await listFn({ data: { token } });
    const map: Record<string, Record<string, string>> = {};
    (r.content as any[]).forEach((row: any) => {
      if (typeof row.key === "string" && row.key.startsWith("page:") && row.value && typeof row.value === "object") {
        map[row.key.slice(5)] = row.value;
      }
    });
    setOverrides(map);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [token]);

  const page = findPage(activeId);

  // When switching page, populate draft from overrides (else defaults).
  useEffect(() => {
    if (!page) return;
    const ov = overrides[page.id] || {};
    const next: Drafts = {};
    page.blocks.forEach((b) => { next[b.id] = ov[b.id] ?? b.default; });
    setDraft(next);
  }, [page, overrides]);

  const dirty = useMemo(() => {
    if (!page) return false;
    const ov = overrides[page.id] || {};
    return page.blocks.some((b) => (draft[b.id] ?? "") !== (ov[b.id] ?? b.default));
  }, [draft, page, overrides]);

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const visible = PAGES.filter(
      (p) => !f || p.label.toLowerCase().includes(f) || p.id.toLowerCase().includes(f),
    );
    const out: Record<string, typeof PAGES> = {};
    visible.forEach((p) => { (out[p.group] ||= [] as any).push(p); });
    return out;
  }, [filter]);

  const save = async () => {
    if (!page) return;
    setBusy(true);
    try {
      // Persist only blocks that differ from their defaults — keeps storage clean.
      const value: Record<string, string> = {};
      page.blocks.forEach((b) => {
        const v = draft[b.id] ?? "";
        if (v !== b.default && v.length > 0) value[b.id] = v;
      });
      await upsert({ data: { token, key: `page:${page.id}`, value } });
      flash("Saved — live on site.");
      await reload();
    } catch (e: any) { flash(e.message || "Save failed"); }
    finally { setBusy(false); }
  };

  const resetBlock = (b: Block) => setDraft((d) => ({ ...d, [b.id]: b.default }));
  const clearOverride = (b: Block) => setDraft((d) => ({ ...d, [b.id]: b.default }));

  const resetAll = async () => {
    if (!page) return;
    setBusy(true);
    try {
      await upsert({ data: { token, key: `page:${page.id}`, value: {} } });
      flash("All overrides cleared.");
      await reload();
    } catch (e: any) { flash(e.message || "Reset failed"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="pb-4 mb-5 md:mb-8 border-b border-border">
        <p className="text-[10px] sm:text-[11px] tracking-[0.2em] uppercase text-accent mb-1.5 sm:mb-2">Editorial</p>
        <h2 className="font-display text-xl sm:text-3xl md:text-4xl font-light leading-tight">
          Pages — <em className="italic">copy & content</em>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Pick a page on the left, edit any block, save. Existing copy is loaded so you can rewrite or restore it. A green dot marks pages with active overrides.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter pages…"
            className="w-full px-3 py-2 bg-background border border-border text-sm"
          />
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1 px-2">{group}</p>
                {items.map((p) => {
                  const has = !!overrides[p.id] && Object.keys(overrides[p.id]).length > 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setActiveId(p.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm text-left border-l-2 transition-colors",
                        activeId === p.id ? "border-accent text-accent bg-muted/30" : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span>{p.label}</span>
                      <span className="flex items-center gap-2">
                        {p.blocks.length === 0 && (
                          <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60">soon</span>
                        )}
                        {has && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Has overrides" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-5 min-w-0">
          {!page ? null : page.blocks.length === 0 ? (
            <div className="border border-dashed border-border p-8 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">{page.label} — not yet wired.</p>
              <p>
                This page is registered but its copy isn't broken into editable blocks yet. Tell the agent which sections to make editable
                and they'll show up here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">Editing</p>
                  <p className="font-display text-2xl">{page.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetAll}
                    disabled={busy || !overrides[page.id] || Object.keys(overrides[page.id] || {}).length === 0}
                    className="px-3 py-2 text-[11px] tracking-[0.2em] uppercase border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                  >
                    Reset page
                  </button>
                  <button
                    onClick={save}
                    disabled={busy || !dirty}
                    className="px-5 py-2 bg-foreground text-background text-[11px] tracking-[0.2em] uppercase disabled:opacity-50"
                  >
                    {busy ? "Saving…" : dirty ? "Save & publish" : "Saved"}
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {page.blocks.map((b) => {
                  const ov = overrides[page.id]?.[b.id];
                  const isOverridden = typeof ov === "string" && ov !== b.default;
                  const value = draft[b.id] ?? "";
                  return (
                    <div key={b.id} className="border border-border bg-background">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium truncate">{b.label}</span>
                          {!b.wired && (
                            <span className="text-[9px] tracking-[0.2em] uppercase text-amber-500" title="Block defined but page isn't reading from CMS yet">
                              not wired
                            </span>
                          )}
                          {isOverridden && (
                            <span className="text-[9px] tracking-[0.2em] uppercase text-emerald-400">overridden</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => resetBlock(b)}
                            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
                            title="Restore default copy"
                          >
                            ↺ Default
                          </button>
                          <button
                            onClick={() => clearOverride(b)}
                            className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
                            title="Clear this field"
                          >
                            ✕ Clear
                          </button>
                        </div>
                      </div>
                      {b.multiline ? (
                        <textarea
                          value={value}
                          onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                          rows={Math.max(3, Math.min(10, Math.ceil((value.length || 60) / 70)))}
                          className="w-full px-3 py-2 bg-background text-sm leading-relaxed outline-none resize-y"
                        />
                      ) : (
                        <input
                          value={value}
                          onChange={(e) => setDraft((d) => ({ ...d, [b.id]: e.target.value }))}
                          className="w-full px-3 py-2 bg-background text-sm outline-none"
                        />
                      )}
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border bg-muted/10 truncate">
                        Default: <span className="font-mono">{b.default}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
