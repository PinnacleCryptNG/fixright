import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { NotBuiltYet } from "@/components/not-built-yet";
import { Button } from "@/components/ui/button";
import { useAppUser } from "@/hooks/use-app-user";
import { SERVICE_FEE_NOTE } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — FixRight" },
      { name: "description", content: "Track your FixRight repair requests and appointments." },
    ],
  }),
  component: CustomerDashboard,
});

function CustomerDashboard() {
  const { appUser, role, isPending } = useAppUser();

  return (
    <DashboardShell
      area="Customer"
      navItems={[{ label: "Overview", linkProps: { to: "/dashboard" } }]}
    >
      <PageHeader
        title={
          isPending
            ? "Your dashboard"
            : `Welcome${appUser?.full_name ? `, ${appUser.full_name.split(" ")[0]}` : ""}`
        }
        description="This is your home for repair requests and appointments. Booking arrives in the next iteration."
      />

      {role === "technician" ? (
        <div className="mb-6 rounded-lg border border-border bg-primary-soft p-4 text-sm text-accent-foreground">
          Your account is registered as a technician.{" "}
          <Link to="/technician" className="font-medium underline">
            Go to your technician area
          </Link>
          .
        </div>
      ) : null}

      <div className="grid gap-5">
        <NotBuiltYet
          title="Request a repair"
          description="The request flow — choose what's broken, describe the fault, share your location and availability — is the next piece of FixRight to be built."
        >
          <Button size="sm" variant="outline" disabled>
            Request a repair
          </Button>
        </NotBuiltYet>

        <NotBuiltYet
          title="Your appointments"
          description="Once matching and confirmation exist, confirmed appointments with your technician will appear here."
        />

        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-semibold">What a visit costs</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{SERVICE_FEE_NOTE}</p>
        </div>
      </div>
    </DashboardShell>
  );
}
