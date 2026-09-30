import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard-shell";
import { useAppUser } from "@/hooks/use-app-user";

export const Route = createFileRoute("/_authenticated/technician")({
  component: TechnicianLayout,
});

function TechnicianLayout() {
  const { role, isPending } = useAppUser();
  return (
    <DashboardShell
      area="Technician"
      navItems={[
        { label: "Dashboard", linkProps: { to: "/technician/dashboard" } },
        { label: "Requests", linkProps: { to: "/technician/requests" } },
        { label: "Jobs", linkProps: { to: "/technician/jobs" } },
        { label: "Profile", linkProps: { to: "/technician/profile" } },
      ]}
    >
      {isPending ? (
        <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
      ) : role !== "technician" ? (
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">Technician accounts only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for FixRight technicians. <Link to="/dashboard" className="font-medium text-primary underline">Go to your dashboard</Link>.
          </p>
        </div>
      ) : (
        <Outlet />
      )}
    </DashboardShell>
  );
}
