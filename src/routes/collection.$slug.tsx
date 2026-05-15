import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { findCollection } from "@/lib/collections";

export const Route = createFileRoute("/collection/$slug")({
  beforeLoad: ({ params }) => {
    if (!findCollection(params.slug)) throw notFound();
  },
  component: () => <Outlet />,
});
