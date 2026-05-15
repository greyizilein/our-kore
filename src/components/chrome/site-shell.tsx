import { lazy, Suspense, type ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

// Defer the chat widget out of the initial bundle — it's not LCP-critical.
const ChatWidget = lazy(() => import("./chat-widget").then((m) => ({ default: m.ChatWidget })));

export function SiteShell({ children, padTop = true }: { children: ReactNode; padTop?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className={padTop ? "flex-1 pt-20" : "flex-1"}>{children}</main>
      <SiteFooter />
      <Suspense fallback={null}><ChatWidget /></Suspense>
    </div>
  );
}
