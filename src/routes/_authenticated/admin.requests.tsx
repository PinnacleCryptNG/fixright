import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({
    meta: [{ title: "Repair requests — FixRight admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminRequests,
});

function AdminRequests() {
  return (
    <>
      <PageHeader
        title="Repair requests"
        description="Customer requests and their matching progress, from submitted through to completed."
      />
      <NotBuiltYet
        title="Request list"
        description="No requests exist yet — this view fills up once the customer request flow and matching are built."
      />
    </>
  );
}
