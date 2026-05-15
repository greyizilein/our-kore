import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/chrome/site-shell";
import { SubscriptionSection } from "@/components/marketing/subscription-section";

export const Route = createFileRoute("/subscription")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Subscribe — KORE" },
      { name: "description", content: "Early access, collection notes, and invitations. One email per season." },
    ],
  }),
});

function Page() {
  return (
    <SiteShell>
      <div className="min-h-[calc(100vh-5rem)] flex flex-col justify-center px-6 max-w-2xl mx-auto">
        <SubscriptionSection />
      </div>
    </SiteShell>
  );
}
