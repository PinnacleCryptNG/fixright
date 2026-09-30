import { createFileRoute, Outlet } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated/technician")({
  component: TechnicianLayout,
});

function TechnicianLayout() {
  return (
    <DashboardShell
      area="Technician"
      navItems={[
        { label: "Overview", linkProps: { to: "/technician" } },
        { label: "Jobs", linkProps: { to: "/technician/dashboard" } },
        { label: "Profile", linkProps: { to: "/technician/profile" } },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}
