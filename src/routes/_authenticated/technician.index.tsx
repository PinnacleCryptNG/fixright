import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";
import { useAppUser } from "@/hooks/use-app-user";
import { SERVICE_FEE_NOTE } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/technician/")({
  head: () => ({
    meta: [
      { title: "Technician area — FixRight" },
      {
        name: "description",
        content: "Manage your FixRight technician account, services and availability.",
      },
    ],
  }),
  component: TechnicianOverview,
});

function TechnicianOverview() {
  const { appUser } = useAppUser();

  return (
    <>
      <PageHeader
        title="Technician area"
        description="Your account, services and job requests live here. Request handling is built in the next iteration."
      />

      <div className="grid gap-5">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">Account</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{appUser?.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{appUser?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="capitalize">{appUser?.role ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Visit fee</dt>
              <dd>₦1,000</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{SERVICE_FEE_NOTE}</p>
        </div>

        <NotBuiltYet
          title="Incoming job requests"
          description="When matching is built, nearby repair requests you can accept or decline will appear here."
        />
      </div>
    </>
  );
}
