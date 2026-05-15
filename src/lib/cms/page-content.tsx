// Lightweight CMS overrides for editable on-page copy.
// Storage: site_content rows keyed `page:<pageId>` → { [blockId]: string }.
// Reads run via getSiteContent (public). Writes go through the admin panel.

import { createContext, useContext, useEffect, useMemo, useState, createElement, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent } from "@/lib/cms.functions";
import { PAGES, pageKeys } from "./registry";

type Overrides = Record<string, Record<string, string>>; // pageId -> blockId -> text

const Ctx = createContext<{ overrides: Overrides; ready: boolean; refresh: () => void }>({
  overrides: {},
  ready: false,
  refresh: () => {},
});

export function PageContentProvider({ children }: { children: ReactNode }) {
  const fetcher = useServerFn(getSiteContent);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [ready, setReady] = useState(false);

  const load = () => {
    fetcher({ data: { keys: pageKeys() } })
      .then(({ content }) => {
        const map: Overrides = {};
        Object.entries(content || {}).forEach(([key, val]) => {
          if (!key.startsWith("page:")) return;
          const id = key.slice(5);
          if (val && typeof val === "object" && !Array.isArray(val)) {
            map[id] = val as Record<string, string>;
          }
        });
        setOverrides(map);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const value = useMemo(() => ({ overrides, ready, refresh: load }), [overrides, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePageText(pageId: string, blockId: string, fallback: string): string {
  const { overrides } = useContext(Ctx);
  const v = overrides[pageId]?.[blockId];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/**
 * Drop-in editable text. Renders the override (when set) or the default.
 *   <T page="home" id="hero.title" default="Intelligent" />
 *   <T page="home" id="hero.title" default="Intelligent" as="span" className="..." />
 */
export function T({
  page, id, default: def, as = "span", className,
}: {
  page: string;
  id: string;
  default: string;
  as?: string;
  className?: string;
}) {
  const text = usePageText(page, id, def);
  return createElement(as, { className }, text);
}

export { PAGES };
