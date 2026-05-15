import type { ReactNode } from "react";
import { SiteShell } from "@/components/chrome/site-shell";

export function Stub({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <SiteShell>
      <section className="mx-auto max-w-[1400px] px-6 lg:px-10 py-24 lg:py-32">
        <div className="eyebrow text-accent">{eyebrow}</div>
        <h1 className="mt-6 text-6xl lg:text-8xl font-display max-w-4xl">{title}</h1>
        {body && (
          <p className="mt-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {body}
          </p>
        )}
        {children && <div className="mt-16">{children}</div>}
        {!children && (
          <div className="mt-20 p-10 border border-dashed border-border text-sm text-muted-foreground">
            Page scaffolded. Wire content + data in next pass.
          </div>
        )}
      </section>
    </SiteShell>
  );
}
